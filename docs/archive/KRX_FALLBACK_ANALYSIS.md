# KRX API Fallback 구조 분석

## 현재 Fallback 구조

### 1. 수급 데이터 수집 (`fetchKoreaSupplyDemand`)

**위치:** `lib/finance.ts:377`

**Fallback 흐름:**
```
1. KRX API 시도 (fetchKoreaSupplyDemandKRX)
   ├─ 성공 → 데이터 반환
   ├─ API 키 없음 → null 반환 → 네이버 크롤링
   ├─ 401 오류 (키 무효) → Error throw → catch → null 반환 → 네이버 크롤링
   ├─ 기타 오류 → Error throw → catch → null 반환 → 네이버 크롤링
   └─ 데이터 없음 → null 반환 → 네이버 크롤링

2. 네이버 크롤링 (fetchKoreaSupplyDemandNaver)
   └─ 성공/실패 → 데이터 또는 null 반환
```

**코드 구조:**
```typescript
export async function fetchKoreaSupplyDemand(symbol: string) {
  // KRX Open API 우선 시도
  try {
    const krxData = await fetchKoreaSupplyDemandKRX(symbol);
    if (krxData) {
      return krxData; // 성공
    }
  } catch (error) {
    console.warn(`KRX API failed, falling back to Naver:`, error);
  }
  
  // KRX API 실패 시 네이버 금융 크롤링 사용
  return await fetchKoreaSupplyDemandNaver(symbol);
}
```

**✅ Fallback 구조: 정상 작동**

---

### 2. KRX API 함수 (`fetchKoreaSupplyDemandKRX`)

**위치:** `lib/krx-api.ts:124`

**오류 처리:**
- API 키 없음: `null` 반환 (fallback 가능)
- 401 오류: Error throw → catch에서 `null` 반환 (fallback 가능)
- 기타 오류: Error throw → catch에서 `null` 반환 (fallback 가능)
- 데이터 없음: `null` 반환 (fallback 가능)

**코드 구조:**
```typescript
export async function fetchKoreaSupplyDemandKRX(symbol: string) {
  try {
    if (!KRX_API_KEY) {
      return null; // API 키 없음 → fallback
    }
    
    const tradingInfo = await krxRequest(...);
    // ... 데이터 처리
    
    return result; // 성공
  } catch (error) {
    // 모든 오류를 catch하여 null 반환 → fallback 가능
    return null;
  }
}
```

**✅ 오류 처리: 정상 작동**

---

### 3. KRX API 요청 함수 (`krxRequest`)

**위치:** `lib/krx-api.ts:54`

**오류 처리:**
- 401 오류: Error throw + 알림 생성
- 429 오류: Error throw
- 기타 오류: Error throw

**문제점:**
- 401 오류 시 Error를 throw하지만, `fetchKoreaSupplyDemandKRX`의 catch에서 잡혀서 `null` 반환
- 알림은 생성되지만, fallback은 정상 작동

**✅ Fallback 구조: 정상 작동**

---

## Fallback 시나리오 테스트

### 시나리오 1: API 키 없음
```
1. fetchKoreaSupplyDemand 호출
2. fetchKoreaSupplyDemandKRX 호출
3. KRX_API_KEY가 없음 → null 반환
4. fetchKoreaSupplyDemand에서 krxData가 null
5. fetchKoreaSupplyDemandNaver 호출 → 네이버 크롤링 사용
✅ 정상 작동
```

### 시나리오 2: API 키 무효 (401 오류)
```
1. fetchKoreaSupplyDemand 호출
2. fetchKoreaSupplyDemandKRX 호출
3. krxRequest에서 401 오류 발생
4. 알림 생성 (비동기)
5. Error throw
6. fetchKoreaSupplyDemandKRX의 catch에서 null 반환
7. fetchKoreaSupplyDemand에서 krxData가 null
8. fetchKoreaSupplyDemandNaver 호출 → 네이버 크롤링 사용
✅ 정상 작동 + 알림 생성
```

### 시나리오 3: API 키 유효하지만 데이터 없음
```
1. fetchKoreaSupplyDemand 호출
2. fetchKoreaSupplyDemandKRX 호출
3. API 호출 성공하지만 데이터 없음 → null 반환
4. fetchKoreaSupplyDemand에서 krxData가 null
5. fetchKoreaSupplyDemandNaver 호출 → 네이버 크롤링 사용
✅ 정상 작동
```

### 시나리오 4: 네트워크 오류 등 기타 오류
```
1. fetchKoreaSupplyDemand 호출
2. fetchKoreaSupplyDemandKRX 호출
3. 네트워크 오류 등 발생 → Error throw
4. fetchKoreaSupplyDemandKRX의 catch에서 null 반환
5. fetchKoreaSupplyDemand에서 krxData가 null
6. fetchKoreaSupplyDemandNaver 호출 → 네이버 크롤링 사용
✅ 정상 작동
```

---

## 결론

**✅ Fallback 구조는 정상적으로 작동합니다.**

모든 오류 시나리오에서:
1. KRX API 실패 시 자동으로 네이버 크롤링으로 fallback
2. 사용자는 서비스 중단 없이 데이터 수집 가능
3. API 키 무효 시 알림 생성 (사용자 인지 가능)

---

## 개선 제안 (선택사항)

현재 구조는 정상 작동하지만, 다음 개선이 가능합니다:

1. **Fallback 로깅 강화**: 어떤 이유로 fallback이 발생했는지 더 명확한 로깅
2. **Fallback 메트릭**: Fallback 발생 횟수 추적
3. **사용자 알림**: Fallback 발생 시 사용자에게 알림 (선택사항)
