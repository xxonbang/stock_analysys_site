/**
 * 캐시 통계 API
 *
 * 캐시 상태를 모니터링하고 관리하기 위한 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

export async function GET() {
  const stats = cache.getStats();

  return NextResponse.json({
    success: true,
    stats: {
      ...stats,
      description: {
        hits: '캐시 히트 횟수 (API 호출 절약)',
        misses: '캐시 미스 횟수 (실제 API 호출)',
        size: '현재 캐시된 항목 수',
        hitRate: '캐시 적중률 (높을수록 효율적)',
      },
    },
    cacheTTL: {
      quote: '5분 (현재가)',
      historical: '1시간 (과거 데이터)',
      exchangeRate: '10분 (환율)',
      vix: '10분 (VIX)',
      news: '30분 (뉴스)',
      stockData: '5분 (통합 주식 데이터)',
    },
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pattern = searchParams.get('pattern');

  if (pattern) {
    // 특정 패턴 삭제
    const deleted = cache.deletePattern(pattern);
    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted} cache entries matching pattern: ${pattern}`,
    });
  }

  // 전체 삭제
  cache.clear();
  return NextResponse.json({
    success: true,
    message: 'All cache cleared',
  });
}

export async function POST() {
  // 만료된 캐시 정리
  const cleaned = cache.cleanup();
  return NextResponse.json({
    success: true,
    message: `Cleaned ${cleaned} expired cache entries`,
    stats: cache.getStats(),
  });
}
