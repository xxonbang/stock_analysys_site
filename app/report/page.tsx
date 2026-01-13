'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyzeResponse, AnalyzeResult } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

export default function ReportPage() {
  const router = useRouter();
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('analysisResults');
    if (!stored) {
      router.push('/');
      return;
    }

    try {
      const data: AnalyzeResponse = JSON.parse(stored);
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setSelectedIndex(0); // 결과가 로드되면 첫 번째 종목으로 리셋
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

  if (isLoading) {
    const stored = sessionStorage.getItem('analysisResults');
    let periodText = '데이터를';
    if (stored) {
      try {
        const data: AnalyzeResponse = JSON.parse(stored);
        if (data.results && data.results.length > 0 && data.results[0].period) {
          periodText = `${data.results[0].period} 동안의 데이터를`;
        }
      } catch (e) {
        // ignore
      }
    }
    
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
  
  // 안전한 인덱스 계산 (항상 유효한 범위 내)
  const safeIndex = results.length > 0 
    ? Math.max(0, Math.min(selectedIndex, results.length - 1)) 
    : 0;
  
  const currentResult = results.length > 0 ? results[safeIndex] : null;
  
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
            {currentResult.period && (
              <p className="text-sm text-gray-600 mt-1">
                분석 기간: {currentResult.period}
              </p>
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
              {result.period && (
                <span className="ml-2 text-xs opacity-75">
                  ({result.period})
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
