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
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setSelectedIndex(0); // 결과가 로드되면 첫 번째 종목으로 리셋
        
        // 분석 기간 텍스트 설정 (하이드레이션 오류 방지)
        if (data.results[0].period) {
          setPeriodText(`${data.results[0].period} 동안의 데이터를`);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to parse results:', error);
      router.push('/');
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
    return transformToChartData(currentResult);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">분석 결과가 없습니다.</p>
              <Button onClick={() => router.push('/')} className="mt-4 w-full">
                다시 분석하기
              </Button>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 분석 결과</h1>
            {(currentResult.period || currentResult.historicalPeriod) && (
              <div className="text-sm text-gray-600 mt-1 space-y-1">
                {currentResult.historicalPeriod && (
                  <p>과거 이력 분석 기간: {currentResult.historicalPeriod}</p>
                )}
                {currentResult.period && (
                  <p>향후 전망 분석 기간: {currentResult.period}</p>
                )}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            새 분석
          </Button>
        </div>

        {/* 종목 탭 - 항상 표시 (1개일 때도 표시하여 일관성 유지) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {results.map((result, index) => (
            <button
              key={`${result.symbol}-${index}`}
              onClick={() => setSelectedIndex(index)}
              className={`px-4 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {result.symbol}
              {(result.period || result.historicalPeriod) && (
                <span className="ml-2 text-xs opacity-75">
                  {result.historicalPeriod && `과거: ${result.historicalPeriod}`}
                  {result.historicalPeriod && result.period && ' / '}
                  {result.period && `전망: ${result.period}`}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 대시보드 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* 현재가 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">현재가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketData.price.toLocaleString()}
              </div>
              <div
                className={`text-sm mt-1 ${
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">RSI(14)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketData.rsi}</div>
                <div className={`text-sm mt-1 ${rsiStatus.color}`}>{rsiStatus.text}</div>
              </CardContent>
            </Card>
          )}

          {/* 이동평균선 */}
          {marketData.movingAverages && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">이동평균선</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">이격도 (20일 기준)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketData.disparity}%</div>
                <div className="text-sm mt-1 text-gray-600">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">수급 (주)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">VIX 지수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketData.vix.toFixed(2)}</div>
                <div className="text-sm mt-1 text-gray-600">
                  {marketData.vix > 30 ? '공포 구간' : marketData.vix < 20 ? '탐욕 구간' : '중립'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 환율 */}
          {marketData.exchangeRate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">환율 (USD/KRW)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketData.exchangeRate.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 1 지표 */}
          {/* ETF 괴리율 */}
          {marketData.etfPremium && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">ETF 괴리율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketData.etfPremium.premium >= 0 ? '+' : ''}
                  {marketData.etfPremium.premium}%
                </div>
                <div className={`text-sm mt-1 ${
                  marketData.etfPremium.isPremium ? 'text-red-600' : 
                  marketData.etfPremium.isDiscount ? 'text-blue-600' : 
                  'text-gray-600'
                }`}>
                  {marketData.etfPremium.isPremium ? '프리미엄' : 
                   marketData.etfPremium.isDiscount ? '할인' : 
                   '정상'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 볼린저 밴드 */}
          {marketData.bollingerBands && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">볼린저 밴드</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">변동성</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketData.volatility.annualizedVolatility.toFixed(1)}%
                </div>
                <div className="text-sm mt-1 text-gray-600">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">거래량 지표</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>평균: {marketData.volumeIndicators.averageVolume.toLocaleString()}</div>
                <div>비율: {marketData.volumeIndicators.volumeRatio.toFixed(2)}배</div>
                <div className={`text-xs mt-1 ${
                  marketData.volumeIndicators.isHighVolume ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {marketData.volumeIndicators.isHighVolume ? '고거래량' : '정상'}
                </div>
                <div className="text-xs text-gray-500">
                  추세: {marketData.volumeIndicators.volumeTrend === 'increasing' ? '증가' : 
                         marketData.volumeIndicators.volumeTrend === 'decreasing' ? '감소' : 
                         '안정'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 2 지표 */}
          {/* 눌림목 여부 */}
          {marketData.supportLevel && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">눌림목 여부</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  marketData.supportLevel.isNearSupport ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {marketData.supportLevel.isNearSupport ? '지지선 근처' : '일반 구간'}
                </div>
                <div className="text-sm mt-1 text-gray-600">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">저항선/지지선</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="font-medium text-gray-700">저항선:</div>
                  <div className="text-gray-600">
                    {marketData.supportResistance.resistanceLevels.map(l => l.toLocaleString()).join(', ')}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">지지선:</div>
                  <div className="text-gray-600">
                    {marketData.supportResistance.supportLevels.map(l => l.toLocaleString()).join(', ')}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">거래량</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketData.volume.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 섹션 */}
        {chartData && chartData.length > 0 && (
          <div className="space-y-6 mb-6">
            {/* 주가 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>주가 차트</CardTitle>
                <CardDescription>
                  {currentResult.symbol}의 주가 추이 및 이동평균선
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
            <CardDescription>{currentResult.symbol} 종목 분석</CardDescription>
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
                {aiReport}
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
