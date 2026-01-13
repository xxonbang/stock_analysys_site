# 캐싱 전략

## 문제점
- API 호출 비용 및 Rate Limit
- 응답 속도 개선 필요
- 동일한 데이터 반복 요청

## 캐싱 솔루션

### 옵션 1: In-Memory 캐싱 (간단)
**구현:**
```typescript
const cache = new Map<string, { data: any; expires: number }>();

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}
```

**장점:**
- 구현 간단
- 추가 의존성 없음
- 빠른 속도

**단점:**
- 서버 재시작 시 캐시 손실
- 메모리 사용량 증가
- 멀티 인스턴스 환경에서 공유 불가

**적합성:** ⭐⭐⭐
- 개발/소규모 프로덕션에 적합

---

### 옵션 2: Redis 캐싱 (권장)
**구현:**
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getCached(key: string) {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCache(key: string, data: any, ttl: number) {
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

**장점:**
- 영구 저장
- 멀티 인스턴스 공유 가능
- TTL 자동 관리
- 높은 성능

**단점:**
- Redis 서버 필요
- 추가 비용 (무료 플랜 있음)

**적합성:** ⭐⭐⭐⭐⭐
- 프로덕션 환경에 최적

---

### 옵션 3: Next.js 캐싱 (Built-in)
**구현:**
```typescript
import { unstable_cache } from 'next/cache';

const getCachedStockData = unstable_cache(
  async (symbol: string) => {
    return await fetchStockData(symbol);
  },
  ['stock-data'],
  {
    revalidate: 300, // 5분
    tags: ['stock-data'],
  }
);
```

**장점:**
- Next.js 내장 기능
- 추가 의존성 없음
- 간단한 구현

**단점:**
- 서버 컴포넌트에서만 사용 가능
- 제한적인 제어

**적합성:** ⭐⭐⭐⭐
- Next.js 프로젝트에 적합

---

## 캐싱 전략

### TTL (Time To Live) 설정

| 데이터 타입 | TTL | 이유 |
|------------|-----|------|
| 현재가 (Quote) | 1분 | 실시간성 중요 |
| Historical 데이터 | 1시간 | 하루에 한 번만 변경 |
| 기술적 지표 | 5분 | 계산 비용 절감 |
| 뉴스 | 30분 | 자주 업데이트되지 않음 |
| 환율 | 5분 | 상대적으로 안정적 |

### 캐시 키 구조
```
stock:quote:{symbol}          # 현재가
stock:historical:{symbol}      # 과거 데이터
stock:indicators:{symbol}     # 기술적 지표
news:{symbol}                 # 뉴스
exchange:USDKRW              # 환율
vix                          # VIX 지수
```

### 캐시 무효화 전략
1. **TTL 기반**: 자동 만료
2. **태그 기반**: 특정 태그 무효화
3. **수동 무효화**: API 엔드포인트 제공

---

## 구현 예시

### Redis를 사용한 캐싱
```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redis) {
    // Redis가 없으면 직접 fetch
    return await fetcher();
  }

  // 캐시 확인
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // 캐시 미스: 데이터 fetch 및 저장
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### 사용 예시
```typescript
// lib/finance-adapter.ts
import { getCached } from './cache';

export async function fetchStocksData(symbols: string[]) {
  const results = new Map();
  
  for (const symbol of symbols) {
    const data = await getCached(
      `stock:data:${symbol}`,
      () => fetchStockDataFromAPI(symbol),
      300 // 5분 TTL
    );
    results.set(symbol, data);
  }
  
  return results;
}
```

---

## 추천 구현 순서

1. **Phase 1**: In-Memory 캐싱 (빠른 구현)
2. **Phase 2**: Redis 캐싱 (프로덕션 준비)
3. **Phase 3**: 캐시 무효화 API 추가
