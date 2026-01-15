/**
 * 차트 데이터 변환 유틸리티
 */

import type { AnalyzeResult } from './types';
import { calculateRSI, calculateMA } from './finance';

export interface ChartDataPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  rsi?: number;
}

/**
 * AnalyzeResult를 차트 데이터로 변환
 */
export function transformToChartData(
  result: AnalyzeResult
): ChartDataPoint[] {
  if (!result.historicalData || result.historicalData.length === 0) {
    return [];
  }

  // historicalData는 과거 -> 최신 순서로 정렬 보장
  const historicalData = [...result.historicalData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const closes = historicalData.map((d) => d.close);
  const volumes = historicalData.map((d) => d.volume);

  // 각 데이터 포인트에 지표 추가
  return historicalData.map((d, index) => {
    // 해당 시점(index)까지의 과거 전체 데이터를 사용하여 지표 계산
    const historicalSlice = closes.slice(0, index + 1);
    
    // 지표 계산 (MA5, MA20, MA60)
    const ma5Val = calculateMA(historicalSlice, 5) ?? undefined;
    const ma20Val = calculateMA(historicalSlice, 20) ?? undefined;
    const ma60Val = calculateMA(historicalSlice, 60) ?? undefined;
    const ma120Val = calculateMA(historicalSlice, 120) ?? undefined;
    
    // RSI 계산 (과거 데이터 기반, 각 시점별)
    const rsiVal = historicalSlice.length >= 15 ? calculateRSI(historicalSlice, 14) : undefined;
    
    // 볼린저 밴드 계산 (각 시점별 20일 기반)
    let bbUpper = undefined;
    let bbMiddle = undefined;
    let bbLower = undefined;

    if (historicalSlice.length >= 20) {
      const recent20 = historicalSlice.slice(-20);
      const ma20 = recent20.reduce((a, b) => a + b, 0) / 20;
      const mean = ma20;
      const variance =
        recent20.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      
      bbMiddle = ma20;
      bbUpper = bbMiddle + stdDev * 2;
      bbLower = bbMiddle - stdDev * 2;
    }
    
    return {
      date: d.date,
      close: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      volume: d.volume,
      ma5: ma5Val,
      ma20: ma20Val,
      ma60: ma60Val,
      ma120: ma120Val,
      bbUpper,
      bbMiddle,
      bbLower,
      rsi: rsiVal,
    };
  });
}

/**
 * 날짜 포맷팅 (차트 X축용)
 */
export function formatChartDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 가격 포맷팅 (차트 Y축용)
 */
export function formatChartPrice(price: number): string {
  if (price >= 1000) {
    return (price / 1000).toFixed(1) + 'K';
  }
  return price.toFixed(0);
}
