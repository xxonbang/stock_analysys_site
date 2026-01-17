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
 * 네이버 증권 자동완성 API로 한국 주식 검색
 * 
 * 실시간 데이터 기반으로 신규 상장 종목도 즉시 검색 가능합니다.
 * FinanceDataReader의 행정 마스터 파일 지연 문제를 해결합니다.
 */
async function searchStocksNaver(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `/api/search-naver-stocks?q=${encodedQuery}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Stock Search] Naver Finance API failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];
    
    if (results.length > 0) {
      console.log(`[Stock Search] Naver Finance API found ${results.length} results for "${query}"`);
    }
    
    return results;
  } catch (error) {
    console.error('[Stock Search] Error searching with Naver Finance API:', error);
    return [];
  }
}

/**
 * 통합 종목 검색 (하이브리드 방식)
 * 
 * 1단계: 로컬 symbols.json 검색 (빠르고 안정적)
 * 2단계: 로컬 검색 결과가 없으면 네이버 증권 API로 실시간 검색 (신규 상장주 대응)
 * 
 * 이 방식으로 FinanceDataReader의 행정 마스터 파일 지연 문제를 해결하면서도
 * 대부분의 검색은 빠른 로컬 검색으로 처리합니다.
 */
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const isKorean = /[가-힣]/.test(trimmedQuery);
  const isKoreaTicker = /^\d{6}$/.test(trimmedQuery);

  try {
    // 1단계: 로컬 검색 (한국 주식인 경우에만)
    const { searchStocksLocal } = await import('./local-stock-search');
    let results = await searchStocksLocal(trimmedQuery);
    
    // 정확한 매칭이 있는지 확인 (종목명이 검색어와 정확히 일치)
    const normalizedQuery = trimmedQuery.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();
    const hasExactMatch = results.some(r => {
      const normalizedName = r.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();
      return normalizedName === normalizedQuery || normalizedName === trimmedQuery.toLowerCase();
    });
    
    if (hasExactMatch) {
      console.log(`[Stock Search] Local search found exact match for "${trimmedQuery}"`);
      return results;
    }
    
    // 2단계: 정확한 매칭이 없으면 네이버 API 호출 (신규 상장주 대응)
    // 한글 검색어이거나 한국 티커인 경우 항상 네이버 API도 시도
    if (isKorean || isKoreaTicker) {
      console.log(`[Stock Search] No exact match in local search, trying Naver Finance API for "${trimmedQuery}"`);
      const naverResults = await searchStocksNaver(trimmedQuery);
      
      if (naverResults.length > 0) {
        // 네이버 API 결과에서 정확한 매칭 우선 확인
        const naverExactMatch = naverResults.find(r => {
          const normalizedName = r.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();
          return normalizedName === normalizedQuery || normalizedName === trimmedQuery.toLowerCase();
        });
        
        if (naverExactMatch) {
          console.log(`[Stock Search] Naver Finance API found exact match: "${naverExactMatch.name}" (${naverExactMatch.symbol})`);
          // 정확한 매칭을 첫 번째로, 로컬 검색 결과와 나머지 네이버 결과를 뒤에 추가
          const otherNaverResults = naverResults.filter(r => r.symbol !== naverExactMatch.symbol);
          const localResultsWithoutDuplicates = results.filter(r => {
            const code = r.symbol.replace(/\.(KS|KQ)$/, '');
            return !naverResults.some(nr => nr.symbol.replace(/\.(KS|KQ)$/, '') === code);
          });
          return [naverExactMatch, ...localResultsWithoutDuplicates, ...otherNaverResults].slice(0, 10);
        }
        
        // 정확한 매칭은 없지만 네이버 결과가 있으면 네이버 결과 우선 반환
        console.log(`[Stock Search] Naver Finance API found ${naverResults.length} results (including newly listed stocks)`);
        // 로컬 검색 결과와 중복 제거하여 병합
        const localResultsWithoutDuplicates = results.filter(r => {
          const code = r.symbol.replace(/\.(KS|KQ)$/, '');
          return !naverResults.some(nr => nr.symbol.replace(/\.(KS|KQ)$/, '') === code);
        });
        return [...naverResults, ...localResultsWithoutDuplicates].slice(0, 10);
      }
    }
    
    // 3단계: 네이버 API 결과도 없으면 로컬 검색 결과 반환 (부분 매칭이라도)
    if (results.length > 0) {
      console.log(`[Stock Search] Returning ${results.length} partial matches from local search`);
      return results;
    }
    
    console.log(`[Stock Search] No results found for "${trimmedQuery}"`);
    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Stock Search] Search error:', errorMessage);
    
    // 에러 발생 시에도 네이버 API 시도 (한국 주식인 경우)
    if (isKorean || isKoreaTicker) {
      try {
        const naverResults = await searchStocksNaver(trimmedQuery);
        if (naverResults.length > 0) {
          return naverResults;
        }
      } catch (naverError) {
        console.error('[Stock Search] Naver Finance API fallback also failed:', naverError);
      }
    }
    
    return [];
  }
}
