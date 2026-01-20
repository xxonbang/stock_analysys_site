# 동적 종목 검색 및 데이터 획득 연구 보고서

## 1. 현재 아키텍처 분석

### 1.1 검색 계층 구조
```
사용자 입력
    ↓
[1단계] 로컬 검색 (symbols.json + Fuse.js)
    ↓ 정확한 매칭 없음
[2단계] 네이버 증권 API (실시간)
    ↓ 결과 없음
[3단계] Python 동적 크롤링 (Naver/KRX)
    ↓
결과 반환
```

### 1.2 현재 데이터 소스
| 소스 | 타입 | 업데이트 주기 | 장점 | 단점 |
|------|------|--------------|------|------|
| symbols.json | 정적 | 수동 | 빠름, 오프라인 가능 | 신규 상장 누락 |
| 네이버 증권 API | 동적 | 실시간 | 최신 데이터 | API 변경 위험 |
| KRX 캐시 | 동적 | 24시간 | 공식 데이터 | 지연 발생 가능 |
| FinanceDataReader | 동적 | 일일 | 안정적 | 행정 지연 |

### 1.3 문제점 분석
1. **symbols.json 갭**: 두산로보틱스(454910) 같은 신규 상장 종목 누락
2. **동적 검색 미활용**: 로컬 검색 실패 시 동적 검색 fallback이 불완전
3. **캐시 동기화 문제**: symbols.json과 동적 캐시 간 불일치

---

## 2. 외부 데이터 소스 연구

### 2.1 pykrx (추천)
- **URL**: https://github.com/sharebook-kr/pykrx
- **특징**: KRX 공식 웹사이트 스크래핑
- **장점**:
  - 실시간 거래 종목 조회
  - 시가총액, 거래량 등 부가 정보
  - 상장/폐지 종목 자동 반영
- **API 예시**:
```python
from pykrx import stock
# 특정일 전체 종목 조회
tickers = stock.get_market_ticker_list("20260119", market="ALL")
# 종목명 조회
name = stock.get_market_ticker_name("454910")  # 두산로보틱스
```

### 2.2 KRX Open API (공식)
- **URL**: https://data.krx.co.kr
- **특징**: 한국거래소 공식 API
- **장점**: 가장 정확한 공식 데이터
- **단점**: 승인 대기 (최대 1일), 사용량 제한
- **비용**: 무료 티어 제공

### 2.3 네이버 증권 자동완성 API (현재 사용 중)
- **URL**: `https://ac.finance.naver.com/ac?q={query}&st=1&r_format=json`
- **특징**: 실시간 검색어 자동완성
- **장점**: 신규 상장 즉시 반영, 무료
- **단점**: 비공식 API, 변경 가능성

### 2.4 Finnhub API
- **URL**: https://finnhub.io
- **특징**: 글로벌 주식 데이터
- **장점**: 한국/미국 동시 지원, 안정적
- **단점**: 무료 티어 제한 (60 calls/min)

---

## 3. 개선 방안 제안

### 3.1 즉시 적용 가능한 개선 (권장)

#### A. 네이버 API Fallback 강화
현재 `stock-search.ts`에서 네이버 API fallback이 조건부로만 실행됨.
모든 로컬 검색 실패 시 네이버 API를 호출하도록 개선:

```typescript
// lib/stock-search.ts 개선안
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  // 1. 로컬 검색 먼저 시도
  const localResults = await searchStocksLocal(query);

  // 2. 정확한 매칭 확인
  const hasExactMatch = checkExactMatch(localResults, query);

  // 3. 정확한 매칭 없으면 항상 네이버 API 호출 (한국어 여부 무관)
  if (!hasExactMatch) {
    try {
      const naverResults = await searchStocksNaver(query);
      if (naverResults.length > 0) {
        // 네이버 결과를 상위에 배치하고 로컬 결과와 병합
        return mergeAndDeduplicate(naverResults, localResults);
      }
    } catch (error) {
      console.warn('Naver API fallback failed:', error);
    }
  }

  return localResults;
}
```

#### B. 실시간 종목 검증 로직 추가
검색 결과를 반환하기 전에 실제 거래 가능한 종목인지 검증:

```typescript
// lib/stock-validator.ts (신규 파일)
export async function validateStock(symbol: string): Promise<boolean> {
  try {
    // 네이버 금융 페이지에서 종목 존재 여부 확인
    const response = await fetch(
      `https://finance.naver.com/item/main.naver?code=${symbol.replace(/\.(KS|KQ)$/, '')}`,
      { method: 'HEAD' }
    );
    return response.ok && response.status === 200;
  } catch {
    return true; // 검증 실패 시 기본적으로 허용
  }
}
```

### 3.2 중기 개선 방안

#### A. symbols.json 자동 업데이트 시스템
GitHub Actions를 활용한 일일 자동 업데이트:

```yaml
# .github/workflows/update-symbols.yml
name: Update Symbols JSON

on:
  schedule:
    - cron: '0 0 * * *'  # 매일 자정 (UTC)
  workflow_dispatch:  # 수동 실행

jobs:
  update-symbols:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install FinanceDataReader pandas requests beautifulsoup4

      - name: Generate symbols.json
        run: python scripts/generate_symbols_json.py

      - name: Commit and push
        run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email 'actions@github.com'
          git add public/data/symbols.json
          git diff --staged --quiet || git commit -m "chore: update symbols.json [skip ci]"
          git push
```

#### B. pykrx 통합
Python 스크립트에 pykrx 추가하여 더 정확한 종목 리스트 확보:

```python
# scripts/get_comprehensive_stock_listing.py 개선안
def get_stock_listing_from_pykrx():
    """pykrx를 사용한 종목 리스트 조회"""
    try:
        from pykrx import stock
        from datetime import datetime

        today = datetime.now().strftime("%Y%m%d")
        all_stocks = []

        for market in ['KOSPI', 'KOSDAQ']:
            tickers = stock.get_market_ticker_list(today, market=market)
            for ticker in tickers:
                name = stock.get_market_ticker_name(ticker)
                all_stocks.append({
                    'Symbol': ticker,
                    'Name': name,
                    'Market': market
                })

        return all_stocks
    except Exception as e:
        print(f"pykrx 조회 실패: {e}", file=sys.stderr)
        return []
```

### 3.3 장기 개선 방안

#### A. 하이브리드 캐싱 시스템
```
[사용자 요청]
      ↓
[L1 캐시] 브라우저 localStorage (5분 TTL)
      ↓ miss
[L2 캐시] symbols.json (정적, 일일 업데이트)
      ↓ miss
[L3 캐시] 서버 Redis/Memory (24시간 TTL)
      ↓ miss
[Origin] 네이버/KRX API (실시간)
```

#### B. 실시간 WebSocket 연동
신규 상장 종목 알림을 위한 실시간 연동:
- KRX 공시 시스템 연동
- 상장 예정 종목 미리 등록

---

## 4. 구현 우선순위

### Phase 1: 즉시 (1-2일) ✅ 완료
1. ✅ 네이버 API fallback 무조건 실행으로 변경
2. ✅ 검색 결과 유사도 검증 강화
3. ✅ pykrx 패키지 추가 및 스크립트 개선

### Phase 2: 단기 (1주) ✅ 완료
1. ✅ GitHub Actions 자동 업데이트 설정 (기존 구현 확인)
2. ✅ 종목 검증 API 추가 (`/api/validate-stock`)
3. ✅ 캐시 무효화 로직 개선 (버전 관리, 손상 감지)

### Phase 3: 중기 (2-4주)
1. ⬜ KRX Open API 연동 (승인 필요)
2. ⬜ 하이브리드 캐싱 시스템 구현
3. ⬜ 관리자 대시보드 추가 (종목 수동 추가)

---

## 5. 참고 자료

### Sources
- [pykrx - KRX 주식 정보 스크래핑](https://github.com/sharebook-kr/pykrx)
- [FinanceDataReader - Financial data reader](https://github.com/FinanceData/FinanceDataReader)
- [KRX Data Marketplace](https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd?locale=en)
- [Korean Stock Market DART & KRX MCP](https://fastmcp.me/MCP/Details/1279/korean-stock-market-dart-krx)

### 관련 파일
- `lib/stock-search.ts` - 통합 검색 진입점
- `lib/local-stock-search.ts` - 로컬 캐시 검색
- `lib/korea-stock-mapper-dynamic.ts` - 동적 종목 매핑
- `scripts/generate_symbols_json.py` - symbols.json 생성
- `scripts/get_comprehensive_stock_listing.py` - 종목 리스트 크롤링

---

## 6. 결론

현재 시스템은 이미 하이브리드 검색 아키텍처를 갖추고 있으나, **동적 검색 fallback이 불완전**하여 신규 상장 종목이 누락되는 문제가 있습니다.

**핵심 개선 포인트**:
1. 네이버 API fallback을 항상 실행하도록 변경
2. pykrx 추가로 더 정확한 종목 리스트 확보
3. GitHub Actions로 symbols.json 자동 업데이트

이 개선을 통해 두산로보틱스 같은 신규 상장 종목도 즉시 검색 가능해집니다.
