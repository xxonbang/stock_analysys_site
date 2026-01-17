import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getStockListing } from '@/lib/korea-stock-mapper-dynamic';

const CACHE_DIR = join(process.cwd(), '.cache');
const STOCK_LISTING_CACHE_FILE = join(CACHE_DIR, 'krx-stock-listing.json');

/**
 * 종목 리스트 캐시 강제 갱신 API
 * POST /api/refresh-stock-listing
 */
export async function POST(request: NextRequest) {
  try {
    // 캐시 삭제
    if (existsSync(STOCK_LISTING_CACHE_FILE)) {
      await unlink(STOCK_LISTING_CACHE_FILE);
      console.log('[API] Cache file deleted');
    }
    
    // 새로 가져오기
    const data = await getStockListing();
    
    return NextResponse.json({ 
      success: true, 
      count: data.length,
      message: `캐시가 갱신되었습니다. ${data.length}개 종목이 로드되었습니다.`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] Failed to refresh stock listing cache:', errorMessage);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      message: '캐시 갱신에 실패했습니다.'
    }, { status: 500 });
  }
}
