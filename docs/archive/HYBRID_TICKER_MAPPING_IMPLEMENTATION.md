# 하이브리드 티커 매핑 구현 완료

## 개요

하드코딩된 매핑 대신 **하이브리드 방식**으로 한국 주식 이름을 티커로 동적으로 변환하는 기능을 구현했습니다.

## 구현 내용

### 1. StockListing API 오류 해결

**문제:**
- FinanceDataReader `StockListing('KRX')` API가 JSON 파싱 오류 발생
- KRX 서버 일시적 문제 또는 API 구조 변경 가능성

**해결:**
- 재시도 로직 추가 (최대 3회, 지수 백오프)
- GitHub 백업 CSV를 Fallback으로 사용
- 오류 처리 개선

### 2. 하이브리드 매핑 전략

**구현된 로직 순서:**

```
1. 티커 형식 확인 (6자리 숫자 또는 .KS 포함)
   ↓ 실패 시
2. 하드코딩된 매핑 확인 (빠른 조회)
   ↓ 실패 시
3. 동적 검색 (GitHub CSV 또는 StockListing)
   - 캐시 확인 (24시간 TTL)
   - Python 스크립트로 종목 리스트 가져오기
   - 이름으로 티커 검색 (정확 매칭 → 부분 매칭)
   ↓ 실패 시
4. 원본 심볼 반환 (Fallback)
```

### 3. 파일 구조

```
lib/
├── korea-stock-mapper.ts              # 기존 하드코딩 매핑
├── korea-stock-mapper-dynamic.ts      # 하이브리드 동적 매핑 (신규)
└── finance-vercel.ts                  # 동적 매핑 통합

scripts/
└── get_stock_listing.py               # Python 스크립트 (StockListing + GitHub CSV)

.cache/
└── krx-stock-listing.json             # 캐시 파일 (자동 생성)
```

## 사용 방법

### 기본 사용 (자동 활성화)

동적 매핑은 기본적으로 활성화되어 있습니다:

```typescript
import { fetchStocksDataBatchVercel } from '@/lib/finance-vercel';

// '일동제약' 같은 새로운 종목도 자동으로 티커 변환
const data = await fetchStocksDataBatchVercel(['일동제약', '삼성전자', 'TSLA']);
```

### 비활성화 (환경 변수)

동적 매핑을 비활성화하려면:

```bash
USE_DYNAMIC_TICKER_MAPPING=false
```

## 동작 방식

### 1. 하드코딩 매핑 (빠름)

자주 사용되는 종목은 하드코딩된 매핑에서 즉시 조회:

```typescript
'삼성전자' → '005930.KS'  // 즉시 반환
```

### 2. 동적 검색 (느림, 하지만 완전함)

하드코딩에 없는 종목은 동적으로 검색:

```typescript
'일동제약' → GitHub CSV 검색 → '249420.KS'
```

**검색 과정:**
1. 캐시 확인 (`.cache/krx-stock-listing.json`)
2. 캐시 없으면 Python 스크립트 실행
3. FinanceDataReader StockListing 시도
4. 실패 시 GitHub CSV 사용 (Fallback)
5. 결과를 캐시에 저장 (24시간)

### 3. 캐싱 전략

- **캐시 위치**: `.cache/krx-stock-listing.json`
- **TTL**: 24시간
- **자동 갱신**: 캐시 만료 시 자동으로 재조회

## 성능 최적화

1. **하드코딩 우선**: 자주 사용되는 종목은 즉시 반환
2. **캐싱**: 종목 리스트는 24시간 캐시
3. **Fallback**: StockListing 실패 시 GitHub CSV 사용
4. **비동기 처리**: 여러 종목을 병렬로 정규화

## 테스트 결과

### 성공 사례

```bash
# GitHub CSV에서 일동제약 검색 성공
일동제약: 249420 (KOSPI)

# Python 스크립트 실행 성공
Success: True
Count: 2612
Source: github_csv
```

### 지원 종목 수

- **하드코딩**: ~27개 주요 종목
- **동적 검색**: 2,612개 전체 KRX 종목 (GitHub CSV)

## 환경 변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `USE_DYNAMIC_TICKER_MAPPING` | `true` | 동적 매핑 활성화 여부 |

## 주의사항

1. **첫 실행 시 지연**: 동적 검색은 첫 실행 시 Python 스크립트 실행으로 인해 약간의 지연이 발생할 수 있습니다 (캐시 생성 후 빠름)

2. **GitHub CSV 의존성**: StockListing API 실패 시 GitHub CSV를 사용하므로, 해당 저장소가 유지보수되지 않으면 문제가 될 수 있습니다

3. **캐시 관리**: `.cache/` 디렉토리는 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다

## 향후 개선 사항

1. **KRX API 복구 대비**: StockListing API가 복구되면 자동으로 사용
2. **로컬 CSV 백업**: GitHub CSV 실패 시 로컬 백업 사용
3. **검색 알고리즘 개선**: 더 정확한 부분 매칭 (유사도 점수)

## 관련 문서

- `docs/DYNAMIC_TICKER_MAPPING_ANALYSIS.md`: 동적 매핑 분석 문서
- `lib/korea-stock-mapper-dynamic.ts`: 구현 코드
- `scripts/get_stock_listing.py`: Python 스크립트
