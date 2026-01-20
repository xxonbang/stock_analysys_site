# 듀얼 소스 데이터 수집 시스템 분석

> 작성일: 2026-01-20
> 최종 업데이트: 2026-01-20 (Agentic Screenshot 구현 완료)
> 분석 대상: `lib/dual-source/` 디렉토리

---

## 0. Agentic Screenshot 방식 구현 완료

### 핵심 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                   Agentic Screenshot 방식                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. Puppeteer 브라우저 자동화                                    │
│      └─ 웹페이지 접속 및 렌더링                                    │
│                                                                  │
│   2. 화면 캡처 (Screenshot)                                       │
│      └─ page.screenshot({ encoding: 'base64' })                  │
│                                                                  │
│   3. Vision AI 분석 (Gemini)                                      │
│      └─ 이미지에서 주식 데이터 시각적 추출                          │
│                                                                  │
│   4. 구조화된 JSON 반환                                           │
│      └─ AI가 동적으로 데이터 위치 파악                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 구현 상태

| 구분 | Source A | Source B |
|------|----------|----------|
| **한국 주식** | Agentic Screenshot (네이버 금융) | 다음 금융 REST API |
| **미국 주식** | Agentic Screenshot (Yahoo Finance) | Yahoo Finance API |

---

## 1. 디렉토리 구조

```
lib/dual-source/
├── index.ts                  # 모듈 엔트리 포인트
├── types.ts                  # 공통 타입 정의
├── dual-source-collector.ts  # 메인 수집 오케스트레이터
├── validation-engine.ts      # 검증 및 병합 엔진
├── agentic-crawler.ts        # ★ Agentic Screenshot 크롤러 (신규)
├── korea-stock-crawler.ts    # 한국 주식 전통적 크롤러 (폴백)
├── korea-stock-daum.ts       # 한국 주식 다음 금융 API (신규)
├── us-stock-yahoo.ts         # Yahoo Finance API 수집기
└── us-stock-finnhub.ts       # Finnhub API 수집기 (서버리스 폴백)
```

---

## 2. Agentic Screenshot 핵심 구현

### 2.1 agentic-crawler.ts

```typescript
// 핵심 코드 구조
export class AgenticScreenshotCrawler {
  private browser: Browser | null = null;
  private genAI: GoogleGenerativeAI | null = null;

  // Vision AI로 스크린샷에서 데이터 추출
  private async extractDataWithVision(
    screenshot: string,
    prompt: string
  ): Promise<Record<string, unknown>> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: screenshot,  // base64 인코딩된 스크린샷
        },
      },
      prompt,  // 추출할 데이터 명세
    ]);

    return extractJsonFromResponse(result.response.text());
  }

  // 한국 주식 수집
  async collectKoreaStock(symbol: string): Promise<CollectionResult> {
    const page = await this.createPage();
    await page.goto(`https://finance.naver.com/item/main.naver?code=${symbol}`);

    // 스크린샷 캡처
    const screenshot = await page.screenshot({ encoding: 'base64' });

    // Vision AI로 데이터 추출
    return this.extractDataWithVision(screenshot, koreaPrompt);
  }

  // 미국 주식 수집
  async collectUSStock(symbol: string): Promise<CollectionResult> {
    await page.goto(`https://finance.yahoo.com/quote/${symbol}`);
    const screenshot = await page.screenshot({ encoding: 'base64' });
    return this.extractDataWithVision(screenshot, usPrompt);
  }
}
```

### 2.2 Vision AI 프롬프트 구조

```json
// 한국 주식 추출 프롬프트 (요약)
{
  "basicInfo": { "name": "종목명", "market": "KOSPI/KOSDAQ" },
  "priceData": { "currentPrice": "숫자", "change": "숫자", ... },
  "valuationData": { "per": "숫자", "pbr": "숫자", ... },
  "marketData": { "marketCap": "숫자", ... },
  "supplyDemandData": { "foreignOwnership": "%" }
}
```

---

## 3. 테스트 결과 (2026-01-20)

### 3.1 한국 주식 (삼성전자 005930) - 성공

```
테스트: 005930 (삼성전자)
───────────────────────────────────────
Source: agentic (Vision AI)
Latency: 11,341ms

추출된 데이터:
┌────────────────┬─────────────────┐
│ 필드           │ 값               │
├────────────────┼─────────────────┤
│ 종목명         │ 삼성전자          │
│ 현재가         │ 145,200원        │
│ 전일대비       │ -4,100원 (-2.75%)│
│ PER            │ 30.15배          │
│ PBR            │ 2.39배           │
│ EPS            │ 4,816원          │
│ BPS            │ 60,632원         │
│ 외국인 보유율   │ 51.86%          │
│ 시가총액        │ 859.5조원        │
│ 상장주식수      │ 5,919,637,922주  │
└────────────────┴─────────────────┘

결과: Vision AI가 스크린샷에서 정확하게 데이터 추출 성공
```

### 3.2 Agentic vs 전통적 방식 비교

| 특성 | Agentic Screenshot | 전통적 크롤링 |
|------|-------------------|--------------|
| 추출 방식 | Vision AI 시각 분석 | CSS 셀렉터 하드코딩 |
| 구조 변경 대응 | 자동 적응 | 코드 수정 필요 |
| 응답 시간 | ~11초 | ~1초 |
| 정확도 | AI 기반 (유연) | 규칙 기반 (정확) |
| 비용 | Gemini API 호출 | 무료 |

---

## 4. 듀얼 소스 교차 검증 시스템

### 4.1 검증 엔진 상세

```
┌─────────────────────────────────────────────────────────────┐
│                     검증 엔진 동작                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Source A (Agentic)      Source B (API)                    │
│        │                       │                             │
│        └───────────┬───────────┘                             │
│                    │                                         │
│                    ▼                                         │
│        ┌───────────────────────┐                            │
│        │    필드별 비교         │                            │
│        │  (허용 오차 적용)      │                            │
│        └───────────────────────┘                            │
│                    │                                         │
│        ┌───────────┼───────────┐                            │
│        ▼           ▼           ▼                            │
│    ┌──────┐   ┌──────┐   ┌──────┐                          │
│    │ 일치  │   │ 충돌  │   │ 단일  │                          │
│    └──────┘   └──────┘   └──────┘                          │
│        │           │           │                             │
│        └───────────┴───────────┘                             │
│                    │                                         │
│                    ▼                                         │
│        ┌───────────────────────┐                            │
│        │   ValidatedStockData  │                            │
│        │   + 신뢰도 점수       │                            │
│        └───────────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 허용 오차 설정

| 데이터 유형 | 허용 오차 | 이유 |
|------------|----------|------|
| 현재가 | 0.5% | 실시간 시세 변동 |
| 거래량 | 5% | 집계 시점 차이 |
| PER/EPS | 1% | 계산 방식 차이 |
| 재무 데이터 | 2% | 단위 변환 |

### 4.3 신뢰도 계산

| 상태 | 설명 | 기본 신뢰도 |
|------|------|------------|
| `MATCH` | 두 소스 완전 일치 | 98% |
| `PARTIAL` | 부분 일치 | 85% |
| `CONFLICT` | 허용 오차 초과 | 70% |
| `SINGLE` | 단일 소스만 성공 | 45-65% |

---

## 5. 환경별 폴백 전략

### 5.1 환경 감지

```typescript
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
```

### 5.2 Source A 폴백 체인

```
로컬 환경:
  Agentic Screenshot (Vision AI)
       ↓ (실패 시)
  전통적 크롤링 (cheerio/Puppeteer)

서버리스 환경:
  전통적 크롤링 (한국)
  Finnhub API (미국)
```

---

## 6. 주요 파일 참조

| 파일 | 설명 | 라인 참조 |
|------|------|----------|
| `agentic-crawler.ts` | Agentic Screenshot 핵심 구현 | 전체 |
| `dual-source-collector.ts` | 듀얼 소스 오케스트레이션 | 110-175 (한국), 185-248 (미국) |
| `korea-stock-daum.ts` | 다음 금융 API 수집기 | 전체 |
| `validation-engine.ts` | 교차 검증 엔진 | 전체 |

---

## 7. API Rate Limit 고려사항

### Gemini API 제한

- 무료 티어: 20 requests/day/model
- 권장: 유료 플랜 사용 또는 API 키 로테이션

### 폴백 동작

```
Gemini API Rate Limit 초과 시:
  → 전통적 크롤링으로 자동 폴백
  → Source B (API)만 사용
  → 신뢰도 45%로 단일 소스 결과 반환
```

---

## 8. 결론

### 구현 완료 항목

- [x] Agentic Screenshot 크롤러 (`agentic-crawler.ts`)
- [x] 한국 주식 Vision AI 추출 (네이버 금융)
- [x] 미국 주식 Vision AI 추출 (Yahoo Finance)
- [x] 다음 금융 API 수집기 (한국 Source B)
- [x] 듀얼 소스 통합 및 교차 검증
- [x] 환경별 폴백 전략

### Agentic 방식의 핵심 가치

```
웹사이트 구조 변경 → CSS 셀렉터 무효화 → 기존 크롤러 실패
                ↓
Vision AI가 화면을 "보고" 데이터 추출 → 자동 적응
```

### 테스트 확인

```bash
# 한국 주식 테스트 (Agentic Screenshot)
curl "http://localhost:3000/api/dual-source-test?symbol=005930&mode=single&source=A"

# 듀얼 소스 교차 검증 테스트
curl "http://localhost:3000/api/dual-source-test?symbol=005930"
```
