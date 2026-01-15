/**
 * 추가 기술적 지표 계산 함수들
 * Phase 1 & Phase 2 지표 구현
 */

/**
 * ETF 괴리율 계산
 * 괴리율(%) = ((시장 가격 - NAV) / NAV) × 100
 */
export function calculateETFPremium(
  currentPrice: number,
  nav: number
): {
  premium: number; // 괴리율 (%)
  isPremium: boolean; // 프리미엄 여부
  isDiscount: boolean; // 할인 여부
} {
  if (nav === 0 || isNaN(nav) || nav === null || nav === undefined) {
    return { premium: 0, isPremium: false, isDiscount: false };
  }
  
  const premium = ((currentPrice - nav) / nav) * 100;
  const isPremium = premium > 0;
  const isDiscount = premium < 0;
  
  return {
    premium: Math.round(premium * 100) / 100,
    isPremium,
    isDiscount,
  };
}

/**
 * 볼린저 밴드 계산
 * - 중심선: 20일 이동평균
 * - 상단 밴드: 중심선 + (표준편차 × 2)
 * - 하단 밴드: 중심선 - (표준편차 × 2)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2,
  currentPrice?: number // 현재가 (별도 전달 시 사용)
): {
  upper: number; // 상단 밴드
  middle: number; // 중심선 (이동평균)
  lower: number; // 하단 밴드
  bandwidth: number; // 밴드폭 (%)
  position: number; // 현재가 위치 (0-1, 0=하단, 1=상단)
} {
  if (prices.length < period) {
    const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : prices[0] || 0;
    const price = currentPrice !== undefined ? currentPrice : (prices.length > 0 ? prices[prices.length - 1] : avg);
    return {
      upper: avg,
      middle: avg,
      lower: avg,
      bandwidth: 0,
      position: 0.5,
    };
  }
  
  // prices 배열은 "과거 → 최신" 순서이므로, 최근 period일은 slice(-period)로 가져옴
  const recentPrices = prices.slice(-period);
  const middle = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  // 표준편차 계산
  const variance = recentPrices.reduce((sum, price) => {
    return sum + Math.pow(price - middle, 2);
  }, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = middle + (stdDev * multiplier);
  const lower = middle - (stdDev * multiplier);
  const bandwidth = upper - lower > 0 ? ((upper - lower) / middle) * 100 : 0;
  
  // 현재가는 별도 전달받았으면 사용, 없으면 배열의 마지막 값(최신 가격) 사용
  const price = currentPrice !== undefined ? currentPrice : prices[prices.length - 1];
  const position = upper - lower > 0 ? (price - lower) / (upper - lower) : 0.5;
  
  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    position: Math.max(0, Math.min(1, Math.round(position * 100) / 100)),
  };
}

/**
 * 변동성 계산 (표준편차 기반)
 */
export function calculateVolatility(
  prices: number[],
  period: number = 20
): {
  volatility: number; // 변동성 (%)
  annualizedVolatility: number; // 연율화 변동성 (%)
  volatilityRank: 'low' | 'medium' | 'high'; // 변동성 등급
} {
  if (prices.length < period || prices.length < 2) {
    return {
      volatility: 0,
      annualizedVolatility: 0,
      volatilityRank: 'low',
    };
  }
  
  const recentPrices = prices.slice(0, period);
  const returns: number[] = [];
  
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i] > 0) {
      const returnRate = (recentPrices[i - 1] - recentPrices[i]) / recentPrices[i];
      returns.push(returnRate);
    }
  }
  
  if (returns.length === 0) {
    return {
      volatility: 0,
      annualizedVolatility: 0,
      volatilityRank: 'low',
    };
  }
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => {
    return sum + Math.pow(ret - meanReturn, 2);
  }, 0) / returns.length;
  
  const stdDev = Math.sqrt(variance);
  const volatility = stdDev * 100; // %
  const annualizedVolatility = volatility * Math.sqrt(252); // 연율화 (252 거래일)
  
  const volatilityRank = 
    annualizedVolatility < 15 ? 'low' :
    annualizedVolatility < 30 ? 'medium' :
    'high';
  
  return {
    volatility: Math.round(volatility * 100) / 100,
    annualizedVolatility: Math.round(annualizedVolatility * 100) / 100,
    volatilityRank,
  };
}

/**
 * 거래량 지표 계산
 * volumes 배열은 "과거 → 최신" 순서로 정렬되어 있음을 가정
 * @param volumes 과거 거래량 배열 (과거 → 최신 순서)
 * @param period 평균 계산 기간 (기본 20일)
 * @param latestVolume 최신 거래량 (quote에서 가져온 값, 선택사항)
 */
export function calculateVolumeIndicators(
  volumes: number[],
  period: number = 20,
  latestVolume?: number // quote에서 가져온 최신 거래량
): {
  currentVolume: number; // 현재 거래량 (최신)
  averageVolume: number; // 평균 거래량 (최근 period일)
  volumeRatio: number; // 현재 거래량 / 평균 거래량
  isHighVolume: boolean; // 고거래량 여부 (1.5배 이상)
  volumeTrend: 'increasing' | 'decreasing' | 'stable'; // 거래량 추세
} {
  if (volumes.length === 0) {
    return {
      currentVolume: latestVolume || 0,
      averageVolume: 0,
      volumeRatio: 1,
      isHighVolume: false,
      volumeTrend: 'stable',
    };
  }

  // latestVolume이 제공되면 우선 사용, 없으면 volumes 배열의 마지막 요소 사용
  // volumes 배열은 "과거 → 최신" 순서이므로, 마지막 요소가 최신 거래량
  const historicalLatestVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
  const currentVolume = latestVolume !== undefined ? latestVolume : historicalLatestVolume;
  
  // 디버깅 로그
  if (latestVolume !== undefined) {
    console.log(`[VolumeIndicators] Using latestVolume from quote: ${latestVolume}, historical latest: ${historicalLatestVolume}`);
  }
  
  if (volumes.length < period) {
    // 데이터가 부족한 경우, 전체 데이터의 평균 사용
    const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
    console.log(`[VolumeIndicators] Data insufficient (${volumes.length} < ${period}), currentVolume: ${currentVolume}, averageVolume: ${averageVolume}, ratio: ${volumeRatio}`);
    return {
      currentVolume,
      averageVolume: Math.round(averageVolume),
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      isHighVolume: volumeRatio >= 1.5,
      volumeTrend: 'stable',
    };
  }
  
  // 최근 period일의 거래량 (배열의 마지막 period개)
  const recentVolumes = volumes.slice(-period);
  const averageVolume = recentVolumes.reduce((a, b) => a + b, 0) / period;
  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
  
  // 디버깅 로그
  console.log(`[VolumeIndicators] currentVolume: ${currentVolume}, averageVolume: ${averageVolume}, ratio: ${volumeRatio.toFixed(2)}`);
  
  const isHighVolume = volumeRatio >= 1.5;
  
  // 거래량 추세 (최근 5일: 배열의 마지막 5개)
  const recent5 = volumes.slice(-Math.min(5, volumes.length));
  if (recent5.length < 2) {
    return {
      currentVolume,
      averageVolume: Math.round(averageVolume),
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      isHighVolume,
      volumeTrend: 'stable',
    };
  }
  
  // recent5는 "과거 → 최신" 순서이므로, 첫 번째가 5일 전, 마지막이 오늘
  const oldest = recent5[0]; // 5일 전
  const newest = recent5[recent5.length - 1]; // 오늘
  const volumeTrend = 
    newest > oldest * 1.1 ? 'increasing' :
    newest < oldest * 0.9 ? 'decreasing' :
    'stable';
  
  return {
    currentVolume,
    averageVolume: Math.round(averageVolume),
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    isHighVolume,
    volumeTrend,
  };
}

/**
 * 눌림목 여부 판단
 * - 최근 N일간의 저점들을 찾아 지지선 형성 여부 확인
 * - 현재가가 지지선 근처에 있는지 확인
 */
export function detectSupportLevel(
  historicalData: Array<{ date: string; close: number; low?: number }>,
  currentPrice: number,
  period: number = 20
): {
  isNearSupport: boolean;
  supportLevel: number;
  distanceFromSupport: number; // %
} {
  if (historicalData.length < period) {
    return {
      isNearSupport: false,
      supportLevel: currentPrice,
      distanceFromSupport: 0,
    };
  }
  
  // 최근 N일간의 저점들 추출
  const lows = historicalData
    .slice(0, period)
    .map(d => d.low || d.close)
    .filter(l => l > 0);
  
  if (lows.length === 0) {
    return {
      isNearSupport: false,
      supportLevel: currentPrice,
      distanceFromSupport: 0,
    };
  }
  
  const minLow = Math.min(...lows);
  const supportLevel = minLow;
  const distanceFromSupport = ((currentPrice - supportLevel) / supportLevel) * 100;
  
  // 지지선 근처 (5% 이내)에 있으면 눌림목으로 판단
  const isNearSupport = distanceFromSupport >= -5 && distanceFromSupport <= 5;
  
  return {
    isNearSupport,
    supportLevel: Math.round(supportLevel * 100) / 100,
    distanceFromSupport: Math.round(distanceFromSupport * 100) / 100,
  };
}

/**
 * 저항선/지지선 계산
 * - 저항선: 최근 N일간의 고점들
 * - 지지선: 최근 N일간의 저점들
 */
export function calculateSupportResistance(
  historicalData: Array<{ date: string; close: number; high?: number; low?: number }>,
  period: number = 60
): {
  resistanceLevels: number[]; // 저항선 레벨들
  supportLevels: number[]; // 지지선 레벨들
  currentPosition: 'near_resistance' | 'near_support' | 'middle'; // 현재 위치
} {
  if (historicalData.length < period) {
    const currentPrice = historicalData[0]?.close || 0;
    return {
      resistanceLevels: [currentPrice],
      supportLevels: [currentPrice],
      currentPosition: 'middle',
    };
  }
  
  const data = historicalData.slice(0, period);
  
  // 고점/저점 추출
  const highs = data.map(d => d.high || d.close).filter(h => h > 0);
  const lows = data.map(d => d.low || d.close).filter(l => l > 0);
  
  if (highs.length === 0 || lows.length === 0) {
    const currentPrice = historicalData[0]?.close || 0;
    return {
      resistanceLevels: [currentPrice],
      supportLevels: [currentPrice],
      currentPosition: 'middle',
    };
  }
  
  // 저항선: 고점들 중 상위 3개
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const resistanceLevels = sortedHighs.slice(0, 3);
  
  // 지지선: 저점들 중 하위 3개
  const sortedLows = [...lows].sort((a, b) => a - b);
  const supportLevels = sortedLows.slice(0, 3);
  
  const currentPrice = data[0].close;
  const nearestResistance = Math.min(...resistanceLevels);
  const nearestSupport = Math.max(...supportLevels);
  
  const distanceToResistance = ((nearestResistance - currentPrice) / currentPrice) * 100;
  const distanceToSupport = ((currentPrice - nearestSupport) / currentPrice) * 100;
  
  const currentPosition = 
    distanceToResistance <= 3 ? 'near_resistance' :
    distanceToSupport <= 3 ? 'near_support' :
    'middle';
  
  return {
    resistanceLevels: resistanceLevels.map(l => Math.round(l * 100) / 100),
    supportLevels: supportLevels.map(l => Math.round(l * 100) / 100),
    currentPosition,
  };
}
