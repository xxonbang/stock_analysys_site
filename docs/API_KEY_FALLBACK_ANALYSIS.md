# API 키 Fallback 로직 분석 보고서

## 📋 현재 상태 분석

### 1. 환경 변수 이름 불일치

**사용자 요구사항**: `GOOGLE_API_KEY_01`, `GOOGLE_API_KEY_02`  
**현재 코드**: `GEMINI_API_KEY_01`, `GEMINI_API_KEY_02`

**문제점**: 환경 변수 이름이 일치하지 않음

---

### 2. Default 키 우선순위 문제

**현재 동작**:
1. `GEMINI_API_KEY` (있으면 우선 사용)
2. `GEMINI_API_KEY_01`
3. `GEMINI_API_KEY_02`

**사용자 요구사항**: `GOOGLE_API_KEY_01`이 default 키여야 함

**문제점**: `GEMINI_API_KEY`가 있으면 `GEMINI_API_KEY_01`보다 우선 사용됨

---

### 3. Fallback 로직 분석

#### ✅ 정상 동작하는 부분

**일일 사용량 제한 오류 감지**:
```typescript
const isRetryableError = 
  errorCode === 429 ||
  statusCode === 429 ||
  errorMessage.toLowerCase().includes('quota') ||
  errorMessage.toLowerCase().includes('rate limit') ||
  errorMessage.toLowerCase().includes('resource exhausted') ||
  errorMessage.toLowerCase().includes('exceeded') ||
  errorMessage.toLowerCase().includes('limit');
```

**Fallback 동작**:
- 재시도 가능한 오류 발생 시 다음 키로 자동 전환
- 모든 키를 순차적으로 시도

#### ✅ 반대 상황도 동작함

**02 → 01 Fallback**:
- 키 배열이 `[01, 02]` 순서로 정렬됨
- 01이 실패하면 02로 시도
- 02가 실패하면 01로 시도 (이미 시도했으므로 실패)

**하지만**: 키 순서가 고정되어 있어서, 02가 먼저 실패해도 01로 돌아가지 않음

---

## 🔍 상세 분석

### 현재 Fallback 로직

```typescript
// 각 키로 순차적으로 시도
for (let i = 0; i < apiKeys.length; i++) {
  try {
    // API 호출
    const result = await operation(genAI, modelName);
    return result; // 성공 시 즉시 반환
  } catch (error) {
    // 재시도 가능한 오류인지 확인
    if (i < apiKeys.length - 1 && isRetryableError) {
      continue; // 다음 키로 시도
    }
    // 재시도 불가능한 오류는 즉시 throw
    if (!isRetryableError) {
      throw lastError;
    }
  }
}
```

**동작 방식**:
1. 키 배열 순서대로 시도: `[01, 02]`
2. 01 실패 → 02 시도
3. 02 실패 → 모든 키 실패 오류

**문제점**:
- 키 순서가 고정되어 있어서, 02가 먼저 실패해도 01로 돌아가지 않음
- 하지만 실제로는 키 배열이 `[01, 02]` 순서로 정렬되므로, 01이 항상 먼저 시도됨

---

## ✅ 수정 필요 사항

### 1. 환경 변수 이름 변경

`GEMINI_API_KEY_*` → `GOOGLE_API_KEY_*`

### 2. Default 키 우선순위 수정

`GOOGLE_API_KEY_01`을 default로 설정하고, `GEMINI_API_KEY` 우선순위 제거

### 3. Fallback 로직 검증

현재 로직은 이미 양방향으로 동작하지만, 명확성을 위해 검증 필요
