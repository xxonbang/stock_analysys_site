# Agentic Web Browsing 효용성 검증 보고서

## 지표 및 수치 데이터 수집 관점 분석

> **분석 범위**: 검색 기능이 아닌, 각종 **지표 및 수치 데이터 수집**에 대한 Agentic Web Browsing 기술 적용 효용성 검토

---

## 1. 기술 개요

### 1.1 Agentic Web Browsing이란?

**"브라우저 자동화 + 화면 캡처 + 시각적 정보 추출(Vision AI)"**을 조합한 최신 웹 자동화 패러다임입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentic Web Browsing                      │
├─────────────────────────────────────────────────────────────┤
│  [1] 브라우저 자동화     [2] 스크린샷 캡처    [3] Vision AI   │
│      (Playwright/       (실시간 화면       (GPT-4o Vision/  │
│       Puppeteer)         이미지 획득)       Claude Vision)  │
├─────────────────────────────────────────────────────────────┤
│                    ↓                                         │
│  AI Agent가 스크린샷을 "보고" → "이해하고" → "데이터 추출"     │
│                    ↓                                         │
│  테이블, 차트, 동적 콘텐츠에서 수치 데이터 자동 추출           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 전통적 크롤링 vs Agentic Web Browsing (데이터 수집 관점)

| 구분 | 전통적 크롤링 | Agentic Web Browsing |
|------|---------------|---------------------|
| **데이터 추출 방식** | CSS 선택자, XPath | 스크린샷 + Vision AI |
| **테이블 데이터 추출** | 고정 구조에 의존 | 시각적 테이블 인식 |
| **수치 포맷 처리** | 정규식/파싱 로직 필요 | AI가 자동 해석 |
| **사이트 변경 대응** | 선택자 수정 필요 | 자동 적응 |
| **속도** | 빠름 (ms 단위) | 느림 (초 단위) |
| **비용** | 낮음 | 높음 (API 호출 비용) |
| **유지보수** | 높음 (잦은 수정) | 낮음 (자동 적응) |

---

## 2. 현재 프로젝트의 데이터 수집 현황 분석

### 2.1 현재 구현된 데이터 수집 체계

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 데이터 수집 아키텍처                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [주가 데이터] ─────────────────────────────────────────────  │
│    ✅ Yahoo Finance API (yahoo-finance2)                    │
│    - 현재가, 등락률, 거래량, 시가총액                         │
│    - 180일 히스토리컬 데이터                                  │
│    - Rate limiting 대응 (재시도 로직)                        │
│                                                              │
│  [기술적 지표] ─────────────────────────────────────────────  │
│    ✅ RSI (14일)                                             │
│    ✅ 이동평균선 (MA5, MA20, MA60, MA120)                    │
│    ✅ 이격도 (Disparity)                                     │
│    ✅ 볼린저 밴드 (20일, 2σ)                                 │
│    ✅ MACD (12-26-9)                                         │
│    ✅ 스토캐스틱 (14-3-3)                                    │
│    ✅ 변동성 (20일 표준편차)                                 │
│    ✅ 지지선/저항선                                          │
│                                                              │
│  [수급 데이터] ─────────────────────────────────────────────  │
│    ⚠️ KRX API → 투자자별 매매동향 필드 미제공                │
│    ⚠️ 네이버 금융 크롤링 (Fallback) → CSS 선택자 의존        │
│                                                              │
│  [재무 지표] ───────────────────────────────────────────────  │
│    ❌ calculateFinancialMetrics() 함수만 존재                │
│    ❌ 실제 재무제표 데이터 수집 미구현                        │
│    - PER, PBR, ROE, ROA, EPS, BPS 계산 함수 준비됨           │
│    - 입력 데이터 (순이익, 자기자본 등) 수집 안됨              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 한계점 식별

#### 한계 1: 재무 지표 데이터 소스 부재 (Critical)

```typescript
// lib/indicators.ts:871-979 - 함수는 존재하지만 데이터가 없음
export function calculateFinancialMetrics(
  currentPrice: number,
  financialData: {
    netIncome?: number;        // ❌ 수집 안됨
    totalEquity?: number;      // ❌ 수집 안됨
    totalAssets?: number;      // ❌ 수집 안됨
    totalLiabilities?: number; // ❌ 수집 안됨
    sharesOutstanding?: number;// ❌ 수집 안됨
    dividendPerShare?: number; // ❌ 수집 안됨
    revenue?: number;          // ❌ 수집 안됨
    operatingIncome?: number;  // ❌ 수집 안됨
  }
): FinancialMetrics
```

**현재 상태**:
- PER, PBR, ROE, ROA, EPS, BPS 등 계산 함수 완비
- **그러나 입력 데이터(재무제표)를 가져오는 소스가 없음**
- 한국 주식 재무제표 API가 부재하거나 유료

#### 한계 2: 수급 데이터 크롤링 취약성 (High)

```typescript
// lib/finance.ts:426-525 - 네이버 크롤링 의존
async function fetchKoreaSupplyDemandNaver(symbol: string) {
  // ⚠️ CSS 선택자에 의존 - 사이트 변경 시 깨짐
  $('table.type_1 tbody tr').each((index, element) => {
    // 기관, 외국인, 개인 순매수 추출
  });

  // 대안 선택자 (역시 취약)
  $('.section.trade_compare table tbody tr').each(...)
}
```

**현재 상태**:
- KRX API는 투자자별 매매동향 필드 미제공 (API 문서 확인됨)
- **항상 네이버 금융 크롤링으로 Fallback**
- 네이버 UI 변경 시 즉시 데이터 수집 실패

#### 한계 3: KRX API 한계

```typescript
// lib/krx-api.ts:89-94 - 투자자별 데이터 미제공
// ⚠️ 캡처 이미지의 OUTPUT 정보에 투자자별 필드가 없음
INSTI_BY_QTY?: string;   // 기관 순매수량 (별도 API)
FRGN_BY_QTY?: string;    // 외국인 순매수량 (별도 API)
PRSN_INBY_QTY?: string;  // 개인 순매수량 (별도 API)
// 네이버 크롤링 fallback 사용 필요
```

---

## 3. Agentic Web Browsing 적용 시나리오

### 3.1 시나리오 A: 재무제표 데이터 수집

```
┌─────────────────────────────────────────────────────────────┐
│     시나리오: 네이버 금융에서 재무제표 수치 추출              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  대상 URL: finance.naver.com/item/main.naver?code=005930    │
│                                                              │
│  추출 대상 데이터:                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [투자지표]                                          │    │
│  │  • PER: 14.25배                                      │    │
│  │  • PBR: 1.12배                                       │    │
│  │  • ROE: 8.23%                                        │    │
│  │  • EPS: 4,523원                                      │    │
│  │  • BPS: 45,230원                                     │    │
│  │                                                       │    │
│  │  [재무제표 요약]                                      │    │
│  │  • 매출액: 302조원                                   │    │
│  │  • 영업이익: 36.7조원                                │    │
│  │  • 순이익: 26.4조원                                  │    │
│  │  • 부채비율: 42.3%                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  전통적 크롤링 문제점:                                       │
│  • CSS 선택자가 동적으로 변경 (클래스명 해시화)              │
│  • JavaScript 렌더링 후 데이터 로드                          │
│  • 테이블 구조 주기적 변경                                   │
│                                                              │
│  Agentic 접근:                                               │
│  • Vision AI가 "투자지표" 섹션 시각적 인식                   │
│  • 테이블 형태와 무관하게 라벨-값 쌍 추출                    │
│  • 숫자 포맷 (조, 억, %, 배) 자동 해석                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 시나리오 B: 수급 데이터 수집 개선

```
┌─────────────────────────────────────────────────────────────┐
│     시나리오: 투자자별 매매동향 수집 안정화                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  대상 URL: finance.naver.com/item/frgn.naver?code=005930    │
│                                                              │
│  현재 크롤링 (취약):                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  $('table.type_1 tbody tr')  ← 선택자 변경 시 실패   │    │
│  │  - 기관: +15,230주                                   │    │
│  │  - 외국인: -8,450주                                  │    │
│  │  - 개인: -6,780주                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Agentic 접근 (안정적):                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. 스크린샷 캡처                                    │    │
│  │  2. Vision AI: "투자자별 매매동향 테이블 찾기"       │    │
│  │  3. 테이블 인식 → 행/열 구조 파악                    │    │
│  │  4. "기관", "외국인", "개인" 라벨 인식               │    │
│  │  5. 해당 행의 수치 추출                              │    │
│  │  → 테이블 스타일/클래스 변경 무관                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 시나리오 C: 증권사 리포트 데이터 추출

```
┌─────────────────────────────────────────────────────────────┐
│     시나리오: 증권사 목표가/투자의견 수집                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  대상 데이터:                                                │
│  • 목표주가 컨센서스                                         │
│  • 투자의견 (매수/중립/매도)                                 │
│  • 추정 EPS/BPS                                              │
│                                                              │
│  전통적 크롤링 불가 사유:                                    │
│  • PDF 형태 리포트                                           │
│  • 이미지 기반 차트/테이블                                   │
│  • 로그인 필요 사이트                                        │
│                                                              │
│  Agentic 접근:                                               │
│  • PDF 스크린샷 → Vision AI로 테이블 인식                   │
│  • 차트 이미지 → 수치 데이터 추출                            │
│  • 자동 로그인 후 데이터 수집                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 주요 Agentic Web Browsing 도구 비교

### 4.1 Browser-Use (오픈소스)

| 항목 | 내용 |
|------|------|
| **GitHub** | [browser-use/browser-use](https://github.com/browser-use/browser-use) |
| **성능** | WebVoyager 벤치마크 **89.1%** |
| **특징** | 자연어 명령으로 브라우저 제어 |
| **언어** | Python |
| **비용** | LLM API 비용만 발생 |

```python
# 재무제표 수집 예시
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="""
    https://finance.naver.com/item/main.naver?code=005930 접속
    '투자지표' 섹션에서 다음 데이터를 JSON으로 추출:
    - PER, PBR, ROE, EPS, BPS
    - 52주 최고/최저
    - 배당수익률
    """,
    llm=ChatOpenAI(model="gpt-4o")
)
result = await agent.run()
```

### 4.2 Claude Computer Use

| 항목 | 내용 |
|------|------|
| **지원 모델** | Claude Sonnet 4.5, Opus 4.5 |
| **도구 버전** | computer-use-2025-01-24 |
| **특징** | 스크린샷 + GUI 제어 (마우스/키보드) |
| **권장 환경** | 샌드박스 컨테이너 |

```typescript
// 수급 데이터 수집 예시
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: screenshot }},
      { type: "text", text: `
        이 화면에서 투자자별 매매동향 테이블을 찾아 다음 정보를 추출해주세요:
        - 기관 순매수량
        - 외국인 순매수량
        - 개인 순매수량
        JSON 형식으로 반환해주세요.
      `}
    ]
  }]
});
```

### 4.3 Skyvern

| 항목 | 내용 |
|------|------|
| **아키텍처** | 3-Phase (Planner → Actor → Validator) |
| **성능** | WebVoyager 벤치마크 **85.85%** |
| **특징** | JavaScript-heavy 사이트 처리 우수 |
| **오픈소스** | ✅ |

### 4.4 도구 비교 요약

| 도구 | 오픈소스 | 성능 | 데이터 추출 적합성 | 한국어 지원 |
|------|:--------:|------|:------------------:|:-----------:|
| Browser-Use | ✅ | 89.1% | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Claude Computer Use | ✅ | 높음 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Skyvern | ✅ | 85.85% | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| OpenAI Operator | ❌ | 높음 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 5. 효용성 평가 매트릭스

### 5.1 재무 지표 수집 (시나리오 A)

| 평가 항목 | 전통적 크롤링 | Agentic | 판정 |
|-----------|:------------:|:-------:|:----:|
| **구현 가능성** | 중 (JS 렌더링 필요) | 상 | Agentic 승 |
| **유지보수 비용** | 높음 | 낮음 | Agentic 승 |
| **데이터 정확도** | 높음 (파싱 성공 시) | 높음 | 동등 |
| **실행 속도** | ~500ms/종목 | ~5초/종목 | 전통적 승 |
| **사이트 변경 대응** | 수동 수정 | 자동 적응 | Agentic 승 |
| **비용** | 무료 | ~$0.02/요청 | 전통적 승 |

**결론**: 재무 지표는 **현재 수집 불가 상태**이므로, Agentic 방식이 실질적 해결책

### 5.2 수급 데이터 수집 (시나리오 B)

| 평가 항목 | 현재 (네이버 크롤링) | Agentic | 판정 |
|-----------|:------------------:|:-------:|:----:|
| **안정성** | 낮음 (CSS 의존) | 높음 | Agentic 승 |
| **유지보수** | 높음 | 낮음 | Agentic 승 |
| **실행 속도** | ~200ms | ~3초 | 전통적 승 |
| **비용** | 무료 | ~$0.01/요청 | 전통적 승 |
| **확장성** | 낮음 | 높음 | Agentic 승 |

**결론**: **Fallback으로 Agentic 방식 권장** (기존 크롤링 실패 시 자동 전환)

### 5.3 비용 분석 (월간 추정)

```
┌─────────────────────────────────────────────────────────────┐
│                    월간 비용 비교                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [전통적 크롤링 유지보수]                                    │
│  • 개발자 시간: 월 8-16시간 (사이트 변경 대응)              │
│  • 인건비 환산: $400-800/월                                 │
│  • 서버 비용: ~$0 (Vercel 무료 티어)                        │
│  • 총: $400-800/월                                          │
│                                                              │
│  [Agentic Web Browsing]                                     │
│  • API 비용:                                                 │
│    - 일 1회 전종목 재무 수집 (2,000종목)                    │
│    - $0.02/요청 × 2,000 = $40/일                            │
│    - 월간: $40 × 30 = $1,200/월                             │
│  • 유지보수: 월 1-2시간 = $50-100/월                        │
│  • 총: $1,250-1,300/월                                      │
│                                                              │
│  [하이브리드 (권장)]                                         │
│  • 기존 크롤링: 정상 동작 시 사용                            │
│  • Agentic Fallback: 크롤링 실패 시에만 호출                │
│  • 예상 Agentic 호출: 월 500회 (오류 발생 시)               │
│  • 월간 비용: $50 (API) + $100 (유지보수) = $150/월         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 방안

### 6.1 하이브리드 아키텍처 (권장)

```
┌─────────────────────────────────────────────────────────────┐
│                하이브리드 데이터 수집 시스템                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [1단계] 기존 API (Yahoo Finance, KRX API)                  │
│     ↓ 실패 또는 데이터 부재                                  │
│  [2단계] 전통적 크롤링 (BeautifulSoup/Cheerio)               │
│     ↓ 실패 (선택자 오류, 구조 변경)                          │
│  [3단계] Agentic Fallback (Browser-Use / Claude Vision)     │
│     ↓                                                        │
│  [4단계] 데이터 검증 및 캐싱                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  수집 데이터 유형별 전략                            │    │
│  ├────────────────────────────────────────────────────┤    │
│  │  주가 데이터     : Yahoo Finance API (기존)        │    │
│  │  기술적 지표     : 로컬 계산 (기존)                │    │
│  │  수급 데이터     : 네이버 크롤링 → Agentic Fallback│    │
│  │  재무 지표       : Agentic (신규 구현)             │    │
│  │  증권사 리포트   : Agentic (향후 확장)             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 구현 예시: 재무 지표 수집

```python
# scripts/agentic_financial_crawler.py
from browser_use import Agent
from langchain_openai import ChatOpenAI
import json

async def fetch_financial_metrics_agentic(stock_code: str) -> dict:
    """
    Agentic 방식으로 재무 지표 수집
    현재 프로젝트에서 구현되지 않은 재무제표 데이터를 수집
    """

    agent = Agent(
        task=f"""
        https://finance.naver.com/item/main.naver?code={stock_code} 접속

        다음 재무 지표를 JSON으로 추출해주세요:

        1. 투자지표 섹션:
           - PER (주가수익비율)
           - PBR (주가순자산비율)
           - ROE (자기자본이익률)
           - EPS (주당순이익)
           - BPS (주당순자산)

        2. 재무제표 요약:
           - 매출액
           - 영업이익
           - 순이익
           - 부채비율
           - 유동비율

        3. 배당 정보:
           - 주당배당금
           - 배당수익률

        숫자는 원 단위로 통일 (조, 억 → 숫자 변환)

        출력 형식:
        {{
          "per": 14.25,
          "pbr": 1.12,
          "roe": 8.23,
          "eps": 4523,
          "bps": 45230,
          "revenue": 302000000000000,
          "operatingIncome": 36700000000000,
          "netIncome": 26400000000000,
          "debtRatio": 42.3,
          "currentRatio": 156.2,
          "dividendPerShare": 1444,
          "dividendYield": 2.24
        }}
        """,
        llm=ChatOpenAI(model="gpt-4o"),
    )

    result = await agent.run()
    return json.loads(result)
```

### 6.3 구현 예시: 수급 데이터 Fallback

```typescript
// lib/agentic-supply-demand.ts
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';

export async function fetchSupplyDemandAgentic(
  stockCode: string
): Promise<SupplyDemandData | null> {
  // 1. Puppeteer로 스크린샷 캡처
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    `https://finance.naver.com/item/frgn.naver?code=${stockCode}`,
    { waitUntil: 'networkidle0' }
  );

  const screenshot = await page.screenshot({ encoding: 'base64' });
  await browser.close();

  // 2. Claude Vision으로 데이터 추출
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: screenshot }
        },
        {
          type: "text",
          text: `
            이 화면은 네이버 금융의 투자자별 매매동향 페이지입니다.
            가장 최근 거래일의 다음 데이터를 추출해주세요:

            1. 기관 순매수량 (주 단위)
            2. 외국인 순매수량 (주 단위)
            3. 개인 순매수량 (주 단위)

            양수는 순매수, 음수는 순매도입니다.
            천 단위 콤마를 제거하고 숫자만 반환해주세요.

            JSON 형식:
            {"institutional": 15230, "foreign": -8450, "individual": -6780}
          `
        }
      ]
    }]
  });

  // 3. 응답 파싱
  const content = response.content[0];
  if (content.type === 'text') {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }

  return null;
}
```

---

## 7. 결론 및 권장사항

### 7.1 종합 판정

| 적용 영역 | 즉시 적용 권장 | 장기 가치 | 비용 효율성 |
|----------|:--------------:|:---------:|:-----------:|
| **재무 지표 수집** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **수급 데이터 Fallback** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **증권사 리포트** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### 7.2 권장 적용 전략

#### 1단계: 즉시 적용 (1-2주)

```
[목표] 현재 미구현된 재무 지표 데이터 수집 활성화

• Browser-Use 또는 Claude Vision 기반 재무 지표 수집 모듈 개발
• calculateFinancialMetrics() 함수에 실제 데이터 연결
• 일 1회 배치 수집 (비용 최적화)
```

#### 2단계: 안정성 강화 (3-4주)

```
[목표] 수급 데이터 수집 안정성 확보

• 기존 네이버 크롤링 유지 (정상 동작 시)
• Agentic Fallback 구현 (크롤링 실패 감지 시 자동 전환)
• 데이터 검증 로직 추가 (이상치 탐지)
```

#### 3단계: 확장 (1-2개월)

```
[목표] 고급 데이터 소스 추가

• 증권사 목표가/투자의견 수집
• 실적 발표 일정 자동 추출
• 동종 업계 비교 데이터
```

### 7.3 핵심 인사이트

> **"Agentic Web Browsing은 현재 프로젝트의 가장 큰 데이터 공백인 '재무 지표'를 해결할 수 있는 현실적인 솔루션입니다. 기존 크롤링의 대체가 아닌, 보완재로 활용할 때 최대 효과를 발휘합니다."**

**핵심 포인트**:
1. **재무 지표 수집**: 현재 `calculateFinancialMetrics()` 함수는 있지만 데이터가 없음 → Agentic으로 해결
2. **수급 데이터**: 네이버 크롤링 + Agentic Fallback 하이브리드 전략
3. **비용 최적화**: 전체 대체가 아닌 Fallback으로 사용 시 월 $150 이내 예상
4. **유지보수 절감**: CSS 선택자 변경 대응 불필요

---

## 8. 참고 자료

### Sources
- [Browser-Use GitHub Repository](https://github.com/browser-use/browser-use)
- [Claude Computer Use Tool Documentation](https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool)
- [Skyvern - Automate Browser-based Workflows](https://github.com/Skyvern-AI/skyvern)
- [The Best Agentic AI Browsers to Look For in 2026 - KDnuggets](https://www.kdnuggets.com/the-best-agentic-ai-browsers-to-look-for-in-2026)

### 프로젝트 내부 참조
- `lib/indicators.ts:871-979` - calculateFinancialMetrics() (데이터 소스 필요)
- `lib/finance.ts:426-525` - fetchKoreaSupplyDemandNaver() (CSS 의존)
- `lib/krx-api.ts:89-94` - KRX API 투자자별 데이터 미제공

---

*문서 작성일: 2026-01-20*
*분석 범위: 지표 및 수치 데이터 수집*
*작성자: Claude Code Analysis*
