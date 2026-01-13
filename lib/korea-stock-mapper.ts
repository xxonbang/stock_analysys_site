/**
 * 한국 주식 이름을 티커로 변환하는 유틸리티
 */

// 주요 한국 주식 이름-티커 매핑
const KOREA_STOCK_MAP: Record<string, string> = {
  '삼성전자': '005930',
  'SK하이닉스': '000660',
  'NAVER': '035420',
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
