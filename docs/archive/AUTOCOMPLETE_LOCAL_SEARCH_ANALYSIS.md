# 종목 입력 자동완성 로컬 검색 개선 방안 분석

## 📋 현재 상황 분석

### 현재 구조

```
stock-autocomplete.tsx
  └─> searchStocks() (lib/stock-search.ts)
      ├─> 1. searchStocksLocal() (우선 시도) ✅
      │   └─> public/data/symbols.json 사용
      │   └─> Fuse.js 퍼지 검색
      │
      └─> 2. API 검색 (Fallback) ⚠️
          ├─> searchKoreaStocksViaAPI()
          ├─> searchUSStocksViaAPI()
          ├─> searchStocksYahoo() (429 에러 위험)
          └─> searchStocksFinnhub()
```

### 현재 동작 방식

1. **로컬 검색 우선**: `searchStocksLocal()` 먼저 시도
2. **API Fallback**: 로컬 검색 실패 시 API 호출
3. **Debounce**: 400ms 지연 후 검색 실행

---

## 🔍 문제점 분석

### 1. API Fallback의 문제

**현재 문제:**
- 로컬 검색이 실패하면 API 호출 발생
- 네트워크 레이턴시 (100-500ms)
- 429 Too Many Requests 에러 위험
- 외부 API 의존성

**영향:**
- 사용자 경험 저하 (검색 지연)
- 서버 부하 증가
- 비용 발생 가능성

### 2. 로컬 검색 실패 원인

**가능한 원인:**
1. `symbols.json` 파일 로드 실패
2. Fuse.js 인덱스 생성 실패
3. 파일 경로 문제
4. 네트워크 문제 (첫 로드 시)

---

## ✅ 개선 방안

### 방안 1: 로컬 검색 전용 (권장) ⭐⭐⭐⭐⭐

**개념:**
- API Fallback 완전 제거
- 로컬 검색만 사용
- 실패 시 빈 결과 반환

**장점:**
- ✅ **속도**: 즉시 검색 (0ms 레이턴시)
- ✅ **안정성**: 외부 API 의존성 제거
- ✅ **비용**: API 호출 비용 없음
- ✅ **429 에러**: 완전히 방지

**단점:**
- ⚠️ `symbols.json` 파일이 없으면 검색 불가
- ⚠️ 최신 종목이 반영되기까지 지연 (하루 1회 업데이트)

**구현:**
```typescript
// lib/stock-search.ts 수정
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  // 로컬 검색만 사용
  const { searchStocksLocal } = await import('./local-stock-search');
  return await searchStocksLocal(query);
}
```

---

### 방안 2: 로컬 검색 안정성 향상 ⭐⭐⭐⭐

**개념:**
- 로컬 검색의 안정성 개선
- API Fallback은 유지하되 최소화

**개선 사항:**
1. **에러 핸들링 강화**
   - 파일 로드 실패 시 재시도
   - 캐시 전략 개선

2. **로딩 전략**
   - 앱 시작 시 `symbols.json` 미리 로드
   - Service Worker 캐싱

3. **Fallback 최소화**
   - 로컬 검색 실패 시에만 API 호출
   - API 호출 빈도 제한

**구현:**
```typescript
// 앱 시작 시 미리 로드
useEffect(() => {
  import('./local-stock-search').then(({ loadSymbols }) => {
    loadSymbols().catch(console.error);
  });
}, []);
```

---

### 방안 3: 하이브리드 (현재 구조 개선) ⭐⭐⭐

**개념:**
- 현재 구조 유지
- 로컬 검색 성공률 향상
- API Fallback 최소화

**개선 사항:**
1. 로컬 검색 실패 원인 분석 및 해결
2. API 호출 빈도 제한 (Rate Limiting)
3. 로컬 검색 우선순위 강화

---

## 📊 성능 비교

### 현재 방식 (로컬 + API Fallback)

| 항목 | 로컬 검색 성공 | 로컬 검색 실패 |
|------|--------------|--------------|
| 레이턴시 | 0-10ms | 100-500ms |
| 안정성 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 429 에러 | 없음 | 위험 |
| 비용 | 없음 | 있음 |

### 개선 후 (로컬 전용)

| 항목 | 값 |
|------|-----|
| 레이턴시 | 0-10ms |
| 안정성 | ⭐⭐⭐⭐⭐ |
| 429 에러 | 없음 |
| 비용 | 없음 |

---

## 🎯 권장 사항

### 단기 개선 (즉시 적용 가능)

1. **로컬 검색 전용으로 변경** (방안 1)
   - API Fallback 제거
   - 검색 속도 및 안정성 향상

2. **에러 핸들링 개선**
   - `symbols.json` 로드 실패 시 명확한 메시지
   - 재시도 로직 추가

### 중기 개선

3. **프리로딩 전략**
   - 앱 시작 시 `symbols.json` 미리 로드
   - Service Worker 캐싱

4. **검색 성능 최적화**
   - Fuse.js 인덱스 최적화
   - 검색 결과 캐싱

---

## 💡 구현 예시

### 1. 로컬 검색 전용으로 변경

```typescript
// lib/stock-search.ts
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  
  try {
    // 로컬 검색만 사용
    const { searchStocksLocal } = await import('./local-stock-search');
    const results = await searchStocksLocal(trimmedQuery);
    
    if (results.length > 0) {
      console.log(`[Stock Search] Local search found ${results.length} results`);
      return results;
    }
    
    // 결과가 없어도 빈 배열 반환 (API 호출 안 함)
    return [];
  } catch (error) {
    console.error('[Stock Search] Local search error:', error);
    // 에러 발생 시에도 빈 배열 반환 (API 호출 안 함)
    return [];
  }
}
```

### 2. 에러 핸들링 개선

```typescript
// lib/local-stock-search.ts
async function loadSymbols(): Promise<SymbolsJSON> {
  if (cachedSymbols) {
    return cachedSymbols;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/data/symbols.json', {
        cache: 'force-cache',
      });

      if (!response.ok) {
        throw new Error(`Failed to load symbols.json: ${response.status}`);
      }

      const data: SymbolsJSON = await response.json();
      cachedSymbols = data;

      // Fuse.js 인덱스 생성
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 0.8 },
          { name: 'code', weight: 0.2 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      };

      fuseKorea = new Fuse(data.korea.stocks, fuseOptions);
      fuseUS = new Fuse(data.us.stocks, fuseOptions);

      return data;
    } catch (error) {
      console.error('[Local Stock Search] Failed to load symbols.json:', error);
      // 재시도 로직 추가 가능
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}
```

### 3. 프리로딩 전략

```typescript
// app/layout.tsx 또는 app/page.tsx
useEffect(() => {
  // 앱 시작 시 symbols.json 미리 로드
  import('@/lib/local-stock-search').then((module) => {
    // 내부 함수를 export하여 미리 로드
    module.preloadSymbols?.().catch(console.error);
  });
}, []);
```

---

## 📈 예상 효과

### 성능 개선

- **검색 속도**: 100-500ms → 0-10ms (50배 이상 향상)
- **안정성**: 429 에러 완전 제거
- **비용**: API 호출 비용 제로

### 사용자 경험

- **즉시 검색 결과 표시**: 타이핑과 동시에 결과 표시
- **오프라인 지원**: 네트워크 없이도 검색 가능
- **일관된 성능**: 네트워크 상태와 무관

---

## ⚠️ 주의사항

### 1. symbols.json 파일 의존성

- 파일이 없으면 검색 불가
- GitHub Actions로 매일 업데이트 필요
- 파일 크기: 약 4.9MB (압축 시 약 500KB)

### 2. 최신 종목 반영

- 하루 1회 업데이트 (GitHub Actions)
- 신규 상장 종목은 최대 24시간 지연 가능

### 3. 브라우저 캐싱

- `force-cache` 사용으로 오래된 데이터 사용 가능
- 필요 시 캐시 무효화 전략 필요

---

## ✅ 결론

**권장: 방안 1 (로컬 검색 전용)**

이유:
1. **성능**: 즉시 검색 결과 (0ms 레이턴시)
2. **안정성**: 외부 API 의존성 완전 제거
3. **비용**: API 호출 비용 없음
4. **사용자 경험**: 타이핑과 동시에 결과 표시

현재 `symbols.json`에 32,330개 종목이 포함되어 있어 대부분의 검색 요구를 충족할 수 있습니다.

---

## 🚀 다음 단계

1. 로컬 검색 전용으로 변경
2. 에러 핸들링 개선
3. 프리로딩 전략 구현
4. 성능 테스트 및 모니터링
