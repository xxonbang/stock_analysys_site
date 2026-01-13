/**
 * 분석 기간 관련 유틸리티 함수
 */

import type { AnalysisPeriod } from './types';

/**
 * 기간을 일수로 변환
 */
export function periodToDays(period: AnalysisPeriod): number {
  switch (period) {
    case '1d':
      return 1;
    case '1w':
      return 7;
    case '1m':
      return 30;
    case '3m':
      return 90;
    case '6m':
      return 180;
    case '1y':
      return 365;
    default:
      return 30; // 기본값: 1달
  }
}

/**
 * 기간을 한국어로 변환
 */
export function periodToKorean(period: AnalysisPeriod): string {
  switch (period) {
    case '1d':
      return '1일';
    case '1w':
      return '1주일';
    case '1m':
      return '1달';
    case '3m':
      return '3개월';
    case '6m':
      return '6개월';
    case '1y':
      return '1년';
    default:
      return '1달';
  }
}

/**
 * 기간에 따른 시작일 계산
 */
export function getStartDate(period: AnalysisPeriod): Date {
  const days = periodToDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return startDate;
}

/**
 * 기간에 따른 Unix timestamp 계산 (period1, period2)
 */
export function getPeriodTimestamps(period: AnalysisPeriod): {
  period1: number;
  period2: number;
} {
  const startDate = getStartDate(period);
  const endDate = new Date();
  
  return {
    period1: Math.floor(startDate.getTime() / 1000),
    period2: Math.floor(endDate.getTime() / 1000),
  };
}
