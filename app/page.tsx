"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";
import { IndicatorInfoButton } from "@/components/indicator-info-button";
import { StockAutocomplete } from "@/components/stock-autocomplete";
import { useAuth } from "@/lib/auth-context";
import type { AnalyzeRequest } from "@/lib/types";
import type { StockSuggestion } from "@/lib/stock-search";

import type { AnalysisPeriod } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [stocks, setStocks] = useState<string[]>([""]);
  // 종목명 -> 심볼 매핑 (분석 시 심볼로 변환하기 위해 사용)
  const [stockSymbolMap, setStockSymbolMap] = useState<Map<string, string>>(
    new Map()
  );
  const [period, setPeriod] = useState<AnalysisPeriod>("1m"); // 향후 전망 분석 기간
  const [historicalPeriod, setHistoricalPeriod] =
    useState<AnalysisPeriod>("3m"); // 과거 이력 분석 기간
  // 분석 기준일: 오늘 날짜 (YYYY-MM-DD 형식)
  const [analysisDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [indicators, setIndicators] = useState({
    rsi: true,
    movingAverages: true,
    disparity: true,
    supplyDemand: true,
    fearGreed: true,
    exchangeRate: true,
    // Phase 1 지표
    etfPremium: false,
    bollingerBands: false,
    volatility: false,
    volumeIndicators: false,
    // Phase 2 지표
    supportLevel: false,
    supportResistance: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const addStockInput = () => {
    if (stocks.length < 5) {
      setStocks([...stocks, ""]);
    }
  };

  const removeStockInput = (index: number) => {
    if (stocks.length > 1) {
      const removedStock = stocks[index];
      const newStocks = stocks.filter((_, i) => i !== index);
      setStocks(newStocks);

      // 삭제된 종목의 심볼 매핑도 제거
      if (removedStock && stockSymbolMap.has(removedStock)) {
        const newMap = new Map(stockSymbolMap);
        newMap.delete(removedStock);
        setStockSymbolMap(newMap);
      }
    }
  };

  const updateStock = (index: number, value: string) => {
    const newStocks = [...stocks];
    const oldValue = newStocks[index];
    newStocks[index] = value;
    setStocks(newStocks);

    // 사용자가 직접 입력한 경우 심볼 매핑 제거 (자동완성 선택이 아닌 경우)
    if (oldValue && stockSymbolMap.has(oldValue)) {
      const newMap = new Map(stockSymbolMap);
      newMap.delete(oldValue);
      setStockSymbolMap(newMap);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 로그인 체크
    if (!isAuthenticated) {
      const confirmed = window.confirm("로그인 해주세요.");
      if (confirmed) {
        // 로그인 버튼으로 스크롤 및 하이라이트 효과
        window.dispatchEvent(new Event("highlightLogin"));
      }
      return;
    }

    const validStocks = stocks.filter((s) => s.trim() !== "");
    if (validStocks.length === 0) {
      alert("최소 1개 이상의 종목을 입력해주세요.");
      return;
    }

    if (validStocks.length > 5) {
      alert("최대 5개 종목까지 분석 가능합니다.");
      return;
    }

    setIsLoading(true);

    try {
      // 종목명을 심볼로 변환
      const convertToSymbols = async (
        stockNames: string[]
      ): Promise<{ symbols: string[]; nameMap: Map<string, string> }> => {
        const symbols: string[] = [];
        const nameMap = new Map<string, string>(); // 심볼 -> 종목명 매핑 (API 응답에 종목명 추가용)

        for (const name of stockNames) {
          // 이미 매핑된 심볼이 있으면 사용
          if (stockSymbolMap.has(name)) {
            const symbol = stockSymbolMap.get(name)!;
            symbols.push(symbol);
            nameMap.set(symbol, name);
            continue;
          }

          // 매핑이 없으면 종목명으로 검색하여 심볼 찾기
          try {
            const { searchStocks } = await import("@/lib/stock-search");
            const results = await searchStocks(name);

            if (results.length > 0) {
              // 첫 번째 결과의 심볼 사용
              const symbol = results[0].symbol;
              const matchedName = results[0].name; // 검색 결과의 정확한 종목명 사용
              symbols.push(symbol);
              nameMap.set(symbol, matchedName);

              // 매핑 저장
              const newMap = new Map(stockSymbolMap);
              newMap.set(name, symbol);
              setStockSymbolMap(newMap);
            } else {
              // 검색 결과가 없으면 입력값 그대로 사용 (사용자가 직접 심볼을 입력한 경우)
              symbols.push(name);
              nameMap.set(name, name); // 심볼과 동일하게 설정
            }
          } catch (error) {
            console.warn(`Failed to convert "${name}" to symbol:`, error);
            // 변환 실패 시 입력값 그대로 사용
            symbols.push(name);
            nameMap.set(name, name);
          }
        }

        return { symbols, nameMap };
      };

      const { symbols: stockSymbols, nameMap: symbolToNameMap } =
        await convertToSymbols(validStocks);

      // 검색 결과가 없는 종목이 있는지 확인
      const hasInvalidStocks = stockSymbols.some((symbol, index) => {
        const originalName = validStocks[index];
        // 검색 결과가 없고, 원본 입력값과 심볼이 동일한 경우 (직접 심볼 입력이 아닌 경우)
        return (
          !stockSymbolMap.has(originalName) &&
          symbol === originalName &&
          originalName.trim().length > 0
        );
      });

      if (hasInvalidStocks) {
        const invalidNames = validStocks.filter((name, index) => {
          const symbol = stockSymbols[index];
          return (
            !stockSymbolMap.has(name) &&
            symbol === name &&
            name.trim().length > 0
          );
        });
        sessionStorage.setItem(
          "analysisResults",
          JSON.stringify({
            error: `다음 종목을 찾을 수 없습니다: ${invalidNames.join(
              ", "
            )}. 정확한 종목명 또는 종목코드를 입력해주세요.`,
            results: [],
          })
        );
        router.push("/report");
        setIsLoading(false);
        return;
      }

      const request: AnalyzeRequest = {
        stocks: stockSymbols,
        period,
        historicalPeriod,
        analysisDate,
        indicators,
      };

      // 지표 선택 상태 로깅 (디버깅용)
      console.log("[Frontend] Sending request with indicators:", indicators);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = "분석 요청에 실패했습니다.";
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
      if (data.error) {
        // 오류가 있으면 sessionStorage에 저장하고 리포트 페이지로 이동 (오류 표시용)
        sessionStorage.setItem(
          "analysisResults",
          JSON.stringify({ error: data.error, results: [] })
        );
        router.push("/report");
        setIsLoading(false);
        return;
      }

      if (!data || !data.results || data.results.length === 0) {
        // 결과가 없으면 오류로 처리
        sessionStorage.setItem(
          "analysisResults",
          JSON.stringify({
            error: "분석 결과가 없습니다. 입력하신 종목을 확인해주세요.",
            results: [],
          })
        );
        router.push("/report");
        setIsLoading(false);
        return;
      }

      // 실제 소요 시간 메타데이터를 로컬 스토리지에 저장 (다음 분석 시 진행률 계산에 활용)
      if (data._metadata) {
        try {
          const timingKey = `analysisTiming_${validStocks.length}`;
          localStorage.setItem(timingKey, JSON.stringify(data._metadata));
          console.log("[Frontend] Saved analysis timing:", data._metadata);
        } catch (error) {
          console.warn("Failed to save analysis timing:", error);
        }
      }

      // 종목명 매핑을 결과에 추가 (symbolToNameMap 사용)
      const resultsWithNames = data.results.map((result: any) => {
        // symbolToNameMap에서 종목명 찾기 (가장 정확)
        if (symbolToNameMap.has(result.symbol)) {
          return { ...result, name: symbolToNameMap.get(result.symbol) };
        }
        // 없으면 stockSymbolMap에서 찾기
        for (const [name, symbol] of stockSymbolMap.entries()) {
          if (symbol === result.symbol) {
            return { ...result, name };
          }
        }
        return result;
      });

      const dataWithNames = { ...data, results: resultsWithNames };

      // 결과를 sessionStorage에 저장하고 리포트 페이지로 이동
      sessionStorage.setItem("analysisResults", JSON.stringify(dataWithNames));
      router.push("/report");
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validStocks = stocks.filter((s) => s.trim() !== "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <LoadingOverlay isLoading={isLoading} stocks={validStocks} />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            📈 종목어때.ai
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            AI 기반 실시간 주식 분석 리포트
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
          {/* 종목 입력 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">종목 입력</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석할 종목을 입력하세요 (최대 5개)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 flex-1">
                  종목명, 종목코드, 티커 등 (예: 삼성전자, AAPL, TSLA,
                  005930.KS)
                </label>
                {stocks.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStockInput}
                    disabled={isLoading}
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0"
                  >
                    ➕ 추가
                  </Button>
                )}
              </div>
              {stocks.map((stock, index) => (
                <div key={index} className="flex gap-2">
                  <StockAutocomplete
                    value={stock}
                    onChange={(value) => updateStock(index, value)}
                    onSelect={(suggestion) => {
                      // 종목명으로 저장하고, 심볼 매핑도 함께 저장
                      updateStock(index, suggestion.name);
                      const newMap = new Map(stockSymbolMap);
                      newMap.set(suggestion.name, suggestion.symbol);
                      setStockSymbolMap(newMap);
                    }}
                    disabled={isLoading}
                    placeholder="종목 입력"
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
              {/* 안내 문구 */}
              <div className="mt-0 px-0.5 py-0 bg-gray-50/50 rounded-md">
                <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed">
                  <span className="text-gray-500">💡</span> 검색이 끝나지
                  않았더라도 종목명, 종목코드, 티커 등을 정확히 입력한 상태라면
                  바로 분석 가능합니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 분석 기준일 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">분석 기준일</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석을 수행하는 기준 날짜입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="date"
                  value={analysisDate}
                  disabled
                  className="w-full sm:max-w-xs bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                  (변경 불가)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 종목별 과거 이력 분석 기간 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                종목별 과거 이력 분석 기간
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                분석할 과거 데이터 기간을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(["1d", "1w", "1m", "3m", "6m", "1y"] as AnalysisPeriod[]).map(
                  (p) => {
                    const labels: Record<AnalysisPeriod, string> = {
                      "1d": "1일",
                      "1w": "1주일",
                      "1m": "1달",
                      "3m": "3개월",
                      "6m": "6개월",
                      "1y": "1년",
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHistoricalPeriod(p)}
                        disabled={isLoading}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                          historicalPeriod === p
                            ? "bg-primary text-primary-foreground"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          {/* 종목별 향후 전망 분석 기간 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                종목별 향후 전망 분석 기간
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                향후 전망할 기간을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(["1d", "1w", "1m", "3m", "6m", "1y"] as AnalysisPeriod[]).map(
                  (p) => {
                    const labels: Record<AnalysisPeriod, string> = {
                      "1d": "1일",
                      "1w": "1주일",
                      "1m": "1달",
                      "3m": "3개월",
                      "6m": "6개월",
                      "1y": "1년",
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        disabled={isLoading}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                          period === p
                            ? "bg-primary text-primary-foreground"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          {/* 지표 선택 섹션 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                분석 지표 선택
              </CardTitle>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    RSI
                    <IndicatorInfoButton indicatorKey="rsi" />
                  </span>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    이동평균선 (5/20/60/120)
                    <IndicatorInfoButton indicatorKey="movingAverages" />
                  </span>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    이격도
                    <IndicatorInfoButton indicatorKey="disparity" />
                  </span>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    수급 (기관/외인)
                    <IndicatorInfoButton indicatorKey="supplyDemand" />
                  </span>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    공포/탐욕 지수
                    <IndicatorInfoButton indicatorKey="fearGreed" />
                  </span>
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
                  <span className="text-xs sm:text-sm flex items-center">
                    환율
                    <IndicatorInfoButton indicatorKey="exchangeRate" />
                  </span>
                </label>
                {/* Phase 1 지표 */}
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.etfPremium || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        etfPremium: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    ETF 괴리율
                    <IndicatorInfoButton indicatorKey="etfPremium" />
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.bollingerBands || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        bollingerBands: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    볼린저 밴드
                    <IndicatorInfoButton indicatorKey="bollingerBands" />
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.volatility || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        volatility: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    변동성 지표
                    <IndicatorInfoButton indicatorKey="volatility" />
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.volumeIndicators || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        volumeIndicators: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    거래량 지표
                    <IndicatorInfoButton indicatorKey="volumeIndicators" />
                  </span>
                </label>
                {/* Phase 2 지표 */}
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.supportLevel || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        supportLevel: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    눌림목 여부
                    <IndicatorInfoButton indicatorKey="supportLevel" />
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <Checkbox
                    checked={indicators.supportResistance || false}
                    onChange={(e) =>
                      setIndicators({
                        ...indicators,
                        supportResistance: e.target.checked,
                      })
                    }
                    disabled={isLoading}
                  />
                  <span className="text-xs sm:text-sm flex items-center">
                    저항선/지지선
                    <IndicatorInfoButton indicatorKey="supportResistance" />
                  </span>
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
