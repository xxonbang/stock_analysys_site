/**
 * 차트 데이터 변환 유틸리티
 */

import type { AnalyzeResult } from './types';
import { calculateRSI, calculateMA } from './finance';
import { calculateBollingerBands } from './indicators';

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
  result: AnalyzeResult,
  currentVolume?: number // marketData.volume (최신 거래량)
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

  // 최신 날짜 확인 (오늘 날짜와 비교)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestDataPoint = historicalData[historicalData.length - 1];
  const latestDate = new Date(latestDataPoint.date);
  latestDate.setHours(0, 0, 0, 0);
  
  // 최신 날짜가 오늘이거나 어제인 경우, currentVolume으로 업데이트
  const isLatestDateTodayOrYesterday = 
    latestDate.getTime() === today.getTime() || 
    latestDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000;

  // 각 데이터 포인트에 지표 추가
  return historicalData.map((d, index) => {
    // 최신 데이터 포인트이고 currentVolume이 제공된 경우, 거래량 업데이트
    const isLatestPoint = index === historicalData.length - 1;
    const volume = isLatestPoint && currentVolume !== undefined && isLatestDateTodayOrYesterday
      ? currentVolume
      : d.volume;
    // 해당 시점(index)까지의 과거 전체 데이터를 사용하여 지표 계산
    const historicalSlice = closes.slice(0, index + 1);
    
    // 지표 계산 (MA5, MA20, MA60)
    const ma5Val = calculateMA(historicalSlice, 5) ?? undefined;
    const ma20Val = calculateMA(historicalSlice, 20) ?? undefined;
    const ma60Val = calculateMA(historicalSlice, 60) ?? undefined;
    const ma120Val = calculateMA(historicalSlice, 120) ?? undefined;
    
    // RSI 계산 (과거 데이터 기반, 각 시점별)
    const rsiVal = historicalSlice.length >= 15 ? calculateRSI(historicalSlice, 14) : undefined;

    // 볼린저 밴드 계산 (indicators.ts 함수 재사용으로 일관성 보장)
    let bbUpper: number | undefined = undefined;
    let bbMiddle: number | undefined = undefined;
    let bbLower: number | undefined = undefined;

    if (historicalSlice.length >= 20) {
      const bb = calculateBollingerBands(historicalSlice, 20, 2, d.close);
      bbUpper = bb.upper;
      bbMiddle = bb.middle;
      bbLower = bb.lower;
    }
    
    return {
      date: d.date,
      close: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      volume: volume, // 업데이트된 거래량 사용
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
