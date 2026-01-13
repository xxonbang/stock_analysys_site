# 서버 없이 Python 라이브러리 사용하기 - 최종 요약

## 🎯 해결 방법: Vercel Serverless Functions (Python Runtime)

**별도 Python 서버 없이** Next.js에서 yfinance-cache와 FinanceDataReader를 사용할 수 있습니다!

---

## ✅ 구현 완료

다음 파일들이 생성되어 있습니다:

1. **`api/stock/[symbol].py`**: Python Serverless Function
   - yfinance-cache (미국 주식)
   - FinanceDataReader (한국 주식)
   - 기술적 지표 계산 (RSI, MA 등)

2. **`api/requirements.txt`**: Python 의존성
   - yfinance-cache
   - FinanceDataReader
   - pandas, numpy

3. **`vercel.json`**: Vercel 설정
   - Python 3.12 런타임 지정

4. **`lib/finance-vercel.ts`**: TypeScript 래퍼
   - Next.js에서 Python 함수 호출

5. **`lib/finance-adapter.ts`**: 통합 어댑터 (업데이트)
   - Vercel Python 자동 선택
   - Fallback 메커니즘

---

## 🚀 사용 방법

### 1. 로컬 테스트

```bash
# Vercel CLI 설치
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

### 3. 자동 사용

코드는 이미 설정되어 있어서, Vercel에 배포하면 **자동으로** Python 함수를 사용합니다.

```typescript
// app/api/analyze/route.ts
import { fetchStocksData } from '@/lib/finance-adapter';

// 자동으로 Vercel Python 함수 사용 (Vercel 환경에서)
const stockDataMap = await fetchStocksData(stocks);
```

---

## 📊 작동 원리

```
사용자 요청
    ↓
Next.js API Route (/api/analyze)
    ↓
finance-adapter.ts
    ↓
Vercel 환경 감지 → Vercel Python 함수 호출
    ↓
/api/stock/[symbol].py 실행
    ↓
yfinance-cache 또는 FinanceDataReader
    ↓
데이터 반환
```

---

## 🎯 장점

1. **✅ 별도 서버 불필요**: Vercel이 Python 런타임 제공
2. **✅ 자동 스케일링**: 트래픽에 따라 자동 확장
3. **✅ 서버 관리 불필요**: Vercel이 모든 관리
4. **✅ 무료 플랜**: Vercel 무료 플랜 사용 가능
5. **✅ 캐싱**: yfinance-cache가 자동으로 캐싱
6. **✅ Rate Limit 해결**: 캐싱으로 문제 완전 해결

---

## ⚠️ 제한사항

1. **Vercel 전용**: 다른 플랫폼에서는 사용 불가
   - 해결: Fallback 메커니즘 (Finnhub/Yahoo Finance)

2. **번들 크기**: 250MB 제한
   - 해결: 필요한 패키지만 포함

3. **Cold Start**: 첫 요청 시 느림 (약 1-2초)
   - 해결: 캐싱으로 중복 요청 방지

4. **타임아웃**: Hobby 플랜 10초, Pro 플랜 60초
   - 해결: 데이터 수집 최적화

---

## 🔄 Fallback 메커니즘

자동으로 작동하는 Fallback:

1. **Vercel Python** (최우선)
2. **Finnhub** (Vercel 실패 시, API 키 있으면)
3. **Yahoo Finance** (최후)

---

## 📝 환경 변수 (선택)

`.env.local` 또는 Vercel 대시보드:

```env
# Vercel Python 사용 여부 (기본: 자동)
USE_VERCEL_PYTHON=true

# Fallback용
FINNHUB_API_KEY=your_key
```

---

## 🧪 테스트

### 로컬 테스트

```bash
# Vercel CLI로 로컬 테스트
vercel dev

# 브라우저에서
http://localhost:3000/api/stock/AAPL
```

### 배포 후 테스트

```bash
# 배포
vercel --prod

# API 호출
curl https://your-domain.vercel.app/api/stock/AAPL
```

---

## 📚 참고 문서

- 상세 가이드: `docs/VERCEL_PYTHON_SETUP.md`
- 서버리스 옵션 비교: `docs/SERVERLESS_PYTHON_OPTIONS.md`
- 데이터 소스 비교: `docs/COMPREHENSIVE_DATA_SOURCES_V2.md`

---

## ✅ 결론

**별도 Python 서버 없이** Vercel Serverless Functions를 사용하면:
- ✅ yfinance-cache + FinanceDataReader 사용 가능
- ✅ Rate limit 문제 해결
- ✅ 한국/미국 주식 모두 지원
- ✅ 서버 관리 불필요

**Vercel에 배포하면 바로 사용 가능합니다!**
