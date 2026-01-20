import { NextRequest, NextResponse } from 'next/server';
import type { StockSuggestion } from '@/lib/stock-search';

// 동적 라우트로 설정
export const dynamic = 'force-dynamic';

/**
 * 네이버 증권 종목 검색 API
 *
 * 기존 ac.finance.naver.com 자동완성 API가 서비스 종료되어
 * 네이버 모바일 주식 API와 직접 종목 페이지 조회를 조합하여 검색합니다.
 *
 * 검색 전략:
 * 1. 6자리 숫자 입력: 직접 종목 페이지에서 검증
 * 2. 텍스트 입력: 네이버 모바일 검색 페이지 파싱
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ results: [] });
    }

    const trimmedQuery = query.trim();
    console.log(`[Naver Finance API] Searching for: "${trimmedQuery}"`);

    const results: StockSuggestion[] = [];

    // 전략 1: 6자리 종목코드 직접 조회
    if (/^\d{6}$/.test(trimmedQuery)) {
      const stockInfo = await fetchStockByCode(trimmedQuery);
      if (stockInfo) {
        results.push(stockInfo);
        console.log(`[Naver Finance API] Direct code lookup found: ${stockInfo.name} (${stockInfo.symbol})`);
        return NextResponse.json({ results });
      }
    }

    // 전략 2: 네이버 모바일 주식 basic API로 검색 (이름 기반)
    const mobileResults = await searchViaMobileAPI(trimmedQuery);
    if (mobileResults.length > 0) {
      results.push(...mobileResults);
    }

    // 전략 3: 결과가 없으면 네이버 금융 검색 페이지 파싱
    if (results.length === 0) {
      const searchPageResults = await searchViaFinancePage(trimmedQuery);
      results.push(...searchPageResults);
    }

    // 중복 제거
    const seenCodes = new Set<string>();
    const uniqueResults = results.filter((item) => {
      const code = item.symbol.replace(/\.(KS|KQ)$/, '');
      if (seenCodes.has(code)) {
        return false;
      }
      seenCodes.add(code);
      return true;
    });

    // 검색어와의 유사도에 따라 정렬
    const sortedResults = sortByRelevance(uniqueResults, trimmedQuery);
    const finalResults = sortedResults.slice(0, 10);

    console.log(`[Naver Finance API] Found ${finalResults.length} results for "${trimmedQuery}"`,
      finalResults.map(r => `${r.name} (${r.symbol})`));

    return NextResponse.json({ results: finalResults });
  } catch (error) {
    console.error('[Naver Finance API] Error:', error);
    return NextResponse.json(
      { results: [], error: 'Failed to search Naver Finance' },
      { status: 500 }
    );
  }
}

/**
 * 종목코드로 직접 네이버 금융 페이지에서 종목 정보 조회
 */
async function fetchStockByCode(code: string): Promise<StockSuggestion | null> {
  try {
    // 네이버 모바일 주식 basic API 사용 (JSON 응답)
    const apiUrl = `https://m.stock.naver.com/api/stock/${code}/basic`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log(`[Naver Finance API] Code ${code} not found (HTTP ${response.status})`);
      return null;
    }

    const data = await response.json();

    if (!data.stockName || !data.itemCode) {
      return null;
    }

    // 시장 구분 (sosok: "0" = KOSPI, "1" = KOSDAQ)
    const isKosdaq = data.sosok === '1' || data.stockExchangeType?.code === 'KQ';
    const suffix = isKosdaq ? '.KQ' : '.KS';

    return {
      symbol: `${data.itemCode}${suffix}`,
      name: data.stockName,
      exchange: 'KRX',
      type: 'stock',
    };
  } catch (error) {
    console.error(`[Naver Finance API] Error fetching code ${code}:`, error);
    return null;
  }
}

/**
 * 네이버 모바일 주식 API로 검색
 * 인기 종목 목록에서 검색어와 매칭되는 종목 필터링
 */
async function searchViaMobileAPI(query: string): Promise<StockSuggestion[]> {
  const results: StockSuggestion[] = [];
  const queryLower = query.toLowerCase();

  try {
    // 시가총액 상위 종목 목록 조회 (KOSPI + KOSDAQ)
    const markets = [
      { sosok: 0, name: 'KOSPI' },
      { sosok: 1, name: 'KOSDAQ' }
    ];

    for (const market of markets) {
      try {
        const url = `https://m.stock.naver.com/api/json/search/searchListJson.nhn?keyword=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) continue;

        const data = await response.json();

        if (data?.result?.d && Array.isArray(data.result.d)) {
          for (const item of data.result.d) {
            const stockName = item.nm || '';
            const stockCode = item.cd || '';

            // 검색어와 매칭 확인
            if (stockName && stockCode && stockCode.length === 6) {
              const nameLower = stockName.toLowerCase();
              if (nameLower.includes(queryLower) || queryLower.includes(nameLower.substring(0, 2))) {
                const isKosdaq = item.kosdaq === true;
                results.push({
                  symbol: `${stockCode}${isKosdaq ? '.KQ' : '.KS'}`,
                  name: stockName,
                  exchange: 'KRX',
                  type: 'stock',
                });
              }
            }
          }
        }
      } catch (e) {
        // 개별 시장 실패는 무시하고 계속
      }
    }
  } catch (error) {
    console.error('[Naver Finance API] Mobile API search error:', error);
  }

  return results;
}

/**
 * 네이버 금융 검색 페이지에서 종목 검색
 */
async function searchViaFinancePage(query: string): Promise<StockSuggestion[]> {
  const results: StockSuggestion[] = [];

  try {
    const searchUrl = `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return results;
    }

    const html = await response.text();

    // HTML에서 종목 정보 추출 (정규식으로 파싱)
    // 패턴: code=XXXXXX와 종목명
    const codePattern = /code=(\d{6})[^>]*>([^<]+)</g;
    let match;
    const seen = new Set<string>();

    while ((match = codePattern.exec(html)) !== null) {
      const code = match[1];
      const name = match[2].trim();

      if (code && name && !seen.has(code)) {
        seen.add(code);

        // 코드 번호로 시장 추정
        const codeNum = parseInt(code, 10);
        const isKosdaq = (codeNum >= 100000 && codeNum < 200000) || codeNum >= 400000;

        results.push({
          symbol: `${code}${isKosdaq ? '.KQ' : '.KS'}`,
          name,
          exchange: 'KRX',
          type: 'stock',
        });
      }
    }
  } catch (error) {
    console.error('[Naver Finance API] Search page parsing error:', error);
  }

  return results;
}

/**
 * 검색어 유사도에 따라 결과 정렬
 */
function sortByRelevance(results: StockSuggestion[], query: string): StockSuggestion[] {
  const normalizedQuery = query.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();

  return results.sort((a, b) => {
    const aName = a.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();
    const bName = b.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '').toLowerCase();

    // 정확한 매칭 우선
    const aExact = aName === normalizedQuery;
    const bExact = bName === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // 검색어로 시작하는 종목 우선
    const aStartsWith = aName.startsWith(normalizedQuery);
    const bStartsWith = bName.startsWith(normalizedQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // 검색어가 포함된 종목 우선
    const aContains = aName.includes(normalizedQuery);
    const bContains = bName.includes(normalizedQuery);
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    // 이름 길이 짧은 것 우선
    return aName.length - bName.length;
  });
}
