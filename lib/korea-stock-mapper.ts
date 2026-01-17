/**
 * 한국 주식 이름을 티커로 변환하는 유틸리티
 * 
 * 하이브리드 방식 지원:
 * 1. 정적 매핑 (하드코딩된 주요 종목)
 * 2. 동적 매핑 (Python 스크립트를 통한 전체 종목 검색)
 */

// 주요 한국 주식 이름-티커 매핑
// 한글 이름과 영문 이름 모두 지원 (예: "네이버"와 "NAVER" 모두 "035420"으로 매핑)
export const KOREA_STOCK_MAP: Record<string, string> = {
  '삼성전자': '005930',
  'SK하이닉스': '000660',
  'NAVER': '035420',
  '네이버': '035420', // NAVER의 한글 이름
  '카카오': '035720',
  'LG전자': '066570',
  '현대차': '005380',
  '기아': '000270',
  'POSCO': '005490',
  '셀트리온': '068270',
  'LG화학': '051910',
  '아모레퍼시픽': '090430',
  'KB금융': '105560',
  '신한지주': '055550',
  '하나금융지주': '086790',
  '삼성SDI': '006400',
  'LG생활건강': '051900',
  '한화솔루션': '009830',
  '롯데케미칼': '011170',
  'CJ제일제당': '097950',
  '한진': '002320',
  '일동제약': '249420', // 일동제약 (코스닥)
  '한농화성': '011500', // 한농화성 추가
  // 주요 ETF (정확한 종목명만 유지, 부분 검색은 동적 검색에서 처리)
  'KODEX 미국나스닥100': '379810',
};

/**
 * 한국 주식 이름을 티커로 변환
 * @param name 주식 이름 (예: "삼성전자")
 * @returns 티커 심볼 (예: "005930" 또는 "005930.KS")
 */
export function convertKoreaStockNameToTicker(name: string): string | null {
  // 이미 티커 형식인 경우 (6자리 숫자 또는 .KS 포함)
  if (/^\d{6}$/.test(name) || name.includes('.KS')) {
    return name.includes('.KS') ? name : `${name}.KS`;
  }

  // 이름으로 매핑 찾기
  const ticker = KOREA_STOCK_MAP[name];
  if (ticker) {
    return `${ticker}.KS`;
  }

  return null;
}

/**
 * 주식 심볼을 정규화 (한국 주식 이름을 티커로 변환)
 * @param symbol 주식 심볼 또는 이름
 * @returns 정규화된 티커 심볼
 */
export function normalizeStockSymbol(symbol: string): string {
  // 한국 주식 이름인지 확인하고 변환
  const converted = convertKoreaStockNameToTicker(symbol);
  if (converted) {
    return converted;
  }

  // 변환 실패 시 원본 반환 (미국 주식 등)
  return symbol;
}

/**
 * 주식 심볼을 정규화 (하이브리드 방식: 정적 매핑 + 동적 검색)
 * 
 * @param symbol 주식 심볼 또는 이름
 * @param useDynamicMapping 동적 매핑 사용 여부 (기본값: true)
 * @returns 정규화된 티커 심볼
 */
export async function normalizeStockSymbolHybrid(
  symbol: string,
  useDynamicMapping: boolean = true
): Promise<string> {
  // 1. 이미 티커 형식인 경우
  if (/^\d{6}$/.test(symbol) || symbol.includes('.KS') || symbol.includes('.KQ')) {
    // 티커 코드만 있는 경우 (.KS 또는 .KQ 추가)
    if (/^\d{6}$/.test(symbol)) {
      // 코스피/코스닥 구분 없이 .KS로 반환 (실제 데이터 조회 시 자동으로 올바른 시장으로 매핑됨)
      return `${symbol}.KS`;
    }
    return symbol;
  }

  // 2. 정적 매핑 확인 (빠른 조회)
  const staticConverted = convertKoreaStockNameToTicker(symbol);
  if (staticConverted) {
    return staticConverted;
  }

  // 3. 동적 매핑 시도 (한글 이름인 경우만)
  if (useDynamicMapping && /[가-힣]/.test(symbol)) {
    try {
      const { normalizeStockSymbolDynamic } = await import('./korea-stock-mapper-dynamic');
      const dynamicConverted = await normalizeStockSymbolDynamic(symbol);
      // 동적 매핑이 원본과 다르면 성공
      if (dynamicConverted !== symbol) {
        return dynamicConverted;
      }
    } catch (error) {
      // 동적 매핑 실패는 무시하고 원본 반환
      console.warn(`[Stock Mapper] Dynamic mapping failed for ${symbol}, using original:`, error);
    }
  }

  // 4. Fallback: 원본 반환
  return symbol;
}
