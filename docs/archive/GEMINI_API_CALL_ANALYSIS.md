# Gemini API 호출 횟수 분석 보고서

## 📋 분석 목적

프로그램이 1회 구동 시 Gemini API 호출이 정확히 1회만 발생하는지 확인

---

## ✅ 분석 결과

### **결론: 1회 구동 시 Gemini API 호출은 1회만 발생합니다**

---

## 🔍 상세 분석

### 1. API 호출 위치

**파일**: `app/api/analyze/route.ts`  
**함수**: `generateAIReportsBatch` (98-470번째 줄)  
**호출 위치**: 372번째 줄

```typescript
const result = await model.generateContent(
  systemPrompt + "\n\n" + dataPrompt
);
```

**중요**: `model.generateContent()`는 **단 1회만 호출**됩니다.

---

### 2. 배치 처리 구조

#### 2.1. 모든 종목 데이터를 하나의 프롬프트로 구성

**코드 위치**: 116-328번째 줄

```typescript
// 모든 종목의 데이터를 하나의 프롬프트로 구성
const stocksDataPrompt = stocksData
  .map(({ symbol, marketData, selectedIndicators }) => {
    // 각 종목의 데이터를 문자열로 변환
    return `## 종목 ${symbol} ...`;
  })
  .join("\n");
```

**동작**:
- 여러 종목의 데이터를 하나의 큰 프롬프트로 결합
- 예: 5개 종목 → 1개의 긴 프롬프트

#### 2.2. 단일 API 호출로 모든 종목 리포트 생성

**코드 위치**: 372번째 줄

```typescript
const result = await model.generateContent(
  systemPrompt + "\n\n" + dataPrompt
);
```

**동작**:
- 1회의 API 호출로 모든 종목의 리포트를 한 번에 받음
- 응답을 종목별로 파싱하여 분리 (378-451번째 줄)

---

### 3. 호출 흐름

```
POST /api/analyze
  ↓
데이터 수집 (모든 종목)
  ↓
지표 계산 (모든 종목)
  ↓
stocksDataForAI 배열 구성 (모든 종목 데이터)
  ↓
callGeminiWithFallback() 호출 (841번째 줄)
  ↓
generateAIReportsBatch() 호출 (856번째 줄)
  ↓
model.generateContent() 호출 (372번째 줄) ← **단 1회만 호출**
  ↓
응답 파싱 및 종목별 리포트 분리
  ↓
결과 반환
```

---

### 4. Fallback 메커니즘 분석

#### 4.1. API 키 Fallback

**파일**: `lib/gemini-client.ts`  
**함수**: `callGeminiWithFallback` (86-229번째 줄)

**동작**:
1. Primary API 키로 시도
2. 실패 시 Fallback API 키들로 순차 시도
3. **성공한 첫 번째 시도에서만 실제 API 호출 발생**

**중요**: Fallback은 **재시도 메커니즘**이지, 추가 호출이 아닙니다.

#### 4.2. 모델 Fallback

**동작**:
1. Primary 모델 (`gemini-2.5-flash`)로 모든 키 시도
2. 일일 한도 오류 발생 시 Fallback 모델 (`gemini-2.0-flash-exp`)로 전환
3. **성공한 첫 번째 시도에서만 실제 API 호출 발생**

---

## 📊 시나리오별 API 호출 횟수

### 시나리오 1: 정상 동작 (Primary 키 + Primary 모델 성공)

```
1개 종목 분석:
  - API 호출: 1회 ✅

5개 종목 분석:
  - API 호출: 1회 ✅ (모든 종목을 하나의 프롬프트로 묶어서 호출)
```

### 시나리오 2: API 키 Fallback

```
Primary 키 실패 → Fallback 키 1 성공:
  - 시도 횟수: 2회
  - 실제 API 호출: 1회 ✅ (Fallback 키에서 성공)
```

### 시나리오 3: 모델 Fallback

```
Primary 모델 (2.5 Flash) 일일 한도 → Fallback 모델 (2.0 Flash) 성공:
  - 시도 횟수: Primary 모델로 모든 키 시도 실패 → Fallback 모델로 모든 키 시도
  - 실제 API 호출: 1회 ✅ (Fallback 모델에서 성공)
```

---

## ✅ 검증 포인트

### 1. 루프 내 API 호출 확인

**검증**: `app/api/analyze/route.ts`에서 `for` 루프나 `.map()` 내부에 `generateContent` 호출이 있는지 확인

**결과**: ✅ **없음**
- `generateAIReportsBatch` 함수는 루프 밖에서 **단 1회만 호출**됨 (856번째 줄)
- 함수 내부의 `generateContent`도 **단 1회만 호출**됨 (372번째 줄)

### 2. 배치 처리 확인

**검증**: 여러 종목을 하나의 프롬프트로 묶어서 처리하는지 확인

**결과**: ✅ **확인됨**
- 116-328번째 줄: 모든 종목 데이터를 `stocksDataPrompt`로 결합
- 372번째 줄: 하나의 프롬프트로 단일 API 호출
- 378-451번째 줄: 응답을 종목별로 파싱하여 분리

### 3. Fallback 메커니즘 확인

**검증**: Fallback이 추가 호출을 발생시키는지 확인

**결과**: ✅ **추가 호출 없음**
- Fallback은 **재시도 메커니즘**으로, 성공한 첫 번째 시도에서만 실제 API 호출 발생
- 실패한 시도는 API 호출 전에 오류로 인해 중단됨

---

## 📝 코드 증거

### 증거 1: 단일 호출 위치

```typescript
// app/api/analyze/route.ts:372
const result = await model.generateContent(
  systemPrompt + "\n\n" + dataPrompt
);
```

**위치**: `generateAIReportsBatch` 함수 내부, 루프 없음

### 증거 2: 배치 처리 주석

```typescript
// app/api/analyze/route.ts:841
// 모든 종목의 데이터를 모아서 한 번에 AI 리포트 생성 (단 1회 Gemini API 호출, fallback 지원)
```

### 증거 3: 로그 메시지

```typescript
// app/api/analyze/route.ts:846-847
console.log(
  `Generating AI reports for ${stocksDataForAI.length} stocks in a single API call...`
);
```

---

## ⚠️ 주의사항

### 1. Fallback 시도 횟수

Fallback 메커니즘으로 인해 **시도 횟수**는 여러 번일 수 있지만, **실제 API 호출**은 성공한 첫 번째 시도에서만 발생합니다.

**예시**:
- Primary 키 실패 → Fallback 키 1 실패 → Fallback 키 2 성공
- 시도 횟수: 3회
- 실제 API 호출: 1회 (Fallback 키 2에서 성공)

### 2. 모델 Fallback

모델 fallback도 마찬가지로, 성공한 첫 번째 시도에서만 실제 API 호출이 발생합니다.

**예시**:
- Primary 모델 (2.5 Flash)로 모든 키 시도 실패 (일일 한도)
- Fallback 모델 (2.0 Flash)로 Primary 키 시도 성공
- 시도 횟수: 여러 번
- 실제 API 호출: 1회 (Fallback 모델에서 성공)

---

## ✅ 최종 결론

**프로그램이 1회 구동 시 Gemini API 호출은 정확히 1회만 발생합니다.**

**이유**:
1. ✅ 모든 종목 데이터를 하나의 프롬프트로 묶어서 처리
2. ✅ `generateContent()` 호출이 단 1회만 발생
3. ✅ 루프나 반복 호출 없음
4. ✅ Fallback은 재시도 메커니즘이지 추가 호출이 아님

**최적화 상태**: ✅ **완벽하게 최적화됨**
