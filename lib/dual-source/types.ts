/**
 * 듀얼 소스 데이터 수집 시스템 - 타입 정의
 */

// 공통 주식 데이터 인터페이스
export interface StockBasicInfo {
  symbol: string;         // 종목코드 (005930, AAPL)
  name: string;           // 종목명
  market: string;         // 시장 (KOSPI, KOSDAQ, NYSE, NASDAQ)
  exchange: string;       // 거래소 (KRX, NYSE, NASDAQ)
}

export interface StockPriceData {
  currentPrice: number;   // 현재가
  previousClose: number;  // 전일종가
  change: number;         // 등락
  changePercent: number;  // 등락률 (%)
  open: number;           // 시가
  high: number;           // 고가
  low: number;            // 저가
  volume: number;         // 거래량
  tradingValue: number;   // 거래대금
  high52Week: number;     // 52주 최고
  low52Week: number;      // 52주 최저
}

export interface StockValuationData {
  per: number | null;            // 주가수익비율
  pbr: number | null;            // 주가순자산비율
  eps: number | null;            // 주당순이익
  bps: number | null;            // 주당순자산
  roe: number | null;            // 자기자본이익률 (%)
  dividendYield: number | null;  // 배당수익률 (%)
  estimatedPer: number | null;   // 추정 PER
  estimatedEps: number | null;   // 추정 EPS
}

export interface StockFinancialData {
  revenue: number | null;           // 매출액
  operatingIncome: number | null;   // 영업이익
  netIncome: number | null;         // 당기순이익
  operatingMargin: number | null;   // 영업이익률 (%)
  netProfitMargin: number | null;   // 순이익률 (%)
  fiscalDate: string | null;        // 재무제표 기준일
}

export interface StockSupplyDemandData {
  foreignOwnership: number | null;  // 외국인 보유율 (%)
  foreignNetBuy: number | null;     // 외국인 순매수량
  institutionalNetBuy: number | null; // 기관 순매수량
  individualNetBuy: number | null;  // 개인 순매수량
}

export interface StockMarketData {
  marketCap: number | null;         // 시가총액
  sharesOutstanding: number | null; // 상장주식수
  floatShares: number | null;       // 유동주식수
  beta: number | null;              // 베타
}

// 통합 주식 데이터
export interface ComprehensiveStockData {
  basicInfo: StockBasicInfo;
  priceData: StockPriceData;
  valuationData: StockValuationData;
  financialData: StockFinancialData;
  supplyDemandData: StockSupplyDemandData;
  marketData: StockMarketData;
  timestamp: number;
  source: 'crawling' | 'agentic' | 'api';
}

// 수집 결과 인터페이스
export interface CollectionResult<T> {
  data: T | null;
  source: 'crawling' | 'agentic' | 'api';
  timestamp: number;
  success: boolean;
  error?: string;
  latency: number; // 수집 소요시간 (ms)
}

// 검증 상태
export type ValidationStatus = 'MATCH' | 'PARTIAL' | 'CONFLICT' | 'SINGLE' | 'EMPTY';

// 검증 결과
export interface ValidationResult {
  status: ValidationStatus;
  matchedFields: string[];
  conflictFields: string[];
  supplementedFields: string[];
  confidence: number; // 0-1
}

// 듀얼 소스 수집 결과
export interface DualSourceResult<T> {
  sourceA: CollectionResult<T>;  // 크롤링
  sourceB: CollectionResult<T>;  // Agentic
}

// 최종 검증된 데이터
export interface ValidatedStockData {
  data: ComprehensiveStockData;
  confidence: number;
  sources: ('crawling' | 'agentic' | 'api')[];
  validation: ValidationResult;
  collectedAt: number;
}

// 필드별 검증 설정
export interface FieldValidationConfig {
  tolerance: number;      // 허용 오차 (0-1, 예: 0.05 = 5%)
  priority: 'A' | 'B' | 'average' | 'latest';  // 충돌 시 우선순위
  required: boolean;      // 필수 필드 여부
}

// 검증 설정
export interface ValidationConfig {
  priceData: Record<keyof StockPriceData, FieldValidationConfig>;
  valuationData: Record<keyof StockValuationData, FieldValidationConfig>;
  financialData: Record<keyof StockFinancialData, FieldValidationConfig>;
  supplyDemandData: Record<keyof StockSupplyDemandData, FieldValidationConfig>;
  marketData: Record<keyof StockMarketData, FieldValidationConfig>;
}

// 수집기 인터페이스
export interface StockDataCollector {
  collectBasicInfo(symbol: string): Promise<CollectionResult<StockBasicInfo>>;
  collectPriceData(symbol: string): Promise<CollectionResult<StockPriceData>>;
  collectValuationData(symbol: string): Promise<CollectionResult<StockValuationData>>;
  collectFinancialData(symbol: string): Promise<CollectionResult<StockFinancialData>>;
  collectSupplyDemandData(symbol: string): Promise<CollectionResult<StockSupplyDemandData>>;
  collectMarketData(symbol: string): Promise<CollectionResult<StockMarketData>>;
  collectAll(symbol: string): Promise<CollectionResult<ComprehensiveStockData>>;
}
