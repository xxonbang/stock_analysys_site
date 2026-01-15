# 종목 입력 UX 개선 방안

## 📋 연구 개요

현재 종목 입력 방식의 문제점과 개선 방안을 심도있게 연구한 결과를 정리합니다.

## 🔍 현재 구현 분석

### 현재 방식
- 텍스트 입력 필드 (최대 5개)
- 수동으로 종목명/코드 입력
- "종목 추가" 버튼으로 필드 추가
- 개별 삭제 버튼

### 문제점
1. **타이핑 오류 가능성**: 사용자가 정확한 티커를 기억해야 함
2. **입력 불편**: 여러 종목을 하나씩 추가해야 함
3. **검증 부재**: 입력 중 실시간 검증 없음
4. **한국 주식 입력 불편**: 한글 이름 입력 시 변환 과정 불투명
5. **자동완성 없음**: 입력 중 제안 기능 없음

## 🎯 개선 방안

### 1. 자동완성(Autocomplete) 기능 ⭐⭐⭐⭐⭐

**우선순위: 최고**

#### 구현 방법

**A. Yahoo Finance Autocomplete API**
```typescript
// 엔드포인트
https://autoc.finance.yahoo.com/autoc?query={query}&region=1&lang=en

// 응답 예시
{
  "ResultSet": {
    "Result": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "exch": "NAS",
        "type": "S"
      }
    ]
  }
}
```

**B. Finnhub Symbol Search API**
```typescript
// 엔드포인트
https://finnhub.io/api/v1/search?q={query}&token={API_TOKEN}

// 응답 예시
{
  "result": [
    {
      "description": "APPLE INC",
      "displaySymbol": "AAPL",
      "symbol": "AAPL",
      "type": "Common Stock"
    }
  ]
}
```

**C. 한국 주식 자동완성**
- 기존 `korea-stock-mapper-dynamic.ts`의 `getStockListing()` 활용
- 로컬 캐시된 종목 리스트에서 검색
- 실시간 API 호출 최소화

#### 기능 요구사항
- ✅ Debounce 적용 (300-500ms)
- ✅ 키보드 네비게이션 (↑↓, Enter, Tab, Esc)
- ✅ 최대 10개 제안 표시
- ✅ 매칭 텍스트 하이라이트
- ✅ 회사명과 티커 함께 표시
- ✅ 로딩 인디케이터
- ✅ 접근성 (ARIA 속성)

### 2. 복사/붙여넣기로 여러 종목 입력 ⭐⭐⭐⭐

**우선순위: 높음**

#### 구현 방법
- 쉼표, 줄바꿈, 공백으로 구분된 입력 파싱
- 자동으로 여러 필드에 분배
- 중복 제거
- 최대 5개 제한 처리

#### 예시
```
입력: "AAPL, TSLA, 삼성전자, 005930, MSFT"
→ 자동으로 5개 필드에 분배
```

### 3. 칩(Chip) 형태 UI ⭐⭐⭐⭐

**우선순위: 높음**

#### 구현 방법
- 입력된 종목을 칩 형태로 표시
- 칩 클릭으로 삭제
- 드래그 앤 드롭으로 순서 변경
- 티커와 회사명 함께 표시

#### 장점
- 시각적으로 명확
- 삭제/재정렬 용이
- 모바일 친화적

### 4. 실시간 검증 및 피드백 ⭐⭐⭐

**우선순위: 중간**

#### 구현 방법
- 입력 중 실시간 티커 검증
- 유효한 티커: 초록색 체크 표시
- 유효하지 않은 티커: 빨간색 경고 표시
- 한국 주식 자동 변환 표시

### 5. 최근 입력한 종목 저장 ⭐⭐⭐

**우선순위: 중간**

#### 구현 방법
- localStorage에 최근 입력한 종목 저장 (최대 20개)
- 자동완성 드롭다운에 "최근 입력" 섹션 추가
- 클릭으로 빠른 재입력

### 6. 입력 히스토리 및 즐겨찾기 ⭐⭐

**우선순위: 낮음**

#### 구현 방법
- 즐겨찾기 종목 저장
- 자주 분석하는 포트폴리오 저장
- 빠른 선택 기능

## 🛠 기술적 구현 계획

### Phase 1: 자동완성 기능 (핵심)

#### 1.1 Autocomplete 컴포넌트 생성
```typescript
// components/stock-autocomplete.tsx
- Debounce hook 사용
- API 호출 (Yahoo Finance / Finnhub)
- 드롭다운 UI
- 키보드 네비게이션
```

#### 1.2 API 통합
```typescript
// lib/stock-search.ts
- searchStocksYahoo(query: string)
- searchStocksFinnhub(query: string)
- searchKoreaStocks(query: string) // 로컬 캐시 활용
```

#### 1.3 통합 검색 함수
```typescript
// lib/stock-search.ts
export async function searchStocks(
  query: string
): Promise<StockSuggestion[]>
```

### Phase 2: 복사/붙여넣기 지원

#### 2.1 입력 파싱 함수
```typescript
// lib/stock-input-parser.ts
export function parseStockInput(input: string): string[]
```

#### 2.2 자동 분배 로직
- 최대 5개 제한
- 중복 제거
- 유효성 검증

### Phase 3: UI 개선

#### 3.1 칩 컴포넌트
```typescript
// components/stock-chip.tsx
- 삭제 버튼
- 드래그 핸들
- 티커/회사명 표시
```

#### 3.2 실시간 검증
- 입력 중 티커 검증
- 시각적 피드백
- 오류 메시지

### Phase 4: 고급 기능

#### 4.1 최근 입력 저장
- localStorage 활용
- 자동완성에 통합

#### 4.2 즐겨찾기
- 사용자 설정 저장
- 빠른 선택

## 📊 우선순위별 구현 계획

### 🔴 Phase 1 (즉시 구현)
1. **자동완성 기능**
   - Yahoo Finance Autocomplete API 통합
   - Debounce 적용
   - 기본 드롭다운 UI
   - 키보드 네비게이션

2. **한국 주식 자동완성**
   - 기존 동적 매핑 활용
   - 로컬 캐시 검색

### 🟡 Phase 2 (단기)
3. **복사/붙여넣기 지원**
   - 여러 종목 한번에 입력
   - 자동 파싱 및 분배

4. **실시간 검증**
   - 입력 중 티커 검증
   - 시각적 피드백

### 🟢 Phase 3 (중기)
5. **칩 UI**
   - 칩 형태 표시
   - 드래그 앤 드롭

6. **최근 입력 저장**
   - localStorage 활용
   - 빠른 재입력

## 🎨 UI/UX 디자인 가이드

### 자동완성 드롭다운
```
┌─────────────────────────────┐
│ 삼성전자 (005930.KS)        │ ← 하이라이트된 매칭
│ SK하이닉스 (000660.KS)     │
│ 삼성SDI (006400.KS)        │
│ 삼성물산 (028260.KS)       │
└─────────────────────────────┘
```

### 칩 UI
```
[삼성전자 (005930.KS) ×] [AAPL ×] [TSLA ×]
```

### 입력 필드 상태
- ✅ 유효: 초록색 체크
- ⚠️ 검증 중: 회색 로딩
- ❌ 무효: 빨간색 경고

## 🔧 기술 스택

### 필요한 라이브러리
- `use-debounce` (또는 커스텀 hook)
- `react-dnd` (드래그 앤 드롭, 선택사항)

### API 엔드포인트
- Yahoo Finance Autocomplete: `https://autoc.finance.yahoo.com/autoc`
- Finnhub Symbol Search: `https://finnhub.io/api/v1/search`

## 📝 구현 시 주의사항

1. **Rate Limiting**
   - Debounce 필수 (300-500ms)
   - API 호출 최소화
   - 캐싱 활용

2. **에러 처리**
   - API 실패 시 Fallback
   - 네트워크 오류 처리
   - 사용자 친화적 메시지

3. **성능 최적화**
   - 메모이제이션
   - 가상화 (대량 데이터)
   - 불필요한 리렌더링 방지

4. **접근성**
   - ARIA 속성
   - 키보드 네비게이션
   - 스크린 리더 지원

## 🚀 예상 효과

### 사용자 경험 개선
- ✅ 입력 시간 50% 단축
- ✅ 오류율 80% 감소
- ✅ 사용자 만족도 향상

### 기술적 이점
- ✅ 실시간 검증
- ✅ 자동 변환
- ✅ 확장 가능한 구조

## 📚 참고 자료

- [Autocomplete UX Best Practices](https://www.freshconsulting.com/insights/blog/autocomplete-benefits-ux-best-practices/)
- [Yahoo Finance Autocomplete API](https://github.com/gadicc/node-yahoo-finance2/issues/8)
- [Finnhub Symbol Search API](https://hibernix.github.io/finnhub-api/docs/finnhub-api/com.hibernix.finnhub.api/-finnhub-api/symbol-search.html)
- [React Debounce Best Practices](https://www.youtube.com/watch?v=0UPFvHuRQAM)
