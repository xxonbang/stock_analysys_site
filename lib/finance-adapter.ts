/**
 * 데이터 소스 어댑터
 * 
 * 여러 데이터 소스를 통합 관리하고, 필요에 따라 전환할 수 있도록 함
 * - Yahoo Finance (기존)
 * - Finnhub (추천)
 * - Fallback 메커니즘
 */

import type { StockData, SupplyDemandData } from './finance';
import {
  fetchStocksDataBatch as fetchYahooBatch,
  fetchExchangeRate as fetchYahooExchangeRate,
  fetchVIX as fetchYahooVIX,
  fetchNews as fetchYahooNews,
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

export type DataSource = 'finnhub' | 'yahoo' | 'vercel' | 'auto';

const DEFAULT_DATA_SOURCE: DataSource =
  (process.env.DATA_SOURCE as DataSource) || 'auto';

/**
 * 자동으로 최적의 데이터 소스 선택
 */
function selectDataSource(symbols: string[]): DataSource {
  // 명시적으로 설정된 경우
  if (DEFAULT_DATA_SOURCE !== 'auto') {
    return DEFAULT_DATA_SOURCE;
  }

  // Python 스크립트 사용 설정이 있으면 최우선 (로컬 테스트용)
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
 * 통합 주식 데이터 수집 (데이터 소스 자동 선택)
 */
export async function fetchStocksData(
  symbols: string[]
): Promise<Map<string, StockData>> {
  const dataSource = selectDataSource(symbols);

  console.log(`Using data source: ${dataSource} for symbols: ${symbols.join(', ')}`);

  try {
    if (dataSource === 'vercel') {
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
    if (dataSource === 'vercel') {
      console.warn('Vercel Python failed, falling back to Finnhub/Yahoo:', error);
      try {
        if (process.env.FINNHUB_API_KEY) {
          const normalizedSymbols = symbols.map(normalizeKoreaSymbol);
          return await fetchStocksDataBatchFinnhub(normalizedSymbols);
        } else {
          return await fetchYahooBatch(symbols);
        }
      } catch (fallbackError) {
        console.error('All data sources failed:', fallbackError);
        throw fallbackError;
      }
    } else if (dataSource === 'finnhub') {
      console.warn('Finnhub failed, falling back to Yahoo Finance:', error);
      try {
        return await fetchYahooBatch(symbols);
      } catch (fallbackError) {
        console.error('Both data sources failed:', fallbackError);
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
