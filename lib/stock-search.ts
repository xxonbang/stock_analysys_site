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
 * 통합 종목 검색 (모든 소스 활용)
 * 한국/미국 모든 종목(ETF 포함)에 대해 동적으로 검색
 */
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  
  // 한국어 입력인지 확인
  const isKorean = /[가-힣]/.test(trimmedQuery);
  
  // 한국 주식 티커 형식인지 확인 (6자리 숫자 또는 .KS/.KQ 포함)
  const isKoreaTicker = /^\d{6}$/.test(trimmedQuery) || /\.(KS|KQ)$/i.test(trimmedQuery);
  
  // 미국 주식 티커 형식인지 확인 (영문 대문자, 보통 1-5자)
  const isUSTicker = /^[A-Z]{1,5}$/.test(trimmedQuery.toUpperCase());

  try {
    const promises: Promise<StockSuggestion[]>[] = [];

    // 1. 한국 주식 검색 (한글 입력 또는 한국 티커인 경우)
    if (isKorean || isKoreaTicker) {
      promises.push(searchKoreaStocksViaAPI(trimmedQuery));
    }

    // 2. 미국 주식 검색 (항상 실행 - 한글 검색어도 미국 주식 검색 시도)
    // 예: '애플' → 'Apple', '알파벳' → 'Alphabet' 등
    promises.push(searchUSStocksViaAPI(trimmedQuery));

    // 3. Yahoo Finance 검색 (Fallback)
    // 한글 입력인 경우 한국/미국 모두 검색
    if (isKorean) {
      promises.push(searchStocksYahoo(trimmedQuery, { region: 'KR', lang: 'ko-KR' }));
      promises.push(searchStocksYahoo(trimmedQuery, { region: '1', lang: 'en' })); // 미국도 검색
    } else {
      // 영어/티커 입력: 글로벌 검색
      promises.push(searchStocksYahoo(trimmedQuery));
    }

    // 4. Finnhub Symbol Search (Fallback)
    const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;
    if (FINNHUB_API_KEY) {
      promises.push(searchStocksFinnhub(trimmedQuery));
    }

    // 모든 검색 결과 병렬로 가져오기
    const results = await Promise.all(promises);
    
    // 결과 합치기 및 중복 제거
    const allResults: StockSuggestion[] = [];
    const seenSymbols = new Set<string>();

    for (const resultSet of results) {
      for (const item of resultSet) {
        // 심볼이 같으면 중복 제거 (거래소 구분 없이)
        const symbolKey = item.symbol.split('.')[0].toUpperCase(); // 'AAPL'과 'AAPL.US'는 같은 것으로 간주
        if (!seenSymbols.has(symbolKey)) {
          seenSymbols.add(symbolKey);
          allResults.push(item);
        }
      }
    }

    // 검색 결과 정렬
    allResults.sort((a, b) => {
      const aIsKorea = a.symbol.includes('.KS') || a.symbol.includes('.KQ');
      const bIsKorea = b.symbol.includes('.KS') || b.symbol.includes('.KQ');
      
      // 한국어 입력인 경우 한국 주식 우선
      if (isKorean || isKoreaTicker) {
        if (aIsKorea && !bIsKorea) return -1;
        if (!aIsKorea && bIsKorea) return 1;
      }
      
      // 검색어로 시작하는 종목 우선
      const aName = a.name.toLowerCase().replace(/\s+/g, '');
      const bName = b.name.toLowerCase().replace(/\s+/g, '');
      const queryLower = trimmedQuery.toLowerCase().replace(/\s+/g, '');
      
      const aStartsWith = aName.startsWith(queryLower) || a.symbol.toLowerCase().startsWith(queryLower);
      const bStartsWith = bName.startsWith(queryLower) || b.symbol.toLowerCase().startsWith(queryLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // 이름 길이 짧은 것 우선 (더 정확한 매칭)
      if (aName.length !== bName.length) {
        return aName.length - bName.length;
      }
      
      return 0;
    });

    return allResults.slice(0, 10); // 최대 10개
  } catch (error) {
    console.error('Error in unified stock search:', error);
    return [];
  }
}
