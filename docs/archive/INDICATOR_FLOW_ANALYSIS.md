# 분석 지표 수집 및 전달 흐름 분석

## 현재 구현 상태 분석

### 1. 프론트엔드 → API 전달

**위치**: `app/page.tsx`

```typescript
const request: AnalyzeRequest = {
  stocks: validStocks,
  period,
  historicalPeriod,
  indicators, // ✅ 올바르게 전달됨
};
```

**확인 사항**: ✅ 정상
- 사용자가 선택한 지표들이 `indicators` 객체에 포함되어 API로 전달됨
- 로깅 추가: `console.log('[Frontend] Sending request with indicators:', indicators)`

---

### 2. API에서 지표 수집 및 marketData 구성

**위치**: `app/api/analyze/route.ts` (line 450-466)

```typescript
const marketData: AnalyzeResult["marketData"] = {
  price: stockData.price,
  change: stockData.change,
  changePercent: stockData.changePercent,
  volume: stockData.volume,
  marketCap: stockData.marketCap,
  ...(indicators.rsi && { rsi: stockData.rsi }), // ✅ 조건부 포함
  ...(indicators.movingAverages && {
    movingAverages: stockData.movingAverages, // ✅ 조건부 포함
  }),
  ...(indicators.disparity && { disparity: stockData.disparity }), // ✅ 조건부 포함
  ...(supplyDemand && { supplyDemand }), // ✅ 조건부 포함
  ...(indicators.fearGreed && vix !== null && { vix }), // ✅ 조건부 포함
  ...(indicators.exchangeRate && exchangeRate !== null && { exchangeRate }), // ✅ 조건부 포함
  ...(news.length > 0 && { news }), // ✅ 항상 포함 (있을 경우)
};
```

**확인 사항**: ✅ 정상
- `indicators.xxx`가 `true`일 때만 해당 지표가 `marketData`에 포함됨
- 로깅 추가: 각 종목별로 포함된 지표 확인

**주의사항**:
- `stockData`에는 항상 `rsi`, `movingAverages`, `disparity`가 포함되어 있음 (StockData 인터페이스)
- 하지만 `indicators.xxx`가 `false`면 `marketData`에 포함되지 않음
- 이는 올바른 동작임 (사용자가 선택하지 않은 지표는 제외)

---

### 3. Gemini 프롬프트 생성

**위치**: `app/api/analyze/route.ts` (line 86-151)

```typescript
const stocksDataPrompt = stocksData
  .map(({ symbol, marketData }) => {
    return `
## 종목 ${symbol}
...
${marketData.rsi !== undefined ? `**RSI(14)**: ${marketData.rsi}` : ""}
${marketData.movingAverages ? `**이동평균선**: ...` : ""}
${marketData.disparity !== undefined ? `**이격도(20일 기준)**: ${marketData.disparity}%` : ""}
${marketData.supplyDemand ? `**수급 데이터**: ...` : ""}
${marketData.vix !== undefined ? `**VIX 지수**: ${marketData.vix}` : ""}
${marketData.exchangeRate ? `**환율(USD/KRW)**: ${marketData.exchangeRate}` : ""}
`;
  })
```

**확인 사항**: ✅ 정상
- `marketData.xxx !== undefined`로 체크하여 프롬프트에 포함
- 로깅 추가: 각 종목별로 프롬프트에 포함된 지표 확인

---

## 지표별 상세 분석

### 1. RSI (Relative Strength Index)

**수집 위치**: `lib/finance.ts` (line 253)
```typescript
const rsi = calculateRSI(closes, 14);
```

**전달 조건**:
- `indicators.rsi === true` → `marketData.rsi`에 포함
- `marketData.rsi !== undefined` → Gemini 프롬프트에 포함

**확인**: ✅ 정상

---

### 2. 이동평균선 (Moving Averages)

**수집 위치**: `lib/finance.ts` (line 254-257)
```typescript
const ma5 = calculateMA(closes, 5);
const ma20 = calculateMA(closes, 20);
const ma60 = calculateMA(closes, 60);
const ma120 = calculateMA(closes, 120);
```

**전달 조건**:
- `indicators.movingAverages === true` → `marketData.movingAverages`에 포함
- `marketData.movingAverages` 존재 → Gemini 프롬프트에 포함

**확인**: ✅ 정상

---

### 3. 이격도 (Disparity)

**수집 위치**: `lib/finance.ts` (line 258)
```typescript
const disparity = calculateDisparity(currentPrice, ma20);
```

**전달 조건**:
- `indicators.disparity === true` → `marketData.disparity`에 포함
- `marketData.disparity !== undefined` → Gemini 프롬프트에 포함

**확인**: ✅ 정상

---

### 4. 수급 데이터 (Supply/Demand)

**수집 위치**: `app/api/analyze/route.ts` (line 435-441)
```typescript
let supplyDemand = undefined;
if (indicators.supplyDemand && isKoreaStock) {
  supplyDemand = await fetchKoreaSupplyDemand(koreaSymbol).catch(() => undefined);
}
```

**전달 조건**:
- `indicators.supplyDemand === true` && 한국 주식 → 수집 시도
- `supplyDemand` 존재 → `marketData.supplyDemand`에 포함
- `marketData.supplyDemand` 존재 → Gemini 프롬프트에 포함

**확인**: ✅ 정상
- 한국 주식이 아니면 수집하지 않음 (정상)
- 수집 실패 시 `undefined`로 처리 (정상)

---

### 5. VIX (공포/탐욕 지수)

**수집 위치**: `app/api/analyze/route.ts` (line 409-416)
```typescript
const vix = indicators.fearGreed
  ? await fetchVIX().catch(() => null)
  : Promise.resolve(null);
```

**전달 조건**:
- `indicators.fearGreed === true` → VIX 수집 시도
- `vix !== null` → `marketData.vix`에 포함
- `marketData.vix !== undefined` → Gemini 프롬프트에 포함

**확인**: ✅ 정상

---

### 6. 환율 (Exchange Rate)

**수집 위치**: `app/api/analyze/route.ts` (line 409-416)
```typescript
const exchangeRate = indicators.exchangeRate
  ? await fetchExchangeRate().catch(() => null)
  : Promise.resolve(null);
```

**전달 조건**:
- `indicators.exchangeRate === true` → 환율 수집 시도
- `exchangeRate !== null` → `marketData.exchangeRate`에 포함
- `marketData.exchangeRate` 존재 → Gemini 프롬프트에 포함

**확인**: ✅ 정상

---

## 결론

### ✅ 정상 작동 확인

1. **프론트엔드 → API**: 지표 선택 상태가 올바르게 전달됨
2. **API → marketData**: 선택된 지표만 조건부로 포함됨
3. **marketData → Gemini**: 포함된 지표만 프롬프트에 포함됨

### 로깅 추가

다음 위치에 로깅을 추가하여 실제 동작을 확인할 수 있음:

1. **프론트엔드**: `[Frontend] Sending request with indicators: {...}`
2. **API 수신**: `[Analyze API] Selected indicators: {...}`
3. **marketData 구성**: `[Analyze API] Market data for {symbol}: {...}`
4. **Gemini 프롬프트**: `[Gemini Prompt] Indicators included for {symbol}: [...]`

### 테스트 방법

1. 브라우저 개발자 도구 콘솔 열기
2. 일부 지표만 선택하여 분석 요청
3. 콘솔에서 로그 확인:
   - 프론트엔드에서 전달된 지표 확인
   - API에서 수신한 지표 확인
   - marketData에 포함된 지표 확인
   - Gemini 프롬프트에 포함된 지표 확인

---

## 잠재적 문제점 및 개선 사항

### 1. StockData 인터페이스

**현재**: `rsi`, `movingAverages`, `disparity`가 필수 필드
**문제**: 항상 계산되지만, 사용자가 선택하지 않으면 marketData에 포함되지 않음
**영향**: 없음 (정상 동작)

### 2. 지표 수집 실패 시 처리

**현재**: 
- RSI, MA, Disparity: 항상 계산됨 (실패 시 오류)
- Supply/Demand: 실패 시 `undefined` 반환
- VIX, ExchangeRate: 실패 시 `null` 반환

**개선 필요**: 없음 (현재 처리 방식 적절)

### 3. 프롬프트에 지표가 없을 때

**현재**: 지표가 없으면 프롬프트에 포함되지 않음
**영향**: Gemini가 해당 지표를 분석하지 않음 (정상 동작)

---

## 최종 확인 사항

- ✅ 사용자가 선택한 지표가 올바르게 수집됨
- ✅ 선택된 지표만 marketData에 포함됨
- ✅ marketData에 포함된 지표만 Gemini 프롬프트에 포함됨
- ✅ 로깅 추가로 실제 동작 확인 가능

**결론**: 현재 구현은 올바르게 작동하고 있습니다.
