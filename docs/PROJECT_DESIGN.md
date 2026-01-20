# Stock Insight - 프로젝트 설계 문서

> 버전: 1.0.0
> 최종 업데이트: 2026-01-19
> 작성자: AI Assistant (Claude)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 명
**Stock Insight** - AI 기반 주식 분석 웹 애플리케이션

### 1.2 프로젝트 목적
개인 투자자를 위한 AI 기반 주식 분석 도구로, 기술적 지표 계산과 Google Gemini AI를 활용한 종합 분석 리포트를 제공합니다.

### 1.3 주요 특징
- 한국/미국 주식 통합 검색 및 분석
- 다양한 기술적 지표 계산 (RSI, MA, 볼린저밴드 등)
- AI 기반 종합 분석 리포트 생성
- 실시간 알림 시스템
- 반응형 웹 디자인

### 1.4 기술 스택
| 구분 | 기술 |
|------|-----|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5.4 |
| **Styling** | Tailwind CSS 3.4, Shadcn UI |
| **State** | React Context, LocalStorage, SessionStorage |
| **Charts** | Recharts |
| **AI** | Google Gemini API |
| **Data** | Yahoo Finance, KRX API, Naver Finance |
| **Python** | yfinance, FinanceDataReader (서버사이드) |

---

## 2. 기능 목록

### 2.1 핵심 기능

| ID | 기능명 | 설명 | 상태 |
|----|-------|------|-----|
| F001 | 종목 검색 | 한국/미국 주식 자동완성 검색 | 완료 |
| F002 | 기술적 지표 계산 | RSI, MA, 이격도, 볼린저밴드 등 | 완료 |
| F003 | AI 분석 리포트 | Gemini AI 기반 종합 분석 | 완료 |
| F004 | 차트 시각화 | 주가, 거래량, RSI 차트 | 완료 |
| F005 | 수급 분석 | 한국 주식 외국인/기관 수급 | 완료 |

### 2.2 보조 기능

| ID | 기능명 | 설명 | 상태 |
|----|-------|------|-----|
| F006 | 알림 시스템 | 목표가/조건 기반 알림 | 완료 |
| F007 | 성능 메트릭 | 데이터 품질 및 API 성능 모니터링 | 완료 |
| F008 | 사용자 인증 | 간단한 로그인 (10분 자동 로그아웃) | 완료 |
| F009 | 설정 관리 | 사용자 설정 페이지 | 완료 |

### 2.3 기술적 지표 상세

#### Phase 1 지표
- **볼린저 밴드**: 20일 이동평균 ± 2표준편차
- **변동성 지표**: 20일 가격 표준편차
- **ETF 괴리율**: (시장가 - NAV) / NAV × 100

#### Phase 2 지표
- **거래량 지표**: 20일 평균 대비 현재 거래량 비율
- **눌림목 감지**: 지지선 근접 여부 분석
- **지지선/저항선**: 최근 저점/고점 기반 계산

---

## 3. 시스템 아키텍처

### 3.1 전체 아키텍처
```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Home Page  │  │ Report Page │  │  Alerts/Settings    │  │
│  │ (page.tsx)  │  │ (page.tsx)  │  │     Pages           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────┴────────────────┴─────────────────────┴──────────┐  │
│  │              Components Layer                           │  │
│  │  (stock-autocomplete, charts, navigation, dialogs)      │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐  │
│  │                Context & State                          │  │
│  │  (AuthContext, SessionStorage, LocalStorage)            │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/HTTPS
┌─────────────────────────────┴───────────────────────────────┐
│                     Next.js Server (API Routes)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  /api/analyze   │  │  /api/search-*-stocks           │   │
│  │  (Main API)     │  │  (Search APIs)                  │   │
│  └────────┬────────┘  └────────────────┬────────────────┘   │
│           │                            │                    │
│  ┌────────┴────────────────────────────┴────────────────┐   │
│  │                  Library Layer                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │  finance-*   │  │  indicators  │  │  gemini    │  │   │
│  │  │  (Data)      │  │  (Calc)      │  │  (AI)      │  │   │
│  │  └──────┬───────┘  └──────────────┘  └─────┬──────┘  │   │
│  └─────────┼──────────────────────────────────┼─────────┘   │
└────────────┼──────────────────────────────────┼─────────────┘
             │                                  │
┌────────────┴──────────────┐    ┌──────────────┴─────────────┐
│     External Data APIs     │    │      AI Services           │
├────────────────────────────┤    ├────────────────────────────┤
│  - Yahoo Finance           │    │  - Google Gemini API       │
│  - KRX Open API            │    │    (Fallback 지원)         │
│  - Naver Finance           │    │                            │
│  - Python (yfinance)       │    │                            │
└────────────────────────────┘    └────────────────────────────┘
```

### 3.2 디렉토리 구조
```
stock_analysys_web_private_02/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트
│   │   ├── analyze/              # 메인 분석 API
│   │   ├── alerts/               # 알림 API
│   │   ├── search-korea-stocks/  # 한국 주식 검색
│   │   ├── search-us-stocks/     # 미국 주식 검색
│   │   ├── search-naver-stocks/  # 네이버 증권 검색
│   │   ├── metrics/              # 메트릭 API
│   │   └── refresh-stock-listing/# 종목 목록 갱신
│   ├── alerts/                   # 알림 페이지
│   ├── metrics/                  # 메트릭 페이지
│   ├── report/                   # 분석 결과 페이지
│   ├── settings/                 # 설정 페이지
│   ├── page.tsx                  # 홈 페이지
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # 전역 스타일
├── components/                   # React 컴포넌트
│   ├── ui/                       # Shadcn UI 컴포넌트
│   ├── charts/                   # 차트 컴포넌트
│   └── *.tsx                     # 기능 컴포넌트
├── lib/                          # 비즈니스 로직
│   ├── constants.ts              # 전역 상수
│   ├── types.ts                  # TypeScript 타입
│   ├── finance*.ts               # 데이터 수집
│   ├── indicators.ts             # 기술적 지표
│   ├── gemini-client.ts          # AI 클라이언트
│   ├── stock-search.ts           # 종목 검색
│   └── *.ts                      # 기타 유틸리티
├── public/data/                  # 정적 데이터
├── scripts/                      # Python 스크립트
└── docs/                         # 문서
```

---

## 4. 핵심 프로세스 흐름

### 4.1 메인 분석 프로세스

```
┌─────────────────────────────────────────────────────────────────┐
│                     사용자 입력 단계                              │
├─────────────────────────────────────────────────────────────────┤
│  1. 종목명 입력 (자동완성)                                        │
│  2. 분석 지표 선택 (RSI, MA, 볼린저밴드 등)                        │
│  3. 분석 기간 선택 (1개월, 3개월, 6개월, 1년)                      │
│  4. "분석 시작" 버튼 클릭                                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     심볼 변환 단계                                │
├─────────────────────────────────────────────────────────────────┤
│  1. 종목명 → 티커 심볼 변환 (예: "삼성전자" → "005930.KS")         │
│  2. 정적 매핑 확인 (KOREA_STOCK_MAP)                              │
│  3. 동적 매핑 (Python StockListing)                              │
│  4. 검증 실패 시 사용자에게 오류 표시                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API 요청 단계                                │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/analyze                                              │
│  Body: { stocks: string[], indicators: string[], period: string }│
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     데이터 수집 단계                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ 가격/거래량 데이터 │  │   수급 데이터    │  │   뉴스 데이터    │  │
│  │ (Yahoo/Python)  │  │   (KRX API)     │  │   (Naver)       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                ▼                                │
│                    데이터 통합 및 검증                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     지표 계산 단계                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  기본 지표    │  │ Phase 1 지표  │  │   Phase 2 지표       │   │
│  │ RSI, MA,     │  │ 볼린저밴드,   │  │  거래량 지표,        │   │
│  │ 이격도       │  │ 변동성, ETF   │  │  지지/저항선         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI 분석 단계                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Gemini API 호출 (프롬프트 구성)                               │
│  2. API 키 Fallback (Key 1 실패 → Key 2)                         │
│  3. 마크다운 형식 리포트 생성                                      │
│  4. 투자 의견 및 목표가 산출                                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     결과 반환 및 표시                             │
├─────────────────────────────────────────────────────────────────┤
│  1. API 응답 → SessionStorage 저장                               │
│  2. /report 페이지로 리다이렉트                                   │
│  3. 대시보드, 차트, AI 리포트 표시                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 종목 검색 프로세스

```
┌─────────────────────────────────────────────────────────────────┐
│                     검색어 입력                                   │
│                  (디바운스: 300ms)                                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   로컬 캐시 검색 (1단계)                          │
├─────────────────────────────────────────────────────────────────┤
│  - public/data/symbols.json 검색                                │
│  - Fuse.js로 퍼지 매칭                                           │
│  - 최대 10개 결과 반환                                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    로컬 결과 부족 시
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API 검색 (2단계)                               │
├─────────────────────────────────────────────────────────────────┤
│  한글 검색어 → /api/search-naver-stocks                          │
│  영문 검색어 → /api/search-us-stocks                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   결과 병합 및 중복 제거                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Core 기능 상세 설명

### 5.1 데이터 수집 모듈 (lib/finance*.ts)

#### 목적
다양한 외부 소스에서 주식 데이터를 수집하고 통합된 형식으로 제공

#### 구성 파일
| 파일 | 역할 |
|------|-----|
| `finance.ts` | Yahoo Finance API 직접 호출 |
| `finance-finnhub.ts` | Finnhub API 통합 |
| `finance-vercel.ts` | Python 스크립트 실행 (yfinance) |
| `finance-adapter.ts` | 데이터 소스 자동 선택 및 Fallback |

#### 데이터 소스 우선순위
```
1. Python (yfinance) - 가장 정확하고 안정적
2. Yahoo Finance - 직접 API 호출
3. Finnhub - 대안 데이터 소스
```

#### 주요 함수
```typescript
// 통합 데이터 수집
fetchStocksData(symbols: string[]): Promise<StockData[]>

// 배치 조회 (효율성)
fetchQuotesBatch(symbols: string[]): Promise<QuoteData[]>

// Python 스크립트 호출
fetchStocksDataBatchVercel(symbols: string[]): Promise<StockData[]>
```

### 5.2 기술적 지표 모듈 (lib/indicators.ts)

#### 목적
주가 및 거래량 데이터로부터 투자 판단에 유용한 기술적 지표 계산

#### 주요 지표 및 계산식

| 지표 | 계산식 | 용도 |
|------|-------|-----|
| **RSI** | 100 - (100 / (1 + RS)) | 과매수/과매도 판단 |
| **이동평균** | N일 종가 평균 | 추세 판단 |
| **이격도** | (현재가 / MA) × 100 | MA 대비 위치 |
| **볼린저밴드** | MA ± (2 × 표준편차) | 변동성 범위 |
| **거래량비율** | 현재거래량 / 20일평균 | 매매 강도 |

#### 주요 함수
```typescript
// RSI 계산
calculateRSI(prices: number[], period?: number): number

// 이동평균선
calculateMA(prices: number[], period: number): number

// 볼린저밴드
calculateBollingerBands(prices: number[], period?: number, stdDev?: number): {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  percentB: number;
}

// 지지선/저항선
calculateSupportResistance(data: HistoricalData[]): {
  supportLevel: number;
  resistanceLevel: number;
}
```

### 5.3 AI 분석 모듈 (lib/gemini-client.ts)

#### 목적
Google Gemini AI를 활용한 종합 투자 분석 리포트 생성

#### 핵심 기능
- API 키 Fallback 시스템 (Key 1 실패 시 Key 2 자동 전환)
- 구조화된 프롬프트 템플릿
- 마크다운 형식 리포트 생성

#### 분석 항목
1. **현재 시장 상황** - 가격, 거래량, 추세
2. **기술적 분석** - 선택된 지표 기반 분석
3. **투자 전략** - 진입/청산 시점 제안
4. **리스크 요인** - 잠재적 위험 요소
5. **투자 의견** - 매수/보유/매도 권고

#### 주요 함수
```typescript
// Fallback 지원 API 호출
callGeminiWithFallback<T>(
  operation: string,
  options: {
    primaryCall: () => Promise<T>;
    fallbackCall: () => Promise<T>;
  }
): Promise<T>

// 배치 리포트 생성
generateAIReportsBatch(
  stocksData: StockData[],
  period: string,
  genAI: GoogleGenerativeAI
): Promise<AIReport[]>
```

### 5.4 종목 검색 모듈 (lib/stock-search.ts)

#### 목적
한국/미국 주식을 통합 검색하고 자동완성 기능 제공

#### 검색 전략
```
1. 로컬 캐시 검색 (symbols.json)
   - 빠른 응답 속도
   - 오프라인 지원

2. API 검색 (Naver/Yahoo)
   - 최신 데이터
   - 전체 종목 커버리지

3. 결과 병합
   - 중복 제거
   - 관련도 정렬
```

#### 주요 함수
```typescript
// 통합 검색
searchStocks(query: string): Promise<SearchResult[]>

// 로컬 검색 (클라이언트)
searchStocksLocal(query: string): Promise<SearchResult[]>

// 심볼 정규화
normalizeStockSymbolHybrid(
  symbol: string,
  useDynamicMapping?: boolean
): Promise<string>
```

### 5.5 인증 모듈 (lib/auth-context.tsx)

#### 목적
간단한 사용자 인증 및 세션 관리

#### 보안 기능
- 10분 비활성 시 자동 로그아웃
- 로컬 스토리지 기반 세션 관리
- 활동 감지 (마우스, 키보드, 스크롤)

#### 주요 함수
```typescript
// 인증 훅
useAuth(): {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateLastActivity: () => void;
}
```

---

## 6. 데이터 모델

### 6.1 주요 타입 정의

```typescript
// 분석 결과
interface AnalyzeResult {
  symbol: string;
  name?: string;
  marketData: MarketData;
  historicalData?: HistoricalDataPoint[];
  aiReport: string;
  news?: NewsItem[];
  supplyDemand?: SupplyDemandData;
}

// 시장 데이터
interface MarketData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  rsi?: number;
  movingAverages?: {
    ma5?: number;
    ma20?: number;
    ma60?: number;
    ma120?: number;
  };
  disparity?: number;
  bollingerBands?: BollingerBands;
  volatility?: number;
  volumeIndicators?: VolumeIndicators;
  supportResistance?: SupportResistance;
}

// 히스토리컬 데이터
interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 검색 결과
interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  type?: string;
}
```

### 6.2 저장소

| 저장소 | 용도 | 데이터 |
|--------|-----|--------|
| **SessionStorage** | 분석 결과 임시 저장 | analysisResults |
| **LocalStorage** | 인증 상태 | isAuthenticated, lastActivityTime |
| **File Cache** | 종목 목록 캐시 | .cache/krx-stock-listing.json |
| **Static** | 심볼 데이터 | public/data/symbols.json |

---

## 7. API 명세

### 7.1 분석 API

**POST /api/analyze**

요청:
```json
{
  "stocks": ["005930.KS", "AAPL"],
  "indicators": ["rsi", "ma", "disparity", "bollinger"],
  "period": "3개월"
}
```

응답:
```json
{
  "results": [
    {
      "symbol": "005930.KS",
      "name": "삼성전자",
      "marketData": {
        "price": 75000,
        "change": 1500,
        "changePercent": 2.04,
        "rsi": 55.3,
        "movingAverages": { "ma5": 74000, "ma20": 72000 }
      },
      "aiReport": "## 삼성전자 분석 리포트\n...",
      "historicalData": [...]
    }
  ],
  "_metadata": {
    "dataCollection": 1200,
    "indicatorCalculation": 50,
    "aiAnalysis": 3000,
    "total": 4250
  }
}
```

### 7.2 검색 API

**GET /api/search-korea-stocks?query=삼성**

응답:
```json
{
  "results": [
    { "symbol": "005930", "name": "삼성전자", "market": "KOSPI" },
    { "symbol": "000810", "name": "삼성화재", "market": "KOSPI" }
  ]
}
```

---

## 8. 개선 권장사항

### 8.1 보안 개선 (긴급)

| 항목 | 현재 상태 | 권장 조치 |
|------|----------|----------|
| 로그인 정보 | 하드코딩 | 환경변수 또는 OAuth 도입 |
| API 키 | .env.local | 비밀 관리 서비스 사용 |
| 세션 관리 | LocalStorage | httpOnly 쿠키 전환 |

### 8.2 성능 개선

| 항목 | 현재 상태 | 권장 조치 |
|------|----------|----------|
| 번들 크기 | 대형 파일 포함 | 동적 임포트, 코드 스플리팅 |
| API 호출 | 순차 처리 일부 | 병렬 처리 확대 |
| 캐싱 | 부분적 | Redis 등 중앙화된 캐시 |

### 8.3 코드 품질

| 항목 | 현재 상태 | 권장 조치 |
|------|----------|----------|
| 타입 | any 사용 있음 | strict 타입 적용 |
| 에러 처리 | 불일치 | 통합 에러 핸들러 |
| 로깅 | console.log | 구조화된 로깅 시스템 |

---

## 9. 향후 로드맵

### Phase 3 (계획)
- [ ] 포트폴리오 관리 기능
- [ ] 백테스팅 도구
- [ ] 실시간 시세 연동
- [ ] 모바일 앱 (React Native)

### Phase 4 (계획)
- [ ] 소셜 트레이딩 기능
- [ ] 자동매매 연동
- [ ] 다국어 지원

---

## 10. 부록

### 10.1 환경 변수

```env
# AI API
GEMINI_API_KEY_01=your_primary_key
GEMINI_API_KEY_02=your_fallback_key

# Data APIs
KRX_API_KEY=your_krx_key
FINNHUB_API_KEY=your_finnhub_key

# App Config
NODE_ENV=production
```

### 10.2 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Yahoo Finance API](https://pypi.org/project/yfinance/)
- [KRX Open API](https://openapi.krx.co.kr/)
