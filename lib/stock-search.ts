/**
 * 종목 검색 및 자동완성 API
 * 
 * Yahoo Finance Autocomplete API와 Finnhub Symbol Search API를 활용
 * 한국 주식은 로컬 캐시를 활용한 검색도 지원
 */

export interface StockSuggestion {
  symbol: string; // 티커 심볼 (예: "AAPL", "005930.KS")
  name: string; // 회사명 (예: "Apple Inc.", "삼성전자")
  exchange?: string; // 거래소 (예: "NAS", "KRX")
  type?: string; // 종목 타입 (예: "S", "Common Stock")
}

/**
 * Yahoo Finance Autocomplete API로 종목 검색
 */
export async function searchStocksYahoo(
  query: string,
  options?: { region?: string; lang?: string }
): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    // 한국어 입력인 경우 한국 지역으로 검색
    const region = options?.region || '1'; // 기본값: US (1), 한국: KR
    const lang = options?.lang || 'en'; // 기본값: 영어, 한국: ko-KR
    const url = `https://autoc.finance.yahoo.com/autoc?query=${encodedQuery}&region=${region}&lang=${lang}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance autocomplete failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data?.ResultSet?.Result) {
      return [];
    }

    const results: StockSuggestion[] = data.ResultSet.Result
      .filter((item: any) => item.symbol && item.name)
      .slice(0, 10) // 최대 10개
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exch,
        type: item.type,
      }));

    return results;
  } catch (error) {
    console.error('Error searching stocks with Yahoo Finance:', error);
    return [];
  }
}

/**
 * Finnhub Symbol Search API로 종목 검색
 */
export async function searchStocksFinnhub(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || '';
  
  if (!FINNHUB_API_KEY) {
    console.warn('FINNHUB_API_KEY not available, skipping Finnhub search');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://finnhub.io/api/v1/search?q=${encodedQuery}&token=${FINNHUB_API_KEY}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Finnhub search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data?.result || !Array.isArray(data.result)) {
      return [];
    }

    const results: StockSuggestion[] = data.result
      .filter((item: any) => item.symbol && item.description)
      .slice(0, 10) // 최대 10개
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type,
      }));

    return results;
  } catch (error) {
    console.error('Error searching stocks with Finnhub:', error);
    return [];
  }
}

/**
 * 한국 주식 검색 (API route를 통해 처리)
 * 
 * 클라이언트에서는 API route를 통해 서버 사이드에서 검색합니다.
 * 서버 사이드에서는 하드코딩 매핑 + 동적 매핑(Python)을 활용합니다.
 */
async function searchKoreaStocksViaAPI(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `/api/search-korea-stocks?q=${encodedQuery}`;
    console.log(`[Stock Search] Calling Korea stocks API: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`[Stock Search] Korea stocks API failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => '');
      console.warn(`[Stock Search] Error details: ${errorText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    const resultCount = data.results?.length || 0;
    console.log(`[Stock Search] Korea stocks API returned ${resultCount} results for "${query}"`);
    
    if (resultCount > 0) {
      console.log(`[Stock Search] Results:`, data.results.map((r: StockSuggestion) => `${r.name} (${r.symbol})`));
    }
    
    return data.results || [];
  } catch (error) {
    console.error('Error searching Korea stocks via API:', error);
    return [];
  }
}

/**
 * 미국 주식 검색 (API route를 통해 처리)
 */
async function searchUSStocksViaAPI(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `/api/search-us-stocks?q=${encodedQuery}`;
    console.log(`[Stock Search] Calling US stocks API: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`[Stock Search] US stocks API failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const resultCount = data.results?.length || 0;
    console.log(`[Stock Search] US stocks API returned ${resultCount} results for "${query}"`);
    
    if (resultCount > 0) {
      console.log(`[Stock Search] Results:`, data.results.map((r: StockSuggestion) => `${r.name} (${r.symbol})`));
    }
    
    return data.results || [];
  } catch (error) {
    console.error('Error searching US stocks via API:', error);
    return [];
  }
}

/**
 * 통합 종목 검색 (로컬 검색 전용)
 * 
 * 안정성과 성능을 위해 로컬 symbols.json만 사용합니다.
 * - 레이턴시: 0-10ms (즉시 검색)
 * - 안정성: 외부 API 의존성 없음
 * - 429 에러: 완전히 방지
 * - 비용: API 호출 비용 없음
 * 
 * symbols.json에는 32,330개 종목이 포함되어 있어 대부분의 검색 요구를 충족합니다.
 */
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();

  try {
    // 로컬 검색만 사용 (API Fallback 제거)
    const { searchStocksLocal } = await import('./local-stock-search');
    const results = await searchStocksLocal(trimmedQuery);
    
    if (results.length > 0) {
      console.log(`[Stock Search] Local search found ${results.length} results for "${trimmedQuery}"`);
    } else {
      console.log(`[Stock Search] No results found for "${trimmedQuery}"`);
    }
    
    return results;
  } catch (error) {
    // 로컬 검색 실패 시에도 빈 배열 반환 (API 호출 안 함)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Stock Search] Local search error:', errorMessage);
    console.warn('[Stock Search] symbols.json 파일을 확인해주세요. (/public/data/symbols.json)');
    return [];
  }
}
