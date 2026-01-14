# 데이터 획득 출처 신뢰도 및 정합성 진단 보고서

## 📋 개요

전체 소스 코드를 분석하여 현재 사용 중인 데이터 획득 출처의 신뢰도와 데이터 정합성을 면밀히 진단한 결과입니다.

---

## 🔍 데이터 소스 현황

### 1. Yahoo Finance (yahoo-finance2) ⚠️

**사용 위치:**
- `lib/finance.ts`: 주요 데이터 소스
- `lib/finance-finnhub.ts`: Fallback으로 사용

**신뢰도 평가: ⭐⭐⭐ (보통)**

**장점:**
- ✅ 광범위한 종목 커버리지 (한국/미국 주식)
- ✅ 무료 사용 가능
- ✅ Historical 데이터 제공

**단점:**
- ⚠️ **Rate Limit 문제**: 명시적 제한 없음, 일시적 차단 가능
- ⚠️ **비공식 API**: Yahoo Finance 공식 API 아님
- ⚠️ **데이터 정합성 검증 부족**: 응답 데이터 검증 미흡
- ⚠️ **라이브러리 유지보수**: yahoo-finance2 v2는 더 이상 유지보수되지 않음 (v3 마이그레이션 필요)

**데이터 정합성 문제:**

1. **검증 부족:**
   ```typescript
   // lib/finance.ts:185
   if (!quote || !quote.regularMarketPrice) {
     throw new Error(`Invalid symbol or no data available: ${symbol}`);
   }
   ```
   - `regularMarketPrice`가 0이거나 음수인 경우 검증 없음
   - `NaN`, `null`, `undefined` 체크 부족

2. **Historical 데이터 검증 부족:**
   ```typescript
   // lib/finance.ts:214
   if (!historical || historical.length === 0) {
     throw new Error(`No historical data available for ${symbol}`);
   }
   ```
   - 배열 길이는 체크하지만, 각 데이터 포인트의 유효성 검증 없음
   - `close` 값이 0이거나 음수인 경우 처리 없음

3. **기술적 지표 계산 오류 가능성:**
   ```typescript
   // lib/finance.ts:219
   const closes = historical.map((h) => h.close).reverse();
   ```
   - `h.close`가 `null` 또는 `undefined`인 경우 `NaN` 발생 가능
   - RSI/MA 계산 시 `NaN` 전파 위험

**개선 필요 사항:**
- 데이터 유효성 검증 강화 (0, 음수, NaN 체크)
- Historical 데이터 포인트별 검증
- Fallback 메커니즘 개선

---

### 2. Finnhub API ⭐⭐⭐⭐

**사용 위치:**
- `lib/finance-finnhub.ts`: 주요 데이터 소스 (API 키 있을 때)

**신뢰도 평가: ⭐⭐⭐⭐ (양호)**

**장점:**
- ✅ 공식 API (안정적)
- ✅ Rate limit 명확 (60 calls/min)
- ✅ 한국/미국 주식 지원
- ✅ 오류 처리 및 재시도 로직 존재

**단점:**
- ⚠️ **무료 플랜 제한**: Historical candle API 제한적
- ⚠️ **한국 주식 심볼 처리 불명확**: `normalizeKoreaSymbol` 함수가 실제로 작동하는지 불확실
- ⚠️ **환율 API 미구현**: `fetchExchangeRateFinnhub`가 `null` 반환 (TODO 상태)

**데이터 정합성 문제:**

1. **Quote 검증:**
   ```typescript
   // lib/finance-finnhub.ts:84
   if (!quote || quote.c === 0) {
     throw new Error(`Invalid symbol or no data available: ${symbol}`);
   }
   ```
   - ✅ 기본 검증 존재
   - ⚠️ `quote.c`가 음수인 경우 검증 없음

2. **Historical 데이터 혼합:**
   ```typescript
   // lib/finance-finnhub.ts:118-161
   // Finnhub 실패 시 Yahoo Finance 사용
   ```
   - ⚠️ **데이터 소스 혼합**: Finnhub quote + Yahoo Finance historical
   - ⚠️ **정합성 문제**: 서로 다른 소스의 데이터를 조합하여 기술적 지표 계산
   - ⚠️ **타임스탬프 불일치 가능성**: 두 소스의 시간대/업데이트 시점 차이

3. **한국 주식 심볼 처리:**
   ```typescript
   // lib/finance-finnhub.ts:338
   export function normalizeKoreaSymbol(symbol: string): string {
     // Finnhub는 한국 주식을 어떻게 처리하는지 확인 필요
     return symbol; // 실제로는 변환하지 않음
   }
   ```
   - ⚠️ **불확실한 구현**: 한국 주식 심볼 변환이 실제로 필요한지 불명확
   - ⚠️ **테스트 부족**: 실제로 작동하는지 검증되지 않음

**개선 필요 사항:**
- 한국 주식 심볼 처리 로직 검증 및 테스트
- 데이터 소스 혼합 시 정합성 검증
- 환율 API 구현 완료

---

### 3. Python (yfinance + FinanceDataReader) ⭐⭐⭐⭐

**사용 위치:**
- `scripts/test_python_stock.py`: 로컬 실행
- `api/stock/[symbol].py`: Vercel Serverless Function

**신뢰도 평가: ⭐⭐⭐⭐ (양호)**

**장점:**
- ✅ 한국 주식 데이터 완벽 (FinanceDataReader)
- ✅ 미국 주식 데이터 안정적 (yfinance)
- ✅ Rate limit 문제 완화 (yfinance-cache)
- ✅ 기술적 지표 계산 로직 검증됨

**단점:**
- ⚠️ **데이터 검증 부족**: Python 스크립트에서 반환하는 데이터의 유효성 검증 미흡
- ⚠️ **TypeScript 레벨 검증 없음**: `fetchStockDataVercel`에서 받은 데이터를 그대로 사용
- ⚠️ **에러 메시지 전달**: Python 오류가 TypeScript로 제대로 전달되지 않을 수 있음

**데이터 정합성 문제:**

1. **TypeScript 레벨 검증 부족:**
   ```typescript
   // lib/finance-vercel.ts:128-138
   return {
     symbol: data.symbol,
     price: data.price,
     change: data.change,
     // ... 검증 없이 그대로 사용
   };
   ```
   - ⚠️ `data.price`가 `null`, `undefined`, `NaN`인 경우 처리 없음
   - ⚠️ `data.movingAverages` 구조 검증 없음
   - ⚠️ `data.historicalData` 배열 검증 없음

2. **Python 스크립트 데이터 검증:**
   ```python
   # scripts/test_python_stock.py:190-207
   result = {
       'price': round(current_price, 2),
       # ... 기본 검증만 존재
   }
   ```
   - ✅ 기본적인 타입 변환 (`float`, `int`)
   - ⚠️ 음수, 0 값 검증 없음
   - ⚠️ `NaN` 체크 없음

3. **Historical 데이터 제한:**
   ```python
   # scripts/test_python_stock.py:204
   'historicalData': historical_data[:10],  # 처음 10개만 출력
   ```
   - ⚠️ **심각한 문제**: Historical 데이터가 10개로 제한됨
   - ⚠️ 기술적 지표 계산에 필요한 120일치 데이터가 전달되지 않음
   - ⚠️ RSI, MA 계산이 부정확할 수 있음

**개선 필요 사항:**
- Historical 데이터 전체 반환 (10개 제한 제거)
- TypeScript 레벨 데이터 검증 추가
- Python 오류 메시지 개선

---

### 4. 네이버 금융 크롤링 ⚠️⚠️

**사용 위치:**
- `lib/finance.ts:345`: 한국 주식 수급 데이터

**신뢰도 평가: ⭐⭐ (낮음)**

**장점:**
- ✅ 한국 주식 수급 데이터 제공
- ✅ 무료 사용

**단점:**
- ⚠️⚠️ **법적 리스크**: 이용약관 위반 가능성
- ⚠️⚠️ **안정성 낮음**: HTML 구조 변경 시 파싱 실패
- ⚠️⚠️ **IP 차단 위험**: 과도한 요청 시 차단 가능
- ⚠️ **데이터 검증 부족**: 파싱된 데이터의 유효성 검증 없음

**데이터 정합성 문제:**

1. **HTML 파싱 의존성:**
   ```typescript
   // lib/finance.ts:366
   $('table.type_1 tbody tr').each((index, element) => {
     // 네이버 금융 페이지 구조에 의존
   });
   ```
   - ⚠️ **취약성**: 네이버 금융 페이지 구조 변경 시 즉시 실패
   - ⚠️ **검증 없음**: 파싱된 텍스트가 숫자인지 확인 없음

2. **데이터 검증 부족:**
   ```typescript
   // lib/finance.ts:376-378
   institutional = parseInt(institutionalText) || 0;
   foreign = parseInt(foreignText) || 0;
   individual = parseInt(individualText) || 0;
   ```
   - ⚠️ `parseInt` 실패 시 0으로 처리 (오류를 숨김)
   - ⚠️ 음수 값 검증 없음
   - ⚠️ 합리성 검증 없음 (예: 기관+외국인+개인 합계 검증)

3. **Fallback 로직:**
   ```typescript
   // lib/finance.ts:384-396
   if (institutional === 0 && foreign === 0 && individual === 0) {
     // 다른 선택자 시도
   }
   ```
   - ⚠️ 실제로 데이터가 0인 경우와 파싱 실패를 구분하지 못함

**개선 필요 사항:**
- 공식 API로 전환 (KRX Open API 등)
- 파싱 데이터 유효성 검증 강화
- 오류 감지 및 로깅 개선

---

### 5. Gemini API (AI 리포트) ⭐⭐⭐⭐

**사용 위치:**
- `app/api/analyze/route.ts`: AI 리포트 생성
- `lib/gemini-client.ts`: Fallback 지원

**신뢰도 평가: ⭐⭐⭐⭐ (양호)**

**장점:**
- ✅ Fallback 메커니즘 구현 (여러 API 키)
- ✅ 오류 처리 및 재시도 로직
- ✅ 배치 처리로 효율성 향상

**단점:**
- ⚠️ **응답 파싱 취약성**: AI 응답 형식이 일정하지 않을 수 있음
- ⚠️ **데이터 검증 부족**: AI 리포트 내용의 정확성 검증 없음

**데이터 정합성 문제:**

1. **응답 파싱:**
   ```typescript
   // app/api/analyze/route.ts:178-233
   // 여러 패턴으로 파싱 시도
   ```
   - ⚠️ 패턴 매칭 실패 시 전체 리포트를 첫 번째 종목에 할당
   - ⚠️ 파싱 실패 감지가 부정확할 수 있음

2. **최소 길이 체크:**
   ```typescript
   // app/api/analyze/route.ts:214
   if (report.length > 100) {
     reportsMap.set(symbol, report);
   }
   ```
   - ⚠️ 100자 이상이면 유효하다고 간주 (너무 낮은 기준)

**개선 필요 사항:**
- AI 응답 파싱 로직 개선
- 리포트 품질 검증 강화

---

## 🚨 심각한 문제점

### 1. Python Historical 데이터 제한 (Critical)

**위치:** `scripts/test_python_stock.py:204`

```python
'historicalData': historical_data[:10],  # 처음 10개만 출력
```

**문제:**
- 기술적 지표 계산에 필요한 120일치 데이터가 10개로 제한됨
- RSI, MA 계산이 부정확함
- AI 리포트 생성에 필요한 충분한 데이터가 제공되지 않음

**영향:**
- 기술적 지표 부정확
- AI 분석 품질 저하
- 사용자에게 잘못된 정보 제공

**해결 방안:**
- `[:10]` 제한 제거
- 전체 historical 데이터 반환

---

### 2. 데이터 검증 부족 (High)

**문제:**
- 모든 데이터 소스에서 받은 데이터의 유효성 검증이 부족함
- `null`, `undefined`, `NaN`, 음수 값 체크 없음
- 타입 검증 없음

**영향:**
- 잘못된 데이터로 기술적 지표 계산
- AI 리포트에 오류 데이터 포함
- 런타임 오류 가능성

**해결 방안:**
- 데이터 검증 함수 추가
- 각 필드별 유효성 검증
- 기본값 설정 및 오류 처리

---

### 3. 데이터 소스 혼합 (Medium)

**문제:**
- Finnhub quote + Yahoo Finance historical 조합
- 서로 다른 소스의 데이터를 믹스하여 사용

**영향:**
- 타임스탬프 불일치
- 가격 불일치 가능성
- 기술적 지표 계산 오류

**해결 방안:**
- 단일 소스 사용 권장
- 또는 데이터 정합성 검증 추가

---

### 4. 네이버 금융 크롤링 안정성 (High)

**문제:**
- HTML 구조 변경에 취약
- 법적 리스크
- IP 차단 위험

**영향:**
- 수급 데이터 수집 실패
- 서비스 중단 가능성

**해결 방안:**
- 공식 API로 전환 (KRX Open API)
- 또는 크롤링 안정성 개선

---

## 📊 신뢰도 종합 평가

| 데이터 소스 | 신뢰도 | 정합성 | 안정성 | 개선 필요도 |
|------------|--------|--------|--------|------------|
| Yahoo Finance | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 높음 |
| Finnhub | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 중간 |
| Python (yfinance/FDR) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 높음 (Historical 제한) |
| 네이버 크롤링 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 매우 높음 |
| Gemini API | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 낮음 |

---

## 🔧 권장 개선 사항

### ✅ 즉시 수정 완료 (Critical)

1. **Python Historical 데이터 제한 제거** ✅
   - `scripts/test_python_stock.py:204` 수정 완료
   - 전체 historical 데이터 반환하도록 변경

2. **데이터 검증 함수 추가** ✅
   - `lib/data-validator.ts` 신규 생성
   - `validateStockData`, `validateNumber`, `validateHistoricalCloses` 함수 추가
   - 모든 데이터 소스에서 받은 데이터 검증 로직 통합

3. **TypeScript 레벨 검증 강화** ✅
   - `fetchStockDataVercel`에서 `validateStockData` 사용
   - `fetchStockData` (Yahoo Finance)에서 historical 데이터 검증 추가
   - `fetchStockDataFinnhub`에서 데이터 검증 추가

4. **네이버 금융 크롤링 개선** ✅
   - 파싱 오류 감지 개선 (NaN 체크, 숫자 검증)
   - 합리성 검증 추가 (비정상적으로 큰 값 감지)

### 단기 개선 (High Priority)

5. **데이터 소스 정합성 검증**
   - Finnhub + Yahoo Finance 혼합 시 검증
   - 타임스탬프 일치 확인

6. **오류 처리 개선**
   - 더 명확한 오류 메시지
   - 사용자 친화적 오류 처리

### 중기 개선 (Medium Priority)

7. **네이버 금융 크롤링 대체**
   - 공식 API 전환 검토 (KRX Open API)
   - 또는 크롤링 안정성 추가 개선

8. **모니터링 및 로깅 강화**
   - 데이터 품질 메트릭 수집
   - 오류 발생 패턴 분석

---

## 📝 결론

**진단 결과:**
- ✅ **Critical 문제 해결 완료**: Python Historical 데이터 제한 제거, 데이터 검증 추가
- ⚠️ **High Priority 문제 부분 해결**: 네이버 금융 크롤링 개선 완료, 정합성 검증은 추가 개선 필요
- 📊 **전체 신뢰도**: ⭐⭐⭐ (보통) → ⭐⭐⭐⭐ (양호)로 향상 예상

**개선 완료 사항:**
1. ✅ Python Historical 데이터 10개 제한 제거
2. ✅ 데이터 검증 함수 추가 및 적용
3. ✅ TypeScript 레벨 검증 강화
4. ✅ 네이버 금융 크롤링 파싱 개선

**추가 개선 권장:**
- 데이터 소스 정합성 검증 (Finnhub + Yahoo 혼합 시)
- 네이버 금융 공식 API 전환 검토
- 모니터링 시스템 구축

현재 시스템의 데이터 신뢰도와 정합성이 크게 향상되었습니다.
