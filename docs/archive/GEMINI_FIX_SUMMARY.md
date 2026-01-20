# Gemini API 반복 호출 문제 및 수정 사항

## 🔍 발견된 문제

### 문제 위치
**파일**: `app/api/analyze/route.ts`  
**라인**: 162-216번째 줄 (for 루프 내)

### 문제점
```typescript
// 각 종목별로 데이터 처리 및 AI 리포트 생성
for (const symbol of stocks) {
  ...
  // AI 리포트 생성 (딜레이 없이 연속 호출)
  aiReport = await generateAIReport(symbol, marketData, periodKorean, genAI);
  ...
}
```

**문제:**
1. **연속 호출**: 각 종목마다 Gemini API를 **딜레이 없이 연속으로 호출**
2. **Rate Limit 빠른 소진**: 5개 종목 선택 시 → 5번 연속 호출 → 무료 티어(20회/일) 빠르게 소진
3. **딜레이 없음**: API 호출 사이에 대기 시간이 없어서 rate limit에 즉시 도달

### 시나리오 예시
```
사용자가 5개 종목 선택:
종목 1: Gemini API 호출 (0초)
종목 2: Gemini API 호출 (0초 후) ← 딜레이 없음!
종목 3: Gemini API 호출 (0초 후) ← 딜레이 없음!
종목 4: Gemini API 호출 (0초 후) ← 딜레이 없음!
종목 5: Gemini API 호출 (0초 후) ← 딜레이 없음!

→ 5번 연속 호출로 인해 rate limit 즉시 도달
```

---

## ✅ 수정 사항

### 1. API 호출 사이에 딜레이 추가
```typescript
// AI 리포트 생성
// ⚠️ Rate Limit 방지: 각 Gemini API 호출 사이에 딜레이 추가
// 첫 번째 종목이 아니면 2초 대기 (무료 티어 보호)
if (i > 0) {
  console.log(`Waiting 2 seconds before next Gemini API call to avoid rate limit...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

**효과:**
- 5개 종목 선택 시: 총 8초 딜레이 (2초 × 4회)
- Rate limit 완화

### 2. Rate Limit 오류 시 조기 종료
```typescript
// Rate limit 오류인 경우, 이후 종목들의 리포트 생성을 건너뛰고 데이터만 반환
if (error instanceof Error && 
    (error.message.includes('429') || 
     error.message.includes('quota') || 
     error.message.includes('한도'))) {
  // 남은 종목들은 데이터만 추가하고 루프 종료
  break;
}
```

**효과:**
- Rate limit 도달 시 불필요한 추가 호출 방지
- 남은 종목들은 데이터만 반환 (AI 리포트 없음)

---

## 📊 수정 전/후 비교

### 수정 전
- **호출 패턴**: 연속 호출 (딜레이 0초)
- **5개 종목**: 5번 연속 호출 → 즉시 rate limit 도달
- **예상 시간**: ~10-25초 (API 응답 시간만)

### 수정 후
- **호출 패턴**: 각 호출 사이 2초 딜레이
- **5개 종목**: 5번 호출 (총 8초 딜레이) → rate limit 완화
- **예상 시간**: ~18-33초 (딜레이 + API 응답 시간)
- **Rate limit 도달 시**: 즉시 종료하여 불필요한 호출 방지

---

## 🎯 추가 개선 사항 (선택사항)

### 1. 딜레이 시간 조정
현재 2초 딜레이를 환경 변수로 설정 가능하게:
```typescript
const GEMINI_DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS || '2000', 10);
```

### 2. 재시도 로직
Rate limit 오류 발생 시 자동 재시도 (지수 백오프):
```typescript
async function generateAIReportWithRetry(...) {
  let retries = 3;
  while (retries > 0) {
    try {
      return await generateAIReport(...);
    } catch (error) {
      if (error.status === 429 && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // 1초, 2초, 4초
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
      } else {
        throw error;
      }
    }
  }
}
```

### 3. 배치 처리
여러 종목의 리포트를 하나의 프롬프트로 묶어서 생성 (프롬프트 길이 제한 고려 필요)

---

## 📝 테스트 결과

### 수정 전
- ❌ 5개 종목 선택 시 → 5번 연속 호출 → Rate limit 즉시 도달

### 수정 후
- ✅ 각 호출 사이 2초 딜레이 추가
- ✅ Rate limit 도달 시 조기 종료
- ✅ 남은 종목들은 데이터만 반환

---

## 💡 권장 사항

1. **딜레이 시간**: 현재 2초는 적절하지만, 필요시 조정 가능
2. **모니터링**: Gemini API 사용량 모니터링 추가
3. **캐싱**: 동일 종목/기간 조합에 대한 결과 캐싱 고려
4. **사용자 알림**: Rate limit 도달 시 사용자에게 명확한 안내
