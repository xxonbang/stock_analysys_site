/**
 * 한국 주식 데이터 수집기 - 다음 금융 (Source B)
 *
 * 다음 금융 API 특징:
 * - REST API 제공 (JSON 응답)
 * - 네이버 금융과 독립적인 데이터 소스
 * - 풍부한 기업 정보 제공
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

const DAUM_FINANCE_API_URL = 'https://finance.daum.net/api';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface DaumQuoteResponse {
  symbolCode: string;
  code: string;
  name: string;
  market: string;
  tradePrice: number;
  prevClosingPrice: number;
  change: string;
  changePrice: number;
  changeRate: number;
  openingPrice: number;
  highPrice: number;
  lowPrice: number;
  accTradeVolume: number;
  accTradePrice: number;
  high52wPrice: number;
  low52wPrice: number;
  marketCap: number;
  foreignRatio: number;
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  dps: number;
  debtRatio: number;
  sales: number;
  operatingProfit: number;
  netIncome: number;
  listedShareCount: number;
  companySummary: string;
}

interface DaumInvestorResponse {
  data: Array<{
    date: string;
    foreignNetBuyVolume: number;
    institutionNetBuyVolume: number;
    individualNetBuyVolume: number;
  }>;
}

export class KoreaStockDaumCollector implements StockDataCollector {
  private async fetchQuote(symbol: string): Promise<DaumQuoteResponse> {
    // 다음 금융은 A + 6자리 코드 형식 사용
    const daumSymbol = symbol.startsWith('A') ? symbol : `A${symbol}`;

    const response = await axios.get(`${DAUM_FINANCE_API_URL}/quotes/${daumSymbol}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': `https://finance.daum.net/quotes/${daumSymbol}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    return response.data;
  }

  private async fetchInvestorData(symbol: string): Promise<DaumInvestorResponse | null> {
    try {
      const daumSymbol = symbol.startsWith('A') ? symbol : `A${symbol}`;

      const response = await axios.get(`${DAUM_FINANCE_API_URL}/investor/${daumSymbol}/days`, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': `https://finance.daum.net/quotes/${daumSymbol}`,
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      return response.data;
    } catch {
      return null;
    }
  }

  async collectBasicInfo(symbol: string): Promise<CollectionResult<StockBasicInfo>> {
    const startTime = Date.now();

    try {
      const quote = await this.fetchQuote(symbol);

      return {
        data: {
          symbol: symbol.replace(/^A/, ''),
          name: quote.name,
          market: quote.market,
          exchange: 'KRX',
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
      const quote = await this.fetchQuote(symbol);

      // change가 'FALL'이면 음수로 변환
      let change = quote.changePrice;
      let changePercent = quote.changeRate * 100;
      if (quote.change === 'FALL') {
        change = -Math.abs(change);
        changePercent = -Math.abs(changePercent);
      }

      return {
        data: {
          currentPrice: quote.tradePrice,
          previousClose: quote.prevClosingPrice,
          change,
          changePercent,
          open: quote.openingPrice,
          high: quote.highPrice,
          low: quote.lowPrice,
          volume: quote.accTradeVolume,
          tradingValue: quote.accTradePrice,
          high52Week: quote.high52wPrice,
          low52Week: quote.low52wPrice,
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
      const quote = await this.fetchQuote(symbol);

      return {
        data: {
          per: quote.per || null,
          pbr: quote.pbr || null,
          eps: quote.eps || null,
          bps: quote.bps || null,
          roe: null, // 다음 금융에서 직접 제공하지 않음
          dividendYield: quote.dps && quote.tradePrice
            ? (quote.dps / quote.tradePrice) * 100
            : null,
          estimatedPer: null, // 추정치는 제공하지 않음
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
      const quote = await this.fetchQuote(symbol);

      // 영업이익률 계산
      const operatingMargin = quote.sales && quote.operatingProfit
        ? (quote.operatingProfit / quote.sales) * 100
        : null;

      // 순이익률 계산
      const netProfitMargin = quote.sales && quote.netIncome
        ? (quote.netIncome / quote.sales) * 100
        : null;

      return {
        data: {
          revenue: quote.sales || null,
          operatingIncome: quote.operatingProfit || null,
          netIncome: quote.netIncome || null,
          operatingMargin: operatingMargin ? Math.round(operatingMargin * 100) / 100 : null,
          netProfitMargin: netProfitMargin ? Math.round(netProfitMargin * 100) / 100 : null,
          fiscalDate: null, // 다음 금융에서 제공하지 않음
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
      const [quote, investorData] = await Promise.all([
        this.fetchQuote(symbol),
        this.fetchInvestorData(symbol),
      ]);

      // 외국인 보유율 (0.5185590403 → 51.86%)
      const foreignOwnership = quote.foreignRatio
        ? quote.foreignRatio * 100
        : null;

      // 최신 투자자별 순매수 데이터
      let foreignNetBuy: number | null = null;
      let institutionalNetBuy: number | null = null;
      let individualNetBuy: number | null = null;

      if (investorData?.data && investorData.data.length > 0) {
        const latest = investorData.data[0];
        foreignNetBuy = latest.foreignNetBuyVolume || null;
        institutionalNetBuy = latest.institutionNetBuyVolume || null;
        individualNetBuy = latest.individualNetBuyVolume || null;
      }

      return {
        data: {
          foreignOwnership,
          foreignNetBuy,
          institutionalNetBuy,
          individualNetBuy,
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
      const quote = await this.fetchQuote(symbol);

      return {
        data: {
          marketCap: quote.marketCap || null,
          sharesOutstanding: quote.listedShareCount || null,
          floatShares: null, // 다음 금융에서 제공하지 않음
          beta: null, // 다음 금융에서 제공하지 않음
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
      // 기본 데이터와 투자자 데이터 병렬 수집
      const [quote, investorData] = await Promise.all([
        this.fetchQuote(symbol),
        this.fetchInvestorData(symbol),
      ]);

      // change가 'FALL'이면 음수로 변환
      let change = quote.changePrice;
      let changePercent = quote.changeRate * 100;
      if (quote.change === 'FALL') {
        change = -Math.abs(change);
        changePercent = -Math.abs(changePercent);
      }

      // 영업이익률/순이익률 계산
      const operatingMargin = quote.sales && quote.operatingProfit
        ? (quote.operatingProfit / quote.sales) * 100
        : null;
      const netProfitMargin = quote.sales && quote.netIncome
        ? (quote.netIncome / quote.sales) * 100
        : null;

      // 외국인 보유율
      const foreignOwnership = quote.foreignRatio
        ? quote.foreignRatio * 100
        : null;

      // 투자자별 순매수
      let foreignNetBuy: number | null = null;
      let institutionalNetBuy: number | null = null;
      let individualNetBuy: number | null = null;

      if (investorData?.data && investorData.data.length > 0) {
        const latest = investorData.data[0];
        foreignNetBuy = latest.foreignNetBuyVolume || null;
        institutionalNetBuy = latest.institutionNetBuyVolume || null;
        individualNetBuy = latest.individualNetBuyVolume || null;
      }

      const comprehensiveData: ComprehensiveStockData = {
        basicInfo: {
          symbol: symbol.replace(/^A/, ''),
          name: quote.name,
          market: quote.market,
          exchange: 'KRX',
        },
        priceData: {
          currentPrice: quote.tradePrice,
          previousClose: quote.prevClosingPrice,
          change,
          changePercent,
          open: quote.openingPrice,
          high: quote.highPrice,
          low: quote.lowPrice,
          volume: quote.accTradeVolume,
          tradingValue: quote.accTradePrice,
          high52Week: quote.high52wPrice,
          low52Week: quote.low52wPrice,
        },
        valuationData: {
          per: quote.per || null,
          pbr: quote.pbr || null,
          eps: quote.eps || null,
          bps: quote.bps || null,
          roe: null,
          dividendYield: quote.dps && quote.tradePrice
            ? (quote.dps / quote.tradePrice) * 100
            : null,
          estimatedPer: null,
          estimatedEps: null,
        },
        financialData: {
          revenue: quote.sales || null,
          operatingIncome: quote.operatingProfit || null,
          netIncome: quote.netIncome || null,
          operatingMargin: operatingMargin ? Math.round(operatingMargin * 100) / 100 : null,
          netProfitMargin: netProfitMargin ? Math.round(netProfitMargin * 100) / 100 : null,
          fiscalDate: null,
        },
        supplyDemandData: {
          foreignOwnership,
          foreignNetBuy,
          institutionalNetBuy,
          individualNetBuy,
        },
        marketData: {
          marketCap: quote.marketCap || null,
          sharesOutstanding: quote.listedShareCount || null,
          floatShares: null,
          beta: null,
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
export const koreaStockDaumCollector = new KoreaStockDaumCollector();
