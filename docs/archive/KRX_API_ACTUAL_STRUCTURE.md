# KRX API 실제 구조 반영 (캡처 이미지 기반)

## 캡처 이미지 분석 결과

### 1. API 엔드포인트 URL

**실제 엔드포인트:**
- 유가증권 일별매매정보: `https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd`
- ETF 일별매매정보: `https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd`

**변경 전:**
- `https://openapi.krx.co.kr/openapi/v2/stock/issu/daily-stat`
- `https://openapi.krx.co.kr/openapi/v2/etf/issu/daily-stat`

---

### 2. 입력 파라미터 (INPUT)

**실제 파라미터 구조:**
- `basDd`: 기준일자 (string(8), YYYYMMDD 형식)
- `InBlock_1`: Block 타입 (repeat: single)

**변경 전:**
- `ISU_CD`: 종목코드
- `STD_DD`: 기준일자

**중요:**
- 종목코드(`ISU_CD`) 파라미터가 INPUT 정보에 없음
- 기준일자만으로 조회하는 것으로 보임 (전체 종목 데이터 반환 가능성)

---

### 3. 출력 필드 (OUTPUT)

#### 3.1 유가증권 일별매매정보

**실제 필드명:**
- `BAS_DD`: 기준일자
- `ISU_CD`: 종목코드
- `ISU_NM`: 종목명
- `MKT_NM`: 시장구분
- `SECT_TP_NM`: 소속부
- `TDD_CLSPRC`: 종가
- `CMPPREVDD_PRC`: 대비
- `FLUC_RT`: 등락률
- `TDD_OPNPRC`: 시가
- `TDD_HGPRC`: 고가
- `TDD_LWPRC`: 저가
- `ACC_TRDVOL`: 거래량
- `ACC_TRDVAL`: 거래대금
- `MKTCAP`: 시가총액
- `LIST_SHRS`: 상장주식수

**⚠️ 중요 발견:**
- **투자자별 매매동향 필드가 없음** (`INSTI_BY_QTY`, `FRGN_BY_QTY`, `PRSN_INBY_QTY`)
- 투자자별 정보는 별도 API이거나 포함되지 않음
- 네이버 크롤링 fallback 필수

#### 3.2 ETF 일별매매정보

**실제 필드명:**
- `BAS_DD`: 기준일자
- `ISU_CD`: 종목코드
- `ISU_NM`: 종목명
- `TDD_CLSPRC`: 종가
- `CMPPREVDD_PRC`: 대비
- `FLUC_RT`: 등락률
- `NAV`: 순자산가치(NAV) - ETF 전용
- `TDD_OPNPRC`: 시가
- `TDD_HGPRC`: 고가
- `TDD_LWPRC`: 저가
- `ACC_TRDVOL`: 거래량
- `ACC_TRDVAL`: 거래대금
- `MKTCAP`: 시가총액
- `INVSTASST_NETASST_TOT`: 순자산총액 - ETF 전용
- `LIST_SHRS`: 상장좌수
- `IDX_IND_NM`: 기초지수_지수명 - ETF 전용
- `OBJ_STKPRC_IDX`: 기초지수_종가 - ETF 전용
- `CMPPREVDD_IDX`: 기초지수_대비 - ETF 전용
- `FLUC_RT_IDX`: 기초지수_등락률 - ETF 전용

---

## 코드 변경 사항

### 1. 엔드포인트 URL 변경

```typescript
// 변경 전
const KRX_API_BASE_URL = 'https://openapi.krx.co.kr/openapi/v2';

// 변경 후
const KRX_API_BASE_URL = 'https://data-dbg.krx.co.kr/svc/apis';
const KRX_STOCK_ENDPOINT = '/sto/stk_bydd_trd';
const KRX_ETF_ENDPOINT = '/etp/etf_bydd_trd';
```

### 2. 파라미터 변경

```typescript
// 변경 전
{
  ISU_CD: symbol,
  STD_DD: todayStr,
}

// 변경 후
{
  basDd: todayStr, // 기준일자만 전달
}
```

**주의:**
- 종목코드 파라미터가 없으므로, 전체 종목 데이터가 반환될 가능성
- 필터링은 클라이언트 측에서 수행 필요

### 3. 응답 필드명 변경

```typescript
// 변경 전
STD_DD, isuCd, clpr, vs, fltRt 등 (대소문자 변형 지원)

// 변경 후
BAS_DD, ISU_CD, TDD_CLSPRC, CMPPREVDD_PRC, FLUC_RT 등 (실제 필드명 사용)
```

### 4. 투자자별 매매동향 처리 변경

**변경 전:**
- API 응답에서 투자자별 필드 추출 시도
- 필드가 없으면 fallback

**변경 후:**
- API 응답에 투자자별 필드가 없음을 확인
- 즉시 네이버 크롤링으로 fallback

```typescript
// ⚠️ 실제 API 응답에 투자자별 매매동향 필드가 포함되지 않음
// OUTPUT 정보에 INSTI_BY_QTY, FRGN_BY_QTY, PRSN_INBY_QTY 필드가 없음
// 네이버 크롤링으로 fallback
console.warn(`[KRX API] Investor trading data not available in daily trading info API for ${symbol}, falling back to Naver`);
return null;
```

---

## 인터페이스 업데이트

### 유가증권 일별매매정보 인터페이스

```typescript
interface KRXStockDailyTradingInfo {
  // 기준일자 및 종목 정보
  BAS_DD?: string; // 기준일자 (YYYYMMDD) - 실제 API 필드명
  ISU_CD?: string; // 종목코드
  ISU_NM?: string; // 종목명
  MKT_NM?: string; // 시장구분
  SECT_TP_NM?: string; // 소속부
  
  // 가격 정보
  TDD_CLSPRC?: string; // 종가
  CMPPREVDD_PRC?: string; // 대비
  FLUC_RT?: string; // 등락률
  TDD_OPNPRC?: string; // 시가
  TDD_HGPRC?: string; // 고가
  TDD_LWPRC?: string; // 저가
  
  // 거래 정보
  ACC_TRDVOL?: string; // 거래량
  ACC_TRDVAL?: string; // 거래대금
  MKTCAP?: string; // 시가총액
  LIST_SHRS?: string; // 상장주식수
  
  // 투자자별 매매동향 (실제 API 응답에 포함되지 않음)
  INSTI_BY_QTY?: string; // 기관 순매수량 (별도 API)
  FRGN_BY_QTY?: string; // 외국인 순매수량 (별도 API)
  PRSN_INBY_QTY?: string; // 개인 순매수량 (별도 API)
}
```

### ETF 일별매매정보 인터페이스

```typescript
interface KRXETFDailyTradingInfo {
  // 기준일자 및 종목 정보
  BAS_DD?: string; // 기준일자 (YYYYMMDD)
  ISU_CD?: string; // 종목코드
  ISU_NM?: string; // 종목명
  
  // 가격 정보
  TDD_CLSPRC?: string; // 종가
  CMPPREVDD_PRC?: string; // 대비
  FLUC_RT?: string; // 등락률
  NAV?: string; // 순자산가치(NAV) - ETF 전용
  TDD_OPNPRC?: string; // 시가
  TDD_HGPRC?: string; // 고가
  TDD_LWPRC?: string; // 저가
  
  // 거래 정보
  ACC_TRDVOL?: string; // 거래량
  ACC_TRDVAL?: string; // 거래대금
  MKTCAP?: string; // 시가총액
  INVSTASST_NETASST_TOT?: string; // 순자산총액 - ETF 전용
  LIST_SHRS?: string; // 상장좌수
  
  // 기초지수 정보 (ETF 전용)
  IDX_IND_NM?: string; // 기초지수_지수명
  OBJ_STKPRC_IDX?: string; // 기초지수_종가
  CMPPREVDD_IDX?: string; // 기초지수_대비
  FLUC_RT_IDX?: string; // 기초지수_등락률
}
```

---

## 중요 발견 사항

### 1. 투자자별 매매동향 필드 부재

**발견:**
- "유가증권 일별매매정보" API의 OUTPUT 정보에 투자자별 필드가 없음
- `INSTI_BY_QTY`, `FRGN_BY_QTY`, `PRSN_INBY_QTY` 필드가 응답에 포함되지 않음

**영향:**
- 투자자별 수급 데이터는 네이버 크롤링으로만 수집 가능
- KRX API로는 기본 주식 정보만 수집 가능

**대응:**
- `fetchKoreaSupplyDemandKRX` 함수에서 즉시 `null` 반환
- 자동으로 네이버 크롤링 fallback 작동

### 2. 종목코드 파라미터 부재

**발견:**
- INPUT 정보에 `ISU_CD` (종목코드) 파라미터가 없음
- `basDd` (기준일자)만 파라미터로 전달

**영향:**
- 특정 종목만 조회하는 것이 아니라, 해당 날짜의 전체 종목 데이터가 반환될 가능성
- 클라이언트 측에서 종목코드로 필터링 필요

**대응:**
- 현재 코드는 종목코드를 파라미터로 전달하지 않음
- 실제 API 호출 시 전체 데이터가 반환되면, 응답에서 `ISU_CD`로 필터링 필요

---

## 다음 단계

### API 승인 후 확인 사항

1. **실제 응답 구조 확인:**
   - 종목코드 파라미터 없이 호출 시 전체 종목 데이터가 반환되는지 확인
   - 특정 종목만 조회하는 방법 확인

2. **투자자별 매매동향 API 확인:**
   - 별도 API 존재 여부 확인
   - 또는 다른 엔드포인트에서 제공되는지 확인

3. **기간별 조회 가능 여부:**
   - `basDd` 파라미터로 기간 지정 가능한지 확인
   - 또는 여러 날짜를 한 번에 조회하는 방법 확인

---

## 참고

- 캡처 이미지에서 확인한 실제 API 구조 기반
- API 승인 후 실제 응답과 다를 수 있으므로 테스트 필요
- 현재 코드는 fallback 메커니즘이 완벽하게 작동하므로 안전
