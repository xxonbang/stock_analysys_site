'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/loading-overlay';
import type { AnalyzeRequest } from '@/lib/types';

import type { AnalysisPeriod } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<string[]>(['']);
  const [period, setPeriod] = useState<AnalysisPeriod>('1m'); // 향후 전망 분석 기간
  const [historicalPeriod, setHistoricalPeriod] = useState<AnalysisPeriod>('3m'); // 과거 이력 분석 기간
  const [indicators, setIndicators] = useState({
    rsi: true,
    movingAverages: true,
    disparity: true,
    supplyDemand: true,
    fearGreed: true,
    exchangeRate: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const addStockInput = () => {
    if (stocks.length < 5) {
      setStocks([...stocks, '']);
    }
  };

  const removeStockInput = (index: number) => {
    if (stocks.length > 1) {
      setStocks(stocks.filter((_, i) => i !== index));
    }
  };

  const updateStock = (index: number, value: string) => {
    const newStocks = [...stocks];
    newStocks[index] = value;
    setStocks(newStocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validStocks = stocks.filter((s) => s.trim() !== '');
    if (validStocks.length === 0) {
      alert('최소 1개 이상의 종목을 입력해주세요.');
      return;
    }

    if (validStocks.length > 5) {
      alert('최대 5개 종목까지 분석 가능합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const request: AnalyzeRequest = {
        stocks: validStocks,
        period,
        historicalPeriod,
        indicators,
      };

      // 지표 선택 상태 로깅 (디버깅용)
      console.log('[Frontend] Sending request with indicators:', indicators);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = '분석 요청에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // JSON 파싱 실패 시 기본 메시지 사용
          errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 응답 데이터 검증
      if (!data || !data.results || data.results.length === 0) {
        throw new Error('분석 결과가 없습니다. 다시 시도해주세요.');
      }
      
      // 결과를 sessionStorage에 저장하고 리포트 페이지로 이동
      sessionStorage.setItem('analysisResults', JSON.stringify(data));
      router.push('/report');
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '분석 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validStocks = stocks.filter((s) => s.trim() !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <LoadingOverlay isLoading={isLoading} stocks={validStocks} />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">📈 Stock Insight</h1>
          <p className="text-sm sm:text-base text-gray-600">AI 기반 실시간 주식 분석 리포트</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* 종목 입력 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">종목 입력</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석할 종목을 입력하세요 (최대 5개)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <label className="text-xs sm:text-sm font-medium text-gray-700 block">
                종목명, 종목코드, 티커 등 (예: AAPL, TSLA, 005930.KS)
              </label>
                {stocks.map((stock, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="종목 입력"
                      value={stock}
                      onChange={(e) => updateStock(index, e.target.value)}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    {stocks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeStockInput(index)}
                        disabled={isLoading}
                      >
                        ➖
                      </Button>
                    )}
                  </div>
                ))}
                {stocks.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStockInput}
                    disabled={isLoading}
                    className="w-full text-sm sm:text-base"
                  >
                    ➕ 종목 추가
                  </Button>
                )}
            </CardContent>
          </Card>

          {/* 종목별 과거 이력 분석 기간 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">종목별 과거 이력 분석 기간</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석할 과거 데이터 기간을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(['1d', '1w', '1m', '3m', '6m', '1y'] as AnalysisPeriod[]).map((p) => {
                    const labels: Record<AnalysisPeriod, string> = {
                      '1d': '1일',
                      '1w': '1주일',
                      '1m': '1달',
                      '3m': '3개월',
                      '6m': '6개월',
                      '1y': '1년',
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHistoricalPeriod(p)}
                        disabled={isLoading}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                          historicalPeriod === p
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* 종목별 향후 전망 분석 기간 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">종목별 향후 전망 분석 기간</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                향후 전망할 기간을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(['1d', '1w', '1m', '3m', '6m', '1y'] as AnalysisPeriod[]).map((p) => {
                    const labels: Record<AnalysisPeriod, string> = {
                      '1d': '1일',
                      '1w': '1주일',
                      '1m': '1달',
                      '3m': '3개월',
                      '6m': '6개월',
                      '1y': '1년',
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        disabled={isLoading}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                          period === p
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* 지표 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">분석 지표 선택</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석에 사용할 지표를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.rsi}
                      onChange={(e) =>
                        setIndicators({ ...indicators, rsi: e.target.checked })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">RSI</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.movingAverages}
                      onChange={(e) =>
                        setIndicators({
                          ...indicators,
                          movingAverages: e.target.checked,
                        })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">이동평균선 (5/20/60/120)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.disparity}
                      onChange={(e) =>
                        setIndicators({
                          ...indicators,
                          disparity: e.target.checked,
                        })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">이격도</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.supplyDemand}
                      onChange={(e) =>
                        setIndicators({
                          ...indicators,
                          supplyDemand: e.target.checked,
                        })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">수급 (기관/외인)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.fearGreed}
                      onChange={(e) =>
                        setIndicators({
                          ...indicators,
                          fearGreed: e.target.checked,
                        })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">공포/탐욕 지수</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <Checkbox
                      checked={indicators.exchangeRate}
                      onChange={(e) =>
                        setIndicators({
                          ...indicators,
                          exchangeRate: e.target.checked,
                        })
                      }
                      disabled={isLoading}
                    />
                    <span className="text-xs sm:text-sm">환율</span>
                  </label>
              </div>
            </CardContent>
          </Card>

          {/* 분석 시작 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>분석 중...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-xl">🔍</span>
                    <span>분석 시작</span>
                  </span>
                )}
                {!isLoading && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                )}
          </Button>
        </form>
      </div>
    </div>
  );
}
