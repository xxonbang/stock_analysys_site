/**
 * 데이터 소스 어댑터
 *
 * 여러 데이터 소스를 통합 관리하고, 필요에 따라 전환할 수 있도록 함
 * - Dual Source (추천) - 교차 검증으로 신뢰성 향상
 * - Yahoo Finance (기존)
 * - Finnhub (대체)
 * - Fallback 메커니즘
 */

import type { StockData, SupplyDemandData } from './finance';
import {
  fetchStocksDataBatch as fetchYahooBatch,
  fetchExchangeRate as fetchYahooExchangeRate,
  fetchVIX as fetchYahooVIX,
  fetchNews as fetchYahooNews,
  calculateRSI,
  calculateMA,
  calculateDisparity,
} from './finance';

import {
  fetchStocksDataBatchFinnhub,
  fetchExchangeRateFinnhub,
  fetchVIXFinnhub,
  fetchNewsFinnhub,
  normalizeKoreaSymbol,
} from './finance-finnhub';

import {
  fetchStocksDataBatchVercel,
} from './finance-vercel';

import {
  collectStockDataDualSource,
  detectMarketType,
  type ValidatedStockData,
  type ComprehensiveStockData,
} from './dual-source';

export type DataSource = 'dual-source' | 'finnhub' | 'yahoo' | 'vercel' | 'auto';

const DEFAULT_DATA_SOURCE: DataSource =
  (process.env.DATA_SOURCE as DataSource) || 'auto';

// 듀얼 소스 활성화 여부
const USE_DUAL_SOURCE = process.env.USE_DUAL_SOURCE === 'true';

/**
 * 자동으로 최적의 데이터 소스 선택
 */
function selectDataSource(symbols: string[]): DataSource {
  // 명시적으로 설정된 경우
  if (DEFAULT_DATA_SOURCE !== 'auto') {
    return DEFAULT_DATA_SOURCE;
  }

  // 듀얼 소스 활성화 설정이 있으면 최우선
  if (USE_DUAL_SOURCE) {
    return 'dual-source';
  }

  // Python 스크립트 사용 설정이 있으면 (로컬 테스트용)
  if (process.env.USE_PYTHON_SCRIPT === 'true') {
    return 'vercel';
  }

  // Vercel 환경이고 Python 함수가 있으면 Vercel 사용
  if (process.env.VERCEL && process.env.USE_VERCEL_PYTHON !== 'false') {
    return 'vercel';
  }

  // Finnhub API 키가 있으면 Finnhub 사용
  if (process.env.FINNHUB_API_KEY) {
    return 'finnhub';
  }

  // 그 외에는 Yahoo Finance
  return 'yahoo';
}

/**
 * 듀얼 소스에서 historicalData 수집을 위한 Yahoo Finance 호출
 */
async function fetchHistoricalDataYahoo(
  symbol: string
): Promise<Array<{ date: string; close: number; volume: number; high?: number; low?: number; open?: number }>> {
  try {
    // Yahoo Finance에서 히스토리컬 데이터 수집
    const yahooData = await fetchYahooBatch([symbol]);
    const stockData = yahooData.get(symbol);
    return stockData?.historicalData || [];
  } catch (error) {
    console.warn(`[DualSource] Historical data fetch failed for ${symbol}:`, error);
    return [];
  }
}

/**
 * ComprehensiveStockData를 StockData로 변환
 */
function convertToStockData(
  validated: ValidatedStockData,
  historicalData: Array<{ date: string; close: number; volume: number; high?: number; low?: number; open?: number }>
): StockData {
  const { data, confidence } = validated;
  const closes = historicalData.map((d) => d.close);

  // RSI, MA, Disparity 계산
  const rsi = closes.length >= 15 ? calculateRSI(closes, 14) : 50;
  const ma5 = calculateMA(closes, 5) || data.priceData.currentPrice;
  const ma20 = calculateMA(closes, 20) || data.priceData.currentPrice;
  const ma60 = calculateMA(closes, 60) || data.priceData.currentPrice;
  const ma120 = calculateMA(closes, 120) || data.priceData.currentPrice;
  const disparity = calculateDisparity(data.priceData.currentPrice, ma20);

  console.log(
    `[DualSource] Converted ${data.basicInfo.symbol}: confidence=${(confidence * 100).toFixed(1)}%, ` +
      `status=${validated.validation.status}, matched=${validated.validation.matchedFields.length}, ` +
      `conflict=${validated.validation.conflictFields.length}`
  );

  return {
    symbol: data.basicInfo.symbol,
    price: data.priceData.currentPrice,
    change: data.priceData.change,
    changePercent: data.priceData.changePercent,
    volume: data.priceData.volume,
    marketCap: data.marketData.marketCap || undefined,
    rsi,
    movingAverages: {
      ma5,
      ma20,
      ma60,
      ma120,
    },
    disparity,
    historicalData,
    // 추가 메타데이터 (확장용)
    _dualSource: {
      confidence,
      status: validated.validation.status,
      sources: validated.sources,
      matchedFields: validated.validation.matchedFields.length,
      conflictFields: validated.validation.conflictFields.length,
    },
  } as StockData & { _dualSource: unknown };
}

/**
 * 듀얼 소스 방식으로 주식 데이터 배치 수집
 */
async function fetchStocksDataDualSource(
  symbols: string[]
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();

  console.log(`[DualSource] Starting batch collection for ${symbols.length} symbols`);

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    // Rate limit 방지 딜레이 (첫 번째 이후)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    try {
      // 1. 듀얼 소스로 현재가/밸류에이션 데이터 수집
      const validated = await collectStockDataDualSource(symbol, {
        timeout: 60000,
        logResults: false,
      });

      // 2. 히스토리컬 데이터 수집 (Yahoo Finance)
      const historicalData = await fetchHistoricalDataYahoo(symbol);

      // 3. StockData 형식으로 변환
      const stockData = convertToStockData(validated, historicalData);
      results.set(symbol, stockData);
    } catch (error) {
      console.error(`[DualSource] Failed to collect ${symbol}:`, error);
      // 개별 종목 실패 시 계속 진행
    }
  }

  console.log(`[DualSource] Completed: ${results.size}/${symbols.length} symbols`);
  return results;
}

/**
 * 통합 주식 데이터 수집 (데이터 소스 자동 선택)
 */
export async function fetchStocksData(
  symbols: string[]
): Promise<Map<string, StockData>> {
  const dataSource = selectDataSource(symbols);

  console.log(`[DataAdapter] Using data source: ${dataSource} for symbols: ${symbols.join(', ')}`);

  try {
    if (dataSource === 'dual-source') {
      // 듀얼 소스 시스템 사용 (교차 검증)
      return await fetchStocksDataDualSource(symbols);
    } else if (dataSource === 'vercel') {
      // Vercel Serverless Functions 사용
      return await fetchStocksDataBatchVercel(symbols);
    } else if (dataSource === 'finnhub') {
      // 한국 주식 심볼 정규화
      const normalizedSymbols = symbols.map(normalizeKoreaSymbol);
      return await fetchStocksDataBatchFinnhub(normalizedSymbols);
    } else {
      return await fetchYahooBatch(symbols);
    }
  } catch (error) {
    // Fallback 전략
    if (dataSource === 'dual-source') {
      console.warn('[DataAdapter] Dual source failed, falling back to Yahoo:', error);
      try {
        return await fetchYahooBatch(symbols);
      } catch (fallbackError) {
        console.error('[DataAdapter] All data sources failed:', fallbackError);
        throw fallbackError;
      }
    } else if (dataSource === 'vercel') {
      console.warn('[DataAdapter] Vercel Python failed, falling back to Finnhub/Yahoo:', error);
      try {
        if (process.env.FINNHUB_API_KEY) {
          const normalizedSymbols = symbols.map(normalizeKoreaSymbol);
          return await fetchStocksDataBatchFinnhub(normalizedSymbols);
        } else {
          return await fetchYahooBatch(symbols);
        }
      } catch (fallbackError) {
        console.error('[DataAdapter] All data sources failed:', fallbackError);
        throw fallbackError;
      }
    } else if (dataSource === 'finnhub') {
      console.warn('[DataAdapter] Finnhub failed, falling back to Yahoo Finance:', error);
      try {
        return await fetchYahooBatch(symbols);
      } catch (fallbackError) {
        console.error('[DataAdapter] Both data sources failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

/**
 * 통합 환율 조회
 */
export async function fetchExchangeRate(): Promise<number | null> {
  const dataSource = selectDataSource([]);

  try {
    if (dataSource === 'finnhub') {
      const rate = await fetchExchangeRateFinnhub();
      if (rate !== null) return rate;
      // Fallback to Yahoo
      return await fetchYahooExchangeRate();
    } else {
      return await fetchYahooExchangeRate();
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return null;
  }
}

/**
 * 통합 VIX 조회
 */
export async function fetchVIX(): Promise<number | null> {
  const dataSource = selectDataSource([]);

  try {
    if (dataSource === 'finnhub') {
      const vix = await fetchVIXFinnhub();
      if (vix !== null) return vix;
      // Fallback to Yahoo
      return await fetchYahooVIX();
    } else {
      return await fetchYahooVIX();
    }
  } catch (error) {
    console.error('Error fetching VIX:', error);
    return null;
  }
}

/**
 * 통합 뉴스 조회
 */
export async function fetchNews(
  symbol: string,
  count: number = 5
): Promise<Array<{ title: string; link: string; date: string }>> {
  const dataSource = selectDataSource([symbol]);

  try {
    if (dataSource === 'finnhub') {
      const normalizedSymbol = normalizeKoreaSymbol(symbol);
      const news = await fetchNewsFinnhub(normalizedSymbol, count);
      if (news.length > 0) return news;
      // Fallback to Yahoo
      return await fetchYahooNews(symbol, count);
    } else {
      return await fetchYahooNews(symbol, count);
    }
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
