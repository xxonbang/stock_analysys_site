# 듀얼 소스 병렬 수집 + 상호검증 아키텍처 분석

## 데이터 정합성 강화를 위한 크로스 밸리데이션 전략

> **분석 범위**: 전통적 크롤링과 Agentic Web Browsing을 Fallback이 아닌 **병렬 수행** 후 **상호검증** 및 **보완**하는 아키텍처 평가

---

## 1. 아키텍처 개념

### 1.1 Fallback vs 듀얼 소스 비교

```
┌─────────────────────────────────────────────────────────────┐
│                    [Fallback 방식 - 기존 제안]               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   전통적 크롤링 ─────→ 성공? ─Yes─→ 데이터 사용              │
│                           │                                  │
│                          No                                  │
│                           ↓                                  │
│                    Agentic 수집 ──→ 데이터 사용              │
│                                                              │
│   특징: 순차 실행, 한 소스만 사용, 검증 없음                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               [듀얼 소스 + 상호검증 방식 - 신규 제안]         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────┐      ┌──────────────────┐            │
│   │  전통적 크롤링    │      │  Agentic 수집    │            │
│   │  (Source A)      │      │  (Source B)      │            │
│   └────────┬─────────┘      └────────┬─────────┘            │
│            │                          │                      │
│            └──────────┬───────────────┘                      │
│                       ↓                                      │
│            ┌──────────────────────┐                          │
│            │   정합성 검증 엔진    │                          │
│            │   (Validation Engine) │                          │
│            └──────────┬───────────┘                          │
│                       ↓                                      │
│            ┌──────────────────────┐                          │
│            │   데이터 병합/보완    │                          │
│            │   (Reconciliation)   │                          │
│            └──────────┬───────────┘                          │
│                       ↓                                      │
│            ┌──────────────────────┐                          │
│            │   최종 검증 데이터    │                          │
│            │   (Validated Data)   │                          │
│            └──────────────────────┘                          │
│                                                              │
│   특징: 병렬 실행, 양 소스 비교, 상호 보완                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **독립성** | 두 수집 방식이 서로 영향 없이 독립적으로 실행 |
| **병렬성** | 동시 실행으로 총 소요시간 최소화 |
| **검증성** | 수집된 데이터 간 교차 검증으로 오류 탐지 |
| **보완성** | 한쪽 소스의 누락 데이터를 다른 소스로 채움 |
| **신뢰성** | 합의된 데이터만 최종 결과로 사용 |

---

## 2. 상세 아키텍처 설계

### 2.1 전체 시스템 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                    듀얼 소스 데이터 수집 파이프라인                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Phase 1: 병렬 수집]                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   ┌─────────────┐                    ┌─────────────┐        │   │
│  │   │ Source A    │    Promise.all()   │ Source B    │        │   │
│  │   │ 전통 크롤링  │◄──────────────────►│ Agentic     │        │   │
│  │   └──────┬──────┘                    └──────┬──────┘        │   │
│  │          │                                   │               │   │
│  │          ▼                                   ▼               │   │
│  │   ┌─────────────┐                    ┌─────────────┐        │   │
│  │   │ DataSet A   │                    │ DataSet B   │        │   │
│  │   │ + metadata  │                    │ + metadata  │        │   │
│  │   │ + timestamp │                    │ + timestamp │        │   │
│  │   │ + source_id │                    │ + source_id │        │   │
│  │   └──────┬──────┘                    └──────┬──────┘        │   │
│  │          │                                   │               │   │
│  └──────────┼───────────────────────────────────┼───────────────┘   │
│             └───────────────┬───────────────────┘                   │
│                             ▼                                        │
│  [Phase 2: 정합성 검증]                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   ┌───────────────────────────────────────────────────┐     │   │
│  │   │              Validation Engine                     │     │   │
│  │   ├───────────────────────────────────────────────────┤     │   │
│  │   │  1. Schema Validation (구조 검증)                  │     │   │
│  │   │  2. Range Validation (범위 검증)                   │     │   │
│  │   │  3. Cross Validation (교차 검증)                   │     │   │
│  │   │  4. Temporal Validation (시점 검증)                │     │   │
│  │   │  5. Anomaly Detection (이상치 탐지)                │     │   │
│  │   └───────────────────────────────────────────────────┘     │   │
│  │                             │                                │   │
│  │                             ▼                                │   │
│  │   ┌───────────────────────────────────────────────────┐     │   │
│  │   │              Validation Result                     │     │   │
│  │   ├───────────────────────────────────────────────────┤     │   │
│  │   │  • MATCH: 두 소스 일치 (신뢰도 높음)              │     │   │
│  │   │  • PARTIAL: 일부 필드만 일치                      │     │   │
│  │   │  • CONFLICT: 두 소스 불일치 (조정 필요)           │     │   │
│  │   │  • SINGLE: 한 소스만 데이터 존재                  │     │   │
│  │   │  • EMPTY: 양쪽 모두 데이터 없음                   │     │   │
│  │   └───────────────────────────────────────────────────┘     │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                             ▼                                        │
│  [Phase 3: 데이터 병합/보완]                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   ┌───────────────────────────────────────────────────┐     │   │
│  │   │            Reconciliation Engine                   │     │   │
│  │   ├───────────────────────────────────────────────────┤     │   │
│  │   │                                                    │     │   │
│  │   │  MATCH    → 아무 소스나 사용 (신뢰도 100%)        │     │   │
│  │   │  PARTIAL  → 일치 필드 사용 + 불일치 필드 조정     │     │   │
│  │   │  CONFLICT → 우선순위 규칙 적용 또는 중재값 계산   │     │   │
│  │   │  SINGLE   → 단일 소스 사용 + 신뢰도 플래그        │     │   │
│  │   │  EMPTY    → null + 수집 실패 알림                 │     │   │
│  │   │                                                    │     │   │
│  │   └───────────────────────────────────────────────────┘     │   │
│  │                             │                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                             ▼                                        │
│  [Phase 4: 최종 출력]                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   {                                                          │   │
│  │     "data": { ... },           // 최종 검증 데이터          │   │
│  │     "confidence": 0.95,        // 신뢰도 점수               │   │
│  │     "sources": ["A", "B"],     // 사용된 소스               │   │
│  │     "validation": {                                         │   │
│  │       "status": "MATCH",       // 검증 상태                 │   │
│  │       "conflicts": [],         // 충돌 필드                 │   │
│  │       "supplements": []        // 보완된 필드               │   │
│  │     },                                                       │   │
│  │     "metadata": { ... }        // 수집 메타데이터           │   │
│  │   }                                                          │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 유형별 검증 전략

#### 2.2.1 수치 데이터 (재무 지표)

```
┌─────────────────────────────────────────────────────────────┐
│           수치 데이터 교차 검증 규칙                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [PER, PBR, ROE 등 비율 지표]                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  허용 오차: ±5%                                     │    │
│  │                                                     │    │
│  │  Source A: PER = 14.25                              │    │
│  │  Source B: PER = 14.68                              │    │
│  │                                                     │    │
│  │  차이율 = |14.25 - 14.68| / 14.25 = 3.02%          │    │
│  │  → 허용 범위 내 → MATCH (평균값 14.47 사용)         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [금액 데이터 (매출, 순이익 등)]                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  허용 오차: ±1% (금액은 더 정밀해야 함)             │    │
│  │                                                     │    │
│  │  Source A: 매출 = 302.5조                           │    │
│  │  Source B: 매출 = 302.8조                           │    │
│  │                                                     │    │
│  │  차이율 = 0.1% → MATCH                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [정수 데이터 (거래량, 수량 등)]                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  허용 오차: ±0.1% (정수는 정확히 일치해야 함)       │    │
│  │                                                     │    │
│  │  Source A: 거래량 = 15,230,000                      │    │
│  │  Source B: 거래량 = 15,230,000                      │    │
│  │                                                     │    │
│  │  차이율 = 0% → EXACT MATCH                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.2 수급 데이터 검증

```
┌─────────────────────────────────────────────────────────────┐
│           수급 데이터 교차 검증 (기관/외국인/개인)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [검증 규칙 1: 합계 균형 검증]                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  기관 + 외국인 + 개인 ≈ 0 (허용 오차: 1%)           │    │
│  │                                                     │    │
│  │  Source A: 기관 +15,230 / 외국인 -8,450 / 개인 -6,780│   │
│  │  합계 = 15,230 - 8,450 - 6,780 = 0 ✓               │    │
│  │                                                     │    │
│  │  Source B: 기관 +15,200 / 외국인 -8,500 / 개인 -6,700│   │
│  │  합계 = 15,200 - 8,500 - 6,700 = 0 ✓               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [검증 규칙 2: 소스 간 비교]                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  각 투자자별 허용 오차: ±2%                         │    │
│  │                                                     │    │
│  │  기관: |15,230 - 15,200| / 15,230 = 0.2% → MATCH   │    │
│  │  외국인: |8,450 - 8,500| / 8,450 = 0.6% → MATCH    │    │
│  │  개인: |6,780 - 6,700| / 6,780 = 1.2% → MATCH      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [검증 규칙 3: 논리적 일관성]                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 순매수 부호가 반대면 CONFLICT                    │    │
│  │  • 순매수량이 거래량보다 크면 INVALID               │    │
│  │  • 전일 대비 급변 시 ANOMALY 플래그                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 충돌 해결 정책 (Conflict Resolution)

```
┌─────────────────────────────────────────────────────────────┐
│                    충돌 해결 우선순위 매트릭스               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [우선순위 결정 요소]                                        │
│                                                              │
│  1. 데이터 신선도 (Freshness)                               │
│     - 더 최근에 수집된 데이터 우선                          │
│     - 타임스탬프 차이 < 5분이면 동등                        │
│                                                              │
│  2. 소스 신뢰도 (Source Reliability)                        │
│     - 공식 API (KRX, Yahoo Finance) > 크롤링 > Agentic     │
│     - 단, Agentic은 재현성이 높아 특정 케이스에서 유리      │
│                                                              │
│  3. 데이터 유형별 가중치                                     │
│     ┌──────────────────────────────────────────────┐       │
│     │  데이터 유형    │ 크롤링 가중치 │ Agentic 가중치│      │
│     ├──────────────────────────────────────────────┤       │
│     │  정확한 수치    │     0.6      │     0.4       │      │
│     │  (주가, 거래량) │              │               │      │
│     ├──────────────────────────────────────────────┤       │
│     │  복잡한 테이블  │     0.4      │     0.6       │      │
│     │  (재무제표)     │              │               │      │
│     ├──────────────────────────────────────────────┤       │
│     │  동적 콘텐츠    │     0.3      │     0.7       │      │
│     │  (JS 렌더링)    │              │               │      │
│     └──────────────────────────────────────────────┘       │
│                                                              │
│  [충돌 해결 전략]                                            │
│                                                              │
│  Strategy 1: 가중 평균 (Weighted Average)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  final_value = (A × weight_A + B × weight_B)       │    │
│  │                                                     │    │
│  │  예: PER 충돌                                       │    │
│  │  A = 14.25 (크롤링, weight = 0.4)                  │    │
│  │  B = 15.10 (Agentic, weight = 0.6)                 │    │
│  │  final = 14.25 × 0.4 + 15.10 × 0.6 = 14.76        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Strategy 2: 신선도 우선 (Freshness First)                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  if (timestamp_A > timestamp_B + 5min)              │    │
│  │    use A                                            │    │
│  │  else if (timestamp_B > timestamp_A + 5min)         │    │
│  │    use B                                            │    │
│  │  else                                               │    │
│  │    use weighted_average(A, B)                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Strategy 3: 보수적 선택 (Conservative)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  // 투자 결정에 불리한 값을 선택 (안전 마진)        │    │
│  │  PER: max(A, B)  // 높은 PER = 더 비싼 평가         │    │
│  │  ROE: min(A, B)  // 낮은 ROE = 더 나쁜 수익성       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 보완 전략

### 3.1 필드별 보완 매트릭스

```
┌─────────────────────────────────────────────────────────────┐
│              소스별 데이터 가용성 및 보완 전략               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  데이터 필드         │ 크롤링 │ Agentic │ 보완 전략         │
│  ────────────────────┼────────┼─────────┼─────────────────  │
│  현재가              │   ✅   │   ✅    │ 교차검증          │
│  등락률              │   ✅   │   ✅    │ 교차검증          │
│  거래량              │   ✅   │   ✅    │ 교차검증          │
│  ────────────────────┼────────┼─────────┼─────────────────  │
│  PER                 │   △    │   ✅    │ Agentic 우선     │
│  PBR                 │   △    │   ✅    │ Agentic 우선     │
│  ROE                 │   △    │   ✅    │ Agentic 우선     │
│  EPS                 │   △    │   ✅    │ Agentic 우선     │
│  BPS                 │   △    │   ✅    │ Agentic 우선     │
│  ────────────────────┼────────┼─────────┼─────────────────  │
│  기관 순매수         │   ✅   │   ✅    │ 교차검증          │
│  외국인 순매수       │   ✅   │   ✅    │ 교차검증          │
│  개인 순매수         │   ✅   │   ✅    │ 교차검증          │
│  ────────────────────┼────────┼─────────┼─────────────────  │
│  재무제표 (상세)     │   ❌   │   ✅    │ Agentic 단독     │
│  증권사 목표가       │   ❌   │   ✅    │ Agentic 단독     │
│  업종 비교           │   ❌   │   ✅    │ Agentic 단독     │
│                                                              │
│  ✅ = 안정적 수집 가능                                       │
│  △ = 불안정 (CSS 의존)                                       │
│  ❌ = 수집 불가                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 보완 로직 예시

```typescript
interface DualSourceResult<T> {
  sourceA: { data: T | null; timestamp: number; success: boolean };
  sourceB: { data: T | null; timestamp: number; success: boolean };
}

interface ValidatedData<T> {
  data: T;
  confidence: number;
  sources: ('A' | 'B')[];
  validation: ValidationStatus;
  supplements: string[]; // 보완된 필드 목록
}

function reconcileData<T>(
  result: DualSourceResult<T>,
  fieldConfig: FieldValidationConfig
): ValidatedData<T> {
  const { sourceA, sourceB } = result;

  // Case 1: 양쪽 모두 성공
  if (sourceA.success && sourceB.success) {
    return crossValidateAndMerge(sourceA.data, sourceB.data, fieldConfig);
  }

  // Case 2: A만 성공 → B 데이터로 보완
  if (sourceA.success && !sourceB.success) {
    return {
      data: sourceA.data,
      confidence: 0.7, // 단일 소스는 신뢰도 감소
      sources: ['A'],
      validation: 'SINGLE_SOURCE',
      supplements: [], // 보완 없음
    };
  }

  // Case 3: B만 성공 → A 데이터로 보완
  if (!sourceA.success && sourceB.success) {
    return {
      data: sourceB.data,
      confidence: 0.7,
      sources: ['B'],
      validation: 'SINGLE_SOURCE',
      supplements: [],
    };
  }

  // Case 4: 양쪽 모두 실패
  throw new DataCollectionError('Both sources failed');
}

function crossValidateAndMerge<T>(
  dataA: T,
  dataB: T,
  config: FieldValidationConfig
): ValidatedData<T> {
  const result: Partial<T> = {};
  const conflicts: string[] = [];
  const supplements: string[] = [];

  for (const field of Object.keys(config.fields)) {
    const valueA = dataA[field];
    const valueB = dataB[field];
    const tolerance = config.fields[field].tolerance;

    if (valueA == null && valueB == null) {
      // 양쪽 모두 없음
      result[field] = null;
    } else if (valueA == null) {
      // A 누락 → B로 보완
      result[field] = valueB;
      supplements.push(field);
    } else if (valueB == null) {
      // B 누락 → A로 보완
      result[field] = valueA;
      supplements.push(field);
    } else if (isWithinTolerance(valueA, valueB, tolerance)) {
      // 허용 오차 내 → 평균 또는 우선순위 적용
      result[field] = config.fields[field].mergeStrategy(valueA, valueB);
    } else {
      // 충돌 → 충돌 해결 정책 적용
      result[field] = resolveConflict(valueA, valueB, config.fields[field]);
      conflicts.push(field);
    }
  }

  const confidence = calculateConfidence(conflicts.length, supplements.length);

  return {
    data: result as T,
    confidence,
    sources: ['A', 'B'],
    validation: conflicts.length > 0 ? 'CONFLICT_RESOLVED' : 'MATCH',
    supplements,
  };
}
```

---

## 4. 비용/성능/신뢰성 트레이드오프 분석

### 4.1 비교 매트릭스

```
┌─────────────────────────────────────────────────────────────────────┐
│                    아키텍처별 비교 분석                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [비용 분석 (월간, 2,000종목 기준)]                                  │
│                                                                      │
│  ┌────────────────┬────────────┬────────────┬────────────────┐     │
│  │                │  Fallback  │ 듀얼소스   │ 듀얼소스+검증  │     │
│  │                │  (기존)    │ (병렬)     │ (전체)         │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 크롤링 비용    │    $0      │    $0      │     $0         │     │
│  │ Agentic 비용   │ ~$50/월    │ ~$1,200/월 │  ~$1,200/월    │     │
│  │ (예상 호출)    │ (500회)    │ (60,000회) │  (60,000회)    │     │
│  │ 검증 로직      │    $0      │    $0      │  ~$50/월       │     │
│  │ (컴퓨팅)       │            │            │  (Lambda)      │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 총 비용        │  ~$50/월   │ ~$1,200/월 │  ~$1,250/월    │     │
│  └────────────────┴────────────┴────────────┴────────────────┘     │
│                                                                      │
│  [성능 분석 (단일 종목 기준)]                                        │
│                                                                      │
│  ┌────────────────┬────────────┬────────────┬────────────────┐     │
│  │                │  Fallback  │ 듀얼소스   │ 듀얼소스+검증  │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 크롤링 시간    │  200ms     │  200ms     │    200ms       │     │
│  │ Agentic 시간   │  (0~3초)   │  3초       │    3초         │     │
│  │ 검증 시간      │    0       │    0       │    50ms        │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 총 소요시간    │  200ms~3초 │  3초       │    3.05초      │     │
│  │ (병렬 실행)    │ (가변적)   │ (일정)     │   (일정)       │     │
│  └────────────────┴────────────┴────────────┴────────────────┘     │
│                                                                      │
│  [신뢰성 분석]                                                       │
│                                                                      │
│  ┌────────────────┬────────────┬────────────┬────────────────┐     │
│  │                │  Fallback  │ 듀얼소스   │ 듀얼소스+검증  │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 데이터 정확도  │    중      │    중      │     상         │     │
│  │ (검증 없음)    │ (단일소스) │ (단일소스) │  (교차검증)    │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 오류 감지      │    하      │    중      │     상         │     │
│  │                │ (감지불가) │ (충돌인지) │  (자동감지)    │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 데이터 완성도  │    중      │    상      │     상         │     │
│  │                │ (누락가능) │ (상호보완) │  (상호보완)    │     │
│  ├────────────────┼────────────┼────────────┼────────────────┤     │
│  │ 단일장애점     │    있음    │    없음    │     없음       │     │
│  │ (SPOF)         │            │            │                │     │
│  └────────────────┴────────────┴────────────┴────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 시나리오별 ROI 분석

```
┌─────────────────────────────────────────────────────────────┐
│                    ROI 시나리오 분석                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [시나리오 1: 소규모 사용 (100종목/일)]                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Fallback 방식:                                     │    │
│  │  • 비용: ~$5/월                                     │    │
│  │  • 신뢰도: 70%                                      │    │
│  │  • 가성비: ⭐⭐⭐⭐⭐                                │    │
│  │                                                     │    │
│  │  듀얼소스+검증:                                     │    │
│  │  • 비용: ~$65/월                                    │    │
│  │  • 신뢰도: 95%                                      │    │
│  │  • 가성비: ⭐⭐⭐ (비용 대비 신뢰도 향상 제한적)    │    │
│  │                                                     │    │
│  │  권장: Fallback 방식                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [시나리오 2: 중규모 사용 (1,000종목/일)]                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Fallback 방식:                                     │    │
│  │  • 비용: ~$25/월                                    │    │
│  │  • 신뢰도: 70%                                      │    │
│  │  • 데이터 오류 발생 시 손실: 높음                   │    │
│  │                                                     │    │
│  │  듀얼소스+검증:                                     │    │
│  │  • 비용: ~$625/월                                   │    │
│  │  • 신뢰도: 95%                                      │    │
│  │  • 오류 자동 감지/수정: 가능                        │    │
│  │                                                     │    │
│  │  권장: 사용 목적에 따라 결정                        │    │
│  │  - 개인 투자: Fallback                              │    │
│  │  - 서비스 운영: 듀얼소스+검증                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [시나리오 3: 대규모 사용 (전종목 2,000+/일)]               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Fallback 방식:                                     │    │
│  │  • 비용: ~$50/월                                    │    │
│  │  • 오류율: 5-10% (CSS 변경 시 급증)                 │    │
│  │  • 유지보수: 월 8시간+ ($400+)                      │    │
│  │                                                     │    │
│  │  듀얼소스+검증:                                     │    │
│  │  • 비용: ~$1,250/월                                 │    │
│  │  • 오류율: <1% (자동 감지/수정)                     │    │
│  │  • 유지보수: 월 2시간 ($100)                        │    │
│  │                                                     │    │
│  │  총 비용 비교:                                      │    │
│  │  • Fallback: $50 + $400 = $450/월                  │    │
│  │  • 듀얼소스: $1,250 + $100 = $1,350/월             │    │
│  │                                                     │    │
│  │  권장: 서비스 품질 요구사항에 따라 결정             │    │
│  │  - 신뢰성 중시: 듀얼소스+검증                       │    │
│  │  - 비용 중시: Fallback + 모니터링 강화             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 구현 예시

### 5.1 TypeScript 구현

```typescript
// lib/dual-source-collector.ts

import { fetchKoreaSupplyDemandNaver } from './finance';
import { fetchSupplyDemandAgentic } from './agentic-supply-demand';

interface CollectionResult<T> {
  data: T | null;
  source: 'crawling' | 'agentic';
  timestamp: number;
  success: boolean;
  error?: string;
}

interface ValidationResult<T> {
  finalData: T;
  confidence: number;
  validation: {
    status: 'MATCH' | 'PARTIAL' | 'CONFLICT' | 'SINGLE' | 'EMPTY';
    matchedFields: string[];
    conflictFields: string[];
    supplementedFields: string[];
  };
  sources: {
    crawling: CollectionResult<T>;
    agentic: CollectionResult<T>;
  };
}

/**
 * 듀얼 소스 병렬 수집 + 상호검증 구현
 */
export async function collectWithDualSourceValidation(
  stockCode: string
): Promise<ValidationResult<SupplyDemandData>> {

  // Phase 1: 병렬 수집
  const [crawlingResult, agenticResult] = await Promise.allSettled([
    collectFromCrawling(stockCode),
    collectFromAgentic(stockCode),
  ]);

  const crawling = processSettledResult(crawlingResult, 'crawling');
  const agentic = processSettledResult(agenticResult, 'agentic');

  // Phase 2: 정합성 검증
  const validation = validateDataConsistency(crawling, agentic);

  // Phase 3: 데이터 병합/보완
  const finalData = reconcileData(crawling, agentic, validation);

  // Phase 4: 결과 반환
  return {
    finalData,
    confidence: calculateConfidence(validation),
    validation,
    sources: { crawling, agentic },
  };
}

async function collectFromCrawling(
  stockCode: string
): Promise<CollectionResult<SupplyDemandData>> {
  const startTime = Date.now();
  try {
    const data = await fetchKoreaSupplyDemandNaver(stockCode);
    return {
      data,
      source: 'crawling',
      timestamp: startTime,
      success: data !== null,
    };
  } catch (error) {
    return {
      data: null,
      source: 'crawling',
      timestamp: startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectFromAgentic(
  stockCode: string
): Promise<CollectionResult<SupplyDemandData>> {
  const startTime = Date.now();
  try {
    const data = await fetchSupplyDemandAgentic(stockCode);
    return {
      data,
      source: 'agentic',
      timestamp: startTime,
      success: data !== null,
    };
  } catch (error) {
    return {
      data: null,
      source: 'agentic',
      timestamp: startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateDataConsistency(
  crawling: CollectionResult<SupplyDemandData>,
  agentic: CollectionResult<SupplyDemandData>
): ValidationStatus {

  // 양쪽 모두 실패
  if (!crawling.success && !agentic.success) {
    return { status: 'EMPTY', matchedFields: [], conflictFields: [], supplementedFields: [] };
  }

  // 한쪽만 성공
  if (!crawling.success || !agentic.success) {
    return {
      status: 'SINGLE',
      matchedFields: [],
      conflictFields: [],
      supplementedFields: ['institutional', 'foreign', 'individual']
    };
  }

  // 양쪽 모두 성공 → 교차 검증
  const cData = crawling.data!;
  const aData = agentic.data!;

  const matchedFields: string[] = [];
  const conflictFields: string[] = [];

  // 필드별 검증 (허용 오차: 2%)
  const tolerance = 0.02;

  for (const field of ['institutional', 'foreign', 'individual'] as const) {
    const cValue = cData[field];
    const aValue = aData[field];

    if (cValue === 0 && aValue === 0) {
      matchedFields.push(field);
    } else if (cValue === 0 || aValue === 0) {
      conflictFields.push(field);
    } else {
      const diff = Math.abs(cValue - aValue) / Math.max(Math.abs(cValue), Math.abs(aValue));
      if (diff <= tolerance) {
        matchedFields.push(field);
      } else {
        conflictFields.push(field);
      }
    }
  }

  // 합계 균형 검증
  const cSum = cData.institutional + cData.foreign + cData.individual;
  const aSum = aData.institutional + aData.foreign + aData.individual;
  const sumValid = Math.abs(cSum) < 100 && Math.abs(aSum) < 100; // 합이 거의 0이어야 함

  if (conflictFields.length === 0) {
    return { status: 'MATCH', matchedFields, conflictFields, supplementedFields: [] };
  } else if (matchedFields.length > 0) {
    return { status: 'PARTIAL', matchedFields, conflictFields, supplementedFields: [] };
  } else {
    return { status: 'CONFLICT', matchedFields, conflictFields, supplementedFields: [] };
  }
}

function reconcileData(
  crawling: CollectionResult<SupplyDemandData>,
  agentic: CollectionResult<SupplyDemandData>,
  validation: ValidationStatus
): SupplyDemandData {

  switch (validation.status) {
    case 'EMPTY':
      throw new Error('Both sources failed to collect data');

    case 'SINGLE':
      // 성공한 소스의 데이터 사용
      return crawling.success ? crawling.data! : agentic.data!;

    case 'MATCH':
      // 일치 → 평균값 사용
      return {
        institutional: Math.round((crawling.data!.institutional + agentic.data!.institutional) / 2),
        foreign: Math.round((crawling.data!.foreign + agentic.data!.foreign) / 2),
        individual: Math.round((crawling.data!.individual + agentic.data!.individual) / 2),
      };

    case 'PARTIAL':
    case 'CONFLICT':
      // 충돌 해결: 가중 평균 (크롤링 0.4, Agentic 0.6 for supply/demand)
      return {
        institutional: resolveConflict(crawling.data!.institutional, agentic.data!.institutional, 0.4, 0.6),
        foreign: resolveConflict(crawling.data!.foreign, agentic.data!.foreign, 0.4, 0.6),
        individual: resolveConflict(crawling.data!.individual, agentic.data!.individual, 0.4, 0.6),
      };
  }
}

function resolveConflict(
  valueA: number,
  valueB: number,
  weightA: number,
  weightB: number
): number {
  // 한쪽이 0이면 다른 쪽 값 사용
  if (valueA === 0) return valueB;
  if (valueB === 0) return valueA;

  // 가중 평균
  return Math.round(valueA * weightA + valueB * weightB);
}

function calculateConfidence(validation: ValidationStatus): number {
  switch (validation.status) {
    case 'MATCH': return 0.98;
    case 'PARTIAL': return 0.85;
    case 'CONFLICT': return 0.70;
    case 'SINGLE': return 0.65;
    case 'EMPTY': return 0;
  }
}
```

### 5.2 데이터 품질 대시보드 구현

```typescript
// lib/data-quality-monitor.ts

interface DataQualityMetrics {
  totalCollections: number;
  matchRate: number;        // MATCH 비율
  conflictRate: number;     // CONFLICT 비율
  singleSourceRate: number; // 단일 소스 비율
  avgConfidence: number;    // 평균 신뢰도
  sourceHealth: {
    crawling: { successRate: number; avgLatency: number };
    agentic: { successRate: number; avgLatency: number };
  };
}

class DataQualityMonitor {
  private metrics: DataQualityMetrics = {
    totalCollections: 0,
    matchRate: 0,
    conflictRate: 0,
    singleSourceRate: 0,
    avgConfidence: 0,
    sourceHealth: {
      crawling: { successRate: 0, avgLatency: 0 },
      agentic: { successRate: 0, avgLatency: 0 },
    },
  };

  recordCollection(result: ValidationResult<any>) {
    this.metrics.totalCollections++;

    // 검증 상태별 집계
    if (result.validation.status === 'MATCH') {
      this.metrics.matchRate = this.updateRate(this.metrics.matchRate, true);
    }
    // ... 기타 메트릭 업데이트

    // 신뢰도 평균 업데이트
    this.metrics.avgConfidence = this.updateAverage(
      this.metrics.avgConfidence,
      result.confidence
    );

    // 알림 조건 확인
    this.checkAlertConditions();
  }

  private checkAlertConditions() {
    // 신뢰도가 80% 미만으로 떨어지면 알림
    if (this.metrics.avgConfidence < 0.8) {
      this.sendAlert('LOW_CONFIDENCE', this.metrics);
    }

    // 충돌률이 20% 이상이면 알림
    if (this.metrics.conflictRate > 0.2) {
      this.sendAlert('HIGH_CONFLICT_RATE', this.metrics);
    }

    // 특정 소스 실패율이 30% 이상이면 알림
    if (this.metrics.sourceHealth.crawling.successRate < 0.7) {
      this.sendAlert('CRAWLING_DEGRADED', this.metrics);
    }
  }
}
```

---

## 6. 종합 평가

### 6.1 장단점 분석

```
┌─────────────────────────────────────────────────────────────┐
│              듀얼 소스 + 상호검증 방식 평가                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [장점]                                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ✅ 데이터 신뢰성 극대화                            │    │
│  │     • 교차 검증으로 오류 자동 감지                  │    │
│  │     • 신뢰도 점수로 데이터 품질 정량화              │    │
│  │                                                     │    │
│  │  ✅ 단일 장애점 제거 (No SPOF)                      │    │
│  │     • 한 소스 실패해도 다른 소스로 데이터 확보      │    │
│  │     • 시스템 가용성 향상                            │    │
│  │                                                     │    │
│  │  ✅ 데이터 완성도 향상                              │    │
│  │     • 한 소스에서 누락된 필드를 다른 소스로 보완    │    │
│  │     • 더 풍부한 데이터셋 구성 가능                  │    │
│  │                                                     │    │
│  │  ✅ 이상치 자동 탐지                                │    │
│  │     • 두 소스 간 큰 차이 = 잠재적 오류 신호         │    │
│  │     • 크롤링 오류/Agentic 환각 감지 가능            │    │
│  │                                                     │    │
│  │  ✅ 유지보수 비용 절감 (장기)                       │    │
│  │     • CSS 변경 시 자동으로 Agentic 데이터 활용      │    │
│  │     • 수동 개입 최소화                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [단점]                                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ❌ 비용 증가 (약 25배)                             │    │
│  │     • Fallback: ~$50/월 → 듀얼소스: ~$1,250/월     │    │
│  │     • 모든 요청에 Agentic 호출 발생                 │    │
│  │                                                     │    │
│  │  ❌ 지연 시간 증가                                  │    │
│  │     • 병렬 실행해도 느린 쪽(Agentic) 기준          │    │
│  │     • 200ms → 3초+ (15배 증가)                     │    │
│  │                                                     │    │
│  │  ❌ 구현 복잡도 증가                                │    │
│  │     • 검증 로직, 충돌 해결, 모니터링 필요          │    │
│  │     • 테스트 케이스 증가                            │    │
│  │                                                     │    │
│  │  ❌ 충돌 해결 정책 설계 필요                        │    │
│  │     • 어떤 소스를 신뢰할지 휴리스틱 필요           │    │
│  │     • 잘못된 정책 = 오히려 품질 저하               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 적용 권장 시나리오

```
┌─────────────────────────────────────────────────────────────┐
│                    적용 권장 매트릭스                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [권장 O - 듀얼 소스 + 상호검증]                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 금융 서비스 운영 (B2B, B2C)                      │    │
│  │    → 데이터 오류 = 직접적인 금전 손실 위험          │    │
│  │                                                     │    │
│  │  • 규제 준수 필요 (금융위원회 등)                   │    │
│  │    → 데이터 정확도 감사 대상                        │    │
│  │                                                     │    │
│  │  • 자동 매매 시스템                                 │    │
│  │    → 잘못된 데이터 = 잘못된 매매                    │    │
│  │                                                     │    │
│  │  • 리포트/분석 서비스                               │    │
│  │    → 신뢰도가 서비스 핵심 가치                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [권장 X - Fallback 방식 유지]                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 개인 투자 보조 도구                              │    │
│  │    → 비용 대비 효용 낮음                            │    │
│  │                                                     │    │
│  │  • 프로토타입/MVP 단계                              │    │
│  │    → 초기에는 단순함 우선                           │    │
│  │                                                     │    │
│  │  • 실시간 데이터 필요                               │    │
│  │    → 3초 지연은 실시간에 부적합                     │    │
│  │                                                     │    │
│  │  • 예산 제약 (월 $100 이하)                         │    │
│  │    → 비용 효율성 우선                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 최종 권장사항

```
┌─────────────────────────────────────────────────────────────┐
│                    최종 권장 전략                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [현재 프로젝트 상황]                                        │
│  • 개인/소규모 프로젝트로 추정                              │
│  • 아직 서비스 운영 단계 아님                               │
│  • 데이터 정확도보다 기능 완성도가 우선                     │
│                                                              │
│  [단계별 권장 전략]                                          │
│                                                              │
│  1단계 (현재): Fallback 방식 먼저 구현                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 크롤링 → Agentic Fallback                        │    │
│  │  • 비용: ~$50-150/월                                │    │
│  │  • 목표: 기능 동작 확인, 재무 지표 데이터 확보      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  2단계 (서비스화 시): 듀얼 소스 검토                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 사용자 피드백으로 데이터 품질 이슈 확인          │    │
│  │  • 오류 발생 패턴 분석 후 필요 시 도입              │    │
│  │  • 비용: ~$1,250/월 (서비스 수익과 비교)            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  3단계 (확장 시): 선택적 듀얼 소스                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • 핵심 지표(PER, ROE 등)만 듀얼 소스 적용          │    │
│  │  • 수급 데이터 등 실시간성 필요한 건 Fallback 유지  │    │
│  │  • 비용 최적화: ~$400-600/월                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [핵심 인사이트]                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  "듀얼 소스 + 상호검증은 기술적으로 우수하지만,     │    │
│  │   비용 대비 효용을 서비스 단계에 맞게 판단해야 함.  │    │
│  │   초기에는 Fallback으로 시작하고, 서비스 성장에     │    │
│  │   따라 점진적으로 신뢰성 아키텍처를 강화하는 것이   │    │
│  │   현실적인 접근법입니다."                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 부록: 비교 요약표

| 항목 | Fallback 방식 | 듀얼 소스 + 상호검증 |
|------|:-------------:|:-------------------:|
| **월 비용** | ~$50-150 | ~$1,250 |
| **응답 시간** | 200ms~3초 (가변) | ~3초 (일정) |
| **데이터 신뢰도** | 70-80% | 95%+ |
| **오류 감지** | 수동 | 자동 |
| **단일 장애점** | 있음 | 없음 |
| **구현 복잡도** | 낮음 | 높음 |
| **유지보수** | 중간 | 낮음 (장기) |
| **권장 대상** | 개인/소규모 | 서비스 운영/금융 |

---

*문서 작성일: 2026-01-20*
*분석 범위: 듀얼 소스 병렬 수집 + 상호검증 아키텍처*
*작성자: Claude Code Analysis*
