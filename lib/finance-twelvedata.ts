/**
 * Twelve Data API를 사용한 주식 데이터 수집
 * 
 * 장점:
 * - Rate limit: 8,000 calls/day (매우 여유)
 * - Historical 데이터 완벽 지원
 * - 100+ 기술적 지표 제공 (직접 계산 불필요)
 * - 글로벌 커버리지 (150+ 거래소)
 * - WebSocket 지원
 * 
 * API 키 발급: https://twelvedata.com/
 */

import axios from 'axios';
import type { StockData } from './finance';

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || '';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
}

interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

interface TwelveDataRSI {
  meta: {
    symbol: string;
    interval: string;
    indicator: string;
    series_type: string;
  };
  values: Array<{
    datetime: string;
    rsi: string;
  }>;
  status: string;
}

interface TwelveDataSMA {
  meta: {
    symbol: string;
    interval: string;
    indicator: string;
    series_type: string;
  };
  values: Array<{
    datetime: string;
    sma: string;
  }>;
  status: string;
}

/**
 * Twelve Data API 호출 헬퍼
 */
async function twelvedataRequest<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  if (!TWELVEDATA_API_KEY) {
    throw new Error('TWELVEDATA_API_KEY가 설정되지 않았습니다.');
  }

  const url = `${TWELVEDATA_BASE_URL}${endpoint}`;
  const queryParams = new URLSearchParams({
    ...params,
    apikey: TWELVEDATA_API_KEY,
  });

  try {
    const response = await axios.get<T>(`${url}?${queryParams.toString()}`, {
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error('Twelve Data API rate limit 초과. 잠시 후 다시 시도해주세요.');
      }
      if (error.response?.status === 401) {
        throw new Error('Twelve Data API 키가 유효하지 않습니다.');
      }
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Twelve Data API 오류: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Twelve Data를 사용하여 주식 데이터 수집
 * @param symbol 주식 티커 (예: "AAPL", "TSLA")
 */
export async function fetchStockDataTwelveData(symbol: string): Promise<StockData> {
  try {
    // 1. 현재 시세 조회
    const quote = await twelvedataRequest<TwelveDataQuote>('/quote', { symbol });

    if (!quote || !quote.close) {
      throw new Error(`Invalid symbol or no data available: ${symbol}`);
    }

    const currentPrice = parseFloat(quote.close);
    const change = parseFloat(quote.change || '0');
    const changePercent = parseFloat(quote.percent_change || '0');
    const volume = parseInt(quote.volume || '0', 10);

    // 2. Historical 데이터 조회 (120일)
    const timeSeries = await twelvedataRequest<TwelveDataTimeSeries>('/time_series', {
      symbol,
      interval: '1day',
      outputsize: '120',
      format: 'json',
    });

    if (!timeSeries.values || timeSeries.values.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    // 종가 배열 추출 (최신순)
    const closes = timeSeries.values
      .map((v) => parseFloat(v.close))
      .reverse();
    const volumes = timeSeries.values
      .map((v) => parseInt(v.volume || '0', 10))
      .reverse();
    const dates = timeSeries.values.map((v) => v.datetime).reverse();

    // Historical 데이터 구성
    const historicalData = closes.map((close, index) => ({
      date: dates[index],
      close,
      volume: volumes[index] || 0,
    }));

    // 3. 기술적 지표 조회 (Twelve Data에서 직접 제공)
    // RSI
    const rsiData = await twelvedataRequest<TwelveDataRSI>('/rsi', {
      symbol,
      interval: '1day',
      time_period: '14',
      series_type: 'close',
    });
    const rsi = rsiData.values && rsiData.values.length > 0
      ? parseFloat(rsiData.values[rsiData.values.length - 1].rsi)
      : 50; // 기본값

    // 이동평균선 (5, 20, 60, 120일)
    const [ma5Data, ma20Data, ma60Data, ma120Data] = await Promise.all([
      twelvedataRequest<TwelveDataSMA>('/sma', {
        symbol,
        interval: '1day',
        time_period: '5',
        series_type: 'close',
      }),
      twelvedataRequest<TwelveDataSMA>('/sma', {
        symbol,
        interval: '1day',
        time_period: '20',
        series_type: 'close',
      }),
      twelvedataRequest<TwelveDataSMA>('/sma', {
        symbol,
        interval: '1day',
        time_period: '60',
        series_type: 'close',
      }),
      twelvedataRequest<TwelveDataSMA>('/sma', {
        symbol,
        interval: '1day',
        time_period: '120',
        series_type: 'close',
      }),
    ]);

    const ma5 = ma5Data.values && ma5Data.values.length > 0
      ? parseFloat(ma5Data.values[ma5Data.values.length - 1].sma)
      : closes[0] || currentPrice;
    const ma20 = ma20Data.values && ma20Data.values.length > 0
      ? parseFloat(ma20Data.values[ma20Data.values.length - 1].sma)
      : closes[0] || currentPrice;
    const ma60 = ma60Data.values && ma60Data.values.length > 0
      ? parseFloat(ma60Data.values[ma60Data.values.length - 1].sma)
      : closes[0] || currentPrice;
    const ma120 = ma120Data.values && ma120Data.values.length > 0
      ? parseFloat(ma120Data.values[ma120Data.values.length - 1].sma)
      : closes[0] || currentPrice;

    // 이격도 계산
    const disparity = (currentPrice / ma20) * 100;

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume,
      rsi,
      movingAverages: {
        ma5,
        ma20,
        ma60,
        ma120,
      },
      disparity,
      historicalData,
    };
  } catch (error) {
    console.error(`Error fetching Twelve Data for ${symbol}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch stock data for ${symbol}: ${errorMessage}`);
  }
}

/**
 * 여러 종목의 데이터를 배치로 수집
 */
export async function fetchStocksDataBatchTwelveData(
  symbols: string[]
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();

  // Twelve Data는 rate limit이 여유로우므로 병렬 처리 가능
  // 하지만 안정성을 위해 약간의 딜레이 추가
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    // 요청 간 딜레이 (첫 번째 제외)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5초 딜레이
    }

    try {
      const stockData = await fetchStockDataTwelveData(symbol);
      results.set(symbol, stockData);
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}:`, error);
      // 실패해도 계속 진행
    }
  }

  return results;
}

/**
 * 뉴스 헤드라인 수집
 */
export async function fetchNewsTwelveData(
  symbol: string,
  count: number = 5
): Promise<Array<{ title: string; link: string; date: string }>> {
  try {
    // Twelve Data는 뉴스 API를 제공하지 않을 수 있음
    // 다른 소스 사용 필요
    return [];
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
