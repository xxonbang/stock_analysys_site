/**
 * 동적 한국 주식 이름 → 티커 변환 유틸리티
 * 
 * 하드코딩된 매핑 대신 FinanceDataReader StockListing을 활용하여
 * 동적으로 티커를 검색합니다.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { findPythonCommand } from './python-utils';

// 캐시 파일 경로
const CACHE_DIR = join(process.cwd(), '.cache');
const STOCK_LISTING_CACHE_FILE = join(CACHE_DIR, 'krx-stock-listing.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

interface StockListingItem {
  Symbol: string;
  Name: string;
  Market: string;
}

interface CachedStockListing {
  data: StockListingItem[];
  timestamp: number;
}

// Python 명령어 캐시
let cachedPythonCommand: string | null = null;

async function getPythonCommand(): Promise<string> {
  if (cachedPythonCommand) {
    return cachedPythonCommand;
  }
  
  try {
    const { command } = await findPythonCommand();
    cachedPythonCommand = command;
    return command;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Python command not found: ${errorMessage}`);
  }
}

/**
 * Python 스크립트를 통해 KRX 전체 종목 리스트 가져오기
 * 종합적인 데이터 소스를 활용하여 최대한 완전한 리스트 확보
 */
async function fetchStockListingFromPython(): Promise<StockListingItem[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const pythonCommand = await getPythonCommand();
      // 종합적인 데이터 소스를 활용하는 스크립트 사용
      const scriptPath = join(process.cwd(), 'scripts', 'get_comprehensive_stock_listing.py');
      const pythonProcess = spawn(pythonCommand, [scriptPath]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput.substring(0, 500)}`));
        return;
      }

      try {
        // JSON 출력 찾기 (stderr 메시지 제외)
        const jsonStart = output.indexOf('{');
        const jsonEnd = output.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
          reject(new Error(`No JSON found in output. Output: ${output.substring(0, 500)}`));
          return;
        }

        const jsonText = output.substring(jsonStart, jsonEnd);
        const result = JSON.parse(jsonText);
        
        if (result.success === false) {
          reject(new Error(result.error || 'Unknown error from Python script'));
          return;
        }
        
        if (result.data && Array.isArray(result.data)) {
          resolve(result.data);
        } else if (result.error) {
          reject(new Error(result.error));
        } else {
          reject(new Error('Invalid response format'));
        }
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${e instanceof Error ? e.message : String(e)}. Output: ${output.substring(0, 500)}`));
      }
    });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 캐시된 StockListing 데이터 읽기
 */
async function readCachedStockListing(): Promise<StockListingItem[] | null> {
  try {
    if (!existsSync(STOCK_LISTING_CACHE_FILE)) {
      return null;
    }

    const content = await readFile(STOCK_LISTING_CACHE_FILE, 'utf-8');
    const cached: CachedStockListing = JSON.parse(content);

    // 캐시 만료 확인
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      return null; // 캐시 만료
    }

    return cached.data;
  } catch (error) {
    console.warn('Failed to read cached stock listing:', error);
    return null;
  }
}

/**
 * StockListing 데이터를 캐시에 저장
 */
async function saveCachedStockListing(data: StockListingItem[]): Promise<void> {
  try {
    // 캐시 디렉토리 생성
    if (!existsSync(CACHE_DIR)) {
      await mkdir(CACHE_DIR, { recursive: true });
    }

    const cached: CachedStockListing = {
      data,
      timestamp: Date.now(),
    };

    await writeFile(STOCK_LISTING_CACHE_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to save cached stock listing:', error);
  }
}

/**
 * StockListing 데이터 가져오기 (캐시 우선)
 */
export async function getStockListing(): Promise<StockListingItem[]> {
  // 1. 캐시 확인
  try {
    const cached = await readCachedStockListing();
    if (cached && cached.length > 0) {
      console.log(`[Dynamic Mapping] Using cached stock listing (${cached.length} stocks)`);
      return cached;
    }
  } catch (error) {
    console.warn('[Dynamic Mapping] Failed to read cache, fetching fresh data:', error);
  }

  // 2. Python 스크립트로 가져오기
  console.log('[Dynamic Mapping] Fetching stock listing from Python...');
  try {
    const data = await fetchStockListingFromPython();
    if (!data || data.length === 0) {
      throw new Error('Stock listing returned empty data');
    }
    // 캐시에 저장 (실패해도 계속 진행)
    try {
      await saveCachedStockListing(data);
      console.log(`[Dynamic Mapping] Fetched and cached ${data.length} stocks`);
    } catch (cacheError) {
      console.warn('[Dynamic Mapping] Failed to save cache, but data is available:', cacheError);
    }
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Dynamic Mapping] Failed to fetch stock listing:', errorMessage);
    // Python 스크립트 실패 시 빈 배열 반환 (검색 실패로 처리)
    // 상위 함수에서 null을 반환하고, normalizeStockSymbolDynamic에서 원본 반환
    throw error; // 상위에서 처리하도록 재throw
  }
}

/**
 * 한국 주식 이름으로 티커 검색 (동적)
 */
export async function searchTickerByName(name: string): Promise<string | null> {
  try {
    const stockList = await getStockListing();
    
    if (!stockList || stockList.length === 0) {
      console.warn('[Dynamic Mapping] Stock listing is empty');
      return null;
    }
    
    // 정확한 이름 매칭 시도 (공백 무시)
    const normalizedName = name.replace(/\s+/g, '');
    const exactMatch = stockList.find(
      (stock) => {
        if (!stock.Name || !stock.Symbol) return false;
        const normalizedStockName = stock.Name.replace(/\s+/g, '');
        return stock.Name === name || normalizedStockName === normalizedName;
      }
    );
    
    if (exactMatch && exactMatch.Symbol) {
      console.log(`[Dynamic Mapping] Found exact match: ${name} -> ${exactMatch.Symbol}`);
      return exactMatch.Symbol;
    }

    // 부분 매칭 시도 (포함 관계)
    const partialMatch = stockList.find(
      (stock) => {
        if (!stock.Name || !stock.Symbol) return false;
        return stock.Name.includes(name) || name.includes(stock.Name);
      }
    );
    
    if (partialMatch && partialMatch.Symbol) {
      console.log(`[Dynamic Mapping] Found partial match: ${name} -> ${partialMatch.Symbol} (${partialMatch.Name})`);
      return partialMatch.Symbol;
    }

    console.log(`[Dynamic Mapping] No match found for: ${name}`);
    return null;
  } catch (error) {
    // getStockListing 실패 시 null 반환 (상위에서 원본 반환)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[Dynamic Mapping] Failed to search ticker for ${name} (will use original symbol):`, errorMessage);
    return null;
  }
}

/**
 * 주식 심볼을 정규화 (하드코딩 매핑 + 동적 검색)
 */
export async function normalizeStockSymbolDynamic(symbol: string): Promise<string> {
  try {
    // 1. 이미 티커 형식인 경우
    if (/^\d{6}$/.test(symbol) || symbol.includes('.KS')) {
      return symbol.includes('.KS') ? symbol : `${symbol}.KS`;
    }

    // 2. 하드코딩된 매핑 확인 (빠른 조회)
    try {
      const { convertKoreaStockNameToTicker } = await import('./korea-stock-mapper');
      const cached = convertKoreaStockNameToTicker(symbol);
      if (cached) {
        return cached;
      }
    } catch (importError) {
      console.warn('[Dynamic Mapping] Failed to import static mapper, continuing with dynamic search:', importError);
    }

    // 3. 동적 검색 (한글 이름인 경우만)
    const isKoreanName = /[가-힣]/.test(symbol);
    if (isKoreanName) {
      try {
        const ticker = await searchTickerByName(symbol);
        if (ticker) {
          return `${ticker}.KS`;
        }
      } catch (searchError) {
        // 동적 검색 실패해도 계속 진행 (원본 반환)
        console.warn(`[Dynamic Mapping] Search failed for ${symbol}, using original:`, searchError);
      }
    }

    // 4. Fallback: 원본 반환
    return symbol;
  } catch (error) {
    // 전체 프로세스 실패 시 원본 반환
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Dynamic Mapping] Normalization failed for ${symbol}, using original:`, errorMessage);
    return symbol;
  }
}
