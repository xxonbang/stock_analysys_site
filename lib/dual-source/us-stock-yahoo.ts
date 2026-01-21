/**
 * 미국 주식 데이터 수집기 - Yahoo Finance (Source B)
 *
 * Yahoo Finance 특징:
 * - yahoo-finance2 라이브러리 사용
 * - Rate limit: 약 100 calls/minute (비공식)
 * - 상세한 재무 데이터 제공
 * - 캐시 적용으로 Rate Limit 방지
 */

import yahooFinance from 'yahoo-finance2';
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
import { cache, CacheKey, CACHE_TTL, withCache } from '../cache';

async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Too Many Requests') && i < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`[Yahoo] Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// 듀얼소스용 캐시 키 (ComprehensiveStockData용)
const DualSourceCacheKey = {
  usStock: (symbol: string) => `dual:us:${symbol}`,
};

export class USStockYahooCollector implements StockDataCollector {
  private async getQuote(symbol: string) {
    return retryWithDelay(() => yahooFinance.quote(symbol), 3, 2000);
  }

  private async getQuoteSummary(symbol: string, modules: string[]) {
    return retryWithDelay(
      () => yahooFinance.quoteSummary(symbol, { modules: modules as never[] }),
      3,
      2000
    );
  }

  async collectBasicInfo(symbol: string): Promise<CollectionResult<StockBasicInfo>> {
    const startTime = Date.now();

    try {
      const quote = await this.getQuote(symbol);

      if (!quote || !quote.shortName) {
        throw new Error(`종목 정보를 찾을 수 없습니다: ${symbol}`);
      }

      return {
        data: {
          symbol,
          name: quote.shortName || quote.longName || symbol,
          market: quote.exchange || 'US',
          exchange: quote.exchange || 'US',
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
      const quote = await this.getQuote(symbol);

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`가격 정보를 찾을 수 없습니다: ${symbol}`);
      }

      return {
        data: {
          currentPrice: quote.regularMarketPrice,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          volume: quote.regularMarketVolume || 0,
          tradingValue: 0, // Yahoo에서 직접 제공하지 않음
          high52Week: quote.fiftyTwoWeekHigh || quote.regularMarketPrice,
          low52Week: quote.fiftyTwoWeekLow || quote.regularMarketPrice,
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
      const summary = await this.getQuoteSummary(symbol, [
        'summaryDetail',
        'defaultKeyStatistics',
      ]);

      const detail = summary?.summaryDetail;
      const stats = summary?.defaultKeyStatistics;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailAny = detail as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsAny = stats as Record<string, unknown>;

      return {
        data: {
          per: (detailAny?.trailingPE as number) || null,
          pbr: (detailAny?.priceToBook as number) || null,
          eps: (statsAny?.trailingEps as number) || null,
          bps: (statsAny?.bookValue as number) || null,
          roe: null, // 별도 계산 필요
          dividendYield: detailAny?.dividendYield
            ? (detailAny.dividendYield as number) * 100
            : null,
          estimatedPer: (detailAny?.forwardPE as number) || null,
          estimatedEps: (statsAny?.forwardEps as number) || null,
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
      const summary = await this.getQuoteSummary(symbol, ['financialData']);

      const financial = summary?.financialData;

      return {
        data: {
          revenue: financial?.totalRevenue || null,
          operatingIncome: null, // 별도 API 필요
          netIncome: null, // 별도 API 필요
          operatingMargin: financial?.operatingMargins
            ? financial.operatingMargins * 100
            : null,
          netProfitMargin: financial?.profitMargins
            ? financial.profitMargins * 100
            : null,
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

    try {
      const summary = await this.getQuoteSummary(symbol, [
        'majorHoldersBreakdown',
        'institutionOwnership',
      ]);

      const holders = summary?.majorHoldersBreakdown;

      return {
        data: {
          foreignOwnership: null, // 미국 주식에서는 일반적으로 구분하지 않음
          foreignNetBuy: null,
          institutionalNetBuy: null,
          individualNetBuy: null,
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

  async collectMarketData(symbol: string): Promise<CollectionResult<StockMarketData>> {
    const startTime = Date.now();

    try {
      const [quote, summary] = await Promise.all([
        this.getQuote(symbol),
        this.getQuoteSummary(symbol, ['defaultKeyStatistics']).catch(() => null),
      ]);

      const stats = summary?.defaultKeyStatistics;

      return {
        data: {
          marketCap: quote?.marketCap || null,
          sharesOutstanding: stats?.sharesOutstanding || quote?.sharesOutstanding || null,
          floatShares: stats?.floatShares || null,
          beta: stats?.beta || null,
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
    const cacheKey = DualSourceCacheKey.usStock(symbol);

    // 캐시 확인
    const cached = cache.get<CollectionResult<ComprehensiveStockData>>(cacheKey);
    if (cached && cached.success) {
      console.log(`[Yahoo DualSource] Cache HIT for ${symbol}`);
      return {
        ...cached,
        latency: Date.now() - startTime, // 캐시 히트 시 레이턴시 재계산
      };
    }

    try {
      // quote와 quoteSummary를 먼저 한 번에 호출
      const [quote, summary] = await Promise.all([
        this.getQuote(symbol),
        this.getQuoteSummary(symbol, [
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
        ]).catch(() => null),
      ]);

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`가격 정보를 찾을 수 없습니다: ${symbol}`);
      }

      const detail = summary?.summaryDetail;
      const stats = summary?.defaultKeyStatistics;
      const financial = summary?.financialData;

      const comprehensiveData: ComprehensiveStockData = {
        basicInfo: {
          symbol,
          name: quote.shortName || quote.longName || symbol,
          market: quote.exchange || 'US',
          exchange: quote.exchange || 'US',
        },
        priceData: {
          currentPrice: quote.regularMarketPrice,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          volume: quote.regularMarketVolume || 0,
          tradingValue: 0,
          high52Week: quote.fiftyTwoWeekHigh || quote.regularMarketPrice,
          low52Week: quote.fiftyTwoWeekLow || quote.regularMarketPrice,
        },
        valuationData: {
          per: (detail as Record<string, unknown>)?.trailingPE as number || null,
          pbr: (detail as Record<string, unknown>)?.priceToBook as number || null,
          eps: (stats as Record<string, unknown>)?.trailingEps as number || null,
          bps: (stats as Record<string, unknown>)?.bookValue as number || null,
          roe: null,
          dividendYield: (detail as Record<string, unknown>)?.dividendYield
            ? ((detail as Record<string, unknown>).dividendYield as number) * 100
            : null,
          estimatedPer: (detail as Record<string, unknown>)?.forwardPE as number || null,
          estimatedEps: (stats as Record<string, unknown>)?.forwardEps as number || null,
        },
        financialData: {
          revenue: financial?.totalRevenue || null,
          operatingIncome: null,
          netIncome: null,
          operatingMargin: financial?.operatingMargins
            ? financial.operatingMargins * 100
            : null,
          netProfitMargin: financial?.profitMargins
            ? financial.profitMargins * 100
            : null,
          fiscalDate: null,
        },
        supplyDemandData: {
          foreignOwnership: null,
          foreignNetBuy: null,
          institutionalNetBuy: null,
          individualNetBuy: null,
        },
        marketData: {
          marketCap: quote.marketCap || null,
          sharesOutstanding: stats?.sharesOutstanding || quote?.sharesOutstanding || null,
          floatShares: stats?.floatShares || null,
          beta: stats?.beta || null,
        },
        timestamp: Date.now(),
        source: 'api',
      };

      const result: CollectionResult<ComprehensiveStockData> = {
        data: comprehensiveData,
        source: 'api',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };

      // 캐시에 저장 (5분 TTL)
      cache.set(cacheKey, result, CACHE_TTL.STOCK_DATA);
      console.log(`[Yahoo DualSource] Fetched and cached ${symbol}`);

      return result;
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
export const usStockYahooCollector = new USStockYahooCollector();
