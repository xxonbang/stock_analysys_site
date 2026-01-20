/**
 * 한국 주식 데이터 크롤러 (네이버 금융)
 * Source A: 전통적 크롤링 방식
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  StockDataCollector,
  CollectionResult,
  StockBasicInfo,
  StockPriceData,
  StockValuationData,
  StockFinancialData,
  StockSupplyDemandData,
  StockMarketData,
  ComprehensiveStockData,
} from './types';

const NAVER_FINANCE_BASE_URL = 'https://finance.naver.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * HTML에서 숫자 추출 (콤마, 공백, 특수문자 제거)
 */
function extractNumber(text: string | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[,\s%배원조억만]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * HTML에서 blind 클래스의 텍스트 추출 (실제 값)
 */
function extractBlindText($element: ReturnType<cheerio.CheerioAPI>): string {
  const blindSpan = $element.find('span.blind').first();
  return blindSpan.text().trim();
}

/**
 * 금액 단위 변환 (조, 억 → 원)
 */
function convertToWon(text: string): number | null {
  if (!text) return null;

  // "869조5,948억" 같은 형식 파싱
  const joMatch = text.match(/(\d+(?:,\d+)*)조/);
  const eokMatch = text.match(/(\d+(?:,\d+)*)억/);
  const manMatch = text.match(/(\d+(?:,\d+)*)만/);

  let result = 0;

  if (joMatch) {
    result += extractNumber(joMatch[1])! * 1_0000_0000_0000; // 조 = 10^12
  }
  if (eokMatch) {
    result += extractNumber(eokMatch[1])! * 1_0000_0000; // 억 = 10^8
  }
  if (manMatch) {
    result += extractNumber(manMatch[1])! * 1_0000; // 만 = 10^4
  }

  // 단위 없이 숫자만 있는 경우
  if (!joMatch && !eokMatch && !manMatch) {
    return extractNumber(text);
  }

  return result || null;
}

export class KoreaStockCrawler implements StockDataCollector {
  private async fetchPage(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });
    return response.data;
  }

  async collectBasicInfo(symbol: string): Promise<CollectionResult<StockBasicInfo>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $ = cheerio.load(html);

      // 종목명 추출
      const name = $('div.wrap_company h2 a').first().text().trim();

      // 시장 구분 (KOSPI/KOSDAQ)
      const marketImg = $('div.wrap_company img.kospi, div.wrap_company img.kosdaq');
      const marketAlt = marketImg.attr('alt') || '';
      const market = marketAlt.includes('코스닥') ? 'KOSDAQ' : 'KOSPI';

      if (!name) {
        throw new Error(`종목 정보를 찾을 수 없습니다: ${symbol}`);
      }

      return {
        data: {
          symbol,
          name,
          market,
          exchange: 'KRX',
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectPriceData(symbol: string): Promise<CollectionResult<StockPriceData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $ = cheerio.load(html);

      // KRX 기준 데이터 영역 (rate_info_krx)
      const rateInfo = $('#rate_info_krx');

      // 현재가 (span.blind에서 추출)
      const currentPriceText = extractBlindText(rateInfo.find('p.no_today em'));
      const currentPrice = extractNumber(currentPriceText);

      // 등락 (span.blind에서 추출)
      const changeText = extractBlindText(rateInfo.find('p.no_exday em').first());
      let change = extractNumber(changeText);

      // 하락인 경우 음수로 변환
      if (rateInfo.find('em.no_down').length > 0 || rateInfo.find('span.ico.down').length > 0) {
        if (change && change > 0) change = -change;
      }

      // 등락률
      const changePercentText = extractBlindText(rateInfo.find('p.no_exday em').last());
      let changePercent = extractNumber(changePercentText);
      if (change && change < 0 && changePercent && changePercent > 0) {
        changePercent = -changePercent;
      }

      // 시세 테이블에서 추출
      const siseTable = rateInfo.find('table.no_info');

      // 전일종가
      const prevCloseText = siseTable.find('td.first em span.blind').text();
      const previousClose = extractNumber(prevCloseText);

      // 고가
      const highText = siseTable.find('tr').first().find('td').eq(1).find('em').first().find('span.blind').text();
      const high = extractNumber(highText);

      // 저가
      const lowText = siseTable.find('tr').eq(1).find('td').eq(1).find('em').first().find('span.blind').text();
      const low = extractNumber(lowText);

      // 시가
      const openText = siseTable.find('tr').eq(1).find('td.first em span.blind').text();
      const open = extractNumber(openText);

      // 거래량
      const volumeText = siseTable.find('tr').first().find('td').eq(2).find('em span.blind').text();
      const volume = extractNumber(volumeText);

      // 거래대금
      const tradingValueText = siseTable.find('tr').eq(1).find('td').eq(2).find('em span.blind').text();
      const tradingValue = extractNumber(tradingValueText);

      // 52주 최고/최저 (투자정보 탭에서)
      const week52Row = $('th:contains("52주최고")').parent();
      const week52Text = week52Row.find('td').text();
      const week52Parts = week52Text.split('|').map(s => s.trim());
      const high52Week = extractNumber(week52Parts[0]);
      const low52Week = extractNumber(week52Parts[1]);

      if (!currentPrice) {
        throw new Error('현재가를 추출할 수 없습니다');
      }

      return {
        data: {
          currentPrice: currentPrice!,
          previousClose: previousClose || currentPrice!,
          change: change || 0,
          changePercent: changePercent || 0,
          open: open || currentPrice!,
          high: high || currentPrice!,
          low: low || currentPrice!,
          volume: volume || 0,
          tradingValue: tradingValue || 0,
          high52Week: high52Week || currentPrice!,
          low52Week: low52Week || currentPrice!,
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectValuationData(symbol: string): Promise<CollectionResult<StockValuationData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $ = cheerio.load(html);

      // PER/EPS 테이블
      const perTable = $('table.per_table');

      // PER
      const perText = $('#_per').text();
      const per = extractNumber(perText);

      // EPS
      const epsText = $('#_eps').text();
      const eps = extractNumber(epsText);

      // 추정 PER
      const cnsPerText = $('#_cns_per').text();
      const estimatedPer = extractNumber(cnsPerText);

      // 추정 EPS
      const cnsEpsText = $('#_cns_eps').text();
      const estimatedEps = extractNumber(cnsEpsText);

      // PBR
      const pbrText = $('#_pbr').text();
      const pbr = extractNumber(pbrText);

      // BPS (PBR 행의 두 번째 값)
      const pbrRow = perTable.find('tr').filter((_, el) => {
        return $(el).find('th').text().includes('PBR');
      });
      const bpsText = pbrRow.find('td em').last().text();
      const bps = extractNumber(bpsText);

      // 배당수익률
      const dividendRow = perTable.find('tr').filter((_, el) => {
        return $(el).find('th').text().includes('배당수익률');
      });
      const dividendText = dividendRow.find('td em').text();
      const dividendYield = dividendText.includes('N/A') ? null : extractNumber(dividendText);

      // ROE는 별도 페이지에서 수집 필요 (또는 계산)
      // 여기서는 null로 설정
      const roe = null;

      return {
        data: {
          per,
          pbr,
          eps,
          bps,
          roe,
          dividendYield,
          estimatedPer,
          estimatedEps,
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectFinancialData(symbol: string): Promise<CollectionResult<StockFinancialData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $ = cheerio.load(html);

      // 기업현황 비교 테이블에서 추출
      // 매출액
      const revenueRow = $('th.th_cop_comp7').parent();
      const revenueText = revenueRow.find('td').first().text();
      const revenue = convertToWon(revenueText + '억'); // 단위가 억인 경우

      // 영업이익
      const opIncomeRow = $('th.th_cop_comp8').parent();
      const opIncomeText = opIncomeRow.find('td').first().text();
      const operatingIncome = convertToWon(opIncomeText + '억');

      // 당기순이익
      const netIncomeRow = $('th.th_cop_comp10').parent();
      const netIncomeText = netIncomeRow.find('td').first().text();
      const netIncome = convertToWon(netIncomeText + '억');

      // 영업이익률, 순이익률은 계산 또는 별도 수집
      const operatingMargin = revenue && operatingIncome
        ? (operatingIncome / revenue) * 100
        : null;

      const netProfitMargin = revenue && netIncome
        ? (netIncome / revenue) * 100
        : null;

      // 재무제표 기준일 (PER/EPS 테이블에서)
      const dateMatch = $('table.per_table th:contains("PER")').text().match(/\((\d{4}\.\d{2})\)/);
      const fiscalDate = dateMatch ? dateMatch[1] : null;

      return {
        data: {
          revenue,
          operatingIncome,
          netIncome,
          operatingMargin: operatingMargin ? Math.round(operatingMargin * 100) / 100 : null,
          netProfitMargin: netProfitMargin ? Math.round(netProfitMargin * 100) / 100 : null,
          fiscalDate,
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectSupplyDemandData(symbol: string): Promise<CollectionResult<StockSupplyDemandData>> {
    const startTime = Date.now();

    try {
      // 메인 페이지에서 외국인 보유율
      const mainHtml = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $main = cheerio.load(mainHtml);

      // 외국인 보유율 (th_cop_comp6)
      const foreignOwnershipRow = $main('th.th_cop_comp6').parent();
      const foreignOwnershipText = foreignOwnershipRow.find('td').first().text();
      const foreignOwnership = extractNumber(foreignOwnershipText);

      // 투자자별 매매동향 페이지에서 순매수 데이터
      const frgnHtml = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/frgn.naver?code=${symbol}`);
      const $frgn = cheerio.load(frgnHtml);

      // 첫 번째 데이터 행 (최신)
      const firstDataRow = $frgn('table.type2 tbody tr').first();
      const cells = firstDataRow.find('td');

      // 외국인 순매수 (4번째 컬럼)
      const foreignNetBuyText = cells.eq(4).text();
      let foreignNetBuy = extractNumber(foreignNetBuyText);
      // 음수 확인 (하락 아이콘 또는 - 표시)
      if (cells.eq(4).find('.down, .minus').length > 0 && foreignNetBuy && foreignNetBuy > 0) {
        foreignNetBuy = -foreignNetBuy;
      }

      // 기관 순매수 (5번째 컬럼)
      const institutionalNetBuyText = cells.eq(5).text();
      let institutionalNetBuy = extractNumber(institutionalNetBuyText);
      if (cells.eq(5).find('.down, .minus').length > 0 && institutionalNetBuy && institutionalNetBuy > 0) {
        institutionalNetBuy = -institutionalNetBuy;
      }

      // 개인 순매수는 (외국인 + 기관)의 반대
      const individualNetBuy = foreignNetBuy !== null && institutionalNetBuy !== null
        ? -(foreignNetBuy + institutionalNetBuy)
        : null;

      return {
        data: {
          foreignOwnership,
          foreignNetBuy,
          institutionalNetBuy,
          individualNetBuy,
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectMarketData(symbol: string): Promise<CollectionResult<StockMarketData>> {
    const startTime = Date.now();

    try {
      const html = await this.fetchPage(`${NAVER_FINANCE_BASE_URL}/item/main.naver?code=${symbol}`);
      const $ = cheerio.load(html);

      // 시가총액 (#_market_sum)
      const marketCapText = $('#_market_sum').text();
      const marketCap = convertToWon(marketCapText);

      // 상장주식수
      const sharesRow = $('th:contains("상장주식수")').parent();
      const sharesText = sharesRow.find('td').text();
      const sharesOutstanding = extractNumber(sharesText);

      // 유동주식수, 베타는 네이버에서 직접 제공하지 않음
      const floatShares = null;
      const beta = null;

      return {
        data: {
          marketCap,
          sharesOutstanding,
          floatShares,
          beta,
        },
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  async collectAll(symbol: string): Promise<CollectionResult<ComprehensiveStockData>> {
    const startTime = Date.now();

    try {
      // 모든 데이터 병렬 수집
      const [
        basicInfo,
        priceData,
        valuationData,
        financialData,
        supplyDemandData,
        marketData,
      ] = await Promise.all([
        this.collectBasicInfo(symbol),
        this.collectPriceData(symbol),
        this.collectValuationData(symbol),
        this.collectFinancialData(symbol),
        this.collectSupplyDemandData(symbol),
        this.collectMarketData(symbol),
      ]);

      // 필수 데이터 확인
      if (!basicInfo.success || !basicInfo.data) {
        throw new Error('기본 정보 수집 실패');
      }
      if (!priceData.success || !priceData.data) {
        throw new Error('가격 정보 수집 실패');
      }

      const comprehensiveData: ComprehensiveStockData = {
        basicInfo: basicInfo.data,
        priceData: priceData.data,
        valuationData: valuationData.data || {
          per: null, pbr: null, eps: null, bps: null,
          roe: null, dividendYield: null, estimatedPer: null, estimatedEps: null,
        },
        financialData: financialData.data || {
          revenue: null, operatingIncome: null, netIncome: null,
          operatingMargin: null, netProfitMargin: null, fiscalDate: null,
        },
        supplyDemandData: supplyDemandData.data || {
          foreignOwnership: null, foreignNetBuy: null,
          institutionalNetBuy: null, individualNetBuy: null,
        },
        marketData: marketData.data || {
          marketCap: null, sharesOutstanding: null, floatShares: null, beta: null,
        },
        timestamp: Date.now(),
        source: 'crawling',
      };

      return {
        data: comprehensiveData,
        source: 'crawling',
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        data: null,
        source: 'crawling',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }
}

// 싱글톤 인스턴스
export const koreaStockCrawler = new KoreaStockCrawler();
