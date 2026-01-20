/**
 * 듀얼 소스 데이터 수집 테스트 API
 *
 * 사용 예:
 * GET /api/dual-source-test?symbol=005930 (삼성전자)
 * GET /api/dual-source-test?symbol=AAPL (애플)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  collectStockDataDualSource,
  collectStockDataSingleSource,
  detectMarketType,
} from '@/lib/dual-source';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 최대 60초 (Vercel Pro)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const mode = searchParams.get('mode') || 'dual'; // 'dual' | 'single'
  const source = searchParams.get('source') || 'A'; // 'A' | 'B' (single 모드에서만)

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol 파라미터가 필요합니다' },
      { status: 400 }
    );
  }

  try {
    const marketType = detectMarketType(symbol);
    const startTime = Date.now();

    if (mode === 'single') {
      // 단일 소스 모드
      const result = await collectStockDataSingleSource(
        symbol,
        source as 'A' | 'B'
      );

      return NextResponse.json({
        success: result.success,
        mode: 'single',
        market: marketType,
        source: result.source,
        latency: result.latency,
        totalTime: Date.now() - startTime,
        data: result.data,
        error: result.error,
      });
    }

    // 듀얼 소스 모드
    const result = await collectStockDataDualSource(symbol, {
      logResults: true,
    });

    return NextResponse.json({
      success: true,
      mode: 'dual',
      market: marketType,
      confidence: result.confidence,
      validationStatus: result.validation.status,
      matchedFields: result.validation.matchedFields.length,
      conflictFields: result.validation.conflictFields.length,
      supplementedFields: result.validation.supplementedFields.length,
      sources: result.sources,
      totalTime: Date.now() - startTime,
      data: result.data,
      validation: result.validation,
    });
  } catch (error) {
    console.error('[DualSource Test] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        symbol,
      },
      { status: 500 }
    );
  }
}
