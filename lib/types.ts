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
  analysisDate: string; // 분석 기준일 (YYYY-MM-DD 형식)
  indicators: {
    rsi: boolean;
    movingAverages: boolean;
    disparity: boolean;
    supplyDemand: boolean;
    fearGreed: boolean;
    exchangeRate: boolean;
    // Phase 1 지표
    etfPremium?: boolean; // ETF 괴리율
    bollingerBands?: boolean; // 볼린저 밴드
    volatility?: boolean; // 변동성
    volumeIndicators?: boolean; // 거래량 지표
    // Phase 2 지표
    supportLevel?: boolean; // 눌림목 여부
    supportResistance?: boolean; // 저항선/지지선
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
    // Phase 1 지표
    etfPremium?: {
      premium: number;
      isPremium: boolean;
      isDiscount: boolean;
    };
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      position: number;
    };
    volatility?: {
      volatility: number;
      annualizedVolatility: number;
      volatilityRank: 'low' | 'medium' | 'high';
    };
    volumeIndicators?: {
      averageVolume: number;
      volumeRatio: number;
      isHighVolume: boolean;
      volumeTrend: 'increasing' | 'decreasing' | 'stable';
    };
    // Phase 2 지표
    supportLevel?: {
      isNearSupport: boolean;
      supportLevel: number;
      distanceFromSupport: number;
    };
    supportResistance?: {
      resistanceLevels: number[];
      supportLevels: number[];
      currentPosition: 'near_resistance' | 'near_support' | 'middle';
    };
  };
  historicalData?: Array<{
    date: string;
    close: number;
    volume: number;
    high?: number;
    low?: number;
    open?: number;
  }>;
  aiReport: string;
}

export interface AnalyzeResponse {
  results: AnalyzeResult[];
  error?: string;
}
