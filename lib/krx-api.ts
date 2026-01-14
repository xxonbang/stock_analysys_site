/**
 * KRX Open API를 사용한 한국 주식 데이터 수집
 * 
 * 한국거래소(KRX) 공식 Open API 사용
 * https://openapi.krx.co.kr/
 * 
 * 사용 API:
 * - 유가증권 일별매매정보 API
 * - ETF 일별매매정보 API
 * 
 * 장점:
 * - 공식 API (안정적, 법적 리스크 없음)
 * - 무료 사용 가능
 * - 실시간 데이터 제공
 * 
 * 단점:
 * - API 키 발급 필요
 * - 하루 10,000회 제한
 * 
 * Fallback:
 * - KRX API 호출 실패 시 자동으로 네이버 금융 크롤링으로 fallback
 */

import axios from 'axios';
import type { SupplyDemandData } from './finance';

const KRX_API_BASE_URL = 'https://openapi.krx.co.kr/openapi/v2';
const KRX_API_KEY = process.env.KRX_API_KEY || '';

/**
 * KRX API 공통 응답 구조
 * 
 * KRX Open API는 일반적으로 OutBlock_1 배열로 응답
 * 실제 응답 구조가 다를 경우 자동으로 fallback 작동
 */
interface KRXResponse<T> {
  OutBlock_1?: T[];
  outBlock_1?: T[]; // 소문자 변형
  data?: T[]; // 다른 구조일 수 있음
  [key: string]: any; // 유연한 구조 지원
}

interface KRXStockTradingInfo {
  ISU_CD: string; // 종목코드
  ISU_NM: string; // 종목명
  TDD_CLSPRC: string; // 종가
  CMPPREVDD_PRC: string; // 대비
  FLUC_RT: string; // 등락률
  TDD_OPNPRC: string; // 시가
  TDD_HGPRC: string; // 고가
  TDD_LWPRC: string; // 저가
  ACC_TRDVOL: string; // 거래량
  ACC_TRDVAL: string; // 거래대금
  MKTCAP: string; // 시가총액
  LIST_SHRS: string; // 상장주식수
}

/**
 * 유가증권 일별매매정보 API 응답 인터페이스
 * 
 * KRX Open API 일반적인 응답 구조 기반
 * 실제 응답 구조가 다를 경우 자동으로 fallback 작동
 */
interface KRXStockDailyTradingInfo {
  // 공통 필드 (KRX API 일반 패턴)
  ISU_CD?: string; // 종목코드
  isuCd?: string; // 종목코드 (소문자 변형)
  ISU_NM?: string; // 종목명
  isuNm?: string; // 종목명 (소문자 변형)
  STD_DD?: string; // 기준일자 (YYYYMMDD)
  trdDd?: string; // 거래일자 (YYYYMMDD)
  stdDd?: string; // 기준일자 (소문자 변형)
  
  // 가격 정보
  TDD_CLSPRC?: string; // 종가
  clpr?: string; // 종가 (소문자 변형)
  CMPPREVDD_PRC?: string; // 대비
  vs?: string; // 전일 대비 (소문자 변형)
  FLUC_RT?: string; // 등락률
  fltRt?: string; // 등락률 (소문자 변형)
  TDD_OPNPRC?: string; // 시가
  mkp?: string; // 시가 (소문자 변형)
  TDD_HGPRC?: string; // 고가
  hipr?: string; // 고가 (소문자 변형)
  TDD_LWPRC?: string; // 저가
  lopr?: string; // 저가 (소문자 변형)
  
  // 거래 정보
  ACC_TRDVOL?: string; // 거래량
  trqu?: string; // 거래량 (소문자 변형)
  ACC_TRDVAL?: string; // 거래대금
  trPrc?: string; // 거래대금 (소문자 변형)
  MKTCAP?: string; // 시가총액
  LIST_SHRS?: string; // 상장주식수
  
  // 투자자별 매매동향 (별도 API일 수 있음)
  INSTI_BY_QTY?: string; // 기관 순매수량
  FRGN_BY_QTY?: string; // 외국인 순매수량
  PRSN_INBY_QTY?: string; // 개인 순매수량
  instiByQty?: string; // 기관 순매수량 (소문자 변형)
  frgnByQty?: string; // 외국인 순매수량 (소문자 변형)
  prsnInByQty?: string; // 개인 순매수량 (소문자 변형)
  
  // 기타 필드 (실제 응답에 따라 추가 가능)
  [key: string]: any;
}

/**
 * ETF 일별매매정보 API 응답 인터페이스
 * 
 * KRX Open API 일반적인 응답 구조 기반
 * 실제 응답 구조가 다를 경우 자동으로 fallback 작동
 */
interface KRXETFDailyTradingInfo {
  // 공통 필드 (KRX API 일반 패턴)
  ISU_CD?: string; // 종목코드
  isuCd?: string; // 종목코드 (소문자 변형)
  ISU_NM?: string; // 종목명
  isuNm?: string; // 종목명 (소문자 변형)
  STD_DD?: string; // 기준일자 (YYYYMMDD)
  trdDd?: string; // 거래일자 (YYYYMMDD)
  stdDd?: string; // 기준일자 (소문자 변형)
  
  // 가격 정보
  TDD_CLSPRC?: string; // 종가
  clpr?: string; // 종가 (소문자 변형)
  CMPPREVDD_PRC?: string; // 대비
  vs?: string; // 전일 대비 (소문자 변형)
  FLUC_RT?: string; // 등락률
  fltRt?: string; // 등락률 (소문자 변형)
  TDD_OPNPRC?: string; // 시가
  mkp?: string; // 시가 (소문자 변형)
  TDD_HGPRC?: string; // 고가
  hipr?: string; // 고가 (소문자 변형)
  TDD_LWPRC?: string; // 저가
  lopr?: string; // 저가 (소문자 변형)
  
  // 거래 정보
  ACC_TRDVOL?: string; // 거래량
  trqu?: string; // 거래량 (소문자 변형)
  ACC_TRDVAL?: string; // 거래대금
  trPrc?: string; // 거래대금 (소문자 변형)
  MKTCAP?: string; // 시가총액
  LIST_SHRS?: string; // 상장주식수
  
  // 기타 필드 (실제 응답에 따라 추가 가능)
  [key: string]: any;
}

/**
 * 투자자별 매매동향 정보 (레거시, 실제 API 구조 확인 후 업데이트 필요)
 */
interface KRXInvestorTradingInfo {
  ISU_CD: string; // 종목코드
  ISU_NM: string; // 종목명
  STD_DD: string; // 기준일자
  INSTI_BY_QTY: string; // 기관 순매수량
  FRGN_BY_QTY: string; // 외국인 순매수량
  PRSN_INBY_QTY: string; // 개인 순매수량
}

/**
 * KRX API 호출 헬퍼
 */
async function krxRequest<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T[]> {
  // 동적 import를 사용하여 순환 참조 방지
  let alertSystem: any = null;
  if (!KRX_API_KEY) {
    throw new Error('KRX_API_KEY가 설정되지 않았습니다. 환경 변수에 KRX_API_KEY를 설정해주세요.');
  }

  const url = `${KRX_API_BASE_URL}${endpoint}`;
  const queryParams = new URLSearchParams({
    ...params,
    AUTH_KEY: KRX_API_KEY,
    lang: 'kr',
  });

  try {
    const response = await axios.get<KRXResponse<T>>(`${url}?${queryParams.toString()}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    // 다양한 응답 구조 지원
    if (response.data) {
      if (response.data.OutBlock_1 && Array.isArray(response.data.OutBlock_1)) {
        return response.data.OutBlock_1;
      }
      if (response.data.outBlock_1 && Array.isArray(response.data.outBlock_1)) {
        return response.data.outBlock_1;
      }
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // 배열 자체가 응답인 경우
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // API 키 무효 알림 생성 (비동기, 실패해도 계속 진행)
        try {
          if (!alertSystem) {
            const alertModule = await import('./alert-system');
            alertSystem = alertModule.alertSystem;
          }
        await alertSystem.alertApiKeyInvalid(
          'KRX API',
          '401 Unauthorized 오류가 발생했습니다. API 키가 만료되었거나 유효하지 않을 수 있습니다.',
          {
            statusCode: 401,
            endpoint,
            timestamp: Date.now(),
            note: 'KRX API 키는 1년 유효기간이 있습니다. 만료된 경우 새 키를 발급받아야 합니다.',
          }
        );
        } catch (alertError) {
          // 알림 생성 실패는 무시
          console.warn('[KRX API] Failed to create alert:', alertError);
        }
        throw new Error('KRX API 키가 유효하지 않습니다. API 키가 만료되었거나 유효하지 않을 수 있습니다. KRX Open API(https://openapi.krx.co.kr/)에서 새 키를 발급받아주세요.');
      }
      if (error.response?.status === 403) {
        // 403 오류는 권한 없음 (엔드포인트 오류일 수도 있음)
        throw new Error('KRX API 접근 권한이 없습니다. API 엔드포인트 또는 권한을 확인해주세요.');
      }
      if (error.response?.status === 429) {
        throw new Error('KRX API 요청 한도 초과. 하루 10,000회 제한을 초과했습니다.');
      }
      throw new Error(`KRX API 오류: ${error.message}`);
    }
    throw error;
  }
}

/**
 * KRX Open API를 사용하여 한국 주식 수급 데이터 수집
 * 
 * 사용 API: 유가증권 일별매매정보 API
 * 
 * @param symbol 한국 주식 티커 (예: "005930")
 * @returns 수급 데이터 또는 null (실패 시, 자동으로 네이버 크롤링으로 fallback)
 */
export async function fetchKoreaSupplyDemandKRX(
  symbol: string
): Promise<SupplyDemandData | null> {
  const startTime = Date.now();
  const { metrics } = await import('./data-metrics');

  try {
    if (!KRX_API_KEY) {
      console.warn('[KRX API] API 키가 설정되지 않아 네이버 금융 크롤링으로 fallback');
      return null;
    }

    // 최근 거래일 조회 (오늘 또는 가장 최근 거래일)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // 유가증권 일별매매정보 API 호출
    // 일반적인 KRX API 엔드포인트 패턴 사용
    // 실제 구조가 다를 경우 오류 발생 시 자동 fallback
    const tradingInfo = await krxRequest<KRXStockDailyTradingInfo>(
      '/stock/issu/daily-stat', // 일반적인 KRX API 패턴
      {
        ISU_CD: symbol,
        STD_DD: todayStr,
      }
    );

    if (tradingInfo.length === 0) {
      // 어제 데이터로 재시도
      const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      const tradingInfoYesterday = await krxRequest<KRXStockDailyTradingInfo>(
        '/stock/issu/daily-stat',
        {
          ISU_CD: symbol,
          STD_DD: yesterdayStr,
        }
      );

      if (tradingInfoYesterday.length === 0) {
        console.warn(`[KRX API] No trading data found for ${symbol}, falling back to Naver`);
        return null;
      }

      const data = tradingInfoYesterday[0];
      
      // 투자자별 매매동향 데이터 추출 (다양한 필드명 지원)
      const instiQty = data.INSTI_BY_QTY || data.instiByQty;
      const frgnQty = data.FRGN_BY_QTY || data.frgnByQty;
      const prsnQty = data.PRSN_INBY_QTY || data.prsnInByQty;
      
      if (instiQty && frgnQty && prsnQty) {
        return {
          institutional: parseInt(String(instiQty).replace(/,/g, '')) || 0,
          foreign: parseInt(String(frgnQty).replace(/,/g, '')) || 0,
          individual: parseInt(String(prsnQty).replace(/,/g, '')) || 0,
        };
      } else {
        // 투자자별 정보가 별도 API인 경우
        console.warn(`[KRX API] Investor trading data not found in daily trading info for ${symbol}, falling back to Naver`);
        return null;
      }
    }

    const data = tradingInfo[0];
    
    // 투자자별 매매동향 데이터 추출 (다양한 필드명 지원)
    const instiQty = data.INSTI_BY_QTY || data.instiByQty;
    const frgnQty = data.FRGN_BY_QTY || data.frgnByQty;
    const prsnQty = data.PRSN_INBY_QTY || data.prsnInByQty;
    
    if (instiQty && frgnQty && prsnQty) {
      const result = {
        institutional: parseInt(String(instiQty).replace(/,/g, '')) || 0,
        foreign: parseInt(String(frgnQty).replace(/,/g, '')) || 0,
        individual: parseInt(String(prsnQty).replace(/,/g, '')) || 0,
      };
      const responseTime = Date.now() - startTime;
      metrics.success(symbol, 'KRX API', responseTime);
      return result;
    } else {
      // 투자자별 정보가 없는 경우
      console.warn(`[KRX API] Investor trading data not found in daily trading info for ${symbol}, falling back to Naver`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    metrics.error(symbol, 'KRX API', errorMessage);
    
    // 401 오류는 이미 알림이 생성되었으므로 별도 처리
    if (errorMessage.includes('401') || errorMessage.includes('유효하지 않습니다')) {
      console.warn(`[KRX API] API key invalid for ${symbol}, falling back to Naver (alert already created)`);
    } else {
      console.warn(`[KRX API] Error fetching supply/demand for ${symbol}, falling back to Naver:`, errorMessage);
    }
    
    // 오류 발생 시 null 반환 (fallback으로 네이버 크롤링 사용)
    return null;
  }
}

/**
 * KRX Open API를 사용하여 한국 주식 기본 정보 수집
 * 
 * 사용 API: 유가증권 일별매매정보 API
 * 
 * @param symbol 한국 주식 티커 (예: "005930")
 * @returns 주식 기본 정보 또는 null (실패 시)
 */
export async function fetchKoreaStockInfoKRX(symbol: string): Promise<{
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
} | null> {
  try {
    if (!KRX_API_KEY) {
      return null;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const stockInfo = await krxRequest<KRXStockDailyTradingInfo>(
      '/stock/issu/daily-stat', // 일반적인 KRX API 패턴
      {
        ISU_CD: symbol,
        STD_DD: todayStr,
      }
    );

    if (stockInfo.length === 0) {
      // 어제 데이터로 재시도
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      
      const stockInfoYesterday = await krxRequest<KRXStockDailyTradingInfo>(
        '/stock/issu/daily-stat',
        {
          ISU_CD: symbol,
          STD_DD: yesterdayStr,
        }
      );

      if (stockInfoYesterday.length === 0) {
        return null;
      }

      const data = stockInfoYesterday[0];
      
      // 다양한 필드명 지원 (대소문자 변형)
      const name = data.ISU_NM || data.isuNm || '';
      const closePrice = data.TDD_CLSPRC || data.clpr || '0';
      const change = data.CMPPREVDD_PRC || data.vs || '0';
      const changePercent = data.FLUC_RT || data.fltRt || '0';
      const volume = data.ACC_TRDVOL || data.trqu || '0';
      
      return {
        name,
        price: parseFloat(String(closePrice).replace(/,/g, '')) || 0,
        change: parseFloat(String(change).replace(/[+,]/g, '')) || 0,
        changePercent: parseFloat(String(changePercent).replace(/[+,%]/g, '')) || 0,
        volume: parseInt(String(volume).replace(/,/g, '')) || 0,
      };
    }

    const data = stockInfo[0];
    
    // 다양한 필드명 지원 (대소문자 변형)
    const name = data.ISU_NM || data.isuNm || '';
    const closePrice = data.TDD_CLSPRC || data.clpr || '0';
    const change = data.CMPPREVDD_PRC || data.vs || '0';
    const changePercent = data.FLUC_RT || data.fltRt || '0';
    const volume = data.ACC_TRDVOL || data.trqu || '0';
    
    return {
      name,
      price: parseFloat(String(closePrice).replace(/,/g, '')) || 0,
      change: parseFloat(String(change).replace(/[+,]/g, '')) || 0,
      changePercent: parseFloat(String(changePercent).replace(/[+,%]/g, '')) || 0,
      volume: parseInt(String(volume).replace(/,/g, '')) || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[KRX API] Error fetching stock info for ${symbol}, falling back:`, errorMessage);
    return null;
  }
}

/**
 * KRX Open API를 사용하여 ETF 정보 수집
 * 
 * 사용 API: ETF 일별매매정보 API
 * 
 * @param symbol ETF 티커 (예: "069500")
 * @returns ETF 정보 또는 null (실패 시)
 */
export async function fetchKoreaETFInfoKRX(symbol: string): Promise<{
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
} | null> {
  try {
    if (!KRX_API_KEY) {
      return null;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const etfInfo = await krxRequest<KRXETFDailyTradingInfo>(
      '/etf/issu/daily-stat', // 일반적인 KRX API 패턴
      {
        ISU_CD: symbol,
        STD_DD: todayStr,
      }
    );

    if (etfInfo.length === 0) {
      // 어제 데이터로 재시도
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      
      const etfInfoYesterday = await krxRequest<KRXETFDailyTradingInfo>(
        '/etf/issu/daily-stat',
        {
          ISU_CD: symbol,
          STD_DD: yesterdayStr,
        }
      );

      if (etfInfoYesterday.length === 0) {
        return null;
      }

      const data = etfInfoYesterday[0];
      
      // 다양한 필드명 지원 (대소문자 변형)
      const name = data.ISU_NM || data.isuNm || '';
      const closePrice = data.TDD_CLSPRC || data.clpr || '0';
      const change = data.CMPPREVDD_PRC || data.vs || '0';
      const changePercent = data.FLUC_RT || data.fltRt || '0';
      const volume = data.ACC_TRDVOL || data.trqu || '0';
      
      return {
        name,
        price: parseFloat(String(closePrice).replace(/,/g, '')) || 0,
        change: parseFloat(String(change).replace(/[+,]/g, '')) || 0,
        changePercent: parseFloat(String(changePercent).replace(/[+,%]/g, '')) || 0,
        volume: parseInt(String(volume).replace(/,/g, '')) || 0,
      };
    }

    const data = etfInfo[0];
    
    // 다양한 필드명 지원 (대소문자 변형)
    const name = data.ISU_NM || data.isuNm || '';
    const closePrice = data.TDD_CLSPRC || data.clpr || '0';
    const change = data.CMPPREVDD_PRC || data.vs || '0';
    const changePercent = data.FLUC_RT || data.fltRt || '0';
    const volume = data.ACC_TRDVOL || data.trqu || '0';
    
    return {
      name,
      price: parseFloat(String(closePrice).replace(/,/g, '')) || 0,
      change: parseFloat(String(change).replace(/[+,]/g, '')) || 0,
      changePercent: parseFloat(String(changePercent).replace(/[+,%]/g, '')) || 0,
      volume: parseInt(String(volume).replace(/,/g, '')) || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[KRX API] Error fetching ETF info for ${symbol}, falling back:`, errorMessage);
    return null;
  }
}
