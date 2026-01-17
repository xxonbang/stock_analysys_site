import { NextRequest, NextResponse } from 'next/server';
import type { StockSuggestion } from '@/lib/stock-search';

// 동적 라우트로 설정
export const dynamic = 'force-dynamic';

/**
 * 네이버 증권 자동완성 API 프록시
 * 
 * 네이버 증권 검색창에서 사용하는 자동완성 API를 호출하여
 * 실시간 종목 검색 결과를 반환합니다.
 * 
 * 이 API는 시장 데이터와 실시간 동기화되므로 신규 상장 종목도 즉시 검색됩니다.
 * FinanceDataReader의 행정 마스터 파일 지연 문제를 해결합니다.
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

    try {
      // 네이버 증권 자동완성 API 호출
      // URL 형식: https://ac.finance.naver.com/ac?q={query}&st=1&r_format=json
      // 응답 형식: [[["종목명","종목코드","stock"], ...]]
      const encodedQuery = encodeURIComponent(trimmedQuery);
      const naverUrl = `https://ac.finance.naver.com/ac?q=${encodedQuery}&st=1&r_format=json`;

      const response = await fetch(naverUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://finance.naver.com/',
        },
        // 타임아웃 설정 (5초)
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn(`[Naver Finance API] HTTP error: ${response.status} ${response.statusText}`);
        return NextResponse.json({ results: [] });
      }

      const data = await response.json();
      
      // 네이버 API 응답 파싱
      // 응답 형식: [[["종목명","종목코드","stock"], ["종목명2","종목코드2","stock"], ...]]
      console.log(`[Naver Finance API] Raw response for "${trimmedQuery}":`, JSON.stringify(data).substring(0, 500));
      
      if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
        console.log(`[Naver Finance API] No results for "${trimmedQuery}"`);
        return NextResponse.json({ results: [] });
      }

      const items = data[0];
      console.log(`[Naver Finance API] Found ${items.length} items in response`);
      const results: StockSuggestion[] = [];

      for (const item of items) {
        if (!Array.isArray(item) || item.length < 2) continue;
        
        const name = item[0]?.trim(); // 종목명
        const code = item[1]?.trim(); // 종목코드
        const type = item[2] || 'stock'; // 타입 (보통 "stock")

        if (!name || !code) {
          console.log(`[Naver Finance API] Skipping item with missing name or code:`, item);
          continue;
        }

        // 종목코드가 6자리 숫자인 경우에만 처리 (한국 주식)
        if (!/^\d{6}$/.test(code)) {
          console.log(`[Naver Finance API] Skipping non-KR stock: ${name} (${code})`);
          continue;
        }
        
        console.log(`[Naver Finance API] Processing: ${name} (${code})`);

        // 심볼 형식: 종목코드.KS (코스피) 또는 종목코드.KQ (코스닥)
        // 종목코드 범위로 시장 구분:
        // - 코스피: 000000-099999 (대부분)
        // - 코스닥: 100000-999999 (대부분)
        // 단, 일부 예외가 있을 수 있으므로 기본값은 .KS
        // 참고: 지투지바이오(456160)는 코스닥이므로 .KQ
        const codeNum = parseInt(code, 10);
        // 코스닥은 보통 100000 이상이지만, 일부는 400000대도 있음
        // 정확한 구분을 위해 일반적인 범위 사용
        const suffix = (codeNum >= 100000 && codeNum < 200000) || (codeNum >= 400000) ? '.KQ' : '.KS';
        const symbol = `${code}${suffix}`;

        results.push({
          symbol,
          name,
          exchange: 'KRX',
          type,
        });
      }

      // 중복 제거 (종목코드 기준)
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
      const sortedResults = uniqueResults.sort((a, b) => {
        const aName = a.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '');
        const bName = b.name.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '');
        const query = trimmedQuery.replace(/\s+/g, '').replace('㈜', '').replace('(주)', '');
        const queryLower = query.toLowerCase();
        const aNameLower = aName.toLowerCase();
        const bNameLower = bName.toLowerCase();

        // 정확한 매칭 우선 (대소문자 무시)
        const aExact = aNameLower === queryLower || aName === query;
        const bExact = bNameLower === queryLower || bName === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 검색어로 시작하는 종목 우선 (대소문자 무시)
        const aStartsWith = aNameLower.startsWith(queryLower) || aName.startsWith(query);
        const bStartsWith = bNameLower.startsWith(queryLower) || bName.startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // 검색어가 포함된 종목 우선 (대소문자 무시)
        const aContains = aNameLower.includes(queryLower) || aName.includes(query);
        const bContains = bNameLower.includes(queryLower) || bName.includes(query);
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;

        // 이름 길이 짧은 것 우선 (더 정확한 매칭)
        return aName.length - bName.length;
      });

      const finalResults = sortedResults.slice(0, 10); // 최대 10개
      
      console.log(`[Naver Finance API] Found ${finalResults.length} results for "${trimmedQuery}"`, 
        finalResults.map(r => `${r.name} (${r.symbol})`));

      return NextResponse.json({ results: finalResults });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error(`[Naver Finance API] Fetch error for "${trimmedQuery}":`, errorMessage);
      return NextResponse.json({ results: [] });
    }
  } catch (error) {
    console.error('[Naver Finance API] Error:', error);
    return NextResponse.json(
      { results: [], error: 'Failed to search Naver Finance' },
      { status: 500 }
    );
  }
}
