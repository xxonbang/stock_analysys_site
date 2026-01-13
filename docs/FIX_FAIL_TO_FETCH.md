# 'fail to fetch' 오류 수정

## 문제

분석 시 'fail to fetch' 오류가 발생했습니다.

## 원인 분석

1. **동적 매핑 통합 후 오류 처리 부족**
   - `normalizeStockSymbolDynamic` 실패 시 적절한 fallback 없음
   - Python 스크립트 실행 실패 시 전체 프로세스 중단

2. **오류 메시지 전달 문제**
   - 상세한 오류 메시지가 사용자에게 전달되지 않음
   - 빈 Map 반환 시 명확한 오류 메시지 없음

## 수정 내용

### 1. `lib/finance-vercel.ts`

- **심볼 정규화 오류 처리 강화**
  - 동적 매핑 실패 시 정적 매핑으로 자동 fallback
  - 전체 정규화 실패 시 원본 심볼 사용

- **빈 결과 검증 추가**
  - 모든 종목이 실패한 경우 명확한 오류 메시지 반환
  - 부분 실패는 허용하되, 전체 실패는 오류로 처리

### 2. `lib/korea-stock-mapper-dynamic.ts`

- **오류 처리 개선**
  - `getStockListing` 실패 시 빈 배열 대신 오류 throw
  - `searchTickerByName`에서 오류 발생 시 null 반환 (상위에서 원본 사용)
  - `normalizeStockSymbolDynamic`에서 모든 단계에 try-catch 추가

- **안전한 검색 로직**
  - null/undefined 체크 강화
  - 빈 데이터 검증 추가

### 3. `app/api/analyze/route.ts`

- **Fallback 오류 처리 개선**
  - yahoo-finance2 fallback도 실패 시 명확한 오류 메시지
  - 중첩된 오류 처리로 사용자에게 더 나은 피드백 제공

## 수정된 오류 처리 흐름

```
1. 동적 매핑 시도
   ↓ 실패 시
2. 정적 매핑으로 fallback
   ↓ 실패 시
3. 원본 심볼 사용
   ↓ 실패 시
4. 명확한 오류 메시지 반환
```

## 테스트

- 동적 매핑 실패 시 정적 매핑으로 자동 전환 확인
- Python 스크립트 실패 시에도 정상 작동 확인
- 모든 종목 실패 시 명확한 오류 메시지 확인
