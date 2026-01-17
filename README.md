# Stock Insight - AI 주식 분석 웹 애플리케이션

AI 기반 실시간 주식 분석 리포트를 제공하는 Next.js 웹 애플리케이션입니다.

## 주요 기능

- 📊 실시간 주식 데이터 수집 (yahoo-finance2)
- 📈 기술적 지표 계산 (RSI, 이동평균선, 이격도)
- 🤖 Google Gemini AI 기반 심층 분석 리포트
- 🇰🇷 한국 주식 수급 데이터 크롤링 (네이버 금융)
- 📱 반응형 모던 UI (Tailwind CSS + Shadcn UI)

## 기술 스택

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **AI**: Google Gemini Pro
- **Data Source**: 
  - Yahoo Finance (yahoo-finance2)
  - Finnhub API (선택사항)
  - Python 스크립트 (yfinance, FinanceDataReader)
  - 네이버 금융 (한국 주식 수급 데이터)
- **Python**: 3.10 이상 (권장: 3.11.10)

## 시작하기

### 1. 사전 요구사항

- **Node.js**: 18.x 이상
- **Python**: 3.10 이상 (권장: 3.11.10)
  - Python 스크립트를 사용하려면 필수
  - `pyenv`를 사용하여 설치: `pyenv install 3.11.10`
  - 또는 시스템에 Python 3.10 이상이 설치되어 있어야 함

### 2. 의존성 설치

```bash
# Node.js 의존성 설치
npm install

# Python 의존성 설치 (Python 스크립트 사용 시)
cd api
pip install -r requirements.txt
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 필수: Gemini API 키
GEMINI_API_KEY_01=your_gemini_api_key_here

# 선택사항: 추가 Gemini API 키 (fallback용)
GEMINI_API_KEY_02=your_second_gemini_api_key_here_optional

# 선택사항: Finnhub API 키
FINNHUB_API_KEY=your_finnhub_api_key_here

# 선택사항: Python 스크립트 사용 (로컬 개발 시)
USE_PYTHON_SCRIPT=true

# 선택사항: Python 경로 지정 (Python 3.10 이상)
PYTHON_PATH=python3.11
```

자세한 환경 변수 설명은 `env.example` 파일을 참고하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. Python 버전 확인

Python 스크립트를 사용하는 경우, 다음 명령어로 Python 버전을 확인하세요:

```bash
python3.11 --version
# 또는
python3 --version
```

Python 3.10 미만이 설치되어 있으면 오류가 발생할 수 있습니다. 이 경우:
- `pyenv`를 사용하여 Python 3.11.10 설치: `pyenv install 3.11.10`
- 또는 환경 변수 `PYTHON_PATH`에 Python 3.10 이상의 경로를 지정

## 사용 방법

1. 홈 페이지에서 분석할 종목 코드를 입력합니다 (예: `AAPL`, `TSLA`, `005930.KS`)
2. 원하는 지표를 선택합니다 (RSI, 이동평균선, 이격도 등)
3. "분석 시작" 버튼을 클릭합니다
4. 리포트 페이지에서 상세 분석 결과를 확인합니다

## 종목 코드 형식

- **미국 주식**: `AAPL`, `TSLA`, `MSFT` 등
- **한국 주식**: `005930.KS` (삼성전자), `000660.KS` (SK하이닉스) 등

## 배포

Vercel에 배포할 수 있습니다:

```bash
vercel
```

환경 변수는 Vercel 대시보드에서 설정하세요.
