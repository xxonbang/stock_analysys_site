/**
 * 미국 주식 데이터 수집기 - Finnhub API (Source A)
 *
 * Finnhub API 특징:
 * - Rate limit: 60 calls/min
 * - 무료 플랜으로 기본 데이터 제공
 * - 한국/미국 주식 모두 지원
 */

import axios from 'axios';
import type {
  StockDataCollector,
  CollectionResult,
  StockBasicInfo,
  StockPriceData,
  StockValuationData,
  StockFinancialData,
  StockSupplyDemandData,
  StockMarketData,
  ComprehensiveStockData,
} from './types';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface FinnhubBasicFinancials {
  metric: {
    '52WeekHigh': number;
    '52WeekLow': number;
    '10DayAverageTradingVolume': number;
    beta: number;
    dividendYieldIndicatedAnnual: number;
    epsAnnual: number;
    epsGrowth3Y: number;
    peAnnual: number;
    pbAnnual: number;
    roe: number;
    roic: number;
    revenuePerShareAnnual: number;
    revenueGrowth3Y: number;
    operatingMargin: number;
    netProfitMargin: number;
  };
}

async function finnhubRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!FINNHUB_API_KEY) {
    throw new Error('FINNHUB_API_KEY가 설정되지 않았습니다.');
  }

  const url = `${FINNHUB_BASE_URL}${endpoint}`;
  const queryParams = new URLSearchParams({
    ...params,
    token: FINNHUB_API_KEY,
  });

  const response = await axios.get<T>(`${url}?${queryParams.toString()}`, {
    timeout: 10000,
  });

  return response.data;
}

export class USStockFinnhubCollector implements StockDataCollector {
  async collectBasicInfo(symbol: string): Promise<CollectionResult<StockBasicInfo>> {
    const startTime = Date.now();

    try {
      const profile = await finnhubRequest<FinnhubProfile>('/stock/profile2', { symbol });

      if (!profile || !profile.name) {
        throw new Error(`종목 정보를 찾을 수 없습니다: ${symbol}`);
      }

      return {
        data: {
          symbol,
          name: profile.name,
          market: profile.exchange || 'US',
          exchange: profile.exchange || 'US',
        },
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectPriceData(symbol: string): Promise<CollectionResult<StockPriceData>> {
    const startTime = Date.now();

    try {
      const [quote, financials] = await Promise.all([
        finnhubRequest<FinnhubQuote>('/quote', { symbol }),
        finnhubRequest<FinnhubBasicFinancials>('/stock/metric', { symbol, metric: 'all' }).catch(() => null),
      ]);

      if (!quote || quote.c === 0) {
        throw new Error(`가격 정보를 찾을 수 없습니다: ${symbol}`);
      }

      return {
        data: {
          currentPrice: quote.c,
          previousClose: quote.pc,
          change: quote.d,
          changePercent: quote.dp,
          open: quote.o,
          high: quote.h,
          low: quote.l,
          volume: 0, // Finnhub quote에는 볼륨이 포함되지 않음
          tradingValue: 0,
          high52Week: financials?.metric?.['52WeekHigh'] || quote.h,
          low52Week: financials?.metric?.['52WeekLow'] || quote.l,
        },
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectValuationData(symbol: string): Promise<CollectionResult<StockValuationData>> {
    const startTime = Date.now();

    try {
      const financials = await finnhubRequest<FinnhubBasicFinancials>('/stock/metric', {
        symbol,
        metric: 'all',
      });

      const metric = financials?.metric;

      return {
        data: {
          per: metric?.peAnnual || null,
          pbr: metric?.pbAnnual || null,
          eps: metric?.epsAnnual || null,
          bps: null, // Finnhub에서 직접 제공하지 않음
          roe: metric?.roe || null,
          dividendYield: metric?.dividendYieldIndicatedAnnual || null,
          estimatedPer: null,
          estimatedEps: null,
        },
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectFinancialData(symbol: string): Promise<CollectionResult<StockFinancialData>> {
    const startTime = Date.now();

    try {
      const financials = await finnhubRequest<FinnhubBasicFinancials>('/stock/metric', {
        symbol,
        metric: 'all',
      });

      const metric = financials?.metric;

      return {
        data: {
          revenue: null, // 상세 재무제표 별도 API 필요
          operatingIncome: null,
          netIncome: null,
          operatingMargin: metric?.operatingMargin || null,
          netProfitMargin: metric?.netProfitMargin || null,
          fiscalDate: null,
        },
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectSupplyDemandData(symbol: string): Promise<CollectionResult<StockSupplyDemandData>> {
    const startTime = Date.now();

    // Finnhub 무료 플랜에서는 기관/외국인 순매수 데이터 미제공
    return {
      data: {
        foreignOwnership: null,
        foreignNetBuy: null,
        institutionalNetBuy: null,
        individualNetBuy: null,
      },
      source: 'api',
      timestamp: Date.now(),
      success: true,
      latency: Date.now() - startTime,
    };
  }

  async collectMarketData(symbol: string): Promise<CollectionResult<StockMarketData>> {
    const startTime = Date.now();

    try {
      const [profile, financials] = await Promise.all([
        finnhubRequest<FinnhubProfile>('/stock/profile2', { symbol }),
        finnhubRequest<FinnhubBasicFinancials>('/stock/metric', { symbol, metric: 'all' }).catch(() => null),
      ]);

      return {
        data: {
          marketCap: profile?.marketCapitalization
            ? profile.marketCapitalization * 1_000_000 // Finnhub는 백만 단위로 반환
            : null,
          sharesOutstanding: profile?.shareOutstanding
            ? profile.shareOutstanding * 1_000_000
            : null,
          floatShares: null,
          beta: financials?.metric?.beta || null,
        },
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectAll(symbol: string): Promise<CollectionResult<ComprehensiveStockData>> {
    const startTime = Date.now();

    try {
      const [
        basicInfo,
        priceData,
        valuationData,
        financialData,
        supplyDemandData,
        marketData,
      ] = await Promise.all([
        this.collectBasicInfo(symbol),
        this.collectPriceData(symbol),
        this.collectValuationData(symbol),
        this.collectFinancialData(symbol),
        this.collectSupplyDemandData(symbol),
        this.collectMarketData(symbol),
      ]);

      if (!basicInfo.success || !basicInfo.data) {
        throw new Error('기본 정보 수집 실패');
      }
      if (!priceData.success || !priceData.data) {
        throw new Error('가격 정보 수집 실패');
      }

      const comprehensiveData: ComprehensiveStockData = {
        basicInfo: basicInfo.data,
        priceData: priceData.data,
        valuationData: valuationData.data || {
          per: null, pbr: null, eps: null, bps: null,
          roe: null, dividendYield: null, estimatedPer: null, estimatedEps: null,
        },
        financialData: financialData.data || {
          revenue: null, operatingIncome: null, netIncome: null,
          operatingMargin: null, netProfitMargin: null, fiscalDate: null,
        },
        supplyDemandData: supplyDemandData.data || {
          foreignOwnership: null, foreignNetBuy: null,
          institutionalNetBuy: null, individualNetBuy: null,
        },
        marketData: marketData.data || {
          marketCap: null, sharesOutstanding: null, floatShares: null, beta: null,
        },
        timestamp: Date.now(),
        source: 'api',
      };

      return {
        data: comprehensiveData,
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'api',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }
}

// 싱글톤 인스턴스
export const usStockFinnhubCollector = new USStockFinnhubCollector();
