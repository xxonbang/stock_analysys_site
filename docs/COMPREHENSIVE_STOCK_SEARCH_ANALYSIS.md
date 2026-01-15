# 종목 검색 기능 종합 분석 및 개선 방안

## 📊 현재 구현 상태 분석

### 1. 하드코딩 매핑 (28개 종목)
**위치**: `lib/korea-stock-mapper.ts`

**특징**:
- ✅ 빠른 검색 (즉시 반환)
- ✅ 확실한 결과
- ❌ 제한적 (28개 종목만)
- ❌ 신규 종목 추가 불가

### 2. 동적 매핑 (한국 주식 전체)
**위치**: `lib/korea-stock-mapper-dynamic.ts`

**데이터 소스**:
1. **FinanceDataReader StockListing('KRX')**
   - 코스피 + 코스닥 전체 종목
   - 재시도 로직 (최대 3회)
   - ⚠️ JSON 파싱 오류 발생 가능 (KRX API 일시적 문제)

2. **GitHub 백업 CSV** (Fallback)
   - URL: `https://raw.githubusercontent.com/corazzon/finance-data-analysis/main/krx.csv`
   - FinanceDataReader 실패 시 사용
   - ✅ 안정적
   - ⚠️ 업데이트 주기 불확실

**특징**:
- ✅ 전체 종목 검색 가능 (수천 개)
- ⚠️ Python 스크립트 실행 필요 (서버 사이드만)
- ⚠️ 캐시 의존 (24시간 TTL)
- ⚠️ 실패 시 빈 결과 반환

### 3. Yahoo Finance Autocomplete
**위치**: `lib/stock-search.ts`

**특징**:
- ✅ 미국 주식 검색 가능
- ⚠️ 한국 주식 검색 제한적 (한글 이름 지원 불완전)
- ⚠️ 공식 API 아님 (비공식 엔드포인트)
- ⚠️ Rate Limit 가능성

### 4. Finnhub Symbol Search
**위치**: `lib/stock-search.ts`

**특징**:
- ✅ 공식 API
- ✅ 한국/미국 주식 모두 지원
- ⚠️ API 키 필요
- ⚠️ Rate Limit (60 calls/min)

## 🔍 문제점 분석

### 1. "한농" 검색 실패 원인

**예상 원인**:
1. **정규화 문제**: 한글은 `toLowerCase()`가 의미 없음
   ```typescript
   const normalizedQuery = trimmedQuery.toLowerCase(); // "한농" → "한농" (변화 없음)
   const nameNormalized = stock.Name.toLowerCase(); // "한농화성" → "한농화성" (변화 없음)
   ```
   - 한글은 대소문자 구분이 없으므로 정규화가 불필요하지만, 현재 로직은 문제 없어야 함

2. **부분 매칭 로직 문제**:
   ```typescript
   nameNormalized.includes(normalizedQuery) // "한농화성".includes("한농") → true여야 함
   ```
   - 이론적으로는 작동해야 하지만, 실제로는 작동하지 않음

3. **동적 매핑 실패 가능성**:
   - Python 스크립트 실행 실패
   - 캐시가 비어있거나 만료
   - API route에서 에러 발생

### 2. 전체 종목 검색 제한사항

**현재 제한사항**:
1. **한국 주식**: 
   - 하드코딩 28개 + 동적 매핑 (FinanceDataReader/GitHub CSV)
   - ✅ 전체 종목 검색 가능 (동적 매핑 성공 시)
   - ⚠️ 동적 매핑 실패 시 제한적

2. **미국 주식**:
   - Yahoo Finance Autocomplete에 의존
   - ⚠️ 전체 종목 리스트 없음 (검색 기반만)
   - ⚠️ ETF 포함 여부 불확실

3. **ETF**:
   - 별도 처리 없음
   - Yahoo Finance/Finnhub에서 일부 검색 가능
   - ⚠️ 체계적인 ETF 검색 불가

## 🎯 개선 방안

### Phase 1: 즉시 수정 (필수)

#### 1.1 "한농" 검색 문제 해결
- 한글 검색어 정규화 개선
- 부분 매칭 로직 강화
- 디버깅 로깅 추가

#### 1.2 검색 로직 개선
- 대소문자 구분 제거 (한글은 이미 구분 없음)
- 부분 매칭 우선순위 조정
- 검색어 길이에 따른 매칭 전략 변경

### Phase 2: 신뢰도 향상

#### 2.1 Finnhub Stock Symbols API 활용
- 전체 종목 리스트 구축 (한국/미국)
- ETF 포함
- 주기적 업데이트

#### 2.2 다중 데이터 소스 통합
- 하드코딩 → 동적 매핑 → Finnhub → Yahoo Finance
- Fallback 체계 강화

### Phase 3: 전체 종목 검색 지원

#### 3.1 종목 리스트 사전 구축
- Finnhub Stock Symbols API로 전체 리스트 수집
- 로컬 DB 또는 캐시에 저장
- 주기적 업데이트 (일 1회)

#### 3.2 검색 인덱스 구축
- 빠른 검색을 위한 인덱스
- 부분 매칭 최적화

## 📝 구현 계획

### 즉시 수정 (Phase 1)

1. **검색 로직 개선**
   - 한글 검색어 정규화 수정
   - 부분 매칭 로직 강화
   - "한농" → "한농화성" 매칭 보장

2. **에러 처리 개선**
   - 동적 매핑 실패 시 상세 로깅
   - Fallback 메커니즘 강화

### 중기 개선 (Phase 2)

1. **Finnhub Stock Symbols API 통합**
   - 한국 거래소 (KS, KQ) 전체 종목
   - 미국 거래소 (US) 전체 종목
   - ETF 포함

2. **캐시 전략 개선**
   - 종목 리스트 캐싱
   - 검색 결과 캐싱

### 장기 개선 (Phase 3)

1. **검색 엔진 구축**
   - 인덱스 기반 빠른 검색
   - 오타 교정
   - 유사도 검색
