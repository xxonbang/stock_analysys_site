# 동적 티커 매핑 분석

## 현재 상황

### 하드코딩 방식의 문제점
- `KOREA_STOCK_MAP`에 종목을 수동으로 추가해야 함
- 새로운 종목 추가 시 코드 수정 필요
- 유지보수 비용 증가

## 동적 매핑 가능 방법 분석

### 1. FinanceDataReader StockListing 사용 ⭐ (추천)

**방법:**
```python
import FinanceDataReader as fdr
stock_list = fdr.StockListing('KRX')
matching = stock_list[stock_list['Name'].str.contains('일동제약', na=False)]
ticker = matching.iloc[0]['Symbol']
```

**장점:**
- ✅ 공식 라이브러리 (안정적)
- ✅ KRX 전체 종목 리스트 제공
- ✅ 정확한 매칭 가능
- ✅ 이미 Python 스크립트에 로직 존재

**단점:**
- ⚠️ 현재 API 오류 발생 (JSON 파싱 실패)
- ⚠️ 매 요청마다 전체 리스트 다운로드 (느림)
- ⚠️ Rate limit 가능성

**해결 방안:**
1. **캐싱 전략**: StockListing 결과를 로컬 파일/DB에 캐시
2. **오류 처리 개선**: API 오류 시 재시도 로직
3. **TypeScript 레벨 구현**: Python 대신 Node.js에서 처리

---

### 2. 네이버 금융 크롤링

**방법:**
```typescript
// 네이버 금융 검색 API 또는 크롤링
const searchUrl = `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent('일동제약')}`;
// HTML 파싱하여 티커 추출
```

**장점:**
- ✅ 실시간 데이터
- ✅ 한국 주식 정보 풍부

**단점:**
- ❌ 공식 API 없음 (크롤링 필요)
- ❌ 웹사이트 구조 변경 시 파싱 실패
- ❌ 이용약관 위반 가능성
- ❌ Rate limit 및 IP 차단 위험
- ❌ 법적 리스크

---

### 3. KRX 공식 API

**방법:**
- KRX 정보데이터시스템 (data.krx.co.kr) API 사용

**장점:**
- ✅ 공식 API (안정적)
- ✅ 정확한 데이터

**단점:**
- ❌ API 키 필요 (회원가입)
- ❌ 복잡한 인증 절차
- ❌ 사용량 제한 가능

---

### 4. 하이브리드 방식 (추천) ⭐⭐⭐

**전략:**
1. **1차**: 하드코딩된 매핑 테이블 확인 (빠름)
2. **2차**: FinanceDataReader StockListing 사용 (동적)
3. **3차**: 캐시된 StockListing 결과 사용 (빠름)
4. **Fallback**: 원본 심볼 그대로 사용 (미국 주식 등)

**구현 예시:**
```typescript
async function normalizeStockSymbolDynamic(symbol: string): Promise<string> {
  // 1. 하드코딩된 매핑 확인
  const cached = convertKoreaStockNameToTicker(symbol);
  if (cached) return cached;
  
  // 2. 로컬 캐시 확인
  const localCache = await getCachedStockListing();
  if (localCache) {
    const match = localCache.find(s => s.name === symbol);
    if (match) return `${match.ticker}.KS`;
  }
  
  // 3. Python 스크립트로 StockListing 호출 (캐시 업데이트)
  const ticker = await searchTickerFromPython(symbol);
  if (ticker) {
    await updateCache(symbol, ticker);
    return `${ticker}.KS`;
  }
  
  // 4. Fallback: 원본 반환
  return symbol;
}
```

---

## 추천 구현 방안

### 단계별 구현

#### Phase 1: Python 스크립트 개선 (즉시 가능)
- `StockListing` 오류 처리 개선
- 결과를 JSON 파일로 캐시
- 캐시 만료 시간 설정 (예: 1일)

#### Phase 2: TypeScript 레벨 통합
- Python 스크립트를 API로 호출
- 결과를 메모리/파일 캐시에 저장
- 하드코딩 매핑과 동적 검색 병행

#### Phase 3: 최적화
- 캐시 전략 고도화
- 배치 처리 (여러 종목 한 번에 검색)
- 오류 복구 메커니즘

---

## 구현 복잡도 및 성능

| 방법 | 구현 난이도 | 성능 | 안정성 | 추천도 |
|------|------------|------|--------|--------|
| 하드코딩 | ⭐ 쉬움 | ⭐⭐⭐ 빠름 | ⭐⭐⭐ 높음 | ⭐⭐ |
| FinanceDataReader | ⭐⭐ 보통 | ⭐ 느림 | ⭐⭐ 보통 | ⭐⭐⭐ |
| 네이버 크롤링 | ⭐⭐⭐ 어려움 | ⭐⭐ 보통 | ⭐ 낮음 | ⭐ |
| KRX API | ⭐⭐ 보통 | ⭐⭐ 보통 | ⭐⭐⭐ 높음 | ⭐⭐ |
| 하이브리드 | ⭐⭐ 보통 | ⭐⭐⭐ 빠름 | ⭐⭐⭐ 높음 | ⭐⭐⭐ |

---

## 결론

**가능합니다!** 하지만 몇 가지 제약사항이 있습니다.

### ✅ 가능한 방법

1. **FinanceDataReader StockListing** (추천)
   - 현재 API 오류 발생 중 (KRX 서버 이슈 가능)
   - 오류 해결 시 가장 안정적
   - 캐싱 전략으로 성능 최적화 가능

2. **네이버 금융 크롤링**
   - 기술적으로 가능
   - 법적 리스크 및 안정성 문제

3. **하이브리드 방식** (최선)
   - 하드코딩 매핑 (빠른 조회) + 동적 검색 (새로운 종목)
   - 캐싱으로 성능 최적화
   - Fallback 메커니즘

### ⚠️ 현재 제약사항

- FinanceDataReader `StockListing` API가 현재 JSON 파싱 오류 발생
- KRX 서버 일시적 문제일 수 있음
- 재시도 로직 및 오류 처리 필요

### 📋 권장 구현 전략

1. **단기**: 하드코딩 매핑 유지 + 주요 종목 추가
2. **중기**: StockListing 오류 처리 개선 + 캐싱 구현
3. **장기**: 하이브리드 방식 완전 구현

**결론**: 기술적으로 가능하지만, 현재 StockListing API 오류로 인해 즉시 적용은 어렵습니다. 오류 해결 후 구현 가능합니다.
