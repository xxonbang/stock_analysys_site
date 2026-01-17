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
 * 캐시된 StockListing 데이터 읽기 (만료 여부 포함)
 */
async function readCachedStockListing(): Promise<{ data: StockListingItem[]; isExpired: boolean } | null> {
  try {
    if (!existsSync(STOCK_LISTING_CACHE_FILE)) {
      return null;
    }

    const content = await readFile(STOCK_LISTING_CACHE_FILE, 'utf-8');
    const cached: CachedStockListing = JSON.parse(content);

    // 캐시 만료 확인
    const now = Date.now();
    const isExpired = now - cached.timestamp > CACHE_TTL;

    return {
      data: cached.data,
      isExpired,
    };
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
 * StockListing 데이터 가져오기 (캐시 우선, 만료된 캐시도 사용)
 */
export async function getStockListing(): Promise<StockListingItem[]> {
  // 1. 캐시 확인 (만료 여부와 관계없이)
  let cachedData: StockListingItem[] | null = null;
  let isExpired = false;
  
  try {
    const cached = await readCachedStockListing();
    if (cached && cached.data.length > 0) {
      cachedData = cached.data;
      isExpired = cached.isExpired;
      
      // 만료되지 않았으면 즉시 반환
      if (!isExpired) {
        console.log(`[Dynamic Mapping] Using cached stock listing (${cachedData.length} stocks)`);
        return cachedData;
      }
      
      // 만료되었어도 일단 사용 (백그라운드 갱신)
      console.log(`[Dynamic Mapping] Cache expired, using stale cache (${cachedData.length} stocks) while refreshing in background...`);
    }
  } catch (error) {
    console.warn('[Dynamic Mapping] Failed to read cache, fetching fresh data:', error);
  }

  // 2. 백그라운드에서 갱신 시도 (만료된 캐시가 있으면)
  if (cachedData && isExpired) {
    // 비동기로 백그라운드 갱신 (블로킹하지 않음)
    fetchStockListingFromPython()
      .then((data) => {
        if (data && data.length > 0) {
          saveCachedStockListing(data)
            .then(() => {
              console.log(`[Dynamic Mapping] Cache refreshed in background (${data.length} stocks)`);
            })
            .catch((cacheError) => {
              console.warn('[Dynamic Mapping] Failed to save refreshed cache:', cacheError);
            });
        }
      })
      .catch((err) => {
        console.warn('[Dynamic Mapping] Background refresh failed:', err);
      });
    
    // 만료된 캐시라도 반환
    return cachedData;
  }

  // 3. 캐시가 없으면 동기적으로 가져오기
  console.log('[Dynamic Mapping] Fetching stock listing from Python...');
  try {
    const data = await fetchStockListingFromPython();
    if (!data || data.length === 0) {
      // 실패해도 만료된 캐시가 있으면 사용
      if (cachedData) {
        console.warn('[Dynamic Mapping] Fetch returned empty, using stale cache');
        return cachedData;
      }
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
    // 실패해도 만료된 캐시가 있으면 사용
    if (cachedData) {
      console.warn('[Dynamic Mapping] Fetch failed, using stale cache:', error instanceof Error ? error.message : String(error));
      return cachedData;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Dynamic Mapping] Failed to fetch stock listing:', errorMessage);
    throw error;
  }
}

/**
 * Levenshtein 거리 계산 (문자열 유사도 측정)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 문자열 유사도 계산 (0.0 ~ 1.0)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * 한국 주식 이름으로 티커 검색 (동적)
 */
export async function searchTickerByName(name: string): Promise<string | null> {
  const searchStartTime = Date.now();
  
  try {
    const stockList = await getStockListing();
    
    if (!stockList || stockList.length === 0) {
      console.warn('[Dynamic Mapping] Stock listing is empty');
      return null;
    }
    
    console.log(`[Dynamic Mapping] Searching "${name}" in ${stockList.length} stocks`);
    
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
      const duration = Date.now() - searchStartTime;
      console.log(`[Dynamic Mapping] Found exact match: ${name} -> ${exactMatch.Symbol} (${duration}ms)`);
      return exactMatch.Symbol;
    }

    // 부분 매칭 시도 - 검색어가 종목명에 포함되는 경우만 (역방향 매칭 제거)
    const partialMatches = stockList
      .map((stock) => {
        if (!stock.Name || !stock.Symbol) return null;
        const stockName = stock.Name.replace(/\s+/g, '');
        const searchName = normalizedName;
        
        // 검색어가 종목명에 포함되는 경우만 매칭
        if (!stockName.includes(searchName)) return null;
        
        // 유사도 계산
        const similarity = calculateSimilarity(searchName, stockName);
        
        return {
          stock,
          similarity,
          stockName,
        };
      })
      .filter((item): item is { stock: StockListingItem; similarity: number; stockName: string } => 
        item !== null && item.similarity > 0.6 // 60% 이상 유사도만 고려
      );
    
    if (partialMatches.length > 0) {
      // 유사도와 기타 조건을 종합하여 최적 매칭 선택
      const bestMatch = partialMatches.reduce((best, current) => {
        if (!best) return current;
        
        const bestName = best.stockName;
        const currentName = current.stockName;
        
        // 1. 정확한 매칭 우선
        if (bestName === normalizedName && currentName !== normalizedName) return best;
        if (currentName === normalizedName && bestName !== normalizedName) return current;
        
        // 2. 유사도가 높은 것 우선
        if (current.similarity > best.similarity) return current;
        if (best.similarity > current.similarity) return best;
        
        // 3. 검색어로 시작하는 종목 우선
        const bestStartsWith = bestName.startsWith(normalizedName);
        const currentStartsWith = currentName.startsWith(normalizedName);
        if (currentStartsWith && !bestStartsWith) return current;
        if (bestStartsWith && !currentStartsWith) return best;
        
        // 4. 검색어와 길이가 비슷한 종목 우선 (더 정확한 매칭)
        const bestLengthDiff = Math.abs(bestName.length - normalizedName.length);
        const currentLengthDiff = Math.abs(currentName.length - normalizedName.length);
        if (currentLengthDiff < bestLengthDiff) return current;
        if (bestLengthDiff < currentLengthDiff) return best;
        
        // 5. 이름 길이 짧은 것 우선 (더 정확한 매칭)
        if (bestName.length !== currentName.length) {
          return bestName.length < currentName.length ? best : current;
        }
        
        return best;
      });
      
      if (bestMatch && bestMatch.stock.Symbol) {
        const duration = Date.now() - searchStartTime;
        console.log(`[Dynamic Mapping] Found partial match: ${name} -> ${bestMatch.stock.Symbol} (${bestMatch.stock.Name}, similarity: ${(bestMatch.similarity * 100).toFixed(1)}%, ${duration}ms)`);
        return bestMatch.stock.Symbol;
      }
    }

    // 실패 시 유사한 종목명 제안 (로깅용)
    const suggestions = stockList
      .map((stock) => {
        if (!stock.Name || !stock.Symbol) return null;
        const stockName = stock.Name.replace(/\s+/g, '');
        const similarity = calculateSimilarity(normalizedName, stockName);
        return { stock, similarity };
      })
      .filter((item): item is { stock: StockListingItem; similarity: number } => 
        item !== null && item.similarity > 0.3
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((item) => `${item.stock.Name} (${(item.similarity * 100).toFixed(1)}%)`);
    
    const duration = Date.now() - searchStartTime;
    console.log(`[Dynamic Mapping] No match found for: ${name} (${duration}ms)`);
    if (suggestions.length > 0) {
      console.log(`[Dynamic Mapping] Suggestions: ${suggestions.join(', ')}`);
    }
    
    return null;
  } catch (error) {
    const duration = Date.now() - searchStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[Dynamic Mapping] Failed to search ticker for ${name} (${duration}ms):`, errorMessage);
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

    // 3. 티커 코드로 직접 검색 시도 (6자리 숫자인 경우)
    if (/^\d{6}$/.test(symbol)) {
      try {
        const stockList = await getStockListing();
        const tickerMatch = stockList.find((stock) => stock.Symbol === symbol);
        if (tickerMatch) {
          return `${symbol}.KS`;
        }
      } catch (error) {
        console.warn(`[Dynamic Mapping] Ticker search failed for ${symbol}:`, error);
      }
    }

    // 4. 동적 검색 (한글 이름인 경우만)
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

    // 5. Fallback: 원본 반환
    return symbol;
  } catch (error) {
    // 전체 프로세스 실패 시 원본 반환
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Dynamic Mapping] Normalization failed for ${symbol}, using original:`, errorMessage);
    return symbol;
  }
}
