# 주식 데이터 소스 종합 비교 분석

## 📊 개요

주식 분석 애플리케이션을 위한 데이터 소스를 광범위하게 조사하고 비교 분석한 결과입니다.

---

## 🌍 글로벌 API (미국 주식 중심)

### 1. **Twelve Data** ⭐⭐⭐⭐⭐ (최고 추천)

**무료 플랜:**
- **Rate Limit**: 8 calls/min, 8,000 calls/day
- **Historical Data**: ✅ 지원
- **Real-time Data**: ✅ 지원 (15분 지연)
- **Coverage**: 글로벌 (150+ 거래소)
- **Technical Indicators**: 100+ 제공
- **WebSocket**: ✅ 지원

**장점:**
- 매우 관대한 무료 플랜 (8,000 calls/day)
- 글로벌 시장 커버리지
- 100개 이상의 기술적 지표 제공
- WebSocket 지원으로 실시간 데이터 가능
- 깔끔한 JSON 형식

**단점:**
- 한국 주식 지원 제한적일 수 있음
- 일부 주식은 지연된 데이터

**적합성:** ⭐⭐⭐⭐⭐
- Rate limit이 매우 여유로움
- Historical 데이터 완벽 지원
- 기술적 지표 제공으로 계산 불필요

**API 키 발급:** https://twelvedata.com/

---

### 2. **IEX Cloud** ⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 10 calls/min, 50,000 calls/month
- **Historical Data**: ✅ 지원
- **Real-time Data**: ✅ 지원
- **Coverage**: 미국 주식 중심
- **WebSocket**: ✅ 지원

**장점:**
- 매우 관대한 월간 제한 (50,000 calls)
- 실시간 데이터
- 재무제표, 뉴스 제공
- 안정적인 API

**단점:**
- **한국 주식 미지원**
- 미국 주식만 지원

**적합성:** ⭐⭐⭐⭐
- 미국 주식만 사용한다면 최적
- 한국 주식은 다른 소스 필요

**참고:** 2024년 8월 서비스 종료 예정이었으나 연장됨 (확인 필요)

---

### 3. **Alpha Vantage** ⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 5 calls/min, 500 calls/day
- **Historical Data**: ✅ 지원
- **Real-time Data**: ✅ 지원
- **Technical Indicators**: 50+ 제공
- **Coverage**: 글로벌 (제한적)

**장점:**
- 50개 이상의 기술적 지표 제공
- AI/LLM 통합 지원
- 간단한 API

**단점:**
- Rate limit이 매우 제한적 (5 calls/min)
- 한국 주식 지원 제한적
- 일부 intraday 데이터 제한

**적합성:** ⭐⭐⭐
- 소규모 프로젝트에 적합
- 우리 사용 사례에는 부족할 수 있음

**API 키 발급:** https://www.alphavantage.co/

---

### 4. **Polygon.io** ⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 5 calls/min, 20,000 calls/month
- **Historical Data**: ✅ 지원 (깊은 tick 데이터)
- **Real-time Data**: ✅ 지원 (유료)
- **Coverage**: 미국 주식, Crypto, Forex
- **WebSocket**: ✅ 지원 (유료)

**장점:**
- 고품질 데이터
- 깊은 historical tick 데이터
- 백테스팅에 적합

**단점:**
- 한국 주식 미지원
- 무료 플랜 제한적
- 유료 플랜: $29/월부터

**적합성:** ⭐⭐⭐⭐
- 미국 주식 + 백테스팅에 최적
- 한국 주식은 다른 소스 필요

---

### 5. **Marketstack** ⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 1,000 calls/month
- **Historical Data**: ✅ 지원 (15년)
- **Real-time Data**: ✅ 지원 (유료)
- **Coverage**: 70+ 거래소

**장점:**
- 글로벌 커버리지
- 15년 historical 데이터

**단점:**
- 월간 제한이 낮음 (1,000 calls)
- Real-time은 유료

**적합성:** ⭐⭐⭐
- 소규모 프로젝트에 적합

---

### 6. **EOD Historical Data** ⭐⭐⭐⭐

**무료 플랜:**
- **Historical Data**: ✅ 지원 (1년치)
- **Coverage**: 150,000+ tickers, 60+ 거래소
- **제한**: 일일 API 호출 제한

**장점:**
- 매우 넓은 커버리지
- 1년치 무료 historical 데이터
- 한국 주식 포함 가능성

**단점:**
- Real-time 데이터 제한적
- 일일 호출 제한

**적합성:** ⭐⭐⭐⭐
- Historical 데이터 중심 프로젝트에 적합

**API 키 발급:** https://eodhistoricaldata.com/

---

## 🇰🇷 한국 주식 전용 옵션

### 1. **FinanceDataReader (Python)** ⭐⭐⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Rate Limit**: 없음 (크롤링 기반)
- **Historical Data**: ✅ 지원
- **Coverage**: KOSPI, KOSDAQ, 개별 종목
- **Language**: Python

**장점:**
- 완전 무료
- Rate limit 없음
- 한국 주식 데이터 완벽
- 설치 및 사용 간단

**단점:**
- Python 전용 (Node.js에서 사용하려면 별도 서버 필요)
- 크롤링 기반이라 안정성 이슈 가능

**사용 예시:**
```python
import FinanceDataReader as fdr

# KOSPI 데이터
kospi = fdr.DataReader('KS11', '2022-01-01', '2022-12-31')

# 개별 종목 (삼성전자)
samsung = fdr.DataReader('005930', '2022-01-01', '2022-12-31')
```

**적합성:** ⭐⭐⭐⭐⭐
- 한국 주식에 최적
- Python 서버 구축 필요

**설치:** `pip install finance-datareader`

---

### 2. **KRX Open API (한국거래소)** ⭐⭐⭐⭐

**특징:**
- **무료**: 공식 API
- **Rate Limit**: 명시되지 않음
- **Historical Data**: ✅ 지원
- **Coverage**: KOSPI, KOSDAQ, 지수, 채권 등
- **Data Types**: 시세, 투자자별 매매동향, 공매도 등

**장점:**
- 공식 API로 안정적
- 한국 주식 데이터 완벽
- 다양한 데이터 제공 (투자자별 매매동향 등)
- 무료

**단점:**
- API 키 발급 절차 복잡
- 서비스별 추가 신청 필요
- 문서가 한국어로만 제공

**적합성:** ⭐⭐⭐⭐
- 한국 주식에 최적
- 공식 데이터로 신뢰성 높음

**신청:** https://openapi.krx.co.kr/

---

### 3. **네이버 금융 크롤링** ⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Rate Limit**: 없음 (하지만 IP 차단 위험)
- **Historical Data**: ✅ 가능 (크롤링)
- **Coverage**: 한국 주식 전체

**장점:**
- 완전 무료
- 실시간 데이터 가능
- 투자자별 매매동향 등 상세 정보

**단점:**
- Terms of Service 위반 가능성
- IP 차단 위험
- 안정성 낮음
- HTML 파싱 필요

**적합성:** ⭐⭐⭐
- 법적 리스크 있음
- 안정성 낮음

---

## 🔄 하이브리드 전략

### 전략 1: Twelve Data + FinanceDataReader
```
미국 주식: Twelve Data (8,000 calls/day)
한국 주식: FinanceDataReader (Python 서버)
```

**장점:**
- 각 시장에 최적화
- Rate limit 문제 없음
- 완전 무료 가능

**단점:**
- Python 서버 구축 필요
- 두 시스템 관리

---

### 전략 2: Twelve Data + KRX Open API
```
미국 주식: Twelve Data
한국 주식: KRX Open API
```

**장점:**
- 공식 API로 안정적
- 높은 데이터 품질

**단점:**
- 두 API 관리
- KRX API 키 발급 필요

---

### 전략 3: Twelve Data 단독 + 캐싱
```
모든 주식: Twelve Data
캐싱: Redis (Historical 데이터 하루 1회)
```

**장점:**
- 단일 API로 통합
- 캐싱으로 rate limit 문제 해결
- 빠른 응답 속도

**단점:**
- 한국 주식 지원 확인 필요
- 캐싱 인프라 필요

---

## 📊 종합 비교표

| API | 무료 Rate Limit | Historical | 한국 주식 | 미국 주식 | 기술지표 | 추천도 |
|-----|----------------|------------|-----------|-----------|----------|--------|
| **Twelve Data** | 8,000/day | ✅ | ⚠️ | ✅ | ✅ 100+ | ⭐⭐⭐⭐⭐ |
| **IEX Cloud** | 50,000/month | ✅ | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Alpha Vantage** | 500/day | ✅ | ⚠️ | ✅ | ✅ 50+ | ⭐⭐⭐ |
| **Polygon.io** | 20,000/month | ✅ | ❌ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Finnhub** | 60/min | ⚠️* | ✅ | ✅ | ❌ | ⭐⭐⭐ |
| **FinanceDataReader** | 무제한 | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **KRX Open API** | 미명시 | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐ |
| **EOD Historical** | 제한적 | ✅ (1년) | ⚠️ | ✅ | ❌ | ⭐⭐⭐⭐ |

*Finnhub: 무료 플랜에서 historical candle API 제한

---

## 🎯 최종 추천

### 즉시 적용 가능한 최우선 추천: **Twelve Data**

**이유:**
1. **Rate Limit**: 8,000 calls/day (매우 여유)
2. **Historical Data**: 완벽 지원
3. **기술적 지표**: 100+ 제공 (직접 계산 불필요)
4. **글로벌 커버리지**: 150+ 거래소
5. **WebSocket**: 실시간 데이터 가능
6. **무료 플랜**: 매우 관대함

**구현:**
- Twelve Data API 키 발급
- Historical 데이터 + 기술적 지표 한 번에 수집
- Rate limit 문제 완전 해결

### 한국 주식 추가: **FinanceDataReader (Python 서버)**

**이유:**
1. 완전 무료
2. Rate limit 없음
3. 한국 주식 데이터 완벽
4. 설치 및 사용 간단

**구현:**
- Python FastAPI 서버 구축
- FinanceDataReader로 한국 주식 데이터 제공
- Next.js에서 Python API 호출

### 대안: **KRX Open API**

**이유:**
1. 공식 API로 안정적
2. 한국 주식 데이터 완벽
3. 투자자별 매매동향 등 추가 데이터

**단점:**
- API 키 발급 절차 복잡

---

## 💡 구현 우선순위

### Phase 1: Twelve Data 전환 (즉시)
1. Twelve Data API 키 발급
2. `lib/finance-twelvedata.ts` 구현
3. Historical + 기술적 지표 한 번에 수집
4. Rate limit 문제 완전 해결

### Phase 2: 한국 주식 지원 (선택)
1. FinanceDataReader Python 서버 구축
2. 또는 KRX Open API 연동
3. 어댑터에서 자동 선택

### Phase 3: 캐싱 추가 (최적화)
1. Redis 캐싱
2. Historical 데이터 하루 1회 수집
3. 응답 속도 향상

---

## 📝 각 API 상세 정보

### Twelve Data API 예시

```typescript
// Quote (현재가)
GET https://api.twelvedata.com/quote?symbol=AAPL&apikey=YOUR_KEY

// Historical Data
GET https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=120&apikey=YOUR_KEY

// Technical Indicators (RSI, MA 등)
GET https://api.twelvedata.com/rsi?symbol=AAPL&interval=1day&apikey=YOUR_KEY
GET https://api.twelvedata.com/sma?symbol=AAPL&interval=1day&time_period=20&apikey=YOUR_KEY
```

**장점:**
- 기술적 지표를 직접 계산할 필요 없음
- 한 번의 API 호출로 여러 데이터 수집 가능

---

## 🔗 참고 링크

- Twelve Data: https://twelvedata.com/
- FinanceDataReader: https://github.com/FinanceData/FinanceDataReader
- KRX Open API: https://openapi.krx.co.kr/
- Alpha Vantage: https://www.alphavantage.co/
- Polygon.io: https://polygon.io/
- EOD Historical Data: https://eodhistoricaldata.com/
