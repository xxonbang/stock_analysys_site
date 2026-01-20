# 주식 데이터 소스 전방위 종합 분석 (V2)

## 📋 개요

안정성, 라이브러리, 공식 API, 크롤링 등 모든 옵션을 포함한 전방위 분석입니다.

---

## 🐍 Python 라이브러리 (크롤링 기반)

### 1. **yfinance** ⭐⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Rate Limit**: Yahoo Finance 제한 (하지만 우회 가능)
- **Historical Data**: ✅ 지원
- **Coverage**: Yahoo Finance 지원 종목 전체
- **Language**: Python

**장점:**
- 설치 및 사용 간단
- 광범위한 데이터 제공
- 활발한 커뮤니티
- 한국/미국 주식 모두 지원

**단점:**
- Rate limit 문제
- Yahoo Finance 의존성
- 비공식 API

**Rate Limit 해결 방법:**

1. **yfinance-cache 사용**
   ```python
   pip install yfinance-cache
   import yfinance_cache as yf
   
   ticker = yf.Ticker("AAPL")
   hist = ticker.history(period="1y")
   ```
   - 스마트 캐싱으로 불필요한 요청 방지

2. **requests_cache 통합**
   ```python
   import yfinance as yf
   import requests_cache
   
   session = requests_cache.CachedSession('yfinance.cache')
   ticker = yf.Ticker('MSFT', session=session)
   hist = ticker.history(period="1mo")
   ```
   - 로컬 캐시로 중복 요청 방지

3. **배치 요청**
   ```python
   tickers = "AAPL MSFT GOOGL"
   data = yf.download(tickers, period="1d")
   ```
   - 여러 종목을 한 번에 요청

**적합성:** ⭐⭐⭐⭐
- 캐싱 전략과 함께 사용하면 매우 효과적
- Python 서버 구축 필요

**설치:** `pip install yfinance` 또는 `pip install yfinance-cache`

---

### 2. **FinanceDataReader** ⭐⭐⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Rate Limit**: 없음
- **Historical Data**: ✅ 지원
- **Coverage**: KOSPI, KOSDAQ, 개별 종목, 글로벌
- **Language**: Python

**장점:**
- 한국 주식 데이터 완벽
- Rate limit 없음
- 다양한 데이터 소스 지원

**단점:**
- Python 전용
- 크롤링 기반 (안정성 이슈 가능)

**사용 예시:**
```python
import FinanceDataReader as fdr

# 한국 주식
samsung = fdr.DataReader('005930', '2022-01-01', '2022-12-31')

# 미국 주식
apple = fdr.DataReader('AAPL', '2022-01-01', '2022-12-31')

# 지수
kospi = fdr.DataReader('KS11', '2022-01-01', '2022-12-31')
```

**적합성:** ⭐⭐⭐⭐⭐
- 한국 주식에 최적
- Python 서버 구축 필요

---

### 3. **pandas-datareader** ⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Multiple Sources**: Yahoo, Alpha Vantage, FRED 등
- **Language**: Python

**장점:**
- 여러 데이터 소스 지원
- 유연한 구조

**단점:**
- 일부 소스 중단됨 (Google Finance 등)
- API 변경에 취약

**적합성:** ⭐⭐⭐
- yfinance가 더 안정적

---

### 4. **investpy / investiny** ⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Coverage**: Investing.com 데이터
- **Language**: Python

**장점:**
- 글로벌 시장 커버리지
- 다양한 금융 상품

**단점:**
- 비공식 API
- Terms of Service 이슈 가능
- 안정성 낮음

**적합성:** ⭐⭐⭐
- 법적 리스크 있음

---

## 🌐 공식/상용 API

### 1. **Twelve Data** ⭐⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 8 calls/min, 8,000 calls/day
- **Historical Data**: ✅ 지원
- **Technical Indicators**: ✅ 100+ 제공
- **WebSocket**: ✅ 지원
- **Coverage**: 150+ 거래소

**장점:**
- 매우 관대한 무료 플랜
- 기술적 지표 직접 제공
- WebSocket 지원

**적합성:** ⭐⭐⭐⭐⭐
- 최고 추천

---

### 2. **Tiingo** ⭐⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 50 calls/hour, 1,000 calls/day
- **Historical Data**: ✅ 지원 (30년치)
- **Real-time Data**: ✅ 지원
- **Coverage**: 86,000+ 증권 (미국 주식 중심)
- **WebSocket**: ✅ 지원

**장점:**
- 30년치 historical 데이터
- Real-time 데이터
- WebSocket 지원
- 안정적인 API

**단점:**
- 한국 주식 지원 제한적
- 기술적 지표 직접 제공 안 함 (계산 필요)

**적합성:** ⭐⭐⭐⭐⭐
- 미국 주식에 최적
- Historical 데이터가 풍부

**API 키 발급:** https://www.tiingo.com/

---

### 3. **Nasdaq Data Link (Quandl)** ⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 300 calls/10초, 2,000 calls/10분, 50,000 calls/day
- **Historical Data**: ✅ 지원
- **Coverage**: 다양한 데이터셋
- **Free Datasets**: WIKI (3,000+ 미국 주식)

**장점:**
- 매우 관대한 rate limit
- 다양한 무료 데이터셋
- 공식 API

**단점:**
- 무료 데이터셋은 업데이트 지연 가능
- 한국 주식 제한적

**적합성:** ⭐⭐⭐⭐
- Historical 데이터 중심 프로젝트에 적합

**API 키 발급:** https://data.nasdaq.com/

---

### 4. **IEX Cloud** ⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 10 calls/min, 50,000 calls/month
- **Historical Data**: ✅ 지원
- **Coverage**: 미국 주식 중심
- **WebSocket**: ✅ 지원

**장점:**
- 매우 관대한 월간 제한
- 실시간 데이터
- 안정적

**단점:**
- 한국 주식 미지원
- 2024년 8월 서비스 종료 예정이었으나 연장 (확인 필요)

**적합성:** ⭐⭐⭐⭐
- 미국 주식만 사용한다면 최적

---

### 5. **Alpha Vantage** ⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 5 calls/min, 500 calls/day
- **Historical Data**: ✅ 지원
- **Technical Indicators**: ✅ 50+ 제공
- **AI Integration**: ✅ 지원

**장점:**
- 기술적 지표 제공
- AI/LLM 통합

**단점:**
- Rate limit 매우 제한적
- 한국 주식 제한적

**적합성:** ⭐⭐⭐
- 소규모 프로젝트에 적합

---

### 6. **Polygon.io** ⭐⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 5 calls/min, 20,000 calls/month
- **Historical Data**: ✅ 지원 (깊은 tick 데이터)
- **Coverage**: 미국 주식, Crypto, Forex
- **WebSocket**: ✅ 지원 (유료)

**장점:**
- 고품질 데이터
- 깊은 historical 데이터

**단점:**
- 한국 주식 미지원
- 무료 플랜 제한적

**적합성:** ⭐⭐⭐⭐
- 미국 주식 + 백테스팅에 최적

---

### 7. **EOD Historical Data** ⭐⭐⭐⭐

**무료 플랜:**
- **Historical Data**: ✅ 지원 (1년치)
- **Coverage**: 150,000+ tickers, 60+ 거래소
- **제한**: 일일 API 호출 제한

**장점:**
- 매우 넓은 커버리지
- 1년치 무료 historical 데이터

**단점:**
- Real-time 데이터 제한적
- 일일 호출 제한

**적합성:** ⭐⭐⭐⭐
- Historical 데이터 중심 프로젝트에 적합

---

### 8. **Finnhub** ⭐⭐⭐

**무료 플랜:**
- **Rate Limit**: 60 calls/min
- **Historical Data**: ⚠️ (무료 플랜에서 candle API 제한)
- **Coverage**: 글로벌
- **WebSocket**: ✅ 지원 (유료)

**장점:**
- Rate limit 여유
- 한국 주식 지원

**단점:**
- 무료 플랜에서 historical candle API 제한
- 기술적 지표 직접 제공 안 함

**적합성:** ⭐⭐⭐
- Quote만 사용한다면 좋음
- Historical은 다른 소스 필요

---

## 🇰🇷 한국 주식 전용

### 1. **KRX Open API (한국거래소)** ⭐⭐⭐⭐⭐

**특징:**
- **무료**: 공식 API
- **Rate Limit**: 미명시
- **Historical Data**: ✅ 지원
- **Coverage**: KOSPI, KOSDAQ, 지수, 채권 등
- **Data Types**: 시세, 투자자별 매매동향, 공매도 등

**장점:**
- 공식 API로 안정적
- 한국 주식 데이터 완벽
- 다양한 데이터 제공

**단점:**
- API 키 발급 절차 복잡
- 서비스별 추가 신청 필요

**적합성:** ⭐⭐⭐⭐⭐
- 한국 주식에 최적

**신청:** https://openapi.krx.co.kr/

---

### 2. **FinanceDataReader** ⭐⭐⭐⭐⭐

(위 Python 라이브러리 섹션 참조)

---

## 🔧 하이브리드/특수 솔루션

### 1. **Google Sheets GOOGLEFINANCE** ⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Rate Limit**: Google Sheets 제한
- **Real-time Data**: ✅ 지원 (20분 지연)
- **Historical Data**: ✅ 지원

**사용법:**
```
=GOOGLEFINANCE("NASDAQ:GOOG", "price")
=GOOGLEFINANCE("NASDAQ:GOOG", "close", DATE(2024,1,1), DATE(2024,1,10), "DAILY")
```

**장점:**
- 완전 무료
- 간단한 사용

**단점:**
- Google Sheets 의존성
- API로 직접 접근 어려움
- 20분 지연

**적합성:** ⭐⭐⭐
- 간단한 프로젝트에 적합

---

### 2. **FRED API (Federal Reserve)** ⭐⭐⭐

**특징:**
- **무료**: 완전 무료
- **Coverage**: 경제 지표, 주가지수 (DJIA, S&P 500 등)
- **Language**: Python (fredapi)

**장점:**
- 공식 API
- 경제 지표 포함

**단점:**
- 개별 주식 데이터 제한적
- 주가지수 중심

**적합성:** ⭐⭐⭐
- 경제 지표 분석에 적합

---

### 3. **오픈소스 솔루션**

#### OpenStock ⭐⭐⭐
- 오픈소스 플랫폼
- Self-hosted 가능
- 실시간 가격 추적

#### StockHouse ⭐⭐⭐
- 실시간 시장 분석 플랫폼
- 다양한 데이터 소스 통합
- Self-hosted 가능

---

## 📊 종합 비교표

| 솔루션 | 타입 | 무료 Rate Limit | Historical | 한국 주식 | 미국 주식 | 기술지표 | WebSocket | 추천도 |
|--------|------|----------------|------------|-----------|-----------|----------|-----------|--------|
| **Twelve Data** | API | 8,000/day | ✅ | ⚠️ | ✅ | ✅ 100+ | ✅ | ⭐⭐⭐⭐⭐ |
| **Tiingo** | API | 1,000/day | ✅ 30년 | ⚠️ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐⭐ |
| **Nasdaq Data Link** | API | 50,000/day | ✅ | ⚠️ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐ |
| **IEX Cloud** | API | 50,000/month | ✅ | ❌ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **yfinance** | Library | Yahoo 제한 | ✅ | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐ |
| **yfinance-cache** | Library | 캐싱으로 해결 | ✅ | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **FinanceDataReader** | Library | 무제한 | ✅ | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **KRX Open API** | API | 미명시 | ✅ | ✅ | ❌ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **Alpha Vantage** | API | 500/day | ✅ | ⚠️ | ✅ | ✅ 50+ | ❌ | ⭐⭐⭐ |
| **Polygon.io** | API | 20,000/month | ✅ | ❌ | ✅ | ✅ | ✅* | ⭐⭐⭐⭐ |
| **Finnhub** | API | 60/min | ⚠️* | ✅ | ✅ | ❌ | ✅* | ⭐⭐⭐ |
| **EOD Historical** | API | 제한적 | ✅ 1년 | ⚠️ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐ |

*유료 플랜에서만 사용 가능

---

## 🎯 최종 추천 (우선순위별)

### 1순위: **yfinance-cache + FinanceDataReader (Python 서버)**

**구성:**
- 미국 주식: yfinance-cache (캐싱으로 rate limit 해결)
- 한국 주식: FinanceDataReader (rate limit 없음)

**장점:**
- 완전 무료
- Rate limit 문제 완전 해결
- 한국/미국 주식 모두 완벽 지원
- 안정적 (캐싱 전략)

**단점:**
- Python 서버 구축 필요
- Node.js에서 Python API 호출

**구현:**
```python
# Python FastAPI 서버
from fastapi import FastAPI
import yfinance_cache as yf
import FinanceDataReader as fdr

app = FastAPI()

@app.get("/stock/{symbol}")
async def get_stock(symbol: str):
    # 미국 주식
    if symbol.isalpha():
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="120d")
    # 한국 주식
    else:
        hist = fdr.DataReader(symbol, period="120d")
    return hist.to_dict()
```

---

### 2순위: **Twelve Data 단독**

**장점:**
- Rate limit 매우 여유 (8,000 calls/day)
- 기술적 지표 직접 제공
- Historical 데이터 완벽
- WebSocket 지원

**단점:**
- 한국 주식 지원 확인 필요
- API 키 필요

**적합성:**
- 한국 주식도 지원한다면 최고의 선택

---

### 3순위: **Tiingo + FinanceDataReader**

**구성:**
- 미국 주식: Tiingo (30년치 historical)
- 한국 주식: FinanceDataReader

**장점:**
- 각 시장에 최적화
- 풍부한 historical 데이터

**단점:**
- 두 시스템 관리

---

### 4순위: **KRX Open API + Twelve Data**

**구성:**
- 한국 주식: KRX Open API (공식)
- 미국 주식: Twelve Data

**장점:**
- 공식 API로 안정적
- 높은 데이터 품질

**단점:**
- API 키 발급 복잡
- 두 시스템 관리

---

## 💡 구현 전략

### 전략 A: Python 서버 (추천)

**아키텍처:**
```
Next.js (Frontend)
    ↓
Next.js API Route
    ↓
Python FastAPI Server (yfinance-cache + FinanceDataReader)
    ↓
Yahoo Finance / FinanceDataReader
```

**장점:**
- 완전 무료
- Rate limit 문제 없음
- 한국/미국 주식 모두 완벽

**구현:**
1. Python FastAPI 서버 구축
2. yfinance-cache, FinanceDataReader 설치
3. Next.js에서 Python API 호출

---

### 전략 B: Twelve Data 단독

**아키텍처:**
```
Next.js (Frontend)
    ↓
Next.js API Route
    ↓
Twelve Data API
```

**장점:**
- 단일 API로 통합
- 기술적 지표 직접 제공
- 빠른 응답

**단점:**
- 한국 주식 지원 확인 필요

---

### 전략 C: 하이브리드 (최고 안정성)

**아키텍처:**
```
Next.js (Frontend)
    ↓
Next.js API Route
    ↓
┌─────────────┬──────────────┐
│ Twelve Data │ Python Server│
│ (미국 주식)  │ (한국 주식)   │
└─────────────┴──────────────┘
```

**장점:**
- 각 시장에 최적화
- 최고의 안정성
- 완전한 기능

---

## 📝 구현 체크리스트

### Python 서버 전략
- [ ] Python FastAPI 서버 구축
- [ ] yfinance-cache 설치
- [ ] FinanceDataReader 설치
- [ ] API 엔드포인트 구현
- [ ] Next.js에서 호출 로직 구현
- [ ] 테스트

### Twelve Data 전략
- [ ] API 키 발급
- [ ] 한국 주식 지원 확인
- [ ] `lib/finance-twelvedata.ts` 완성
- [ ] 어댑터 통합
- [ ] 테스트

### 하이브리드 전략
- [ ] 위 두 전략 모두 구현
- [ ] 자동 선택 로직 구현
- [ ] 테스트

---

## 🔗 참고 링크

- yfinance: https://github.com/ranaroussi/yfinance
- yfinance-cache: https://pypi.org/project/yfinance-cache/
- FinanceDataReader: https://github.com/FinanceData/FinanceDataReader
- Twelve Data: https://twelvedata.com/
- Tiingo: https://www.tiingo.com/
- Nasdaq Data Link: https://data.nasdaq.com/
- KRX Open API: https://openapi.krx.co.kr/
