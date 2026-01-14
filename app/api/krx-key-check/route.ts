/**
 * KRX API 키 유효성 검사 API
 * 
 * GET /api/krx-key-check
 * 
 * KRX API 키가 유효한지 테스트하고 결과를 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const KRX_API_BASE_URL = 'https://openapi.krx.co.kr/openapi/v2';
const KRX_API_KEY = process.env.KRX_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    if (!KRX_API_KEY) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'KRX_API_KEY가 설정되지 않았습니다.',
        message: '환경 변수에 KRX_API_KEY를 설정해주세요.',
      });
    }

    // 유가증권 일별매매정보 API로 키 유효성 테스트
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // 일반적인 KRX API 엔드포인트 패턴 사용
    const testUrl = `${KRX_API_BASE_URL}/stock/issu/daily-stat`;
    const queryParams = new URLSearchParams({
      AUTH_KEY: KRX_API_KEY,
      ISU_CD: '005930', // 삼성전자 (테스트용)
      STD_DD: todayStr, // 기준일자
      lang: 'kr',
    });

    try {
      const response = await axios.get(`${testUrl}?${queryParams.toString()}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (response.status === 200) {
        return NextResponse.json({
          success: true,
          valid: true,
          message: 'KRX API 키가 유효합니다.',
          statusCode: response.status,
        });
      }

      return NextResponse.json({
        success: false,
        valid: false,
        message: 'KRX API 키 검증 실패',
        statusCode: response.status,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return NextResponse.json({
            success: false,
            valid: false,
            error: 'KRX API 키가 유효하지 않습니다.',
            message: 'API 키가 만료되었거나 유효하지 않습니다. KRX Open API(https://openapi.krx.co.kr/)에서 새 키를 발급받아주세요.',
            statusCode: 401,
            note: 'KRX API 키는 1년 유효기간이 있습니다.',
          });
        }

        if (error.response?.status === 403) {
          return NextResponse.json({
            success: false,
            valid: false,
            error: 'KRX API 접근 권한이 없습니다.',
            message: 'API 접근 권한이 없습니다. API 엔드포인트 경로가 올바른지 확인해주세요. 오류가 계속되면 네이버 크롤링으로 자동 fallback됩니다.',
            statusCode: 403,
            note: '403 오류는 엔드포인트 경로 오류일 수 있습니다. Fallback이 자동으로 작동합니다.',
          });
        }

        if (error.response?.status === 429) {
          return NextResponse.json({
            success: false,
            valid: false,
            error: 'KRX API 요청 한도 초과',
            message: '하루 10,000회 제한을 초과했습니다.',
            statusCode: 429,
          });
        }

        return NextResponse.json({
          success: false,
          valid: false,
          error: `KRX API 오류: ${error.message}`,
          statusCode: error.response?.status || 500,
        });
      }

      return NextResponse.json({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Error checking KRX API key:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
