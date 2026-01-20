/**
 * 듀얼 소스 데이터 검증 엔진
 *
 * 두 소스에서 수집된 데이터를 비교, 검증하고
 * 최종 신뢰성 높은 데이터를 생성합니다.
 */

import type {
  ComprehensiveStockData,
  CollectionResult,
  ValidationResult,
  ValidationStatus,
  ValidatedStockData,
  StockPriceData,
  StockValuationData,
  StockFinancialData,
  StockSupplyDemandData,
  StockMarketData,
} from './types';

// 기본 검증 설정
const DEFAULT_TOLERANCE: Record<string, number> = {
  // 가격 데이터 - 0.5% 허용 오차 (실시간 데이터 차이 고려)
  currentPrice: 0.005,
  previousClose: 0.005,
  change: 0.01,
  changePercent: 0.01,
  open: 0.005,
  high: 0.005,
  low: 0.005,
  volume: 0.05, // 거래량은 5% 허용
  tradingValue: 0.05,
  high52Week: 0.01,
  low52Week: 0.01,

  // 밸류에이션 데이터 - 1% 허용 오차
  per: 0.01,
  pbr: 0.01,
  eps: 0.01,
  bps: 0.01,
  roe: 0.02,
  dividendYield: 0.02,
  estimatedPer: 0.02,
  estimatedEps: 0.02,

  // 재무 데이터 - 2% 허용 오차 (다른 기간 기준일 수 있음)
  revenue: 0.02,
  operatingIncome: 0.02,
  netIncome: 0.02,
  operatingMargin: 0.02,
  netProfitMargin: 0.02,

  // 수급 데이터 - 5% 허용 오차
  foreignOwnership: 0.05,
  foreignNetBuy: 0.1,
  institutionalNetBuy: 0.1,
  individualNetBuy: 0.1,

  // 시장 데이터 - 1% 허용 오차
  marketCap: 0.01,
  sharesOutstanding: 0.01,
  floatShares: 0.02,
  beta: 0.05,
};

// 신뢰도 점수
const CONFIDENCE_SCORES: Record<ValidationStatus, number> = {
  MATCH: 0.98,     // 두 소스 일치
  PARTIAL: 0.85,   // 부분 일치 (일부 필드만 일치)
  CONFLICT: 0.70,  // 충돌 (허용 오차 초과)
  SINGLE: 0.65,    // 단일 소스만 성공
  EMPTY: 0.0,      // 데이터 없음
};

/**
 * 두 숫자 값을 허용 오차 내에서 비교
 */
function compareValues(
  valueA: number | null | undefined,
  valueB: number | null | undefined,
  tolerance: number
): 'match' | 'conflict' | 'single_a' | 'single_b' | 'empty' {
  const hasA = valueA !== null && valueA !== undefined && !isNaN(valueA);
  const hasB = valueB !== null && valueB !== undefined && !isNaN(valueB);

  if (!hasA && !hasB) return 'empty';
  if (hasA && !hasB) return 'single_a';
  if (!hasA && hasB) return 'single_b';

  // 둘 다 값이 있는 경우
  const a = valueA!;
  const b = valueB!;

  // 둘 다 0인 경우
  if (a === 0 && b === 0) return 'match';

  // 하나가 0인 경우 절대값 비교
  if (a === 0 || b === 0) {
    const diff = Math.abs(a - b);
    const base = Math.max(Math.abs(a), Math.abs(b));
    return diff <= base * tolerance ? 'match' : 'conflict';
  }

  // 상대 오차 계산
  const relativeDiff = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

  return relativeDiff <= tolerance ? 'match' : 'conflict';
}

/**
 * 두 숫자 중 더 신뢰할 수 있는 값 선택 (평균값)
 */
function selectNumericValue(
  valueA: number | null | undefined,
  valueB: number | null | undefined,
  useAverage: boolean = true
): number | null {
  const hasA = valueA !== null && valueA !== undefined && !isNaN(valueA);
  const hasB = valueB !== null && valueB !== undefined && !isNaN(valueB);

  if (!hasA && !hasB) return null;
  if (hasA && !hasB) return valueA!;
  if (!hasA && hasB) return valueB!;

  // 둘 다 값이 있는 경우
  if (useAverage) {
    return (valueA! + valueB!) / 2;
  }
  return valueA!; // A 우선
}

/**
 * 문자열 값 선택 (null이 아닌 값 우선)
 */
function selectStringValue(
  valueA: string | null | undefined,
  valueB: string | null | undefined
): string | null {
  if (valueA) return valueA;
  if (valueB) return valueB;
  return null;
}

interface FieldValidationResult {
  matchedFields: string[];
  conflictFields: string[];
  supplementedFields: string[];
}

/**
 * 가격 데이터 검증 및 병합
 */
function validatePriceData(
  dataA: StockPriceData | null | undefined,
  dataB: StockPriceData | null | undefined
): { merged: StockPriceData; validation: FieldValidationResult } {
  const matchedFields: string[] = [];
  const conflictFields: string[] = [];
  const supplementedFields: string[] = [];

  const fields: (keyof StockPriceData)[] = [
    'currentPrice', 'previousClose', 'change', 'changePercent',
    'open', 'high', 'low', 'volume', 'tradingValue',
    'high52Week', 'low52Week',
  ];

  const merged: StockPriceData = {
    currentPrice: 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    volume: 0,
    tradingValue: 0,
    high52Week: 0,
    low52Week: 0,
  };

  for (const field of fields) {
    const valueA = dataA?.[field];
    const valueB = dataB?.[field];
    const tolerance = DEFAULT_TOLERANCE[field] || 0.05;

    const comparison = compareValues(valueA, valueB, tolerance);

    switch (comparison) {
      case 'match':
        matchedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, true) || 0;
        break;
      case 'conflict':
        conflictFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false) || 0;
        break;
      case 'single_a':
      case 'single_b':
        supplementedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false) || 0;
        break;
      case 'empty':
        merged[field] = 0;
        break;
    }
  }

  return { merged, validation: { matchedFields, conflictFields, supplementedFields } };
}

/**
 * 밸류에이션 데이터 검증 및 병합
 */
function validateValuationData(
  dataA: StockValuationData | null | undefined,
  dataB: StockValuationData | null | undefined
): { merged: StockValuationData; validation: FieldValidationResult } {
  const matchedFields: string[] = [];
  const conflictFields: string[] = [];
  const supplementedFields: string[] = [];

  const fields: (keyof StockValuationData)[] = [
    'per', 'pbr', 'eps', 'bps', 'roe',
    'dividendYield', 'estimatedPer', 'estimatedEps',
  ];

  const merged: StockValuationData = {
    per: null,
    pbr: null,
    eps: null,
    bps: null,
    roe: null,
    dividendYield: null,
    estimatedPer: null,
    estimatedEps: null,
  };

  for (const field of fields) {
    const valueA = dataA?.[field];
    const valueB = dataB?.[field];
    const tolerance = DEFAULT_TOLERANCE[field] || 0.05;

    const comparison = compareValues(valueA, valueB, tolerance);

    switch (comparison) {
      case 'match':
        matchedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, true);
        break;
      case 'conflict':
        conflictFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'single_a':
      case 'single_b':
        supplementedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'empty':
        merged[field] = null;
        break;
    }
  }

  return { merged, validation: { matchedFields, conflictFields, supplementedFields } };
}

/**
 * 재무 데이터 검증 및 병합
 */
function validateFinancialData(
  dataA: StockFinancialData | null | undefined,
  dataB: StockFinancialData | null | undefined
): { merged: StockFinancialData; validation: FieldValidationResult } {
  const matchedFields: string[] = [];
  const conflictFields: string[] = [];
  const supplementedFields: string[] = [];

  const numericFields: (keyof StockFinancialData)[] = [
    'revenue', 'operatingIncome', 'netIncome',
    'operatingMargin', 'netProfitMargin',
  ];

  const merged: StockFinancialData = {
    revenue: null,
    operatingIncome: null,
    netIncome: null,
    operatingMargin: null,
    netProfitMargin: null,
    fiscalDate: null,
  };

  for (const field of numericFields) {
    const valueA = dataA?.[field] as number | null | undefined;
    const valueB = dataB?.[field] as number | null | undefined;
    const tolerance = DEFAULT_TOLERANCE[field] || 0.05;

    const comparison = compareValues(valueA, valueB, tolerance);

    switch (comparison) {
      case 'match':
        matchedFields.push(field);
        (merged[field] as number | null) = selectNumericValue(valueA, valueB, true);
        break;
      case 'conflict':
        conflictFields.push(field);
        (merged[field] as number | null) = selectNumericValue(valueA, valueB, false);
        break;
      case 'single_a':
      case 'single_b':
        supplementedFields.push(field);
        (merged[field] as number | null) = selectNumericValue(valueA, valueB, false);
        break;
      case 'empty':
        (merged[field] as number | null) = null;
        break;
    }
  }

  // fiscalDate 문자열 필드
  merged.fiscalDate = selectStringValue(dataA?.fiscalDate, dataB?.fiscalDate);
  if (dataA?.fiscalDate || dataB?.fiscalDate) {
    supplementedFields.push('fiscalDate');
  }

  return { merged, validation: { matchedFields, conflictFields, supplementedFields } };
}

/**
 * 수급 데이터 검증 및 병합
 */
function validateSupplyDemandData(
  dataA: StockSupplyDemandData | null | undefined,
  dataB: StockSupplyDemandData | null | undefined
): { merged: StockSupplyDemandData; validation: FieldValidationResult } {
  const matchedFields: string[] = [];
  const conflictFields: string[] = [];
  const supplementedFields: string[] = [];

  const fields: (keyof StockSupplyDemandData)[] = [
    'foreignOwnership', 'foreignNetBuy',
    'institutionalNetBuy', 'individualNetBuy',
  ];

  const merged: StockSupplyDemandData = {
    foreignOwnership: null,
    foreignNetBuy: null,
    institutionalNetBuy: null,
    individualNetBuy: null,
  };

  for (const field of fields) {
    const valueA = dataA?.[field];
    const valueB = dataB?.[field];
    const tolerance = DEFAULT_TOLERANCE[field] || 0.1;

    const comparison = compareValues(valueA, valueB, tolerance);

    switch (comparison) {
      case 'match':
        matchedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, true);
        break;
      case 'conflict':
        conflictFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'single_a':
      case 'single_b':
        supplementedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'empty':
        merged[field] = null;
        break;
    }
  }

  return { merged, validation: { matchedFields, conflictFields, supplementedFields } };
}

/**
 * 시장 데이터 검증 및 병합
 */
function validateMarketData(
  dataA: StockMarketData | null | undefined,
  dataB: StockMarketData | null | undefined
): { merged: StockMarketData; validation: FieldValidationResult } {
  const matchedFields: string[] = [];
  const conflictFields: string[] = [];
  const supplementedFields: string[] = [];

  const fields: (keyof StockMarketData)[] = [
    'marketCap', 'sharesOutstanding', 'floatShares', 'beta',
  ];

  const merged: StockMarketData = {
    marketCap: null,
    sharesOutstanding: null,
    floatShares: null,
    beta: null,
  };

  for (const field of fields) {
    const valueA = dataA?.[field];
    const valueB = dataB?.[field];
    const tolerance = DEFAULT_TOLERANCE[field] || 0.05;

    const comparison = compareValues(valueA, valueB, tolerance);

    switch (comparison) {
      case 'match':
        matchedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, true);
        break;
      case 'conflict':
        conflictFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'single_a':
      case 'single_b':
        supplementedFields.push(field);
        merged[field] = selectNumericValue(valueA, valueB, false);
        break;
      case 'empty':
        merged[field] = null;
        break;
    }
  }

  return { merged, validation: { matchedFields, conflictFields, supplementedFields } };
}

/**
 * 검증 상태 결정
 */
function determineValidationStatus(
  matchedCount: number,
  conflictCount: number,
  supplementedCount: number
): ValidationStatus {
  const relevantFields = matchedCount + conflictCount + supplementedCount;

  if (relevantFields === 0) {
    return 'EMPTY';
  }

  // 충돌이 전혀 없고 대부분 일치
  if (conflictCount === 0 && matchedCount >= relevantFields * 0.5) {
    return 'MATCH';
  }

  // 충돌이 있지만 일부는 일치
  if (matchedCount > 0) {
    return 'PARTIAL';
  }

  // 충돌만 있는 경우
  if (conflictCount > 0) {
    return 'CONFLICT';
  }

  // 보완된 필드만 있는 경우 (단일 소스)
  return 'SINGLE';
}

/**
 * 듀얼 소스 데이터 검증 및 병합
 */
export function validateAndMerge(
  resultA: CollectionResult<ComprehensiveStockData>,
  resultB: CollectionResult<ComprehensiveStockData>
): ValidatedStockData {
  const dataA = resultA.data;
  const dataB = resultB.data;

  // 기본 정보 처리
  const basicInfo = dataA?.basicInfo || dataB?.basicInfo;
  if (!basicInfo) {
    throw new Error('기본 정보가 없습니다');
  }

  // 각 데이터 카테고리 검증
  const priceResult = validatePriceData(dataA?.priceData, dataB?.priceData);
  const valuationResult = validateValuationData(dataA?.valuationData, dataB?.valuationData);
  const financialResult = validateFinancialData(dataA?.financialData, dataB?.financialData);
  const supplyDemandResult = validateSupplyDemandData(dataA?.supplyDemandData, dataB?.supplyDemandData);
  const marketResult = validateMarketData(dataA?.marketData, dataB?.marketData);

  // 전체 검증 결과 집계
  const allMatchedFields = [
    ...priceResult.validation.matchedFields.map(f => `priceData.${f}`),
    ...valuationResult.validation.matchedFields.map(f => `valuationData.${f}`),
    ...financialResult.validation.matchedFields.map(f => `financialData.${f}`),
    ...supplyDemandResult.validation.matchedFields.map(f => `supplyDemandData.${f}`),
    ...marketResult.validation.matchedFields.map(f => `marketData.${f}`),
  ];

  const allConflictFields = [
    ...priceResult.validation.conflictFields.map(f => `priceData.${f}`),
    ...valuationResult.validation.conflictFields.map(f => `valuationData.${f}`),
    ...financialResult.validation.conflictFields.map(f => `financialData.${f}`),
    ...supplyDemandResult.validation.conflictFields.map(f => `supplyDemandData.${f}`),
    ...marketResult.validation.conflictFields.map(f => `marketData.${f}`),
  ];

  const allSupplementedFields = [
    ...priceResult.validation.supplementedFields.map(f => `priceData.${f}`),
    ...valuationResult.validation.supplementedFields.map(f => `valuationData.${f}`),
    ...financialResult.validation.supplementedFields.map(f => `financialData.${f}`),
    ...supplyDemandResult.validation.supplementedFields.map(f => `supplyDemandData.${f}`),
    ...marketResult.validation.supplementedFields.map(f => `marketData.${f}`),
  ];

  // 검증 상태 결정
  const status = determineValidationStatus(
    allMatchedFields.length,
    allConflictFields.length,
    allSupplementedFields.length
  );

  // 신뢰도 계산
  const baseConfidence = CONFIDENCE_SCORES[status];
  const matchRatio = allMatchedFields.length / Math.max(1, allMatchedFields.length + allConflictFields.length);
  const adjustedConfidence = baseConfidence * (0.7 + 0.3 * matchRatio);

  // 검증 결과
  const validation: ValidationResult = {
    status,
    matchedFields: allMatchedFields,
    conflictFields: allConflictFields,
    supplementedFields: allSupplementedFields,
    confidence: Math.round(adjustedConfidence * 100) / 100,
  };

  // 사용된 소스 목록
  const sources: ('crawling' | 'agentic' | 'api')[] = [];
  if (resultA.success && resultA.data) {
    sources.push(resultA.data.source);
  }
  if (resultB.success && resultB.data) {
    sources.push(resultB.data.source);
  }

  // 최종 병합 데이터
  const mergedData: ComprehensiveStockData = {
    basicInfo,
    priceData: priceResult.merged,
    valuationData: valuationResult.merged,
    financialData: financialResult.merged,
    supplyDemandData: supplyDemandResult.merged,
    marketData: marketResult.merged,
    timestamp: Date.now(),
    source: sources[0] || 'crawling',
  };

  return {
    data: mergedData,
    confidence: validation.confidence,
    sources,
    validation,
    collectedAt: Date.now(),
  };
}

/**
 * 검증 결과 요약 로그 출력
 */
export function logValidationSummary(result: ValidatedStockData): void {
  const { data, confidence, validation } = result;

  console.log('\n======== 듀얼 소스 검증 결과 ========');
  console.log(`종목: ${data.basicInfo.name} (${data.basicInfo.symbol})`);
  console.log(`신뢰도: ${(confidence * 100).toFixed(1)}%`);
  console.log(`상태: ${validation.status}`);
  console.log(`일치 필드: ${validation.matchedFields.length}개`);
  console.log(`충돌 필드: ${validation.conflictFields.length}개`);
  console.log(`보완 필드: ${validation.supplementedFields.length}개`);

  if (validation.conflictFields.length > 0) {
    console.log('\n⚠️ 충돌 필드:');
    validation.conflictFields.forEach((field) => {
      console.log(`  - ${field}`);
    });
  }

  console.log('\n주요 데이터:');
  console.log(`  현재가: ${data.priceData.currentPrice.toLocaleString()}`);
  console.log(`  등락률: ${data.priceData.changePercent.toFixed(2)}%`);
  console.log(`  PER: ${data.valuationData.per || 'N/A'}`);
  console.log(`  PBR: ${data.valuationData.pbr || 'N/A'}`);
  console.log(`  시가총액: ${data.marketData.marketCap?.toLocaleString() || 'N/A'}`);
  console.log('======================================\n');
}
