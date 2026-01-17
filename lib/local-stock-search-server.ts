/**
 * 서버 사이드 로컬 종목 검색 (정적 symbols.json 활용)
 * 
 * 서버 사이드에서 symbols.json을 직접 읽어서 검색합니다.
 * 클라이언트 사이드와 동일한 로직을 사용하되, 파일 시스템을 통해 접근합니다.
 */

import 'server-only';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Fuse from 'fuse.js';

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
 * symbols.json 파일 로드 (서버 사이드, 파일 시스템 사용)
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
      const symbolsPath = join(process.cwd(), 'public', 'data', 'symbols.json');
      const fileContent = await readFile(symbolsPath, 'utf-8');
      const data: SymbolsJSON = JSON.parse(fileContent);
      
      cachedSymbols = data;

      // Fuse.js 인덱스 생성
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 0.8 }, // 종목명 우선
          { name: 'code', weight: 0.2 },  // 종목코드 보조
        ],
        threshold: 0.4, // 유사도 임계값
        includeScore: true,
        minMatchCharLength: 1,
      };

      fuseKorea = new Fuse(data.korea.stocks, fuseOptions);
      fuseUS = new Fuse(data.us.stocks, fuseOptions);

      return data;
    } catch (error) {
      console.error('[Local Stock Search Server] Failed to load symbols.json:', error);
      loadPromise = null; // 실패 시 재시도 가능하도록
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * 서버 사이드 로컬 종목 검색 (한국 주식)
 */
export async function searchKoreaStocksLocalServer(query: string): Promise<{ code: string; name: string } | null> {
  if (!query || query.trim().length < 1) {
    return null;
  }

  try {
    const symbols = await loadSymbols();
    
    if (!fuseKorea) {
      return null;
    }

    const trimmedQuery = query.trim();
    
    // 정확한 매칭 우선 (종목코드)
    if (/^\d{6}$/.test(trimmedQuery)) {
      const exactMatch = symbols.korea.stocks.find(s => s.code === trimmedQuery);
      if (exactMatch) {
        return {
          code: exactMatch.code,
          name: exactMatch.name,
        };
      }
    }

    // Fuse.js로 퍼지 검색
    const results = fuseKorea.search(trimmedQuery, {
      limit: 5,
    });

    if (results.length > 0) {
      // 가장 정확한 매칭 반환
      const bestMatch = results[0].item;
      return {
        code: bestMatch.code,
        name: bestMatch.name,
      };
    }
    
    return null;
  } catch (error) {
    console.warn('[Local Stock Search Server] Korea search failed:', error);
    return null;
  }
}

/**
 * 서버 사이드 로컬 종목 검색 (미국 주식)
 */
export async function searchUSStocksLocalServer(query: string): Promise<{ code: string; name: string } | null> {
  if (!query || query.trim().length < 1) {
    return null;
  }

  try {
    const symbols = await loadSymbols();
    
    if (!fuseUS) {
      return null;
    }

    const trimmedQuery = query.trim().toUpperCase();
    
    // 정확한 매칭 우선 (티커)
    const exactMatch = symbols.us.stocks.find(s => 
      s.code.toUpperCase() === trimmedQuery || 
      s.name.toLowerCase() === query.toLowerCase()
    );
    if (exactMatch) {
      return {
        code: exactMatch.code,
        name: exactMatch.name,
      };
    }

    // Fuse.js로 퍼지 검색
    const results = fuseUS.search(query, {
      limit: 5,
    });

    if (results.length > 0) {
      const bestMatch = results[0].item;
      return {
        code: bestMatch.code,
        name: bestMatch.name,
      };
    }
    
    return null;
  } catch (error) {
    console.warn('[Local Stock Search Server] US search failed:', error);
    return null;
  }
}

/**
 * 종목명으로 종목코드 찾기 (서버 사이드)
 */
export async function findTickerByNameServer(name: string): Promise<string | null> {
  if (!name || name.trim().length < 1) {
    return null;
  }

  const trimmedName = name.trim();
  const isKorean = /[가-힣]/.test(trimmedName);
  const isKoreaTicker = /^\d{6}$/.test(trimmedName);

  try {
    // 한국 주식 검색
    if (isKorean || isKoreaTicker) {
      const result = await searchKoreaStocksLocalServer(trimmedName);
      if (result) {
        return result.code;
      }
    }

    // 미국 주식 검색
    if (!isKoreaTicker) {
      const result = await searchUSStocksLocalServer(trimmedName);
      if (result) {
        return result.code;
      }
    }

    return null;
  } catch (error) {
    console.warn('[Local Stock Search Server] Failed to find ticker:', error);
    return null;
  }
}
