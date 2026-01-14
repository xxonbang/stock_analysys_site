import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  rsi: number;
  movingAverages: {
    ma5: number;
    ma20: number;
    ma60: number;
    ma120: number;
  };
  disparity: number;
  historicalData: Array<{
    date: string;
    close: number;
    volume: number;
  }>;
}

export interface SupplyDemandData {
  institutional: number;
  foreign: number;
  individual: number;
}

export interface MarketSentiment {
  fearGreedIndex?: number;
  vix?: number;
}

/**
 * RSI(Relative Strength Index) 계산
 * @param prices 종가 배열 (최신순)
 * @param period 기간 (기본값: 14)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // 데이터 부족 시 중립값 반환
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i - 1] - prices[i]);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (const change of changes) {
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // 초기 평균
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's Smoothing 적용
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

/**
 * 이동평균선 계산
 * @param prices 종가 배열 (최신순)
 * @param period 기간
 */
export function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices[0] || 0;
  }
  const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
  return Math.round((sum / period) * 100) / 100;
}

/**
 * 이격도 계산: (현재가 / 이동평균) * 100
 */
export function calculateDisparity(currentPrice: number, movingAverage: number): number {
  if (movingAverage === 0) return 100;
  return Math.round((currentPrice / movingAverage) * 100 * 100) / 100;
}

/**
 * 재시도 로직이 포함된 API 호출 헬퍼
 */
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 3000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Too Many Requests') && i < maxRetries - 1) {
        // Rate limit에 걸린 경우 대기 후 재시도 (지수 백오프)
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * 여러 종목의 quote 데이터를 배치로 수집
 * @param symbols 주식 티커 심볼 배열
 */
export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, any>> {
  try {
    // 모든 종목의 quote를 한 번에 요청 (배치 처리)
    // quote()는 배열을 받으면 QuoteResponseArray를 반환
    const quotes = await retryWithDelay(
      () => yahooFinance.quote(symbols, { return: 'array' }),
      3,
      3000
    );
    
    // 결과를 심볼별로 매핑
    const quoteMap = new Map<string, any>();
    
    if (Array.isArray(quotes)) {
      // 배열 형태로 반환된 경우
      quotes.forEach((quote) => {
        if (quote && quote.symbol) {
          quoteMap.set(quote.symbol, quote);
        }
      });
    } else if (quotes && typeof quotes === 'object') {
      // 객체 형태로 반환된 경우 (심볼이 키)
      Object.entries(quotes).forEach(([symbol, quote]) => {
        if (quote) {
          quoteMap.set(symbol, quote);
        }
      });
    }
    
    return quoteMap;
  } catch (error) {
    console.error('Error fetching quotes batch:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Too Many Requests')) {
      throw new Error('Yahoo Finance API 요청 한도 초과. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  }
}

/**
 * yahoo-finance2를 사용하여 주식 데이터 수집
 * @param symbol 주식 티커 심볼 (예: "AAPL", "005930.KS")
 * @param quoteData 이미 가져온 quote 데이터 (선택사항, 배치 요청 시 사용)
 */
export async function fetchStockData(
  symbol: string,
  quoteData?: any
): Promise<StockData> {
  const startTime = Date.now();
  const { metrics } = await import('./data-metrics');

  try {
    // quote 데이터가 제공되지 않은 경우에만 개별 요청
    let quote = quoteData;
    if (!quote) {
      quote = await retryWithDelay(() => yahooFinance.quote(symbol), 3, 3000);
    }
    
    if (!quote || !quote.regularMarketPrice) {
      throw new Error(`Invalid symbol or no data available: ${symbol}`);
    }

    // 데이터 유효성 검증
    const currentPrice = quote.regularMarketPrice;
    if (currentPrice === null || currentPrice === undefined || isNaN(currentPrice) || currentPrice <= 0) {
      throw new Error(`Invalid price for ${symbol}: ${currentPrice}`);
    }

    const change = quote.regularMarketChange || 0;
    const changePercent = quote.regularMarketChangePercent || 0;
    const volume = Math.max(0, quote.regularMarketVolume || 0);
    const marketCap = quote.marketCap && quote.marketCap > 0 ? quote.marketCap : undefined;

    // 과거 120일치 데이터 조회 (이동평균선 계산을 위해)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 120);

    // 요청 간 딜레이 추가 (rate limiting 방지)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const historical = await retryWithDelay(
      () =>
        yahooFinance.historical(symbol, {
          period1: Math.floor(startDate.getTime() / 1000),
          period2: Math.floor(endDate.getTime() / 1000),
          interval: '1d',
        }),
      3,
      2000
    );

    if (!historical || historical.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    // 종가 배열 추출 (최신순) 및 검증
    const closes = historical
      .map((h) => {
        const close = h.close;
        if (close === null || close === undefined || isNaN(close) || close <= 0) {
          console.warn(`Invalid close price in historical data: ${close}`);
          return null;
        }
        return close;
      })
      .filter((close): close is number => close !== null)
      .reverse();

    if (closes.length === 0) {
      throw new Error(`No valid close prices in historical data for ${symbol}`);
    }

    const historicalData = historical
      .filter((h) => h.close !== null && h.close !== undefined && !isNaN(h.close) && h.close > 0)
      .reverse()
      .map((h) => ({
        date: h.date.toISOString().split('T')[0],
        close: h.close,
        volume: h.volume || 0,
      }));

    // 기술적 지표 계산
    const rsi = calculateRSI(closes, 14);
    const ma5 = calculateMA(closes, 5);
    const ma20 = calculateMA(closes, 20);
    const ma60 = calculateMA(closes, 60);
    const ma120 = calculateMA(closes, 120);
    const disparity = calculateDisparity(currentPrice, ma20);

    const responseTime = Date.now() - startTime;
    metrics.success(symbol, 'Yahoo Finance', responseTime, {
      historicalDataPoints: historicalData.length,
    });

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume,
      marketCap,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    metrics.error(symbol, 'Yahoo Finance', errorMessage);
    console.error(`Error fetching data for ${symbol}:`, error);
    if (errorMessage.includes('Too Many Requests')) {
      throw new Error(
        `Yahoo Finance API 요청 한도 초과. ${symbol} 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.`
      );
    }
    throw new Error(
      `Failed to fetch stock data for ${symbol}: ${errorMessage}`
    );
  }
}

/**
 * 여러 종목의 데이터를 배치로 수집 (quote는 배치, historical는 순차)
 * @param symbols 주식 티커 심볼 배열
 */
export async function fetchStocksDataBatch(symbols: string[]): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();
  
  try {
    // 1. 모든 종목의 quote를 한 번에 배치 요청
    console.log(`Fetching quotes for ${symbols.length} symbols in batch...`);
    const quoteMap = await fetchQuotesBatch(symbols);
    
    // 2. 각 종목의 historical 데이터를 순차적으로 수집 (rate limiting 방지)
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const quote = quoteMap.get(symbol);
      
      if (!quote) {
        console.warn(`Quote data not found for ${symbol}, skipping...`);
        continue;
      }
      
      // 요청 간 딜레이 (첫 번째 제외)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      
      try {
        const stockData = await fetchStockData(symbol, quote);
        results.set(symbol, stockData);
      } catch (error) {
        console.error(`Failed to fetch historical data for ${symbol}:`, error);
        // historical 실패해도 quote 데이터는 있으므로 계속 진행
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in fetchStocksDataBatch:', error);
    throw error;
  }
}

/**
 * 환율 데이터 조회 (USD/KRW)
 */
export async function fetchExchangeRate(): Promise<number> {
  try {
    const quote = await retryWithDelay(() => yahooFinance.quote('KRW=X'), 3, 2000);
    if (!quote || !quote.regularMarketPrice) {
      throw new Error('Failed to fetch exchange rate');
    }
    return quote.regularMarketPrice;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Too Many Requests')) {
      throw new Error('Yahoo Finance API 요청 한도 초과. 잠시 후 다시 시도해주세요.');
    }
    throw new Error('Failed to fetch USD/KRW exchange rate');
  }
}

/**
 * VIX 지수 조회 (공포/탐욕 지표 대용)
 */
export async function fetchVIX(): Promise<number | null> {
  try {
    const quote = await retryWithDelay(() => yahooFinance.quote('^VIX'), 3, 2000);
    return quote?.regularMarketPrice || null;
  } catch (error) {
    console.error('Error fetching VIX:', error);
    return null;
  }
}

/**
 * 한국 주식의 수급 데이터 수집 (KRX API 우선, 실패 시 네이버 크롤링)
 * @param symbol 한국 주식 티커 (예: "005930")
 */
export async function fetchKoreaSupplyDemand(symbol: string): Promise<SupplyDemandData | null> {
  // KRX Open API 우선 시도
  let krxFailed = false;
  let krxFailureReason: string | undefined;
  
  try {
    const { fetchKoreaSupplyDemandKRX } = await import('./krx-api');
    const krxData = await fetchKoreaSupplyDemandKRX(symbol);
    if (krxData) {
      console.log(`[Supply/Demand] Using KRX API for ${symbol}`);
      return krxData;
    }
    // null 반환된 경우 (API 키 없음, 데이터 없음 등)
    krxFailed = true;
    krxFailureReason = 'KRX API returned no data';
  } catch (error) {
    // 오류 발생한 경우 (401, 네트워크 오류 등)
    krxFailed = true;
    const errorMessage = error instanceof Error ? error.message : String(error);
    krxFailureReason = errorMessage;
    
    // 401 오류는 이미 알림이 생성되었으므로 별도 로깅만
    if (errorMessage.includes('401') || errorMessage.includes('유효하지 않습니다')) {
      console.warn(`[Supply/Demand] KRX API key invalid for ${symbol}, falling back to Naver (alert already created)`);
    } else {
      console.warn(`[Supply/Demand] KRX API failed for ${symbol}, falling back to Naver:`, errorMessage);
    }
  }

  // KRX API 실패 시 네이버 금융 크롤링 사용 (Fallback)
  if (krxFailed) {
    console.log(`[Supply/Demand] Using Naver Finance (crawling) as fallback for ${symbol}${krxFailureReason ? ` (reason: ${krxFailureReason})` : ''}`);
  }
  
  return await fetchKoreaSupplyDemandNaver(symbol);
}

/**
 * 네이버 금융에서 한국 주식의 수급 데이터 크롤링 (Fallback)
 * @param symbol 한국 주식 티커 (예: "005930")
 */
async function fetchKoreaSupplyDemandNaver(symbol: string): Promise<SupplyDemandData | null> {
  const startTime = Date.now();
  const { metrics } = await import('./data-metrics');

  try {
    // 네이버 금융 투자자별 매매동향 페이지 URL
    const url = `https://finance.naver.com/item/frgn.naver?code=${symbol}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // 투자자별 매매동향 테이블 찾기
    // 네이버 금융 페이지 구조에 맞게 파싱
    let institutional = 0;
    let foreign = 0;
    let individual = 0;

    // 테이블에서 데이터 추출 (최신 데이터는 보통 첫 번째 행)
    $('table.type_1 tbody tr').each((index, element) => {
      if (index === 0) {
        // 첫 번째 행이 최신 데이터
        const cells = $(element).find('td');
        if (cells.length >= 4) {
          // 기관, 외국인, 개인 순서로 데이터가 있음
          const institutionalText = $(cells[1]).text().trim().replace(/,/g, '');
          const foreignText = $(cells[2]).text().trim().replace(/,/g, '');
          const individualText = $(cells[3]).text().trim().replace(/,/g, '');

          // 숫자 검증 및 파싱
          const institutionalParsed = parseInt(institutionalText.replace(/[^-\d]/g, ''), 10);
          const foreignParsed = parseInt(foreignText.replace(/[^-\d]/g, ''), 10);
          const individualParsed = parseInt(individualText.replace(/[^-\d]/g, ''), 10);

          // NaN 체크
          if (!isNaN(institutionalParsed)) institutional = institutionalParsed;
          if (!isNaN(foreignParsed)) foreign = foreignParsed;
          if (!isNaN(individualParsed)) individual = individualParsed;
        }
      }
    });

    // 대안: 다른 테이블 구조 시도
    if (institutional === 0 && foreign === 0 && individual === 0) {
      // 투자자별 매매동향 섹션에서 직접 추출 시도
      $('.section.trade_compare table tbody tr').each((index, element) => {
        if (index === 0) {
          const cells = $(element).find('td');
          if (cells.length >= 4) {
            // 숫자 검증 및 파싱
            const institutionalText2 = $(cells[1]).text().trim().replace(/,/g, '');
            const foreignText2 = $(cells[2]).text().trim().replace(/,/g, '');
            const individualText2 = $(cells[3]).text().trim().replace(/,/g, '');

            const institutionalParsed2 = parseInt(institutionalText2.replace(/[^-\d]/g, ''), 10);
            const foreignParsed2 = parseInt(foreignText2.replace(/[^-\d]/g, ''), 10);
            const individualParsed2 = parseInt(individualText2.replace(/[^-\d]/g, ''), 10);

            if (!isNaN(institutionalParsed2)) institutional = institutionalParsed2;
            if (!isNaN(foreignParsed2)) foreign = foreignParsed2;
            if (!isNaN(individualParsed2)) individual = individualParsed2;
          }
        }
      });
    }

    // 데이터 검증: 실제로 0인 경우와 파싱 실패를 구분하기 어려우므로
    // 최소한 하나라도 0이 아니면 유효한 데이터로 간주
    // 단, 모든 값이 0이고 파싱이 실패했을 가능성도 있으므로 로깅
    if (institutional === 0 && foreign === 0 && individual === 0) {
      console.warn(`All supply/demand values are zero for ${symbol} (may indicate parsing failure)`);
      return null;
    }

    // 합리성 검증: 세 값의 합이 비정상적으로 크거나 작지 않은지 확인
    const total = Math.abs(institutional) + Math.abs(foreign) + Math.abs(individual);
    if (total > 1e12) { // 1조 이상은 비정상적
      console.warn(`Suspiciously large supply/demand values for ${symbol}: total=${total}`);
    }

    const responseTime = Date.now() - startTime;
    const result = {
      institutional,
      foreign,
      individual,
    };
    metrics.success(symbol, 'Naver Finance (Crawling)', responseTime);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    metrics.error(symbol, 'Naver Finance (Crawling)', errorMessage);
    console.error(`Error fetching supply/demand for ${symbol}:`, error);
    return null;
  }
}

/**
 * 뉴스 헤드라인 수집
 * @param symbol 주식 티커
 * @param count 수집할 뉴스 개수 (기본값: 5)
 */
export async function fetchNews(symbol: string, count: number = 5): Promise<Array<{ title: string; link: string; date: string }>> {
  try {
    const news = await yahooFinance.search(symbol, {
      newsCount: count,
    });

    if (!news || !news.news) {
      return [];
    }

    return news.news.slice(0, count).map((item) => {
      let dateStr = '';
      if (item.providerPublishTime) {
        const timestamp = typeof item.providerPublishTime === 'number' 
          ? item.providerPublishTime 
          : parseInt(String(item.providerPublishTime), 10);
        if (!isNaN(timestamp)) {
          dateStr = new Date(timestamp * 1000).toISOString();
        }
      }
      return {
        title: item.title || '',
        link: item.link || '',
        date: dateStr,
      };
    });
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
