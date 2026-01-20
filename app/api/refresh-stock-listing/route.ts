import { NextRequest, NextResponse } from 'next/server';
import {
  getStockListing,
  invalidateCache,
  getCacheStatus,
} from '@/lib/korea-stock-mapper-dynamic';

/**
 * 캐시 상태 조회 API
 * GET /api/refresh-stock-listing
 */
export async function GET() {
  try {
    const status = await getCacheStatus();

    return NextResponse.json({
      success: true,
      cache: {
        exists: status.exists,
        stockCount: status.stockCount,
        version: status.version,
        isExpired: status.isExpired,
        ageHours: status.ageHours,
        timestamp: status.timestamp
          ? new Date(status.timestamp).toISOString()
          : null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] Failed to get cache status:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * 종목 리스트 캐시 강제 갱신 API
 * POST /api/refresh-stock-listing
 */
export async function POST(request: NextRequest) {
  try {
    // 캐시 무효화
    const invalidateResult = await invalidateCache();
    console.log('[API] Cache invalidated:', invalidateResult.message);

    // 새로 가져오기
    const data = await getStockListing();

    // 새 캐시 상태 조회
    const newStatus = await getCacheStatus();

    return NextResponse.json({
      success: true,
      count: data.length,
      message: `캐시가 갱신되었습니다. ${data.length}개 종목이 로드되었습니다.`,
      cache: {
        version: newStatus.version,
        timestamp: newStatus.timestamp
          ? new Date(newStatus.timestamp).toISOString()
          : null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] Failed to refresh stock listing cache:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: '캐시 갱신에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
