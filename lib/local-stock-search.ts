/**
 * 로컬 종목 검색 (정적 symbols.json 활용)
 * 
 * 안정성과 성능을 위해 정적 JSON 파일을 사용한 로컬 검색을 제공합니다.
 * 실시간 API 호출 없이 클라이언트에서 즉시 검색이 가능합니다.
 */

import Fuse from 'fuse.js';
import type { StockSuggestion } from './stock-search';

interface SymbolData {
  code: string;
  name: string;
  market: string;
  country: 'KR' | 'US';
  type?: string;
}

interface SymbolsJSON {
  version: string;
  generated_at: string;
  korea: {
    count: number;
    stocks: SymbolData[];
  };
  us: {
    count: number;
    stocks: SymbolData[];
  };
  total: number;
}

// symbols.json 캐시
let cachedSymbols: SymbolsJSON | null = null;
let fuseKorea: Fuse<SymbolData> | null = null;
let fuseUS: Fuse<SymbolData> | null = null;
let loadPromise: Promise<SymbolsJSON> | null = null;

/**
 * symbols.json 파일 로드 (캐싱)
 */
async function loadSymbols(): Promise<SymbolsJSON> {
  // 이미 로드된 경우 캐시 반환
  if (cachedSymbols) {
    return cachedSymbols;
  }

  // 로딩 중인 경우 기존 Promise 반환
  if (loadPromise) {
    return loadPromise;
  }

  // 새로 로드
  loadPromise = (async () => {
    try {
      const response = await fetch('/data/symbols.json', {
        cache: 'force-cache', // 브라우저 캐시 활용
      });

      if (!response.ok) {
        throw new Error(`Failed to load symbols.json: ${response.status}`);
      }

      const data: SymbolsJSON = await response.json();
      cachedSymbols = data;

      // Fuse.js 인덱스 생성
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 0.8 }, // 종목명 우선
          { name: 'code', weight: 0.2 },  // 종목코드 보조
        ],
        threshold: 0.4, // 유사도 임계값 (낮을수록 정확한 매칭)
        includeScore: true,
        minMatchCharLength: 1,
      };

      fuseKorea = new Fuse(data.korea.stocks, fuseOptions);
      fuseUS = new Fuse(data.us.stocks, fuseOptions);

      return data;
    } catch (error) {
      console.error('[Local Stock Search] Failed to load symbols.json:', error);
      loadPromise = null; // 실패 시 재시도 가능하도록
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * 로컬 종목 검색 (한국 주식)
 */
export async function searchKoreaStocksLocal(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const symbols = await loadSymbols();
    
    if (!fuseKorea) {
      return [];
    }

    const trimmedQuery = query.trim();
    
    // 정확한 매칭 우선 (종목코드)
    if (/^\d{6}$/.test(trimmedQuery)) {
      const exactMatch = symbols.korea.stocks.find(s => s.code === trimmedQuery);
      if (exactMatch) {
        return [{
          symbol: `${exactMatch.code}.KS`,
          name: exactMatch.name,
          exchange: 'KRX',
        }];
      }
    }

    // Fuse.js로 퍼지 검색
    const results = fuseKorea.search(trimmedQuery, {
      limit: 10,
    });

    return results.map(result => ({
      symbol: `${result.item.code}.KS`,
      name: result.item.name,
      exchange: result.item.market === 'ETF' ? 'ETF' : 'KRX',
      score: result.score, // 유사도 점수 (낮을수록 정확)
    })).sort((a, b) => {
      // 정확한 매칭 우선
      const aExact = a.name.replace(/\s+/g, '') === trimmedQuery.replace(/\s+/g, '');
      const bExact = b.name.replace(/\s+/g, '') === trimmedQuery.replace(/\s+/g, '');
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // 검색어로 시작하는 종목 우선
      const aStartsWith = a.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
      const bStartsWith = b.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // 유사도 점수로 정렬
      const aScore = (a as any).score || 1;
      const bScore = (b as any).score || 1;
      return aScore - bScore;
    });
  } catch (error) {
    console.warn('[Local Stock Search] Korea search failed:', error);
    return [];
  }
}

/**
 * 로컬 종목 검색 (미국 주식)
 */
export async function searchUSStocksLocal(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const symbols = await loadSymbols();
    
    if (!fuseUS) {
      return [];
    }

    const trimmedQuery = query.trim().toUpperCase();
    
    // 정확한 매칭 우선 (티커)
    const exactMatch = symbols.us.stocks.find(s => 
      s.code.toUpperCase() === trimmedQuery || 
      s.name.toLowerCase() === query.toLowerCase()
    );
    if (exactMatch) {
      return [{
        symbol: exactMatch.code,
        name: exactMatch.name,
        exchange: 'US',
        type: exactMatch.type,
      }];
    }

    // Fuse.js로 퍼지 검색
    const results = fuseUS.search(query, {
      limit: 10,
    });

    return results.map(result => ({
      symbol: result.item.code,
      name: result.item.name,
      exchange: 'US',
      type: result.item.type,
      score: result.score,
    })).sort((a, b) => {
      // 정확한 매칭 우선
      const aExact = a.name.toLowerCase() === query.toLowerCase() || 
                     a.symbol.toUpperCase() === trimmedQuery;
      const bExact = b.name.toLowerCase() === query.toLowerCase() || 
                     b.symbol.toUpperCase() === trimmedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // 검색어로 시작하는 종목 우선
      const aStartsWith = a.name.toLowerCase().startsWith(query.toLowerCase()) ||
                          a.symbol.toUpperCase().startsWith(trimmedQuery);
      const bStartsWith = b.name.toLowerCase().startsWith(query.toLowerCase()) ||
                          b.symbol.toUpperCase().startsWith(trimmedQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // 유사도 점수로 정렬
      const aScore = (a as any).score || 1;
      const bScore = (b as any).score || 1;
      return aScore - bScore;
    });
  } catch (error) {
    console.warn('[Local Stock Search] US search failed:', error);
    return [];
  }
}

/**
 * 로컬 종목 검색 (통합 - 한국 + 미국)
 */
export async function searchStocksLocal(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const trimmedQuery = query.trim();
  const isKorean = /[가-힣]/.test(trimmedQuery);
  const isKoreaTicker = /^\d{6}$/.test(trimmedQuery) || /\.(KS|KQ)$/i.test(trimmedQuery);
  const isUSTicker = /^[A-Z]{1,5}$/.test(trimmedQuery.toUpperCase());

  const results: StockSuggestion[] = [];

  // 한국 주식 검색 (한글 입력 또는 한국 티커인 경우)
  if (isKorean || isKoreaTicker) {
    const koreaResults = await searchKoreaStocksLocal(trimmedQuery);
    results.push(...koreaResults);
  }

  // 미국 주식 검색 (항상 시도 - 한글 검색어도 미국 주식 검색)
  if (!isKoreaTicker) {
    const usResults = await searchUSStocksLocal(trimmedQuery);
    results.push(...usResults);
  }

  // 중복 제거 (심볼 기준)
  const seenSymbols = new Set<string>();
  const uniqueResults: StockSuggestion[] = [];

  for (const item of results) {
    const symbolKey = item.symbol.split('.')[0].toUpperCase();
    if (!seenSymbols.has(symbolKey)) {
      seenSymbols.add(symbolKey);
      uniqueResults.push(item);
    }
  }

  // 정렬 (한국어 입력인 경우 한국 주식 우선)
  uniqueResults.sort((a, b) => {
    const aIsKorea = a.symbol.includes('.KS') || a.symbol.includes('.KQ');
    const bIsKorea = b.symbol.includes('.KS') || b.symbol.includes('.KQ');
    
    if (isKorean || isKoreaTicker) {
      if (aIsKorea && !bIsKorea) return -1;
      if (!aIsKorea && bIsKorea) return 1;
    }
    
    // 정확한 매칭 우선
    const aExact = a.name.replace(/\s+/g, '').toLowerCase() === trimmedQuery.replace(/\s+/g, '').toLowerCase();
    const bExact = b.name.replace(/\s+/g, '').toLowerCase() === trimmedQuery.replace(/\s+/g, '').toLowerCase();
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // 검색어로 시작하는 종목 우선
    const aStartsWith = a.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
    const bStartsWith = b.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    return 0;
  });

  return uniqueResults.slice(0, 10); // 최대 10개
}

/**
 * 종목명으로 종목코드 찾기 (로컬 검색 우선)
 */
export async function findTickerByName(name: string): Promise<string | null> {
  if (!name || name.trim().length < 1) {
    return null;
  }

  try {
    const results = await searchStocksLocal(name);
    
    if (results.length > 0) {
      // 첫 번째 결과의 심볼 반환
      const symbol = results[0].symbol;
      
      // 한국 주식인 경우 .KS 제거하여 종목코드만 반환
      if (symbol.includes('.KS') || symbol.includes('.KQ')) {
        return symbol.replace(/\.(KS|KQ)$/, '');
      }
      
      // 미국 주식인 경우 그대로 반환
      return symbol;
    }
    
    return null;
  } catch (error) {
    console.warn('[Local Stock Search] Failed to find ticker:', error);
    return null;
  }
}
