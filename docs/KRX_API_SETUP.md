# KRX API 설정 및 사용 가이드

## 현재 상태

### 사용 신청한 API
- ✅ **유가증권 일별매매정보 API** (사용 신청 완료)
- ✅ **ETF 일별매매정보 API** (사용 신청 완료)

### 승인 상태
- ⏳ **관리자 승인 대기 중**
- 승인 후 실제 데이터 수집 가능

---

## 승인 후 해야 할 작업

### 1. 실제 API 엔드포인트 확인

KRX Open API 마이페이지에서 승인된 API의 실제 엔드포인트를 확인하세요.

**확인 사항:**
- 유가증권 일별매매정보 API의 실제 엔드포인트 경로
- ETF 일별매매정보 API의 실제 엔드포인트 경로
- 요청 파라미터 구조
- 응답 데이터 구조

### 2. 코드 업데이트

`lib/krx-api.ts` 파일에서 다음 부분을 실제 API 구조에 맞게 수정:

#### 2.1 엔드포인트 경로 수정

```typescript
// 현재 (예상 구조)
const tradingInfo = await krxRequest<KRXStockDailyTradingInfo>(
  '/stock/daily-trading', // ⚠️ 실제 경로로 수정 필요
  { ... }
);

// 실제 엔드포인트로 변경 예시
const tradingInfo = await krxRequest<KRXStockDailyTradingInfo>(
  '/stock/daily-trading-info', // 실제 경로
  { ... }
);
```

#### 2.2 인터페이스 구조 수정

실제 API 응답 구조에 맞게 인터페이스를 수정:

```typescript
// 현재 예상 구조
interface KRXStockDailyTradingInfo {
  ISU_CD: string;
  ISU_NM: string;
  // ... 실제 응답 필드에 맞게 수정
}

// 실제 응답 구조 확인 후 수정
```

#### 2.3 파라미터 구조 확인

실제 API가 요구하는 파라미터 구조 확인:

```typescript
// 현재 예상 구조
{
  ISU_CD: symbol,
  STD_DD: todayStr,
}

// 실제 파라미터 구조에 맞게 수정 필요
```

---

## API 사용 방법

### 유가증권 일별매매정보 API

**용도:**
- 한국 주식(유가증권)의 일별 매매정보 수집
- 종가, 시가, 고가, 저가, 거래량 등
- 투자자별 매매동향 (포함 여부 확인 필요)

**사용 위치:**
- `fetchKoreaSupplyDemandKRX()` - 수급 데이터 수집
- `fetchKoreaStockInfoKRX()` - 주식 기본 정보 수집

### ETF 일별매매정보 API

**용도:**
- ETF의 일별 매매정보 수집
- 종가, 시가, 고가, 저가, 거래량 등

**사용 위치:**
- `fetchKoreaETFInfoKRX()` - ETF 정보 수집

---

## 테스트 방법

### 1. API 키 검사

설정 페이지에서 API 키 상태 확인:
```
GET /api/krx-key-check
```

또는 브라우저에서:
```
http://localhost:3000/settings
```

### 2. 실제 데이터 수집 테스트

승인 후 실제 종목으로 테스트:
```typescript
// 유가증권 테스트
const supplyDemand = await fetchKoreaSupplyDemandKRX('005930'); // 삼성전자

// ETF 테스트
const etfInfo = await fetchKoreaETFInfoKRX('069500'); // KODEX KOSPI
```

---

## 오류 처리

### 403 Forbidden 오류

**의미:** API 사용 신청이 아직 승인되지 않음

**처리:**
- 자동으로 네이버 크롤링으로 fallback
- 로그에 "API 승인 대기 중" 메시지 출력

### 401 Unauthorized 오류

**의미:** API 키가 유효하지 않음

**처리:**
- Critical 알림 생성
- 자동으로 네이버 크롤링으로 fallback

---

## 승인 후 체크리스트

- [ ] 실제 API 엔드포인트 경로 확인
- [ ] 응답 데이터 구조 확인
- [ ] 요청 파라미터 구조 확인
- [ ] `lib/krx-api.ts`의 엔드포인트 경로 수정
- [ ] 인터페이스 구조 실제 응답에 맞게 수정
- [ ] 파라미터 구조 실제 요구사항에 맞게 수정
- [ ] 실제 종목으로 테스트
- [ ] Fallback 동작 확인
- [ ] 오류 처리 확인

---

## 참고 자료

- KRX Open API 공식 사이트: https://openapi.krx.co.kr/
- API 문서: 마이페이지에서 확인
- 사용 신청 상태: 마이페이지에서 확인

---

## 현재 구현 상태

### ✅ 완료된 부분
- Fallback 구조 (네이버 크롤링)
- 오류 처리 및 알림
- API 키 검사 기능
- 기본 인터페이스 구조

### ⚠️ 승인 후 수정 필요
- 실제 엔드포인트 경로
- 실제 응답 데이터 구조
- 실제 요청 파라미터 구조

---

## 예상 API 구조 (참고용)

실제 API 문서를 확인한 후 아래 구조를 수정하세요:

```typescript
// 유가증권 일별매매정보 API
GET /openapi/v2/stock/daily-trading
Params:
  - AUTH_KEY: API 키
  - ISU_CD: 종목코드
  - STD_DD: 기준일자 (YYYYMMDD)
  - lang: 'kr'

// ETF 일별매매정보 API
GET /openapi/v2/etf/daily-trading
Params:
  - AUTH_KEY: API 키
  - ISU_CD: 종목코드
  - STD_DD: 기준일자 (YYYYMMDD)
  - lang: 'kr'
```

**⚠️ 위 구조는 예상이며, 실제 API 문서를 확인 후 수정 필요**
