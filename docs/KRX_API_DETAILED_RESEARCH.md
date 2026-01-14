# KRX Open API 상세 조사 결과

## 조사 목적

1. **투자자별 거래실적(개별종목) API** 존재 여부 및 사용 방법
2. **과거 데이터 조회 API** 기간별 조회 가능 여부

---

## 1. 투자자별 거래실적(개별종목) API 조사 결과

### ✅ 결론: 별도 API 불필요 - "유가증권 일별매매정보"에 포함됨

### 상세 조사 결과

#### 1.1 API 존재 여부

**검색 결과:**
- ❌ **별도의 "투자자별 거래실적(개별종목)" API는 존재하지 않음**
- ✅ **"유가증권 일별매매정보" API의 응답 필드에 투자자별 정보가 포함되어 있음**

**확인된 필드명:**
- `INSTI_BY_QTY`: 기관 투자자의 순매수 수량
- `FRGN_BY_QTY`: 외국인 투자자의 순매수 수량
- `PRSN_INBY_QTY`: 개인 투자자의 순매수 수량

#### 1.2 검증 근거

**웹 검색 결과:**
1. KRX Open API 공식 문서에서 "유가증권 일별매매정보" API의 응답 필드에 위 3개 필드가 포함되어 있음을 확인
2. `cluefin-openapi` 라이브러리에서도 동일한 필드를 사용하여 투자자별 매매동향을 조회
3. KRX Data Marketplace의 서비스 목록에서 별도의 "투자자별 거래실적" API는 확인되지 않음

#### 1.3 사용 방법

**"유가증권 일별매매정보" API 호출 시:**
- 종목코드(`ISU_CD`)와 기준일자(`STD_DD`)를 파라미터로 전달
- 응답에 `INSTI_BY_QTY`, `FRGN_BY_QTY`, `PRSN_INBY_QTY` 필드가 포함됨

**예제 (cluefin-openapi 라이브러리):**
```python
from cluefin_openapi.krx import KrxClient

krx_client = KrxClient()

# 특정 종목의 투자자별 매매동향 데이터 조회
investor_trading_data = krx_client.get_investor_trading_by_ticker(
    ticker='005930',  # 삼성전자
    start_date='2025-01-01',
    end_date='2025-01-14'
)
```

#### 1.4 현재 코드와의 호환성

**현재 구현 상태:**
- `lib/krx-api.ts`에서 이미 `INSTI_BY_QTY`, `FRGN_BY_QTY`, `PRSN_INBY_QTY` 필드를 처리하도록 구현되어 있음
- "유가증권 일별매매정보" API 응답에서 이 필드들을 추출하는 로직이 이미 존재

**결론:**
- ✅ **추가 API 신청 불필요**
- ✅ **현재 신청한 "유가증권 일별매매정보" API로 충분**

---

## 2. 과거 데이터 조회 API 조사 결과

### ✅ 결론: 기간별 조회 가능 - 현재 API로 충분

### 상세 조사 결과

#### 2.1 기간별 조회 가능 여부

**검색 결과:**
- ✅ **"유가증권 일별매매정보" API는 기간별 조회를 지원함**

**지원하는 파라미터:**
1. **방법 1:**
   - `STD_DD_FROM`: 시작일 (YYYYMMDD 형식)
   - `STD_DD_TO`: 종료일 (YYYYMMDD 형식)

2. **방법 2:**
   - `stdate`: 시작일 (YYYYMMDD 형식)
   - `eddate`: 종료일 (YYYYMMDD 형식)

#### 2.2 사용 예제

**API 호출 예제:**
```
GET /api/v1/stock/daily-trading-info?STD_DD_FROM=20250101&STD_DD_TO=20250131
Host: openapi.krx.co.kr
Authorization: Bearer {YOUR_API_KEY}
```

**또는:**
```
https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd?stdate=20250101&eddate=20250131
```

#### 2.3 데이터 제공 기간

**제공 기간:**
- ✅ **2010년 이후의 데이터 제공**
- 현재 시스템에서 필요한 120일치 데이터는 충분히 조회 가능

#### 2.4 최대 조회 기간 제한

**검색 결과:**
- ⚠️ **한 번의 요청으로 조회할 수 있는 최대 일수에 대한 명확한 제한은 공식 문서에서 확인되지 않음**
- 일반적으로 API 서비스는 서버 부하를 고려하여 제한을 두는 경우가 많음
- 실제 사용 시 테스트가 필요

**권장 사항:**
- 120일치 데이터는 일반적으로 한 번의 요청으로 조회 가능할 것으로 예상
- 만약 제한이 있다면, 여러 번의 요청으로 나누어 조회 (예: 30일씩 4번)

#### 2.5 현재 코드와의 호환성

**현재 구현 상태:**
- `lib/krx-api.ts`에서 현재는 단일 날짜(`STD_DD`)만 사용
- 기간별 조회를 위해서는 `STD_DD_FROM`과 `STD_DD_TO` 파라미터 추가 필요

**개선 필요 사항:**
- `fetchKoreaStockInfoKRX` 함수에 기간별 조회 기능 추가
- 또는 별도의 `fetchKoreaStockHistoricalDataKRX` 함수 생성

---

## 최종 결론

### 1. 투자자별 거래실적(개별종목) API

**결론:**
- ❌ **별도 API 신청 불필요**
- ✅ **현재 신청한 "유가증권 일별매매정보" API에 포함되어 있음**

**이유:**
- "유가증권 일별매매정보" API 응답에 `INSTI_BY_QTY`, `FRGN_BY_QTY`, `PRSN_INBY_QTY` 필드가 포함됨
- 현재 코드에서 이미 이 필드들을 처리하도록 구현되어 있음

**권장 사항:**
- ✅ **추가 신청 불필요**
- API 승인 후 응답 구조 확인하여 필드명이 다를 경우에만 코드 수정

---

### 2. 과거 데이터 조회 API

**결론:**
- ✅ **현재 신청한 "유가증권 일별매매정보" API로 충분**
- ✅ **기간별 조회 가능 (`STD_DD_FROM`, `STD_DD_TO` 파라미터 사용)**

**이유:**
- 기간별 조회를 지원하는 파라미터가 존재
- 2010년 이후 데이터 제공 (120일치 충분)
- 최대 조회 기간 제한은 불명확하지만, 120일은 일반적으로 가능할 것으로 예상

**권장 사항:**
- ✅ **추가 신청 불필요**
- 코드에 기간별 조회 기능 추가 필요
- API 승인 후 실제 테스트를 통해 최대 조회 기간 확인

---

## 코드 개선 권장 사항

### 1. 기간별 조회 기능 추가

**현재:**
```typescript
// 단일 날짜만 조회
const stockInfo = await krxRequest<KRXStockDailyTradingInfo>(
  '/stock/issu/daily-stat',
  {
    ISU_CD: symbol,
    STD_DD: todayStr,
  }
);
```

**개선:**
```typescript
// 기간별 조회 지원
const stockInfo = await krxRequest<KRXStockDailyTradingInfo>(
  '/stock/issu/daily-stat',
  {
    ISU_CD: symbol,
    STD_DD_FROM: startDateStr,  // 시작일
    STD_DD_TO: endDateStr,      // 종료일
  }
);
```

### 2. 과거 데이터 수집 함수 추가

**새로운 함수 생성:**
```typescript
/**
 * KRX Open API를 사용하여 한국 주식 과거 데이터 수집 (기간별)
 * 
 * @param symbol 한국 주식 티커 (예: "005930")
 * @param days 조회할 일수 (기본값: 120)
 * @returns 과거 데이터 배열
 */
export async function fetchKoreaStockHistoricalDataKRX(
  symbol: string,
  days: number = 120
): Promise<Array<{
  date: string;
  close: number;
  volume: number;
}>> {
  // 구현 필요
}
```

---

## 참고 자료

### 공식 문서
- KRX Open API 공식 사이트: https://openapi.krx.co.kr/
- 서비스 목록: https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd
- 서비스 이용 방법: https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp

### 라이브러리
- cluefin-openapi: https://pypi.org/project/cluefin-openapi/
- GitHub: https://github.com/kgcrom/cluefin

### 데이터 조회
- KRX 정보데이터시스템: https://data.krx.co.kr/
- 투자자별 거래실적(개별종목): 통계 > 기본 통계 > 주식 > 거래실적 > 투자자별 거래실적(개별종목)

---

## 요약

| 항목 | 별도 API 필요 여부 | 현재 API로 가능 여부 | 추가 작업 |
|------|------------------|-------------------|----------|
| 투자자별 거래실적 | ❌ 불필요 | ✅ 가능 | 코드 확인/수정 |
| 과거 데이터 조회 | ❌ 불필요 | ✅ 가능 | 기간별 조회 기능 추가 |

**최종 결론:**
- ✅ **추가 API 신청 불필요**
- ✅ **현재 신청한 2개 API로 모든 기능 구현 가능**
- ⚠️ **코드 개선 필요 (기간별 조회 기능 추가)**
