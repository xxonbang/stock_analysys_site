/**
 * 데이터 품질 메트릭 조회 API
 * 
 * GET /api/metrics?source=Yahoo%20Finance&limit=50
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/data-metrics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const symbol = searchParams.get('symbol') || undefined;

    // 데이터 소스별 메트릭
    const dataSourceMetrics = metricsCollector.getDataSourceMetrics(source);

    // 최근 메트릭
    const recentMetrics = metricsCollector.getRecentMetrics(limit);

    // 특정 심볼 메트릭
    const symbolMetrics = symbol ? metricsCollector.getSymbolMetrics(symbol) : undefined;

    return NextResponse.json({
      success: true,
      data: {
        dataSourceMetrics,
        recentMetrics: symbol ? symbolMetrics : recentMetrics,
        summary: {
          totalMetrics: metricsCollector.getAllMetrics().length,
          dataSourceCount: dataSourceMetrics.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
