import { NextRequest, NextResponse } from 'next/server';

/**
 * 종목 검증 API
 * 실시간으로 종목이 존재하는지 확인합니다.
 * 
 * GET /api/validate-stock?symbol=005930
 * GET /api/validate-stock?symbol=005930.KS
 * GET /api/validate-stock?name=삼성전자
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const name = searchParams.get('name');

  if (!symbol && !name) {
    return NextResponse.json(
      { error: 'symbol 또는 name 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 심볼로 검증하는 경우
    if (symbol) {
      const result = await validateBySymbol(symbol);
      return NextResponse.json(result);
    }

    // 이름으로 검증하는 경우
    if (name) {
      const result = await validateByName(name);
      return NextResponse.json(result);
    }

    return NextResponse.json({ valid: false, error: 'Invalid request' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Validate Stock API] Error:', errorMessage);
    return NextResponse.json(
      { valid: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 심볼로 종목 검증 (네이버 금융 페이지 확인)
 */
async function validateBySymbol(symbol: string): Promise<{
  valid: boolean;
  symbol?: string;
  name?: string;
  market?: string;
  error?: string;
}> {
  // 심볼 정규화
  const cleanSymbol = symbol.replace(/\.(KS|KQ)$/, '');

  // 한국 종목 코드 형식 확인 (6자리 숫자)
  if (!/^\d{6}$/.test(cleanSymbol)) {
    // 미국 종목인 경우 Finnhub으로 검증
    return validateUSStock(symbol);
  }

  try {
    // 네이버 금융 페이지에서 종목 존재 여부 확인
    const url = `https://finance.naver.com/item/main.naver?code=${cleanSymbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // 종목명 추출
    const nameMatch = html.match(/<h2[^>]*class="wrap_company"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/<title>([^:]+)\s*:/);
    
    if (!nameMatch) {
      // 종목이 존재하지 않으면 "금융정보를 찾을 수 없습니다" 페이지로 리다이렉트됨
      if (html.includes('금융정보를 찾을 수 없습니다') || html.includes('종목이 존재하지 않습니다')) {
        return { valid: false, error: '존재하지 않는 종목입니다.' };
      }
    }

    const stockName = nameMatch ? nameMatch[1].trim() : undefined;

    // 시장 구분 (코스피/코스닥)
    let market = 'KRX';
    if (html.includes('코스닥') || html.includes('KOSDAQ')) {
      market = 'KOSDAQ';
    } else if (html.includes('코스피') || html.includes('KOSPI')) {
      market = 'KOSPI';
    }

    // 심볼에 시장 접미사 추가
    const fullSymbol = market === 'KOSDAQ' ? `${cleanSymbol}.KQ` : `${cleanSymbol}.KS`;

    return {
      valid: true,
      symbol: fullSymbol,
      name: stockName,
      market,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMessage };
  }
}

/**
 * 이름으로 종목 검증 (네이버 증권 검색 API)
 */
async function validateByName(name: string): Promise<{
  valid: boolean;
  symbol?: string;
  name?: string;
  market?: string;
  error?: string;
}> {
  try {
    // 네이버 증권 자동완성 API 호출
    const encodedName = encodeURIComponent(name);
    const url = `https://ac.finance.naver.com/ac?q=${encodedName}&st=1&r_format=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // 응답 파싱: [[["종목명","종목코드","stock"], ...]]
    if (!data || !Array.isArray(data) || data.length === 0 ||
        !data[0] || !Array.isArray(data[0]) || data[0].length === 0) {
      return { valid: false, error: '검색 결과가 없습니다.' };
    }

    // 첫 번째 결과 사용
    const firstResult = data[0][0];
    if (!Array.isArray(firstResult) || firstResult.length < 2) {
      return { valid: false, error: '잘못된 응답 형식입니다.' };
    }

    const [stockName, stockCode] = firstResult;

    // 정확한 매칭 확인
    const normalizedInput = name.replace(/\s+/g, '').toLowerCase();
    const normalizedResult = stockName.replace(/\s+/g, '').toLowerCase();

    if (normalizedInput !== normalizedResult) {
      // 정확한 매칭이 아닌 경우 경고
      console.warn(`[Validate Stock] Name mismatch: "${name}" vs "${stockName}"`);
    }

    // 시장 구분 (코드 기반)
    const codeNum = parseInt(stockCode, 10);
    const isKosdaq = (codeNum >= 100000 && codeNum < 200000) || (codeNum >= 400000);
    const market = isKosdaq ? 'KOSDAQ' : 'KOSPI';
    const fullSymbol = isKosdaq ? `${stockCode}.KQ` : `${stockCode}.KS`;

    return {
      valid: true,
      symbol: fullSymbol,
      name: stockName,
      market,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMessage };
  }
}

/**
 * 미국 종목 검증
 */
async function validateUSStock(symbol: string): Promise<{
  valid: boolean;
  symbol?: string;
  name?: string;
  market?: string;
  error?: string;
}> {
  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  if (!FINNHUB_API_KEY) {
    // Finnhub API 키가 없으면 Yahoo Finance로 대체
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const response = await fetch(url);

      if (!response.ok) {
        return { valid: false, error: '종목을 찾을 수 없습니다.' };
      }

      const data = await response.json();
      if (data.chart?.error) {
        return { valid: false, error: data.chart.error.description || '종목을 찾을 수 없습니다.' };
      }

      return {
        valid: true,
        symbol: symbol.toUpperCase(),
        market: 'US',
      };
    } catch {
      return { valid: false, error: 'Yahoo Finance 검증 실패' };
    }
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (!data || !data.name) {
      return { valid: false, error: '종목을 찾을 수 없습니다.' };
    }

    return {
      valid: true,
      symbol: data.ticker || symbol.toUpperCase(),
      name: data.name,
      market: data.exchange || 'US',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMessage };
  }
}
