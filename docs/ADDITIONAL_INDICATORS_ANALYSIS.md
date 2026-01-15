# 추가 가능한 분석 지표 면밀 분석

## 현재 수집 중인 데이터

### 1. 기본 가격 데이터
- ✅ `price`: 현재가
- ✅ `change`: 변동
- ✅ `changePercent`: 변동률
- ✅ `volume`: 거래량
- ✅ `marketCap`: 시가총액 (선택)

### 2. 과거 데이터 (historicalData)
- ✅ `date`: 날짜
- ✅ `close`: 종가 (120일치)
- ✅ `volume`: 거래량 (120일치)

### 3. KRX API에서 추가 수집 가능한 데이터
- ✅ `TDD_OPNPRC`: 시가
- ✅ `TDD_HGPRC`: 고가
- ✅ `TDD_LWPRC`: 저가
- ✅ `ACC_TRDVAL`: 거래대금
- ✅ `MKTCAP`: 시가총액
- ✅ `LIST_SHRS`: 상장주식수

### 4. ETF 특화 데이터 (KRX API)
- ✅ `NAV`: 순자산가치(NAV)
- ✅ `INVSTASST_NETASST_TOT`: 순자산총액
- ✅ `IDX_IND_NM`: 기초지수_지수명
- ✅ `OBJ_STKPRC_IDX`: 기초지수_종가
- ✅ `CMPPREVDD_IDX`: 기초지수_대비
- ✅ `FLUC_RT_IDX`: 기초지수_등락률

### 5. 외부 데이터
- ✅ `VIX`: 공포/탐욕 지수
- ✅ `exchangeRate`: 환율 (USD/KRW)
- ✅ `news`: 뉴스 (최근 5개)
- ✅ `supplyDemand`: 수급 데이터 (한국 주식만)

### 6. Yahoo Finance / Finnhub에서 추가 수집 가능
- ⚠️ `high`: 고가 (historical 데이터에 포함되어 있으나 현재 미사용)
- ⚠️ `low`: 저가 (historical 데이터에 포함되어 있으나 현재 미사용)
- ⚠️ `open`: 시가 (historical 데이터에 포함되어 있으나 현재 미사용)

---

## 추가 가능한 분석 지표 분석

### 1. 눌림목 여부 (Support Level Detection) ⭐⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 고가/저가 데이터 (⚠️ 수집 가능하나 현재 미사용)

**계산 방법**:
```typescript
/**
 * 눌림목 여부 판단
 * - 최근 N일간의 저점들을 찾아 지지선 형성 여부 확인
 * - 현재가가 지지선 근처에 있는지 확인
 */
function detectSupportLevel(
  historicalData: Array<{ date: string; close: number; low?: number }>,
  currentPrice: number,
  period: number = 20
): {
  isNearSupport: boolean;
  supportLevel: number;
  distanceFromSupport: number; // %
} {
  // 최근 N일간의 저점들 추출
  const lows = historicalData
    .slice(0, period)
    .map(d => d.low || d.close)
    .filter(l => l > 0);
  
  const minLow = Math.min(...lows);
  const supportLevel = minLow;
  const distanceFromSupport = ((currentPrice - supportLevel) / supportLevel) * 100;
  
  // 지지선 근처 (5% 이내)에 있으면 눌림목으로 판단
  const isNearSupport = distanceFromSupport >= -5 && distanceFromSupport <= 5;
  
  return {
    isNearSupport,
    supportLevel,
    distanceFromSupport,
  };
}
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 고가/저가 데이터 (Yahoo Finance historical에 포함)

**활용 가치**: ⭐⭐⭐⭐⭐
- 매수 타이밍 판단에 매우 유용
- AI 리포트에 "현재 눌림목 구간에 진입" 같은 분석 추가 가능

---

### 2. ETF 괴리율 (Premium/Discount) ⭐⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능** (ETF만)

**필요한 데이터**:
- 현재가 (✅ 보유)
- NAV (✅ KRX API에서 수집 가능)

**계산 방법**:
```typescript
/**
 * ETF 괴리율 계산
 * 괴리율(%) = ((시장 가격 - NAV) / NAV) × 100
 */
function calculateETFPremium(
  currentPrice: number,
  nav: number
): {
  premium: number; // 괴리율 (%)
  isPremium: boolean; // 프리미엄 여부
  isDiscount: boolean; // 할인 여부
} {
  if (nav === 0) {
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
```

**구현 난이도**: ⭐ (쉬움)
**추가 데이터 수집 필요**: NAV (KRX API에서 이미 수집 가능)

**활용 가치**: ⭐⭐⭐⭐⭐
- ETF 투자에 필수 지표
- 고평가/저평가 판단에 직접 활용

---

### 3. 추세선 (Trend Line) ⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 추세선 계산 (선형 회귀)
 * y = ax + b 형태의 추세선
 */
function calculateTrendLine(
  historicalData: Array<{ date: string; close: number }>,
  period: number = 20
): {
  slope: number; // 기울기 (양수: 상승 추세, 음수: 하락 추세)
  intercept: number; // y절편
  trendStrength: number; // 추세 강도 (0-1)
  currentTrend: 'upward' | 'downward' | 'sideways';
} {
  const data = historicalData.slice(0, period);
  const n = data.length;
  
  // 선형 회귀 계산
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  data.forEach((d, i) => {
    const x = i;
    const y = d.close;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 추세 강도 계산 (R²)
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  data.forEach((d, i) => {
    const y = d.close;
    const predicted = slope * i + intercept;
    ssRes += Math.pow(y - predicted, 2);
    ssTot += Math.pow(y - meanY, 2);
  });
  
  const trendStrength = 1 - (ssRes / ssTot);
  
  const currentTrend = 
    slope > 0.1 ? 'upward' :
    slope < -0.1 ? 'downward' :
    'sideways';
  
  return {
    slope: Math.round(slope * 100) / 100,
    intercept: Math.round(intercept * 100) / 100,
    trendStrength: Math.round(trendStrength * 100) / 100,
    currentTrend,
  };
}
```

**구현 난이도**: ⭐⭐⭐ (중상)
**추가 데이터 수집 필요**: 없음 (현재 데이터로 충분)

**활용 가치**: ⭐⭐⭐⭐
- 장기 추세 파악에 유용
- AI 리포트에 "상승 추세 지속 중" 같은 분석 추가 가능

---

### 4. 볼린저 밴드 (Bollinger Bands) ⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 볼린저 밴드 계산
 * - 중심선: 20일 이동평균
 * - 상단 밴드: 중심선 + (표준편차 × 2)
 * - 하단 밴드: 중심선 - (표준편차 × 2)
 */
function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): {
  upper: number; // 상단 밴드
  middle: number; // 중심선 (이동평균)
  lower: number; // 하단 밴드
  bandwidth: number; // 밴드폭
  position: number; // 현재가 위치 (0-1, 0=하단, 1=상단)
} {
  if (prices.length < period) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return {
      upper: avg,
      middle: avg,
      lower: avg,
      bandwidth: 0,
      position: 0.5,
    };
  }
  
  const recentPrices = prices.slice(0, period);
  const middle = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  // 표준편차 계산
  const variance = recentPrices.reduce((sum, price) => {
    return sum + Math.pow(price - middle, 2);
  }, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = middle + (stdDev * multiplier);
  const lower = middle - (stdDev * multiplier);
  const bandwidth = ((upper - lower) / middle) * 100;
  
  const currentPrice = prices[0];
  const position = (currentPrice - lower) / (upper - lower);
  
  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    position: Math.round(position * 100) / 100,
  };
}
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐⭐
- 변동성 측정 및 과매수/과매도 판단
- RSI와 함께 사용하면 더 정확한 분석 가능

---

### 5. MACD (Moving Average Convergence Divergence) ⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 지수이동평균(EMA) 계산
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices[0] || 0;
  }
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period - 1; i >= 0; i--) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * MACD 계산
 */
function calculateMACD(
  prices: number[]
): {
  macd: number; // MACD선 (12일 EMA - 26일 EMA)
  signal: number; // 시그널선 (MACD선의 9일 EMA)
  histogram: number; // 히스토그램 (MACD - Signal)
  trend: 'bullish' | 'bearish' | 'neutral';
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // MACD선의 9일 EMA 계산 (단순화: MACD 값들을 배열로 만들어 계산)
  // 실제로는 MACD 값들의 시계열이 필요하지만, 여기서는 근사값 사용
  const signal = calculateEMA([macd], 9); // 단순화
  
  const histogram = macd - signal;
  
  const trend = 
    macd > signal && histogram > 0 ? 'bullish' :
    macd < signal && histogram < 0 ? 'bearish' :
    'neutral';
  
  return {
    macd: Math.round(macd * 100) / 100,
    signal: Math.round(signal * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
    trend,
  };
}
```

**구현 난이도**: ⭐⭐⭐ (중상)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐⭐
- 추세 전환점 파악에 유용
- 매수/매도 타이밍 판단에 활용

---

### 6. 스토캐스틱 오실레이터 (Stochastic Oscillator) ⭐⭐⭐

**계산 가능 여부**: ⚠️ **부분 가능** (고가/저가 데이터 필요)

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 고가/저가 데이터 (⚠️ 수집 가능하나 현재 미사용)

**계산 방법**:
```typescript
/**
 * 스토캐스틱 오실레이터 계산
 * %K = [(현재가 - N일 중 최저가) / (N일 중 최고가 - N일 중 최저가)] × 100
 * %D = %K의 3일 이동평균
 */
function calculateStochastic(
  historicalData: Array<{ date: string; close: number; high?: number; low?: number }>,
  period: number = 14
): {
  k: number; // %K
  d: number; // %D
  isOverbought: boolean; // 과매수 (80 이상)
  isOversold: boolean; // 과매도 (20 이하)
} {
  const data = historicalData.slice(0, period);
  const currentPrice = data[0].close;
  
  // 고가/저가가 없으면 종가로 대체 (부정확하지만 근사값)
  const highs = data.map(d => d.high || d.close);
  const lows = data.map(d => d.low || d.close);
  
  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);
  
  const k = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // %D 계산 (단순화: 최근 3일의 %K 평균)
  const recentK = [k]; // 실제로는 여러 %K 값 필요
  const d = recentK.reduce((a, b) => a + b, 0) / recentK.length;
  
  return {
    k: Math.round(k * 100) / 100,
    d: Math.round(d * 100) / 100,
    isOverbought: k >= 80,
    isOversold: k <= 20,
  };
}
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 고가/저가 데이터 (Yahoo Finance historical에 포함)

**활용 가치**: ⭐⭐⭐
- RSI와 유사한 과매수/과매도 지표
- 고가/저가 데이터가 없으면 정확도 낮음

---

### 7. OBV (On-Balance Volume) ⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 과거 거래량 데이터 (✅ 보유)

**계산 방법**:
```typescript
/**
 * OBV 계산
 * - 주가 상승: OBV = 이전 OBV + 거래량
 * - 주가 하락: OBV = 이전 OBV - 거래량
 * - 주가 동일: OBV = 이전 OBV
 */
function calculateOBV(
  historicalData: Array<{ date: string; close: number; volume: number }>
): {
  obv: number; // 현재 OBV
  obvTrend: 'increasing' | 'decreasing' | 'stable'; // OBV 추세
  volumePriceDivergence: boolean; // 거래량-가격 괴리 여부
} {
  let obv = 0;
  let prevClose = historicalData[historicalData.length - 1].close;
  
  for (let i = historicalData.length - 2; i >= 0; i--) {
    const current = historicalData[i];
    const currentClose = current.close;
    const volume = current.volume;
    
    if (currentClose > prevClose) {
      obv += volume;
    } else if (currentClose < prevClose) {
      obv -= volume;
    }
    // 같으면 변화 없음
    
    prevClose = currentClose;
  }
  
  // OBV 추세 판단 (최근 5일)
  const recentOBVs: number[] = []; // 실제로는 계산 과정에서 저장 필요
  const obvTrend = 
    recentOBVs.length >= 2 && recentOBVs[0] > recentOBVs[recentOBVs.length - 1] ? 'increasing' :
    recentOBVs.length >= 2 && recentOBVs[0] < recentOBVs[recentOBVs.length - 1] ? 'decreasing' :
    'stable';
  
  return {
    obv,
    obvTrend,
    volumePriceDivergence: false, // 추가 계산 필요
  };
}
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐
- 거래량과 가격의 관계 분석
- 매수/매도 압력 판단

---

### 8. 변동성 지표 (Volatility) ⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 고가/저가 데이터 (⚠️ 선택사항, 더 정확한 계산 가능)

**계산 방법**:
```typescript
/**
 * 변동성 계산 (표준편차 기반)
 */
function calculateVolatility(
  prices: number[],
  period: number = 20
): {
  volatility: number; // 변동성 (%)
  annualizedVolatility: number; // 연율화 변동성 (%)
  volatilityRank: 'low' | 'medium' | 'high'; // 변동성 등급
} {
  if (prices.length < period) {
    return {
      volatility: 0,
      annualizedVolatility: 0,
      volatilityRank: 'low',
    };
  }
  
  const recentPrices = prices.slice(0, period);
  const returns = [];
  
  for (let i = 1; i < recentPrices.length; i++) {
    const returnRate = (recentPrices[i - 1] - recentPrices[i]) / recentPrices[i];
    returns.push(returnRate);
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
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐⭐
- 리스크 측정에 유용
- 변동성이 높으면 수익 기회도 많지만 위험도 큼

---

### 9. 모멘텀 지표 (Momentum) ⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 모멘텀 계산
 * 모멘텀 = 현재가 - N일 전 주가
 */
function calculateMomentum(
  prices: number[],
  period: number = 10
): {
  momentum: number; // 모멘텀 값
  momentumPercent: number; // 모멘텀 (%)
  trend: 'positive' | 'negative' | 'neutral'; // 모멘텀 추세
} {
  if (prices.length < period + 1) {
    return {
      momentum: 0,
      momentumPercent: 0,
      trend: 'neutral',
    };
  }
  
  const currentPrice = prices[0];
  const pastPrice = prices[period];
  
  const momentum = currentPrice - pastPrice;
  const momentumPercent = (momentum / pastPrice) * 100;
  
  const trend = 
    momentumPercent > 2 ? 'positive' :
    momentumPercent < -2 ? 'negative' :
    'neutral';
  
  return {
    momentum: Math.round(momentum * 100) / 100,
    momentumPercent: Math.round(momentumPercent * 100) / 100,
    trend,
  };
}
```

**구현 난이도**: ⭐ (쉬움)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐
- 단기 추세 강도 측정
- 상승/하락 모멘텀 파악

---

### 10. 거래량 지표 (Volume Indicators) ⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 거래량 데이터 (✅ 보유)
- 현재 거래량 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 거래량 이동평균 및 비율
 */
function calculateVolumeIndicators(
  volumes: number[],
  period: number = 20
): {
  averageVolume: number; // 평균 거래량
  volumeRatio: number; // 현재 거래량 / 평균 거래량
  isHighVolume: boolean; // 고거래량 여부 (1.5배 이상)
  volumeTrend: 'increasing' | 'decreasing' | 'stable'; // 거래량 추세
} {
  if (volumes.length < period) {
    return {
      averageVolume: volumes[0] || 0,
      volumeRatio: 1,
      isHighVolume: false,
      volumeTrend: 'stable',
    };
  }
  
  const recentVolumes = volumes.slice(0, period);
  const averageVolume = recentVolumes.reduce((a, b) => a + b, 0) / period;
  const currentVolume = volumes[0];
  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
  
  const isHighVolume = volumeRatio >= 1.5;
  
  // 거래량 추세 (최근 5일)
  const recent5 = volumes.slice(0, 5);
  const volumeTrend = 
    recent5[0] > recent5[recent5.length - 1] ? 'increasing' :
    recent5[0] < recent5[recent5.length - 1] ? 'decreasing' :
    'stable';
  
  return {
    averageVolume: Math.round(averageVolume),
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    isHighVolume,
    volumeTrend,
  };
}
```

**구현 난이도**: ⭐ (쉬움)
**추가 데이터 수집 필요**: 없음

**활용 가치**: ⭐⭐⭐
- 거래량과 가격의 관계 분석
- 고거래량일 때 추세 신뢰도 높음

---

### 11. 금리 (Interest Rate) ⭐⭐⭐

**계산 가능 여부**: ⚠️ **별도 API 필요**

**필요한 데이터**:
- 한국은행 기준금리 (별도 API 필요)
- CD 금리 (별도 API 필요)

**데이터 소스**:
- 한국은행 ECOS API: https://ecos.bok.or.kr/api/
- 무료 API 제공 (회원가입 및 API 키 발급 필요)

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 한국은행 ECOS API 연동

**활용 가치**: ⭐⭐⭐
- 금리 상승 시 주식 시장에 부정적 영향
- 장기 투자 판단에 유용

---

### 12. 저항선/지지선 (Resistance/Support Levels) ⭐⭐⭐⭐

**계산 가능 여부**: ✅ **가능** (고가/저가 데이터 있으면 더 정확)

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 고가/저가 데이터 (⚠️ 선택사항)

**계산 방법**:
```typescript
/**
 * 저항선/지지선 계산
 * - 저항선: 최근 N일간의 고점들
 * - 지지선: 최근 N일간의 저점들
 */
function calculateSupportResistance(
  historicalData: Array<{ date: string; close: number; high?: number; low?: number }>,
  period: number = 60
): {
  resistanceLevels: number[]; // 저항선 레벨들
  supportLevels: number[]; // 지지선 레벨들
  currentPosition: 'near_resistance' | 'near_support' | 'middle'; // 현재 위치
} {
  const data = historicalData.slice(0, period);
  
  // 고점/저점 추출
  const highs = data.map(d => d.high || d.close);
  const lows = data.map(d => d.low || d.close);
  
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
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 고가/저가 데이터 (선택사항)

**활용 가치**: ⭐⭐⭐⭐
- 매수/매도 타이밍 판단에 매우 유용
- AI 리포트에 "지지선 근처에서 반등 가능" 같은 분석 추가

---

### 13. 가격 채널 (Price Channel) ⭐⭐⭐

**계산 가능 여부**: ✅ **가능**

**필요한 데이터**:
- 과거 종가 데이터 (✅ 보유)
- 고가/저가 데이터 (⚠️ 선택사항)

**계산 방법**:
```typescript
/**
 * 가격 채널 계산
 * - 상단선: N일간 최고가
 * - 하단선: N일간 최저가
 */
function calculatePriceChannel(
  historicalData: Array<{ date: string; close: number; high?: number; low?: number }>,
  period: number = 20
): {
  upperChannel: number; // 상단 채널
  lowerChannel: number; // 하단 채널
  channelWidth: number; // 채널 폭 (%)
  position: number; // 현재 위치 (0-1)
} {
  const data = historicalData.slice(0, period);
  
  const highs = data.map(d => d.high || d.close);
  const lows = data.map(d => d.low || d.close);
  
  const upperChannel = Math.max(...highs);
  const lowerChannel = Math.min(...lows);
  const channelWidth = ((upperChannel - lowerChannel) / lowerChannel) * 100;
  
  const currentPrice = data[0].close;
  const position = (currentPrice - lowerChannel) / (upperChannel - lowerChannel);
  
  return {
    upperChannel: Math.round(upperChannel * 100) / 100,
    lowerChannel: Math.round(lowerChannel * 100) / 100,
    channelWidth: Math.round(channelWidth * 100) / 100,
    position: Math.round(position * 100) / 100,
  };
}
```

**구현 난이도**: ⭐ (쉬움)
**추가 데이터 수집 필요**: 고가/저가 데이터 (선택사항)

**활용 가치**: ⭐⭐⭐
- 변동 범위 파악
- 돌파 여부 판단

---

### 14. ATR (Average True Range) - 변동성 측정 ⭐⭐⭐

**계산 가능 여부**: ⚠️ **부분 가능** (고가/저가 데이터 필요)

**필요한 데이터**:
- 고가/저가 데이터 (⚠️ 수집 가능하나 현재 미사용)
- 전일 종가 (✅ 보유)

**계산 방법**:
```typescript
/**
 * ATR 계산
 * True Range = max(고가-저가, |고가-전일종가|, |저가-전일종가|)
 * ATR = True Range의 N일 이동평균
 */
function calculateATR(
  historicalData: Array<{ date: string; close: number; high?: number; low?: number }>,
  period: number = 14
): {
  atr: number; // ATR 값
  atrPercent: number; // ATR (%)
  volatilityLevel: 'low' | 'medium' | 'high'; // 변동성 수준
} {
  // 고가/저가가 없으면 종가로 대체 (부정확)
  const trueRanges: number[] = [];
  
  for (let i = 1; i < Math.min(historicalData.length, period + 1); i++) {
    const current = historicalData[i - 1];
    const previous = historicalData[i];
    
    const high = current.high || current.close;
    const low = current.low || current.close;
    const prevClose = previous.close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  const atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  const currentPrice = historicalData[0].close;
  const atrPercent = (atr / currentPrice) * 100;
  
  const volatilityLevel = 
    atrPercent < 2 ? 'low' :
    atrPercent < 5 ? 'medium' :
    'high';
  
  return {
    atr: Math.round(atr * 100) / 100,
    atrPercent: Math.round(atrPercent * 100) / 100,
    volatilityLevel,
  };
}
```

**구현 난이도**: ⭐⭐ (중)
**추가 데이터 수집 필요**: 고가/저가 데이터

**활용 가치**: ⭐⭐⭐
- 변동성 측정에 유용
- 손절가 설정에 활용 가능

---

### 15. 거래대금 지표 (Trading Value Indicators) ⭐⭐⭐

**계산 가능 여부**: ✅ **가능** (KRX API에서 거래대금 수집 가능)

**필요한 데이터**:
- 거래대금 (✅ KRX API에서 수집 가능: `ACC_TRDVAL`)
- 거래량 (✅ 보유)

**계산 방법**:
```typescript
/**
 * 거래대금 관련 지표
 */
function calculateTradingValueIndicators(
  currentTradingValue: number, // 현재 거래대금
  averageTradingValue: number, // 평균 거래대금
  marketCap?: number // 시가총액
): {
  tradingValueRatio: number; // 거래대금 비율
  turnoverRate?: number; // 회전율 (%)
  isHighTradingValue: boolean; // 고거래대금 여부
} {
  const tradingValueRatio = averageTradingValue > 0 
    ? currentTradingValue / averageTradingValue 
    : 1;
  
  const turnoverRate = marketCap && marketCap > 0
    ? (currentTradingValue / marketCap) * 100
    : undefined;
  
  const isHighTradingValue = tradingValueRatio >= 1.5;
  
  return {
    tradingValueRatio: Math.round(tradingValueRatio * 100) / 100,
    turnoverRate: turnoverRate ? Math.round(turnoverRate * 100) / 100 : undefined,
    isHighTradingValue,
  };
}
```

**구현 난이도**: ⭐ (쉬움)
**추가 데이터 수집 필요**: 거래대금 (KRX API에서 이미 수집 가능)

**활용 가치**: ⭐⭐⭐
- 시장 참여도 측정
- 유동성 판단

---

## 우선순위별 추천 지표

### 즉시 구현 가능 (추가 데이터 수집 불필요) ⭐⭐⭐⭐⭐

1. **ETF 괴리율** - ETF 전용, NAV 데이터 이미 수집 가능
2. **볼린저 밴드** - 종가 데이터만으로 계산 가능
3. **MACD** - 종가 데이터만으로 계산 가능
4. **모멘텀 지표** - 종가 데이터만으로 계산 가능
5. **변동성 지표** - 종가 데이터만으로 계산 가능
6. **거래량 지표** - 거래량 데이터 이미 보유
7. **거래대금 지표** - KRX API에서 거래대금 수집 가능

### 추가 데이터 수집 후 구현 가능 ⭐⭐⭐⭐

8. **눌림목 여부** - 고가/저가 데이터 필요
9. **스토캐스틱** - 고가/저가 데이터 필요
10. **저항선/지지선** - 고가/저가 데이터 있으면 더 정확
11. **ATR** - 고가/저가 데이터 필요

### 별도 API 연동 필요 ⭐⭐⭐

12. **금리** - 한국은행 ECOS API 연동 필요

---

## 구현 권장 순서

### Phase 1: 즉시 구현 가능 (높은 가치)
1. ETF 괴리율
2. 볼린저 밴드
3. 변동성 지표
4. 거래량 지표

### Phase 2: 고가/저가 데이터 수집 후
5. 눌림목 여부
6. 저항선/지지선
7. ATR

### Phase 3: 고급 지표
8. MACD
9. 모멘텀 지표
10. 추세선

### Phase 4: 외부 데이터 연동
11. 금리 (한국은행 ECOS API)

---

## 데이터 수집 개선 사항

### Yahoo Finance historical 데이터 확장

**현재**: `close`, `volume`만 사용
**개선**: `high`, `low`, `open`도 수집하여 저장

```typescript
// lib/finance.ts 수정 필요
const historicalData = historical
  .filter(h => h.close !== null && h.close !== undefined && !isNaN(h.close) && h.close > 0)
  .reverse()
  .map(h => ({
    date: h.date.toISOString().split('T')[0],
    close: h.close,
    volume: h.volume || 0,
    high: h.high || h.close, // 추가
    low: h.low || h.close, // 추가
    open: h.open || h.close, // 추가
  }));
```

### StockData 인터페이스 확장

```typescript
export interface StockData {
  // ... 기존 필드
  historicalData: Array<{
    date: string;
    close: number;
    volume: number;
    high?: number; // 추가
    low?: number; // 추가
    open?: number; // 추가
  }>;
}
```

---

## 결론

### 즉시 구현 가능한 지표 (7개)
1. ETF 괴리율 ⭐⭐⭐⭐⭐
2. 볼린저 밴드 ⭐⭐⭐⭐
3. MACD ⭐⭐⭐⭐
4. 모멘텀 지표 ⭐⭐⭐
5. 변동성 지표 ⭐⭐⭐⭐
6. 거래량 지표 ⭐⭐⭐
7. 거래대금 지표 ⭐⭐⭐

### 추가 데이터 수집 후 구현 가능 (4개)
8. 눌림목 여부 ⭐⭐⭐⭐⭐
9. 스토캐스틱 ⭐⭐⭐
10. 저항선/지지선 ⭐⭐⭐⭐
11. ATR ⭐⭐⭐

### 별도 API 연동 필요 (1개)
12. 금리 ⭐⭐⭐

**총 12개의 추가 지표 구현 가능**
