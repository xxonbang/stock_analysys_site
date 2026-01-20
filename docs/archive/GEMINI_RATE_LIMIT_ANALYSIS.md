# Gemini API 반복 호출 분석

## 🔍 발견된 문제

### 문제 위치: `app/api/analyze/route.ts` (162-216번째 줄)

```typescript
// 각 종목별로 데이터 처리 및 AI 리포트 생성
for (const symbol of stocks) {
  ...
  // AI 리포트 생성
  let aiReport = '';
  try {
    aiReport = await generateAIReport(symbol, marketData, periodKorean, genAI);
  } catch (error) {
    ...
  }
  ...
}
```

### 문제점

1. **연속 호출**: for 루프에서 각 종목마다 Gemini API를 **연속으로 빠르게 호출**
2. **딜레이 없음**: API 호출 사이에 딜레이가 없어서 rate limit에 빠르게 도달
3. **다중 종목 시 문제**: 5개 종목 선택 시 → 5번 연속 호출

### 시나리오

**사용자가 5개 종목을 선택한 경우:**
```
종목 1: Gemini API 호출 (즉시)
종목 2: Gemini API 호출 (즉시, 0초 후)
종목 3: Gemini API 호출 (즉시, 0초 후)
종목 4: Gemini API 호출 (즉시, 0초 후)
종목 5: Gemini API 호출 (즉시, 0초 후)
```

→ **5번 연속 호출로 인해 무료 티어(하루 20회)를 빠르게 소진**

---

## 💡 해결 방안

### 1. API 호출 사이에 딜레이 추가 (권장)

각 Gemini API 호출 사이에 1-2초 딜레이를 추가하여 rate limit을 완화합니다.

### 2. Rate Limit 체크 및 재시도 로직

429 오류 발생 시 자동으로 재시도하되, 적절한 대기 시간을 두는 로직 추가.

### 3. 배치 처리 최적화

여러 종목의 리포트를 하나의 프롬프트로 묶어서 한 번에 생성 (프롬프트 길이 제한 고려 필요).

---

## 📊 현재 호출 패턴

- **호출 위치**: `app/api/analyze/route.ts`의 `for` 루프 내
- **호출 빈도**: 종목 수만큼 연속 호출 (딜레이 없음)
- **최대 호출 수**: 5개 종목 = 5번 연속 호출
- **예상 소요 시간**: 각 호출당 ~2-5초, 총 ~10-25초

---

## ⚠️ Rate Limit 정보

- **무료 티어**: 하루 20회
- **모델**: gemini-2.5-flash
- **현재 상태**: Rate limit 도달
