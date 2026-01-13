# 주식 데이터 API 대안 검토

## 현재 문제점
- Yahoo Finance API: Rate limiting이 엄격함 (Too Many Requests)
- 무료 버전의 제한이 많음
- 안정성 문제

## 대안 검토

### 1. Finnhub ⭐ 추천
**장점:**
- 무료: 60 calls/min (Yahoo보다 훨씬 여유)
- 실시간 데이터 (15분 지연)
- 한국 주식 지원 (KRX)
- 뉴스, 재무 데이터 포함
- WebSocket 지원 (유료)

**단점:**
- API 키 필요 (무료 등록)
- 한국 주식 데이터는 제한적일 수 있음

**Rate Limit:**
- Free: 60 calls/min
- Basic ($9.99/mo): 300 calls/min

**적합성:** ⭐⭐⭐⭐⭐
- Rate limit이 충분함
- 한국/미국 주식 모두 지원
- 뉴스 데이터도 제공

---

### 2. Alpha Vantage
**장점:**
- 무료: 5 calls/min, 500 calls/day
- 50개 이상의 기술적 지표 제공
- Forex, Crypto 지원

**단점:**
- Rate limit이 매우 제한적 (5 calls/min)
- 한국 주식 지원 제한적

**Rate Limit:**
- Free: 5 calls/min, 500 calls/day

**적합성:** ⭐⭐
- Rate limit이 너무 낮음
- 우리 사용 사례에는 부적합

---

### 3. IEX Cloud
**장점:**
- 무료: 50,000 calls/month
- 실시간 데이터
- 재무제표, 뉴스 제공

**단점:**
- 미국 주식만 지원
- 한국 주식 불가

**Rate Limit:**
- Free: 50,000 calls/month

**적합성:** ⭐⭐⭐
- 미국 주식만 사용한다면 좋음
- 한국 주식 미지원

---

### 4. Polygon.io
**장점:**
- 무료: 5 calls/min, 20,000 calls/month
- 고품질 데이터
- WebSocket 지원

**단점:**
- 미국 주식 중심
- 한국 주식 미지원
- Rate limit이 낮음

**Rate Limit:**
- Free: 5 calls/min, 20,000 calls/month

**적합성:** ⭐⭐
- Rate limit이 낮고 한국 주식 미지원

---

### 5. Twelve Data
**장점:**
- 글로벌 시장 지원
- 실시간 데이터

**단점:**
- 무료 플랜 제한적
- 한국 주식 지원 불확실

**적합성:** ⭐⭐⭐

---

### 6. 한국투자증권 KIS API
**장점:**
- 한국 주식 데이터 완벽 지원
- 실시간 데이터
- 공식 API

**단점:**
- 계좌 개설 필요
- API 키 발급 복잡
- 미국 주식 지원 제한적

**적합성:** ⭐⭐⭐⭐
- 한국 주식만 사용한다면 최적
- 미국 주식은 다른 API 필요

---

## 하이브리드 접근 방식

### 전략 1: Finnhub + Yahoo Finance (Fallback)
```
1차: Finnhub 사용 (주 데이터 소스)
2차: Yahoo Finance (Finnhub 실패 시)
```

**장점:**
- Rate limit 문제 해결
- 안정성 향상
- 한국/미국 주식 모두 지원

### 전략 2: Finnhub + 한국투자증권 API
```
미국 주식: Finnhub
한국 주식: 한국투자증권 API
```

**장점:**
- 각 시장에 최적화된 데이터
- 높은 데이터 품질

**단점:**
- 두 API 관리 필요

### 전략 3: 캐싱 + Finnhub
```
1. 데이터 캐싱 (Redis/Memory)
2. 캐시 미스 시 Finnhub 호출
3. 캐시 TTL: 1-5분
```

**장점:**
- Rate limit 문제 완전 해결
- 빠른 응답 속도
- 비용 절감

---

## 추천 방안

### 🎯 최우선 추천: Finnhub 단독 사용
**이유:**
1. Rate limit이 충분함 (60 calls/min)
2. 한국/미국 주식 모두 지원
3. 뉴스 데이터 포함
4. 무료 플랜으로 충분
5. API가 간단하고 안정적

**구현 난이도:** 낮음
**비용:** 무료

### 🥈 차선책: Finnhub + 캐싱
**이유:**
1. Rate limit 문제 완전 해결
2. 응답 속도 향상
3. 사용자 경험 개선

**구현 난이도:** 중간
**비용:** 무료 (Redis 무료 플랜 사용 가능)

### 🥉 3순위: Finnhub + Yahoo Finance (Fallback)
**이유:**
1. 안정성 향상
2. Finnhub 장애 시 대비

**구현 난이도:** 중간
**비용:** 무료

---

## 구현 계획

### Phase 1: Finnhub로 전환
1. Finnhub API 키 발급
2. `lib/finance-finnhub.ts` 생성
3. 기존 Yahoo Finance 코드와 병행
4. 점진적 마이그레이션

### Phase 2: 캐싱 추가 (선택)
1. Redis 또는 In-memory 캐시
2. 캐시 전략 구현
3. TTL 설정

### Phase 3: Fallback 메커니즘 (선택)
1. Finnhub 실패 시 Yahoo Finance 사용
2. 에러 핸들링 강화
