# Gemini API 키 Fallback 기능

## 개요

Gemini API 키를 여러 개 설정하여, 하나가 실패하거나 오류가 발생할 경우 자동으로 다른 키를 사용하는 상호보완 기능을 구현했습니다.

## 환경 변수 설정

`.env` 또는 `.env.local` 파일에 다음 형식으로 API 키를 설정하세요:

```env
# Primary API Key (필수)
GEMINI_API_KEY=your_primary_api_key_here

# Fallback API Keys (선택사항, 여러 개 가능)
GEMINI_API_KEY_2=your_fallback_api_key_1_here
GEMINI_API_KEY_3=your_fallback_api_key_2_here
# ... 더 많은 키 추가 가능
```

## 동작 방식

### 1. 키 우선순위

1. **Primary Key**: `GEMINI_API_KEY` (첫 번째 시도)
2. **Fallback Key 1**: `GEMINI_API_KEY_2` (두 번째 시도)
3. **Fallback Key 2**: `GEMINI_API_KEY_3` (세 번째 시도)
4. ... (계속 추가 가능)

### 2. Fallback 조건

다음 오류가 발생하면 자동으로 다음 키로 전환합니다:

- **429 (Rate Limit)**: API 호출 한도 초과
- **503 (Service Unavailable)**: 서비스 일시 중단
- **Quota 관련 오류**: 할당량 초과
- **Rate Limit 관련 메시지**: "rate limit", "quota" 등 포함된 오류

### 3. 재시도 불가능한 오류

다음 오류는 즉시 throw되어 fallback을 시도하지 않습니다:

- **401 (Unauthorized)**: 잘못된 API 키
- **400 (Bad Request)**: 잘못된 요청
- **기타 인증/권한 오류**

## 구현 상세

### `lib/gemini-client.ts`

#### `getGeminiApiKeys()`
- 환경 변수에서 모든 Gemini API 키를 수집
- Primary + Fallback 키들을 배열로 반환

#### `callGeminiWithFallback<T>()`
- 여러 API 키로 순차적으로 시도
- 재시도 가능한 오류인지 판단
- 모든 키 실패 시 명확한 오류 메시지 반환

### `app/api/analyze/route.ts`

- `generateAIReportsBatch` 호출 시 `callGeminiWithFallback` 사용
- 자동으로 여러 키를 시도하여 안정성 향상

## 사용 예시

```typescript
import { callGeminiWithFallback } from '@/lib/gemini-client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback 지원으로 Gemini API 호출
const result = await callGeminiWithFallback(
  async (genAI: GoogleGenerativeAI) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent("Hello");
    return await response.response.text();
  },
  { model: "gemini-2.5-flash" }
);
```

## 로그

각 키 사용 시도와 결과가 콘솔에 로그로 출력됩니다:

```
[Gemini] Primary API key 사용 시도...
[Gemini] API key 1 (Primary) 실패: Rate limit exceeded
[Gemini] 재시도 가능한 오류 감지, 다음 API key로 시도...
[Gemini] Fallback 1 API key 사용 시도...
[Gemini] Fallback API key (2번째)로 성공적으로 호출 완료
```

## 장점

1. **안정성 향상**: 하나의 키가 실패해도 다른 키로 자동 전환
2. **Rate Limit 완화**: 여러 키를 순환 사용하여 호출 한도 분산
3. **자동 복구**: 일시적 오류 시 자동으로 다른 키 사용
4. **확장성**: 필요한 만큼 Fallback 키 추가 가능

## 주의사항

1. **최소 1개 키 필요**: `GEMINI_API_KEY`는 반드시 설정해야 합니다
2. **키 유효성**: 모든 키가 유효한 Gemini API 키여야 합니다
3. **비용 관리**: 여러 키 사용 시 각 키의 사용량을 모니터링하세요
