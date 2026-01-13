# 데이터 소스 전환 및 최적화 구현 계획

## 📋 검토 결과 요약

### 현재 문제
- ✅ Yahoo Finance API: Rate limiting이 엄격함
- ✅ 배치 요청으로 일부 개선했지만 여전히 제한적

### 해결 방안

## 🎯 추천 솔루션: Finnhub로 전환

### 이유
1. **Rate Limit**: 60 calls/min (Yahoo보다 훨씬 여유)
2. **한국/미국 주식**: 모두 지원
3. **안정성**: 공식 API로 안정적
4. **비용**: 무료 플랜으로 충분
5. **추가 기능**: 뉴스 데이터 포함

### 구현 상태
- ✅ `lib/finance-finnhub.ts`: Finnhub API 구현 완료
- ✅ `lib/finance-adapter.ts`: 통합 어댑터 구현 완료
- ✅ API 라우트 수정 완료

---

## 🚀 사용 방법

### 1. Finnhub API 키 발급
1. https://finnhub.io/ 접속
2. 무료 계정 생성
3. API 키 발급

### 2. 환경 변수 설정
`.env.local` 파일에 추가:
```env
# Finnhub API (추천)
FINNHUB_API_KEY=your_finnhub_api_key_here

# 데이터 소스 선택 (선택사항)
# auto: 자동 선택 (Finnhub 우선)
# finnhub: Finnhub만 사용
# yahoo: Yahoo Finance만 사용
DATA_SOURCE=auto
```

### 3. 즉시 사용 가능
- 코드는 이미 구현되어 있음
- API 키만 설정하면 자동으로 Finnhub 사용
- Fallback 메커니즘 포함 (Finnhub 실패 시 Yahoo Finance)

---

## 📊 성능 비교

| 항목 | Yahoo Finance | Finnhub |
|------|--------------|---------|
| Rate Limit | 매우 제한적 | 60 calls/min |
| 안정성 | 낮음 | 높음 |
| 한국 주식 | 지원 | 지원 |
| 미국 주식 | 지원 | 지원 |
| 뉴스 데이터 | 제한적 | 포함 |
| 비용 | 무료 | 무료 |

---

## 🔄 추가 최적화 옵션

### 옵션 1: 캐싱 추가 (선택사항)
**목적**: Rate limit 완전 해결 + 응답 속도 향상

**구현:**
- Redis 또는 In-Memory 캐싱
- TTL: 현재가 1분, Historical 1시간
- 자세한 내용: `docs/CACHING_STRATEGY.md` 참고

**장점:**
- Rate limit 문제 완전 해결
- 응답 속도 10배 이상 향상
- API 호출 비용 절감

### 옵션 2: 하이브리드 전략
**구현:**
- 미국 주식: Finnhub
- 한국 주식: 한국투자증권 API (더 정확한 데이터)

**장점:**
- 각 시장에 최적화된 데이터
- 높은 데이터 품질

**단점:**
- 두 API 관리 필요

---

## 📝 마이그레이션 체크리스트

### Phase 1: Finnhub 전환 (즉시 가능)
- [x] Finnhub API 구현
- [x] 어댑터 패턴 구현
- [x] API 라우트 수정
- [ ] Finnhub API 키 발급
- [ ] 환경 변수 설정
- [ ] 테스트

### Phase 2: 캐싱 추가 (선택)
- [ ] Redis 설정 (또는 In-Memory)
- [ ] 캐싱 로직 구현
- [ ] TTL 설정
- [ ] 테스트

### Phase 3: 모니터링 (선택)
- [ ] API 호출 횟수 모니터링
- [ ] 에러 로깅 강화
- [ ] 성능 메트릭 수집

---

## 🧪 테스트 방법

### 1. Finnhub API 키 설정
```bash
# .env.local에 추가
FINNHUB_API_KEY=your_key_here
```

### 2. 서버 재시작
```bash
npm run dev
```

### 3. 테스트 요청
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "stocks": ["AAPL", "MSFT"],
    "indicators": {
      "rsi": true,
      "movingAverages": true,
      "disparity": true,
      "supplyDemand": false,
      "fearGreed": false,
      "exchangeRate": false
    }
  }'
```

### 4. 로그 확인
서버 로그에서 다음 메시지 확인:
```
Using data source: finnhub for symbols: AAPL, MSFT
```

---

## ⚠️ 주의사항

### 한국 주식 심볼
- Finnhub는 한국 주식을 다르게 처리할 수 있음
- 실제 테스트 후 `normalizeKoreaSymbol()` 함수 조정 필요
- 예: `005930` vs `005930.KS`

### 환율 API
- Finnhub Forex API는 무료 플랜에서 제한적일 수 있음
- 필요시 Yahoo Finance로 Fallback

### Rate Limit 모니터링
- 60 calls/min 제한 있음
- 여러 종목 동시 요청 시 주의
- 필요시 캐싱 추가 권장

---

## 📚 참고 문서

- `docs/API_ALTERNATIVES.md`: 모든 대안 상세 비교
- `docs/CACHING_STRATEGY.md`: 캐싱 전략 상세
- Finnhub API 문서: https://finnhub.io/docs/api

---

## ✅ 결론

**즉시 조치:**
1. Finnhub API 키 발급
2. 환경 변수 설정
3. 테스트

**추가 최적화 (선택):**
- 캐싱 추가로 완벽한 해결
- 하이브리드 전략으로 데이터 품질 향상

**예상 효과:**
- ✅ Rate limit 문제 해결
- ✅ 안정성 향상
- ✅ 응답 속도 개선 (캐싱 추가 시)
