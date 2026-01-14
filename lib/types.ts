/**
 * 분석 기간 타입
 */
export type AnalysisPeriod = '1d' | '1w' | '1m' | '3m' | '6m' | '1y';

/**
 * 분석 요청 타입
 */
export interface AnalyzeRequest {
  stocks: string[];
  period: AnalysisPeriod; // 종목별 향후 전망 분석 기간
  historicalPeriod: AnalysisPeriod; // 종목별 과거 이력 분석 기간
  indicators: {
    rsi: boolean;
    movingAverages: boolean;
    disparity: boolean;
    supplyDemand: boolean;
    fearGreed: boolean;
    exchangeRate: boolean;
  };
}

/**
 * 분석 결과 타입
 */
export interface AnalyzeResult {
  symbol: string;
  period?: string; // 향후 전망 분석 기간 (한국어)
  historicalPeriod?: string; // 과거 이력 분석 기간 (한국어)
  marketData: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
    rsi?: number;
    movingAverages?: {
      ma5: number;
      ma20: number;
      ma60: number;
      ma120: number;
    };
    disparity?: number;
    supplyDemand?: {
      institutional: number;
      foreign: number;
      individual: number;
    };
    fearGreedIndex?: number;
    vix?: number;
    exchangeRate?: number;
    news?: Array<{
      title: string;
      link: string;
      date: string;
    }>;
  };
  aiReport: string;
}

export interface AnalyzeResponse {
  results: AnalyzeResult[];
  error?: string;
}
