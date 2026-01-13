# Vercel Serverless Functions (Python) 설정 가이드

## 개요

별도 Python 서버 없이 Vercel Serverless Functions를 사용하여 yfinance-cache와 FinanceDataReader를 실행하는 방법입니다.

---

## ✅ 구현 완료 상태

다음 파일들이 이미 생성되어 있습니다:
- ✅ `api/stock/[symbol].py`: Python Serverless Function
- ✅ `api/requirements.txt`: Python 의존성
- ✅ `vercel.json`: Vercel 설정
- ✅ `lib/finance-vercel.ts`: TypeScript 래퍼

---

## 🚀 사용 방법

### 1. 로컬 테스트

```bash
# Vercel CLI 설치 (아직 안 했다면)
npm i -g vercel

# 로컬에서 Vercel 환경 시뮬레이션
vercel dev
```

이제 `http://localhost:3000/api/stock/AAPL`로 접속하면 Python 함수가 실행됩니다.

### 2. 배포

```bash
# Vercel에 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 3. 환경 변수 설정 (선택)

`.env.local` 또는 Vercel 대시보드에서:
```env
# Vercel Python 사용 여부 (기본: 자동 감지)
USE_VERCEL_PYTHON=true

# Fallback 설정
FINNHUB_API_KEY=your_key  # Vercel 실패 시 사용
```

---

## 📝 코드 사용 예시

### Next.js API Route에서 사용

```typescript
// app/api/analyze/route.ts
import { fetchStocksData } from '@/lib/finance-adapter';

export async function POST(request: NextRequest) {
  const { stocks } = await request.json();
  
  // 자동으로 Vercel Python 함수 사용 (Vercel 환경에서)
  const stockDataMap = await fetchStocksData(stocks);
  
  // ... 나머지 로직
}
```

### 직접 호출

```typescript
import { fetchStockDataVercel } from '@/lib/finance-vercel';

const data = await fetchStockDataVercel('AAPL');
console.log(data);
```

---

## 🔍 작동 원리

1. **요청**: Next.js API Route에서 `/api/stock/AAPL` 호출
2. **Vercel 감지**: `api/stock/[symbol].py` 파일 감지
3. **Python 실행**: Vercel이 Python 3.12 런타임에서 함수 실행
4. **데이터 수집**: yfinance-cache 또는 FinanceDataReader 사용
5. **응답**: JSON 형식으로 반환

---

## ⚙️ 설정 옵션

### vercel.json

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "@vercel/python@3.12",
      "maxDuration": 10  // 타임아웃 (초)
    }
  }
}
```

### 환경 변수

- `USE_VERCEL_PYTHON`: Vercel Python 사용 여부 (기본: 자동)
- `FINNHUB_API_KEY`: Fallback용 (선택)

---

## 🎯 장점

1. **별도 서버 불필요**: Vercel이 Python 런타임 제공
2. **자동 스케일링**: 트래픽에 따라 자동 확장
3. **서버 관리 불필요**: Vercel이 모든 관리
4. **무료 플랜**: Vercel 무료 플랜 사용 가능
5. **캐싱**: yfinance-cache가 자동으로 캐싱

---

## ⚠️ 제한사항

1. **Vercel 전용**: 다른 플랫폼에서는 사용 불가
2. **번들 크기**: 250MB 제한
3. **Cold Start**: 첫 요청 시 느림 (약 1-2초)
4. **타임아웃**: Hobby 플랜 10초, Pro 플랜 60초

---

## 🐛 문제 해결

### Import Error

`requirements.txt`에 필요한 패키지가 모두 포함되어 있는지 확인:
```txt
yfinance-cache==0.2.0
FinanceDataReader==0.9.50
pandas==2.1.3
numpy==1.26.2
```

### 타임아웃

데이터 수집 시간이 길면:
1. `vercel.json`에서 `maxDuration` 증가
2. Pro 플랜 사용 (60초)
3. 캐싱 전략 사용

### Cold Start

첫 요청이 느리면:
1. Keep-alive 사용
2. 캐싱으로 중복 요청 방지
3. Pro 플랜 사용 (더 빠른 Cold Start)

---

## 📊 성능 최적화

### 1. 캐싱 활용

yfinance-cache가 자동으로 캐싱하므로 중복 요청이 빠릅니다.

### 2. 배치 요청 최소화

여러 종목을 한 번에 요청하지 말고 순차적으로:
```typescript
// ❌ 나쁜 예
const promises = symbols.map(s => fetchStockDataVercel(s));
await Promise.all(promises);

// ✅ 좋은 예
for (const symbol of symbols) {
  await fetchStockDataVercel(symbol);
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

### 3. 에러 처리

Fallback 메커니즘이 자동으로 작동:
- Vercel 실패 → Finnhub 시도
- Finnhub 실패 → Yahoo Finance 시도

---

## 🔄 마이그레이션

### 기존 코드에서 전환

```typescript
// Before
import { fetchStocksDataBatch } from '@/lib/finance';

// After (자동으로 Vercel 사용)
import { fetchStocksData } from '@/lib/finance-adapter';
// 어댑터가 자동으로 최적의 소스 선택
```

---

## 📚 참고

- Vercel Python 문서: https://vercel.com/docs/functions/runtimes/python
- yfinance-cache: https://pypi.org/project/yfinance-cache/
- FinanceDataReader: https://github.com/FinanceData/FinanceDataReader
