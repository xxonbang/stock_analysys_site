/**
 * 데이터 검증 유틸리티
 * 
 * 모든 데이터 소스에서 받은 데이터의 유효성을 검증
 */

import type { StockData } from './finance';

/**
 * 숫자 값 검증 (null, undefined, NaN, 음수 체크)
 */
export function validateNumber(
  value: any,
  fieldName: string,
  allowZero: boolean = true,
  allowNegative: boolean = false
): number {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is null or undefined`);
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num)) {
    throw new Error(`${fieldName} is NaN`);
  }

  if (!allowZero && num === 0) {
    throw new Error(`${fieldName} is zero (not allowed)`);
  }

  if (!allowNegative && num < 0) {
    throw new Error(`${fieldName} is negative (${num})`);
  }

  return num;
}

/**
 * StockData 검증
 */
export async function validateStockData(data: any): Promise<StockData> {
  if (!data || typeof data !== 'object') {
    throw new Error('StockData is not an object');
  }

  // 필수 필드 검증
  const symbol = String(data.symbol || '');
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const price = validateNumber(data.price, 'price', false, false);
  const change = validateNumber(data.change, 'change', true, true);
  const changePercent = validateNumber(data.changePercent, 'changePercent', true, true);
  const volume = validateNumber(data.volume, 'volume', true, false);
  
  // RSI 검증 (0-100 범위)
  const rsi = validateNumber(data.rsi, 'rsi', true, false);
  if (rsi < 0 || rsi > 100) {
    console.warn(`RSI out of normal range: ${rsi} (expected 0-100)`);
  }

  // Moving Averages 검증
  if (!data.movingAverages || typeof data.movingAverages !== 'object') {
    throw new Error('movingAverages is required');
  }

  const ma5 = validateNumber(data.movingAverages.ma5, 'ma5', false, false);
  const ma20 = validateNumber(data.movingAverages.ma20, 'ma20', false, false);
  const ma60 = validateNumber(data.movingAverages.ma60, 'ma60', false, false);
  const ma120 = validateNumber(data.movingAverages.ma120, 'ma120', false, false);

  // Disparity 검증 (일반적으로 50-200 범위)
  const disparity = validateNumber(data.disparity, 'disparity', true, false);
  if (disparity < 0 || disparity > 500) {
    console.warn(`Disparity out of normal range: ${disparity} (expected 50-200)`);
  }

  // Historical Data 검증
  if (!Array.isArray(data.historicalData)) {
    throw new Error('historicalData must be an array');
  }

  if (data.historicalData.length === 0) {
    throw new Error('historicalData is empty');
  }

  // Historical 데이터 포인트 검증
  const validatedHistoricalData = data.historicalData.map((item: any, index: number) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`historicalData[${index}] is not an object`);
    }

    const date = String(item.date || '');
    if (!date) {
      throw new Error(`historicalData[${index}].date is required`);
    }

    const close = validateNumber(item.close, `historicalData[${index}].close`, false, false);
    const volume = validateNumber(item.volume, `historicalData[${index}].volume`, true, false);

    return {
      date,
      close,
      volume,
    };
  });

  // 최소 데이터 포인트 확인 (기술적 지표 계산에 최소 14일 필요)
  if (validatedHistoricalData.length < 14) {
    console.warn(`Historical data has only ${validatedHistoricalData.length} points (recommended: 120+)`);
  }

  // 검증 실패 시 알림 생성
  try {
    const { alertSystem } = await import('./alert-system');
    // 각 필드 검증 실패는 이미 throw되므로 여기서는 추가 알림 불필요
  } catch (error) {
    // 알림 시스템 로드 실패는 무시
  }

  return {
    symbol,
    price,
    change,
    changePercent,
    volume,
    marketCap: data.marketCap ? validateNumber(data.marketCap, 'marketCap', true, false) : undefined,
    rsi,
    movingAverages: {
      ma5,
      ma20,
      ma60,
      ma120,
    },
    disparity,
    historicalData: validatedHistoricalData,
  };
}

/**
 * Historical 데이터 배열 검증 (기술적 지표 계산용)
 */
export function validateHistoricalCloses(closes: number[]): number[] {
  if (!Array.isArray(closes)) {
    throw new Error('closes must be an array');
  }

  if (closes.length === 0) {
    throw new Error('closes array is empty');
  }

  // NaN, null, undefined 필터링
  const validated = closes
    .map((close, index) => {
      const num = typeof close === 'number' ? close : parseFloat(String(close));
      if (isNaN(num) || num <= 0) {
        console.warn(`Invalid close price at index ${index}: ${close}`);
        return null;
      }
      return num;
    })
    .filter((close): close is number => close !== null);

  if (validated.length === 0) {
    throw new Error('All close prices are invalid');
  }

  if (validated.length < closes.length * 0.8) {
    console.warn(`Only ${validated.length}/${closes.length} close prices are valid`);
  }

  return validated;
}
