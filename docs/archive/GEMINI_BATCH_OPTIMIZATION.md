# Gemini API 배치 최적화

## ✅ 개선 완료

### 변경 사항

**이전 방식 (문제):**
```typescript
// 각 종목마다 Gemini API 호출 (5개 종목 = 5번 호출)
for (const symbol of stocks) {
  aiReport = await generateAIReport(symbol, marketData, periodKorean, genAI);
}
```

**개선된 방식:**
```typescript
// 모든 종목의 데이터를 모아서 한 번에 Gemini API 호출 (5개 종목 = 1번 호출)
const stocksDataForAI = [...]; // 모든 종목 데이터 수집
aiReportsMap = await generateAIReportsBatch(stocksDataForAI, periodKorean, genAI);
```

---

## 📊 효과

### API 호출 횟수 비교

| 종목 수 | 이전 방식 | 개선된 방식 | 절감률 |
|---------|----------|-----------|--------|
| 1개 | 1회 | 1회 | 0% |
| 2개 | 2회 | 1회 | 50% |
| 3개 | 3회 | 1회 | 67% |
| 4개 | 4회 | 1회 | 75% |
| 5개 | 5회 | 1회 | 80% |

### Rate Limit 영향

- **이전**: 5개 종목 선택 시 → 5번 호출 → 무료 티어(20회/일) 빠르게 소진
- **개선**: 5개 종목 선택 시 → 1번 호출 → Rate limit 완화

---

## 🔧 구현 상세

### 1. 배치 리포트 생성 함수

```typescript
async function generateAIReportsBatch(
  stocksData: Array<{ symbol: string; marketData: AnalyzeResult['marketData'] }>,
  period: string,
  genAI: GoogleGenerativeAI
): Promise<Map<string, string>>
```

**기능:**
- 모든 종목의 데이터를 하나의 프롬프트로 구성
- 단 1회 Gemini API 호출
- 응답을 종목별로 파싱하여 Map으로 반환

### 2. 프롬프트 구조

```
다음 N개 종목의 데이터를 각각 분석해주세요:

## 종목 SYMBOL1
[데이터...]
---

## 종목 SYMBOL2
[데이터...]
---

응답 형식:
[종목: SYMBOL1]
---
[리포트1]

[종목: SYMBOL2]
---
[리포트2]
```

### 3. 파싱 로직

- 여러 패턴 지원 (유연한 파싱)
- 패턴 매칭 실패 시 전체 리포트를 첫 번째 종목에 할당
- 최소 길이 체크 (100자 이상)

---

## 🎯 장점

1. **Rate Limit 완화**: 호출 횟수 대폭 감소
2. **비용 절감**: API 호출 횟수 감소
3. **속도 향상**: 병렬 처리 대신 순차 처리지만 전체적으로 빠름
4. **일관성**: 모든 종목이 동일한 컨텍스트에서 분석

---

## ⚠️ 주의사항

1. **프롬프트 길이**: 종목이 많을수록 프롬프트가 길어짐 (Gemini 토큰 제한 고려)
2. **파싱 안정성**: Gemini 응답 형식이 일관되지 않을 수 있음 (다양한 패턴 지원)
3. **에러 처리**: 한 번의 호출 실패 시 모든 종목 리포트 실패 (현재는 에러 메시지로 처리)

---

## 📝 테스트 결과

- ✅ 단일 종목: 정상 작동
- ✅ 다중 종목: 정상 작동 (단 1회 API 호출)
- ✅ Rate limit 완화 효과 확인
