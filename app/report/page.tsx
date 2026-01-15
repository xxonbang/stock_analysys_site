'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyzeResponse, AnalyzeResult } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { PriceChart } from '@/components/charts/price-chart';
import { VolumeChart } from '@/components/charts/volume-chart';
import { RSIChart } from '@/components/charts/rsi-chart';
import { transformToChartData } from '@/lib/chart-utils';
import { IndicatorInfoButton } from '@/components/indicator-info-button';

export default function ReportPage() {
  const router = useRouter();
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [periodText, setPeriodText] = useState('데이터를');

  useEffect(() => {
    // sessionStorage는 클라이언트 사이드에서만 사용 가능
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const stored = sessionStorage.getItem('analysisResults');
    if (!stored) {
      router.push('/');
      setIsLoading(false);
      return;
    }

    try {
      const data: AnalyzeResponse = JSON.parse(stored);
      
      // API 오류가 있으면 표시
      if (data.error) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setSelectedIndex(0); // 결과가 로드되면 첫 번째 종목으로 리셋
        
        // 분석 기간 텍스트 설정 (하이드레이션 오류 방지)
        if (data.results[0].period) {
          setPeriodText(`${data.results[0].period} 동안의 데이터를`);
        }
        
        // 스크롤을 최상단으로 이동
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to parse results:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // selectedIndex가 유효한 범위인지 확인하고 자동 조정
  // ⚠️ 중요: 모든 hooks는 조건부 return 이전에 호출되어야 함 (React Hooks 규칙)
  useEffect(() => {
    if (results.length > 0 && (selectedIndex >= results.length || selectedIndex < 0)) {
      setSelectedIndex(0);
    }
  }, [results.length]); // results.length만 의존성으로 사용 (무한 루프 방지)

  // 안전한 인덱스 계산 (항상 유효한 범위 내)
  const safeIndex = results.length > 0 
    ? Math.max(0, Math.min(selectedIndex, results.length - 1)) 
    : 0;
  
  const currentResult = results.length > 0 ? results[safeIndex] : null;

  // 차트 데이터 메모이제이션
  // ⚠️ 중요: 모든 hooks는 조건부 return 이전에 호출되어야 함 (React Hooks 규칙)
  const chartData = useMemo(() => {
    if (!currentResult?.historicalData || currentResult.historicalData.length === 0) {
      return null;
    }
    // marketData.volume을 전달하여 최신 거래량과 차트 데이터 일치시키기
    return transformToChartData(currentResult, currentResult.marketData?.volume);
  }, [currentResult]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 분석 결과</h1>
            <p className="text-lg text-gray-600 mb-8">
              AI가 {periodText} 분석 중입니다...
            </p>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    // sessionStorage에서 오류 메시지 확인
    let errorMessage = '분석 결과가 없습니다.';
    try {
      const stored = sessionStorage.getItem('analysisResults');
      if (stored) {
        const data: AnalyzeResponse = JSON.parse(stored);
        if (data.error) {
          errorMessage = data.error;
        }
      }
    } catch (e) {
      // 무시
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-6 sm:py-12 max-w-6xl">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                분석 오류
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-red-200">
                <p className="text-red-700 font-medium mb-2">오류 내용:</p>
                <p className="text-gray-800 text-sm leading-relaxed">{errorMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => router.push('/')} 
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  다시 분석하기
                </Button>
                <Button 
                  onClick={() => router.back()} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  이전 페이지로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!currentResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">분석 결과를 불러올 수 없습니다.</p>
              <Button onClick={() => router.push('/')} className="mt-4 w-full">
                다시 분석하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const { marketData, aiReport } = currentResult;

  const getRSIStatus = (rsi?: number) => {
    if (!rsi) return { text: 'N/A', color: 'text-gray-500' };
    if (rsi >= 70) return { text: '과매수 🔴', color: 'text-red-600' };
    if (rsi <= 30) return { text: '과매도 🟢', color: 'text-green-600' };
    return { text: '중립 🟡', color: 'text-yellow-600' };
  };

  const rsiStatus = getRSIStatus(marketData.rsi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 분석 결과</h1>
            {(currentResult.period || currentResult.historicalPeriod) && (
              <div className="text-xs sm:text-sm text-gray-600 mt-1 space-y-0.5 sm:space-y-1">
                {currentResult.historicalPeriod && (
                  <p>과거 이력 분석 기간: {currentResult.historicalPeriod}</p>
                )}
                {currentResult.period && (
                  <p>향후 전망 분석 기간: {currentResult.period}</p>
                )}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="w-full sm:w-auto"
          >
            새 분석
          </Button>
        </div>

        {/* 종목 탭 - 항상 표시 (1개일 때도 표시하여 일관성 유지) */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {results.map((result, index) => (
            <button
              key={`${result.symbol}-${index}`}
              onClick={() => setSelectedIndex(index)}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium whitespace-nowrap transition-colors text-sm sm:text-base flex-shrink-0 ${
                selectedIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="block sm:inline">{result.name || result.symbol}</span>
              {(result.period || result.historicalPeriod) && (
                <span className="ml-1 sm:ml-2 text-xs opacity-75 hidden sm:inline">
                  {result.historicalPeriod && `과거: ${result.historicalPeriod}`}
                  {result.historicalPeriod && result.period && ' / '}
                  {result.period && `전망: ${result.period}`}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 대시보드 섹션 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* 현재가 */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                💰 현재가
                <IndicatorInfoButton indicatorKey="price" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {marketData.price.toLocaleString()}
              </div>
              <div
                className={`text-xs sm:text-sm mt-1 ${
                  marketData.changePercent >= 0 ? 'text-red-600' : 'text-blue-600'
                }`}
              >
                {marketData.changePercent >= 0 ? '+' : ''}
                {marketData.changePercent.toFixed(2)}% (
                {marketData.change >= 0 ? '+' : ''}
                {marketData.change.toLocaleString()})
              </div>
            </CardContent>
          </Card>

          {/* RSI */}
          {marketData.rsi !== undefined && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📈 RSI(14)
                  <IndicatorInfoButton indicatorKey="rsi" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{marketData.rsi}</div>
                <div className={`text-xs sm:text-sm mt-1 ${rsiStatus.color}`}>{rsiStatus.text}</div>
              </CardContent>
            </Card>
          )}

          {/* 이동평균선 */}
          {marketData.movingAverages && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📉 이동평균선
                  <IndicatorInfoButton indicatorKey="movingAverages" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs sm:text-sm">
                <div>5일: {marketData.movingAverages.ma5.toLocaleString()}</div>
                <div>20일: {marketData.movingAverages.ma20.toLocaleString()}</div>
                <div>60일: {marketData.movingAverages.ma60.toLocaleString()}</div>
                <div>120일: {marketData.movingAverages.ma120.toLocaleString()}</div>
              </CardContent>
            </Card>
          )}

          {/* 이격도 */}
          {marketData.disparity !== undefined && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📏 이격도 (20일 기준)
                  <IndicatorInfoButton indicatorKey="disparity" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{marketData.disparity}%</div>
                <div className="text-xs sm:text-sm mt-1 text-gray-600">
                  {marketData.disparity > 105
                    ? '과열 구간'
                    : marketData.disparity < 95
                    ? '침체 구간'
                    : '정상 구간'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 수급 */}
          {marketData.supplyDemand && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  🔄 수급 (주)
                  <IndicatorInfoButton indicatorKey="supplyDemand" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs sm:text-sm">
                <div>
                  기관:{' '}
                  <span
                    className={
                      marketData.supplyDemand.institutional >= 0
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }
                  >
                    {marketData.supplyDemand.institutional >= 0 ? '+' : ''}
                    {marketData.supplyDemand.institutional.toLocaleString()}
                  </span>
                </div>
                <div>
                  외국인:{' '}
                  <span
                    className={
                      marketData.supplyDemand.foreign >= 0 ? 'text-red-600' : 'text-blue-600'
                    }
                  >
                    {marketData.supplyDemand.foreign >= 0 ? '+' : ''}
                    {marketData.supplyDemand.foreign.toLocaleString()}
                  </span>
                </div>
                <div>
                  개인:{' '}
                  <span
                    className={
                      marketData.supplyDemand.individual >= 0
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }
                  >
                    {marketData.supplyDemand.individual >= 0 ? '+' : ''}
                    {marketData.supplyDemand.individual.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* VIX */}
          {marketData.vix !== undefined && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  😰 VIX 지수
                  <IndicatorInfoButton indicatorKey="fearGreed" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{marketData.vix.toFixed(2)}</div>
                <div className="text-xs sm:text-sm mt-1 text-gray-600">
                  {marketData.vix > 30 ? '공포 구간' : marketData.vix < 20 ? '탐욕 구간' : '중립'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 환율 */}
          {marketData.exchangeRate && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  💱 환율 (USD/KRW)
                  <IndicatorInfoButton indicatorKey="exchangeRate" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {marketData.exchangeRate.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 1 지표 */}
          {/* ETF 괴리율 */}
          {(marketData.etfPremium || (currentResult.selectedIndicators?.etfPremium && !marketData.etfPremium)) && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📊 ETF 괴리율
                  <IndicatorInfoButton indicatorKey="etfPremium" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {marketData.etfPremium ? (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {marketData.etfPremium.premium >= 0 ? '+' : ''}
                      {marketData.etfPremium.premium}%
                    </div>
                    <div className={`text-xs sm:text-sm mt-1 ${
                      marketData.etfPremium.isPremium ? 'text-red-600' : 
                      marketData.etfPremium.isDiscount ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {marketData.etfPremium.isPremium ? '프리미엄' : 
                       marketData.etfPremium.isDiscount ? '할인' : 
                       '정상'}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    ⚠️ 일반 종목은 ETF 괴리율 분석이 불가능합니다. ETF 괴리율은 ETF 전용 지표입니다.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 볼린저 밴드 */}
          {marketData.bollingerBands && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📊 볼린저 밴드
                  <IndicatorInfoButton indicatorKey="bollingerBands" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs sm:text-sm">
                <div>상단: {marketData.bollingerBands.upper.toLocaleString()}</div>
                <div>중심선: {marketData.bollingerBands.middle.toLocaleString()}</div>
                <div>하단: {marketData.bollingerBands.lower.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-2">
                  위치: {(marketData.bollingerBands.position * 100).toFixed(1)}% (0=하단, 100=상단)
                </div>
              </CardContent>
            </Card>
          )}

          {/* 변동성 */}
          {marketData.volatility && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📊 변동성
                  <IndicatorInfoButton indicatorKey="volatility" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {marketData.volatility.annualizedVolatility.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm mt-1 text-gray-600">
                  {marketData.volatility.volatilityRank === 'low' ? '낮음' : 
                   marketData.volatility.volatilityRank === 'medium' ? '보통' : 
                   '높음'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  일일: {marketData.volatility.volatility.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* 거래량 지표 */}
          {marketData.volumeIndicators && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  📦 거래량 지표
                  <IndicatorInfoButton indicatorKey="volumeIndicators" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs sm:text-sm">
                <div className="font-medium text-gray-700">현재 거래량</div>
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {(marketData.volumeIndicators.currentVolume ?? marketData.volume).toLocaleString()}
                </div>
                <div className="pt-1 border-t border-gray-200">
                  <div className="text-gray-600">20일 평균: {marketData.volumeIndicators.averageVolume.toLocaleString()}</div>
                  <div className="text-gray-600">평균 대비: <span className="font-semibold">{marketData.volumeIndicators.volumeRatio.toFixed(2)}배</span></div>
                </div>
                <div className={`text-xs sm:text-sm mt-1 font-medium ${
                  marketData.volumeIndicators.isHighVolume ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {marketData.volumeIndicators.isHighVolume ? '🔴 고거래량' : '⚪ 정상'}
                </div>
                <div className="text-xs text-gray-500">
                  추세: {marketData.volumeIndicators.volumeTrend === 'increasing' ? '📈 증가' : 
                         marketData.volumeIndicators.volumeTrend === 'decreasing' ? '📉 감소' : 
                         '➡️ 안정'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 2 지표 */}
          {/* 눌림목 여부 */}
          {marketData.supportLevel && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  🛡️ 눌림목 여부
                  <IndicatorInfoButton indicatorKey="supportLevel" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-lg sm:text-2xl font-bold ${
                  marketData.supportLevel.isNearSupport ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {marketData.supportLevel.isNearSupport ? '지지선 근처' : '일반 구간'}
                </div>
                <div className="text-xs sm:text-sm mt-1 text-gray-600">
                  지지선: {marketData.supportLevel.supportLevel.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  거리: {marketData.supportLevel.distanceFromSupport >= 0 ? '+' : ''}
                  {marketData.supportLevel.distanceFromSupport.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* 저항선/지지선 */}
          {marketData.supportResistance && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                  🎯 저항선/지지선
                  <IndicatorInfoButton indicatorKey="supportResistance" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm">
                <div>
                  <div className="font-medium text-gray-700">저항선 (최근 고점 기준 3개):</div>
                  <div className="text-gray-600 break-words">
                    {marketData.supportResistance.resistanceLevels.map((l, idx) => (
                      <span key={idx}>
                        {idx + 1}차: {l.toLocaleString()}{idx < marketData.supportResistance.resistanceLevels.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">지지선 (최근 저점 기준 3개):</div>
                  <div className="text-gray-600 break-words">
                    {marketData.supportResistance.supportLevels.map((l, idx) => (
                      <span key={idx}>
                        {idx + 1}차: {l.toLocaleString()}{idx < marketData.supportResistance.supportLevels.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`text-xs mt-2 ${
                  marketData.supportResistance.currentPosition === 'near_resistance' ? 'text-red-600' :
                  marketData.supportResistance.currentPosition === 'near_support' ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  현재: {marketData.supportResistance.currentPosition === 'near_resistance' ? '저항선 근처' :
                         marketData.supportResistance.currentPosition === 'near_support' ? '지지선 근처' :
                         '중간'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 거래량 */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
                거래량
                <IndicatorInfoButton indicatorKey="volume" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {marketData.volume.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 섹션 */}
        {chartData && chartData.length > 0 && (
          <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
            {/* 주가 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>주가 차트</CardTitle>
                <CardDescription>
                  {currentResult.name || currentResult.symbol}의 주가 추이 및 이동평균선
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PriceChart
                  data={chartData}
                  symbol={currentResult.symbol}
                  showMovingAverages={!!marketData.movingAverages}
                  showBollingerBands={!!marketData.bollingerBands}
                />
              </CardContent>
            </Card>

            {/* 거래량 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>거래량 차트</CardTitle>
                <CardDescription>
                  일일 거래량 및 평균 거래량
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VolumeChart
                  data={chartData}
                  averageVolume={marketData.volumeIndicators?.averageVolume}
                />
              </CardContent>
            </Card>

            {/* RSI 차트 */}
            {marketData.rsi !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>RSI (상대강도지수)</CardTitle>
                  <CardDescription>
                    과매수/과매도 구간 분석
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RSIChart
                    data={chartData}
                    currentRSI={marketData.rsi}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI 리포트 섹션 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI 분석 리포트</CardTitle>
            <CardDescription>{currentResult.name || currentResult.symbol} 종목 분석</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-700">{children}</ul>
                  ),
                  li: ({ children }) => <li className="text-gray-700">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                }}
              >
                {currentResult.name 
                  ? aiReport.replace(new RegExp(currentResult.symbol, 'g'), currentResult.name)
                  : aiReport
                }
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* 뉴스 섹션 */}
        {marketData.news && marketData.news.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>최근 뉴스</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {marketData.news.map((item, index) => (
                  <a
                    key={index}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-md border hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.date && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
