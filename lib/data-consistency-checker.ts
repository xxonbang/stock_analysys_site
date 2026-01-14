/**
 * 데이터 소스 정합성 검증 유틸리티
 * 
 * 여러 데이터 소스에서 받은 데이터의 일관성을 검증
 * 특히 Finnhub quote + Yahoo Finance historical 혼합 시 정합성 확인
 */

interface QuoteData {
  price: number;
  timestamp: number; // Unix timestamp (seconds)
  source: string;
}

interface HistoricalDataPoint {
  date: Date;
  close: number;
  timestamp: number; // Unix timestamp (seconds)
  source: string;
}

/**
 * 두 가격 값의 차이를 백분율로 계산
 */
function calculatePriceDifference(price1: number, price2: number): number {
  if (price1 === 0 || price2 === 0) return Infinity;
  return Math.abs((price1 - price2) / Math.max(price1, price2)) * 100;
}

/**
 * 타임스탬프 차이를 시간 단위로 계산
 */
function calculateTimeDifference(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / 3600; // 시간 단위
}

/**
 * Quote와 Historical 데이터의 정합성 검증
 * 
 * @param quoteData Quote 데이터 (현재가)
 * @param historicalData Historical 데이터 (과거 데이터)
 * @param symbol 종목 심볼 (로깅용)
 * @returns 검증 결과
 */
export async function validateDataConsistency(
  quoteData: QuoteData,
  historicalData: HistoricalDataPoint[],
  symbol: string
): Promise<{
  isValid: boolean;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (historicalData.length === 0) {
    errors.push('Historical data is empty');
    return { isValid: false, warnings, errors };
  }

  // 가장 최근 historical 데이터 포인트 찾기
  const latestHistorical = historicalData.reduce((latest, current) => {
    return current.timestamp > latest.timestamp ? current : latest;
  });

  // 1. 타임스탬프 일치 확인
  const timeDiff = calculateTimeDifference(quoteData.timestamp, latestHistorical.timestamp);
  
  // 같은 날짜의 데이터인지 확인 (24시간 이내)
  if (timeDiff > 24) {
    warnings.push(
      `Timestamp mismatch: Quote (${new Date(quoteData.timestamp * 1000).toISOString()}) and latest historical (${new Date(latestHistorical.timestamp * 1000).toISOString()}) differ by ${timeDiff.toFixed(1)} hours`
    );
  }

  // 2. 가격 일치 확인
  const priceDiff = calculatePriceDifference(quoteData.price, latestHistorical.close);
  
  // 가격 차이가 5% 이상이면 경고
  if (priceDiff > 5) {
    warnings.push(
      `Price mismatch: Quote price (${quoteData.price}) and latest historical close (${latestHistorical.close}) differ by ${priceDiff.toFixed(2)}%`
    );
  }

  // 가격 차이가 20% 이상이면 오류
  if (priceDiff > 20) {
    errors.push(
      `Significant price mismatch: Quote price (${quoteData.price}) and latest historical close (${latestHistorical.close}) differ by ${priceDiff.toFixed(2)}%`
    );
  }

  // 3. 데이터 소스 확인
  if (quoteData.source !== latestHistorical.source) {
    warnings.push(
      `Mixed data sources: Quote from ${quoteData.source}, Historical from ${latestHistorical.source}`
    );
  }

  // 4. Historical 데이터 연속성 확인
  for (let i = 1; i < Math.min(historicalData.length, 10); i++) {
    const prev = historicalData[i - 1];
    const curr = historicalData[i];
    
    // 날짜가 연속되지 않으면 경고 (주말/공휴일 제외)
    const daysDiff = (curr.timestamp - prev.timestamp) / (24 * 3600);
    if (daysDiff > 4) { // 4일 이상 차이나면 경고
      warnings.push(
        `Historical data gap: ${daysDiff.toFixed(1)} days between ${new Date(prev.timestamp * 1000).toISOString()} and ${new Date(curr.timestamp * 1000).toISOString()}`
      );
    }

    // 가격 변동이 비정상적으로 크면 경고 (50% 이상)
    const priceChange = calculatePriceDifference(prev.close, curr.close);
    if (priceChange > 50) {
      warnings.push(
        `Unusual price change: ${priceChange.toFixed(2)}% between ${new Date(prev.timestamp * 1000).toISOString()} and ${new Date(curr.timestamp * 1000).toISOString()}`
      );
    }
  }

  // 로깅
  if (warnings.length > 0) {
    console.warn(`[Data Consistency] ${symbol}: ${warnings.length} warning(s)`, warnings);
  }
  if (errors.length > 0) {
    console.error(`[Data Consistency] ${symbol}: ${errors.length} error(s)`, errors);
  }

  const result = {
    isValid: errors.length === 0,
    warnings,
    errors,
  };

  // 알림 시스템에 통합
  if (errors.length > 0 || warnings.length > 0) {
    try {
      const { alertSystem } = await import('./alert-system');
      alertSystem.alertConsistencyFailure(symbol, `${quoteData.source}+${latestHistorical.source}`, errors, warnings);
    } catch (error) {
      // 알림 시스템 로드 실패는 무시 (선택적 기능)
    }
  }

  return result;
}

/**
 * Finnhub Quote와 Yahoo Finance Historical 데이터 정합성 검증
 */
export async function validateFinnhubYahooConsistency(
  finnhubQuote: { c: number; t: number }, // current price, timestamp
  yahooHistorical: Array<{ date: Date; close: number }>,
  symbol: string
): Promise<ReturnType<typeof validateDataConsistency>> {
  const quoteData: QuoteData = {
    price: finnhubQuote.c,
    timestamp: finnhubQuote.t,
    source: 'Finnhub',
  };

  const historicalData: HistoricalDataPoint[] = yahooHistorical.map((h) => ({
    date: h.date,
    close: h.close,
    timestamp: Math.floor(h.date.getTime() / 1000),
    source: 'Yahoo Finance',
  }));

  return await validateDataConsistency(quoteData, historicalData, symbol);
}
