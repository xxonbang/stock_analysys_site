# 데이터 소스 최종 추천 (전방위 분석 결과)

## 🎯 최우선 추천: yfinance-cache + FinanceDataReader (Python 서버)

### 선택 이유

1. **완전 무료**: 모든 기능 무료 사용
2. **Rate Limit 문제 완전 해결**: 
   - yfinance-cache의 스마트 캐싱
   - FinanceDataReader는 rate limit 없음
3. **한국/미국 주식 모두 완벽 지원**
4. **안정성**: 캐싱 전략으로 안정적
5. **유지보수**: 활발한 커뮤니티

### 구현 방법

**Python FastAPI 서버 구축:**
```python
from fastapi import FastAPI
import yfinance_cache as yf
import FinanceDataReader as fdr

app = FastAPI()

@app.get("/stock/{symbol}")
async def get_stock(symbol: str):
    if symbol.isalpha():  # 미국 주식
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="120d")
    else:  # 한국 주식
        hist = fdr.DataReader(symbol, period="120d")
    return hist.to_dict()
```

**Next.js에서 호출:**
```typescript
const response = await fetch('http://python-server:8000/stock/AAPL');
const data = await response.json();
```

### 장점
- ✅ 완전 무료
- ✅ Rate limit 문제 없음
- ✅ 한국/미국 주식 모두 완벽
- ✅ 안정적 (캐싱 전략)

### 단점
- ⚠️ Python 서버 구축 필요
- ⚠️ Node.js에서 Python API 호출

---

## 🥈 차선책: Twelve Data

### 선택 이유

1. **Rate Limit**: 8,000 calls/day
   - 현재 사용량 대비 매우 여유
   - 여러 종목 동시 분석 가능

2. **Historical Data**: 완벽 지원
   - 120일치 데이터 문제없이 수집
   - Yahoo Finance rate limit 문제 완전 해결

3. **기술적 지표**: 100+ 제공
   - RSI, MA 등을 직접 계산할 필요 없음
   - API에서 바로 제공
   - 코드 간소화 및 정확도 향상

4. **글로벌 커버리지**: 150+ 거래소
   - 미국 주식 완벽 지원
   - 한국 주식 지원 여부 확인 필요 (테스트 필요)

5. **무료 플랜**: 매우 관대
   - 개발 및 소규모 프로덕션에 충분

### 구현 상태

- ✅ `lib/finance-twelvedata.ts`: 구현 완료
- ⏳ API 키 발급 필요
- ⏳ 테스트 필요

---

## 🇰🇷 한국 주식 대안

### 옵션 1: FinanceDataReader (Python 서버)

**장점:**
- 완전 무료
- Rate limit 없음
- 한국 주식 데이터 완벽

**구현:**
- Python FastAPI 서버 구축
- FinanceDataReader 사용
- Next.js에서 호출

**단점:**
- 별도 서버 구축 필요
- Python 인프라 관리

### 옵션 2: KRX Open API

**장점:**
- 공식 API로 안정적
- 한국 주식 데이터 완벽
- 투자자별 매매동향 등 추가 데이터

**단점:**
- API 키 발급 절차 복잡
- 서비스별 추가 신청 필요

### 옵션 3: Twelve Data 한국 주식 지원 확인

**가능성:**
- Twelve Data가 한국 주식도 지원할 수 있음
- 테스트 필요

---

## 📋 구현 계획

### Phase 1: Twelve Data 전환 (즉시)

1. **API 키 발급**
   - https://twelvedata.com/ 접속
   - 무료 계정 생성
   - API 키 발급

2. **환경 변수 설정**
   ```env
   TWELVEDATA_API_KEY=your_api_key_here
   DATA_SOURCE=twelvedata
   ```

3. **어댑터 수정**
   - `lib/finance-adapter.ts`에 Twelve Data 추가
   - 자동 선택 로직 구현

4. **테스트**
   - 미국 주식 테스트
   - 한국 주식 지원 여부 확인

### Phase 2: 한국 주식 지원 (필요시)

**시나리오 A: Twelve Data가 한국 주식 지원**
- 추가 작업 불필요
- 완벽한 솔루션

**시나리오 B: Twelve Data가 한국 주식 미지원**
- FinanceDataReader Python 서버 구축
- 또는 KRX Open API 연동
- 하이브리드 전략 적용

### Phase 3: 최적화 (선택)

1. **캐싱 추가**
   - Redis 또는 In-Memory
   - Historical 데이터 하루 1회 수집
   - 응답 속도 향상

2. **기술적 지표 최적화**
   - Twelve Data에서 제공하는 지표 활용
   - 직접 계산 코드 제거

---

## 🔄 마이그레이션 체크리스트

### Twelve Data 전환
- [ ] API 키 발급
- [ ] 환경 변수 설정
- [ ] `lib/finance-adapter.ts` 수정
- [ ] 미국 주식 테스트
- [ ] 한국 주식 지원 확인
- [ ] 기존 코드 정리

### 한국 주식 지원 (필요시)
- [ ] FinanceDataReader 서버 구축 (또는)
- [ ] KRX Open API 연동
- [ ] 하이브리드 로직 구현
- [ ] 테스트

---

## 💡 예상 효과

### Twelve Data 사용 시

**Before (Yahoo Finance):**
- Rate limit: 매우 제한적
- Historical 데이터: 실패 빈번
- 기술적 지표: 직접 계산 필요
- 안정성: 낮음

**After (Twelve Data):**
- Rate limit: 8,000 calls/day (충분)
- Historical 데이터: 완벽 지원
- 기술적 지표: API에서 제공
- 안정성: 높음

**개선 효과:**
- ✅ Rate limit 문제 완전 해결
- ✅ 안정성 향상
- ✅ 코드 간소화
- ✅ 응답 속도 향상 (기술적 지표 직접 계산 불필요)

---

## 📚 참고 문서

- 상세 비교: `docs/COMPREHENSIVE_DATA_SOURCES.md`
- API 대안: `docs/API_ALTERNATIVES.md`
- 캐싱 전략: `docs/CACHING_STRATEGY.md`
