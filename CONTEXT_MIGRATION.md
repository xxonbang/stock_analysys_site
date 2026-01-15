# Stock Analysis Web Application - 대화 이주 컨텍스트 문서

## 📋 프로젝트 개요

**Stock Insight**는 AI 기반 실시간 주식 분석 리포트를 제공하는 Next.js 웹 애플리케이션입니다. Google Gemini AI를 활용하여 종목별 심층 분석 리포트를 자동 생성하며, 다양한 기술적 지표와 차트를 제공합니다.

### 주요 기능
- 📊 실시간 주식 데이터 수집 (한국/미국 주식 지원)
- 📈 기술적 지표 계산 (RSI, 이동평균선, 이격도, 볼린저 밴드, 변동성, 거래량 지표 등)
- 📉 차트 시각화 (주가, 거래량, RSI 차트)
- 🤖 Google Gemini AI 기반 심층 분석 리포트
- 🇰🇷 한국 주식 수급 데이터 크롤링 (네이버 금융)
- 🔔 데이터 품질 모니터링 및 알림 시스템
- 📱 반응형 모던 UI (Tailwind CSS + Shadcn UI)

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Button, Card, Input, Checkbox, Skeleton)
- **Chart Library**: Recharts
- **Markdown**: react-markdown

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Python Integration**: Python 3.11 (Vercel Serverless Functions)
- **Python Libraries**: yfinance, yfinance-cache, FinanceDataReader, pandas

### AI & Data Sources
- **AI Model**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Data Sources**:
  - Yahoo Finance (yahoo-finance2)
  - Finnhub API
  - KRX Open API (한국 주식)
  - 네이버 금융 크롤링 (한국 주식 수급 데이터)
  - Vercel Serverless Functions (Python)

### 배포
- **Platform**: Vercel
- **Python Runtime**: Python 3.11 (runtime.txt)

---

## 📁 프로젝트 구조

```
stock_analysys_web_private/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 홈페이지 (분석 요청 입력)
│   ├── report/                   # 분석 결과 페이지
│   │   └── page.tsx
│   ├── metrics/                  # 데이터 품질 메트릭 대시보드
│   │   └── page.tsx
│   ├── alerts/                   # 알림 관리 페이지
│   │   └── page.tsx
│   ├── settings/                 # 설정 페이지
│   │   └── page.tsx
│   └── api/                      # API Routes
│       ├── analyze/              # 분석 요청 처리
│       │   └── route.ts
│       ├── metrics/              # 메트릭 조회
│       ├── alerts/                # 알림 조회
│       └── krx-key-check/        # KRX API 키 검증
│
├── components/                    # React 컴포넌트
│   ├── charts/                   # 차트 컴포넌트
│   │   ├── price-chart.tsx       # 주가 차트 (MA, 볼린저 밴드)
│   │   ├── volume-chart.tsx      # 거래량 차트
│   │   └── rsi-chart.tsx         # RSI 차트
│   ├── ui/                       # Shadcn UI 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── checkbox.tsx
│   │   └── skeleton.tsx
│   └── loading-overlay.tsx       # 로딩 인디케이터
│
├── lib/                          # 핵심 비즈니스 로직
│   ├── finance.ts                # Yahoo Finance 데이터 수집
│   ├── finance-finnhub.ts        # Finnhub API 데이터 수집
│   ├── finance-vercel.ts         # Python 스크립트 데이터 수집
│   ├── finance-adapter.ts        # 데이터 소스 통합 어댑터
│   ├── chart-utils.ts            # 차트 데이터 변환 유틸리티
│   ├── indicators.ts             # 기술적 지표 계산 (Phase 1 & 2)
│   ├── gemini-client.ts          # Gemini API 클라이언트 (Fallback 지원)
│   ├── types.ts                  # TypeScript 타입 정의
│   ├── korea-stock-mapper.ts     # 한국 주식 티커 매핑 (하드코딩)
│   ├── korea-stock-mapper-dynamic.ts  # 동적 티커 매핑
│   ├── krx-api.ts                # KRX Open API 클라이언트
│   ├── period-utils.ts           # 분석 기간 유틸리티
│   ├── data-validator.ts         # 데이터 유효성 검증
│   ├── data-consistency-checker.ts  # 데이터 소스 간 정합성 검증
│   ├── data-metrics.ts           # 데이터 품질 메트릭 수집
│   ├── alert-system.ts           # 알림 시스템
│   └── alert-notifiers.ts        # 외부 알림 채널 (Slack, Discord)
│
├── scripts/                      # Python 스크립트
│   ├── test_python_stock.py      # 주식 데이터 수집 스크립트
│   └── get_stock_listing.py      # KRX 종목 리스트 수집
│
├── api/                          # Vercel Serverless Functions
│   └── stock/
│       └── [symbol].py           # Python 런타임 API
│
└── docs/                         # 문서
    └── (다양한 분석 및 구현 문서들)
```

---

## 🔑 핵심 파일 설명

### 1. `app/page.tsx` - 홈페이지
- 사용자 입력: 종목명/코드, 분석 기간(과거/향후), 분석 기준일, 분석 지표 선택
- 주요 상태:
  - `stocks`: 종목 배열
  - `period`: 향후 전망 분석 기간
  - `historicalPeriod`: 과거 이력 분석 기간
  - `analysisDate`: 분석 기준일 (기본값: 오늘)
  - `indicators`: 선택된 지표들 (RSI, MA, 이격도, 수급, VIX, 환율, Phase 1/2 지표)

### 2. `app/api/analyze/route.ts` - 분석 API
- **핵심 로직**:
  1. 종목 데이터 수집 (배치 처리)
  2. 기술적 지표 계산 (RSI, MA, 이격도, Phase 1/2 지표)
  3. Gemini AI 리포트 생성 (단 1회 API 호출로 모든 종목 처리)
  4. 결과 반환 (historicalData 포함)
- **데이터 소스 선택**: Vercel Python → Finnhub → Yahoo Finance (Fallback)
- **중요**: `rsiValue`, `ma5`, `ma20`, `ma60`, `ma120`, `disparity`는 API 내에서 직접 계산하여 `marketData`에 할당

### 3. `app/report/page.tsx` - 리포트 페이지
- 종목별 탭으로 결과 표시
- 대시보드: 현재가, RSI, 이동평균선, 이격도, 수급, VIX, 환율, Phase 1/2 지표
- 차트: 주가, 거래량, RSI
- AI 리포트: Markdown 렌더링
- **주의**: React Hooks 규칙 준수 (모든 hooks는 조건부 return 이전에 호출)

### 4. `lib/finance.ts` - Yahoo Finance 데이터 수집
- `fetchStockData()`: 개별 종목 데이터 수집
- `calculateRSI()`: RSI 계산 (Wilder's Smoothing, 과거→최신 순서)
- `calculateMA()`: 이동평균선 계산 (과거→최신 순서, 데이터 부족 시 `null` 반환)
- `calculateDisparity()`: 이격도 계산
- **데이터 수집 기간**: 최소 180일 (MA120 계산을 위해)

### 5. `lib/finance-finnhub.ts` - Finnhub API
- Finnhub Candle API 시도 → 실패 시 Yahoo Finance Fallback
- 데이터 정합성 검증 포함
- **데이터 수집 기간**: 180일

### 6. `lib/finance-vercel.ts` - Python 스크립트 통합
- 로컬: `child_process`로 Python 스크립트 실행
- Vercel: Serverless Function 호출
- 한국 주식 티커 정규화 (하이브리드: 하드코딩 + 동적 검색)

### 7. `lib/chart-utils.ts` - 차트 데이터 변환
- `transformToChartData()`: `AnalyzeResult` → `ChartDataPoint[]`
- 각 시점별 지표 계산 (과거 데이터만 사용)
- 데이터 정렬 보장 (날짜 기준 오름차순)

### 8. `lib/indicators.ts` - Phase 1 & 2 지표
- Phase 1: ETF Premium, Bollinger Bands, Volatility, Volume Indicators
- Phase 2: Support Level, Support/Resistance

### 9. `lib/gemini-client.ts` - Gemini API 클라이언트
- **Fallback 지원**: `GEMINI_API_KEY`, `GEMINI_API_KEY_01`, `GEMINI_API_KEY_02` 등 여러 키 지원
- `getGeminiApiKeys()`: 환경 변수에서 모든 키 수집 (01, 02 형식 지원)
- `callGeminiWithFallback()`: 여러 키로 순차 시도 (Rate Limit 대응)

### 10. `components/charts/price-chart.tsx` - 주가 차트
- **범례 순서**: MA5 → MA20 → MA60 → 종가 (컴포넌트 선언 순서)
- **데이터**: 최근 60일만 표시 (`data.slice(-60)`)
- **Y축 범위**: 데이터 최소/최대값 기준 자동 조정
- **connectNulls**: 모든 MA 선에 적용 (끊김 방지)

---

## 🔐 환경 변수

### 필수 환경 변수
```env
# Gemini API Key (최소 1개, 여러 개 가능)
GEMINI_API_KEY=your_primary_key
GEMINI_API_KEY_01=your_fallback_key_1
GEMINI_API_KEY_02=your_fallback_key_2

# 선택적 환경 변수
FINNHUB_API_KEY=your_finnhub_key          # Finnhub API 사용 시
KRX_API_KEY=your_krx_key                  # KRX Open API 사용 시
USE_PYTHON_SCRIPT=true                    # Python 스크립트 강제 사용
USE_DYNAMIC_TICKER_MAPPING=true           # 동적 티커 매핑 활성화
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 주요 데이터 흐름

### 1. 분석 요청 흐름
```
사용자 입력 (app/page.tsx)
  ↓
POST /api/analyze
  ↓
데이터 소스 선택 (finance-adapter.ts)
  ├─ Vercel Python (finance-vercel.ts)
  ├─ Finnhub (finance-finnhub.ts)
  └─ Yahoo Finance (finance.ts)
  ↓
지표 계산 (indicators.ts, finance.ts)
  ↓
Gemini AI 리포트 생성 (gemini-client.ts)
  ↓
결과 반환 (historicalData 포함)
  ↓
리포트 페이지 (app/report/page.tsx)
  ├─ 대시보드 표시
  ├─ 차트 렌더링 (chart-utils.ts)
  └─ AI 리포트 표시
```

### 2. 지표 계산 흐름
```
historicalData (과거 → 최신 순서)
  ↓
closes 배열 추출
  ↓
calculateRSI(closes, 14)      # RSI 계산
calculateMA(closes, 5/20/60)  # 이동평균선 계산
calculateDisparity(price, ma20) # 이격도 계산
  ↓
Phase 1/2 지표 계산 (indicators.ts)
  ↓
marketData 객체 구성
```

---

## ⚠️ 중요 사항 및 주의사항

### 1. 데이터 순서
- **모든 지표 계산 함수는 "과거 → 최신" 순서의 데이터를 기대합니다**
- `calculateRSI()`, `calculateMA()` 등은 이 순서를 가정하고 작성됨
- `historicalData`는 항상 날짜 기준 오름차순으로 정렬되어야 함

### 2. React Hooks 규칙
- `app/report/page.tsx`에서 모든 hooks는 조건부 return 이전에 호출되어야 함
- `useMemo`, `useEffect` 등은 컴포넌트 최상단에 배치

### 3. Gemini API Fallback
- 여러 API 키 지원 (`GEMINI_API_KEY`, `GEMINI_API_KEY_01`, `GEMINI_API_KEY_02`)
- Rate Limit 발생 시 자동으로 다음 키로 전환
- 재시도 가능한 오류: 429, 503, quota 관련

### 4. 데이터 수집 기간
- **최소 180일치 데이터 수집** (MA120 계산을 위해)
- Python 스크립트: `max(period_to_days(period), 180)`
- Yahoo Finance: 180일
- Finnhub: 180일

### 5. 한국 주식 티커 매핑
- 하이브리드 방식: 하드코딩 + 동적 검색
- 동적 매핑 실패 시 정적 매핑으로 Fallback
- `USE_DYNAMIC_TICKER_MAPPING=false`로 비활성화 가능

### 6. 차트 렌더링
- 최근 60일만 표시 (`data.slice(-60)`)
- 범례 순서는 컴포넌트 선언 순서에 따라 결정됨
- `connectNulls` 속성으로 선 끊김 방지

### 7. 데이터 정합성
- Finnhub + Yahoo Finance 혼합 시 타임스탬프 일치 확인
- 데이터 유효성 검증 (`data-validator.ts`)
- 데이터 품질 메트릭 수집 (`data-metrics.ts`)

---

## 🐛 최근 수정 사항

### 1. RSI 계산 로직 수정
- Wilder's Smoothing 방식 정확히 구현
- 데이터 순서: 과거 → 최신
- 대시보드와 차트의 RSI 값 일치 보장

### 2. 이동평균선 계산 개선
- 데이터 부족 시 `null` 반환 (주가와 겹침 방지)
- 최소 180일치 데이터 수집으로 MA60/120 안정화
- 차트에서 MA20, MA60이 올바르게 표시되도록 수정

### 3. 차트 범례 순서
- MA5 → MA20 → MA60 → 종가 순서로 고정
- 컴포넌트 선언 순서 조정

### 4. Gemini API 키 Fallback
- `GEMINI_API_KEY_01`, `GEMINI_API_KEY_02` 형식 지원
- 환경 변수에서 자동으로 모든 키 수집

### 5. 하이드레이션 오류 해결
- `periodText`를 `useState`로 관리하여 서버/클라이언트 렌더링 일치

---

## 🚀 다음 단계 및 개선 가능 영역

### 1. 성능 최적화
- 차트 데이터 메모이제이션 강화
- API 응답 캐싱

### 2. 기능 확장
- 더 많은 기술적 지표 추가
- 백테스팅 기능
- 포트폴리오 분석

### 3. 데이터 소스
- 더 많은 데이터 소스 통합
- 실시간 데이터 스트리밍

### 4. UI/UX
- 다크 모드 지원
- 차트 인터랙션 개선
- 모바일 최적화 강화

---

## 📝 코드 스타일 가이드

### TypeScript
- 모든 함수에 타입 힌트 사용
- `interface` 사용 (type보다 선호)
- `const` 기본 사용 (재할당 필요 시에만 `let`)

### React
- 함수형 컴포넌트만 사용
- Hooks 규칙 준수
- `useMemo`, `useCallback` 적절히 활용

### 에러 처리
- 모든 외부 API 호출에 try-catch
- Fallback 메커니즘 구현
- 사용자 친화적 에러 메시지

### 주석
- 코드는 영어, 주석은 한국어
- 복잡한 로직에 설명 추가

---

## 🔗 관련 문서

- `docs/DATA_RELIABILITY_ANALYSIS.md`: 데이터 신뢰도 분석
- `docs/GEMINI_API_KEY_FALLBACK.md`: Gemini API Fallback 가이드
- `docs/KRX_API_SETUP.md`: KRX API 설정 가이드
- `docs/CHART_IMPLEMENTATION_REVIEW.md`: 차트 구현 리뷰

---

**마지막 업데이트**: 2024년 (현재 시점)
**프로젝트 상태**: 운영 중, 지속적 개선 중
