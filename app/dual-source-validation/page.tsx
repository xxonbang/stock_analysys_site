'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

// 분석 결과에서 추출한 듀얼소스 데이터 타입
interface DualSourceInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  confidence: number;
  status: 'MATCH' | 'PARTIAL' | 'CONFLICT' | 'SINGLE' | 'EMPTY';
  sources: string[];
  matchedFields: number;
  conflictFields: number;
}

// ValidationStatus에 따른 스타일
const statusConfig: Record<string, { color: string; bgColor: string; label: string; baseConfidence: string }> = {
  MATCH: { color: 'text-green-700', bgColor: 'bg-green-100', label: '완전 일치', baseConfidence: '98%' },
  PARTIAL: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', label: '부분 일치', baseConfidence: '85%' },
  CONFLICT: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: '데이터 충돌', baseConfidence: '70%' },
  SINGLE: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: '단일 소스', baseConfidence: '65%' },
  EMPTY: { color: 'text-gray-700', bgColor: 'bg-gray-100', label: '데이터 없음', baseConfidence: '0%' },
};

export default function DualSourceValidationPage() {
  const { isAuthenticated, username } = useAuth();
  const router = useRouter();
  const [validationData, setValidationData] = useState<DualSourceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 권한 체크 및 데이터 로드
  useEffect(() => {
    if (!isAuthenticated || username !== 'xxonbang') {
      router.push('/');
      return;
    }

    // sessionStorage에서 분석 결과 로드
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const stored = sessionStorage.getItem('analysisResults');
    if (!stored) {
      setError('분석 결과가 없습니다. 먼저 종목 분석을 수행해주세요.');
      setLoading(false);
      return;
    }

    try {
      const data = JSON.parse(stored);
      const results = data.results || [];

      if (results.length === 0) {
        setError('분석된 종목이 없습니다.');
        setLoading(false);
        return;
      }

      // 각 결과에서 듀얼소스 데이터 추출
      const extractedData: DualSourceInfo[] = results.map((result: {
        symbol: string;
        name?: string;
        marketData: {
          price: number;
          change: number;
          changePercent: number;
          volume: number;
          _dualSource?: {
            confidence: number;
            status: 'MATCH' | 'PARTIAL' | 'CONFLICT' | 'SINGLE' | 'EMPTY';
            sources: string[];
            matchedFields: number;
            conflictFields: number;
          };
        };
      }) => {
        const dualSource = result.marketData?._dualSource;

        return {
          symbol: result.symbol,
          name: result.name || result.symbol,
          price: result.marketData?.price || 0,
          change: result.marketData?.change || 0,
          changePercent: result.marketData?.changePercent || 0,
          volume: result.marketData?.volume || 0,
          confidence: dualSource?.confidence ?? 1,
          status: dualSource?.status || 'SINGLE',
          sources: dualSource?.sources || ['api'],
          matchedFields: dualSource?.matchedFields ?? 0,
          conflictFields: dualSource?.conflictFields ?? 0,
        };
      });

      setValidationData(extractedData);
    } catch (err) {
      console.error('Failed to parse analysis results:', err);
      setError('분석 결과를 읽는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, username, router]);

  if (!isAuthenticated || username !== 'xxonbang') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              듀얼소스 검증
            </h1>
            <p className="text-gray-600">
              두 개의 독립적인 데이터 소스에서 수집한 데이터를 교차 검증합니다.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            분석 결과로 돌아가기
          </Button>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-700 font-medium">오류</div>
            <div className="text-red-600">{error}</div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="mt-4"
            >
              홈으로 이동
            </Button>
          </div>
        )}

        {!error && validationData.length > 0 && (
          <>
            {/* 검증 프로세스 다이어그램 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">검증 프로세스</h2>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex items-start justify-between gap-4">
                    {/* Source A */}
                    <div className="flex-1 text-center">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                        <div className="font-semibold text-blue-700">Source A</div>
                        <div className="text-sm text-blue-600">Agentic Screenshot</div>
                        <div className="text-xs text-gray-500 mt-1">(Puppeteer + Vision AI)</div>
                      </div>
                      <div className="text-gray-400">|</div>
                      <div className="text-gray-400">v</div>
                    </div>

                    {/* Source B */}
                    <div className="flex-1 text-center">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-2">
                        <div className="font-semibold text-purple-700">Source B</div>
                        <div className="text-sm text-purple-600">전통적 API</div>
                        <div className="text-xs text-gray-500 mt-1">(REST API)</div>
                      </div>
                      <div className="text-gray-400">|</div>
                      <div className="text-gray-400">v</div>
                    </div>
                  </div>

                  {/* 검증 엔진 */}
                  <div className="flex justify-center my-4">
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 w-3/4">
                      <div className="text-center font-semibold text-gray-700 mb-2">검증 엔진 (Validation Engine)</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-green-100 text-green-700 rounded p-2 text-center">
                          <div className="font-medium">일치</div>
                          <div>허용오차 내 동일</div>
                        </div>
                        <div className="bg-orange-100 text-orange-700 rounded p-2 text-center">
                          <div className="font-medium">충돌</div>
                          <div>오차 초과 차이</div>
                        </div>
                        <div className="bg-blue-100 text-blue-700 rounded p-2 text-center">
                          <div className="font-medium">단일값</div>
                          <div>한쪽만 존재</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 결과 */}
                  <div className="flex justify-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="font-semibold text-green-700">ValidatedStockData</div>
                      <div className="text-sm text-green-600">(신뢰도 포함)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 신뢰도 점수 체계 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">신뢰도 점수 체계</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(statusConfig).map(([status, config]) => (
                  <div key={status} className={`${config.bgColor} rounded-lg p-4 text-center`}>
                    <div className={`font-bold text-lg ${config.color}`}>{status}</div>
                    <div className={`text-sm ${config.color}`}>{config.label}</div>
                    <div className={`text-2xl font-bold ${config.color} mt-2`}>{config.baseConfidence}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 분석 종목별 검증 결과 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                분석 종목 검증 결과 ({validationData.length}개 종목)
              </h2>

              <div className="space-y-4">
                {validationData.map((item) => {
                  const config = statusConfig[item.status] || statusConfig.SINGLE;

                  return (
                    <div
                      key={item.symbol}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* 종목 헤더 */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-lg text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.symbol}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* 신뢰도 */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">신뢰도</div>
                            <div className="text-xl font-bold text-gray-900">
                              {(item.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                          {/* 검증 상태 */}
                          <div className={`${config.bgColor} rounded-lg px-4 py-2 text-center`}>
                            <div className={`font-bold ${config.color}`}>{config.label}</div>
                          </div>
                        </div>
                      </div>

                      {/* 종목 상세 정보 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500">현재가</div>
                          <div className="font-semibold">{item.price.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">등락</div>
                          <div className={`font-semibold ${item.change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {item.change >= 0 ? '+' : ''}{item.change.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">등락률</div>
                          <div className={`font-semibold ${item.changePercent >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">거래량</div>
                          <div className="font-semibold">{item.volume.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* 필드 분석 */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 rounded p-3 text-center">
                          <div className="text-sm text-green-600">일치 필드</div>
                          <div className="text-xl font-bold text-green-700">{item.matchedFields}개</div>
                        </div>
                        <div className="bg-orange-50 rounded p-3 text-center">
                          <div className="text-sm text-orange-600">충돌 필드</div>
                          <div className="text-xl font-bold text-orange-700">{item.conflictFields}개</div>
                        </div>
                      </div>

                      {/* 사용된 소스 */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2">사용된 데이터 소스</div>
                        <div className="flex gap-2">
                          {item.sources.map((source) => (
                            <span
                              key={source}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                source === 'agentic'
                                  ? 'bg-blue-100 text-blue-700'
                                  : source === 'crawling'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {source === 'agentic' ? 'Agentic Screenshot' : source === 'crawling' ? '전통적 크롤링' : 'REST API'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 전체 요약 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">전체 요약</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">분석 종목 수</div>
                  <div className="text-3xl font-bold text-gray-900">{validationData.length}개</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">평균 신뢰도</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {(validationData.reduce((sum, d) => sum + d.confidence, 0) / validationData.length * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">일치/부분일치</div>
                  <div className="text-3xl font-bold text-green-700">
                    {validationData.filter(d => d.status === 'MATCH' || d.status === 'PARTIAL').length}개
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-600">충돌/단일</div>
                  <div className="text-3xl font-bold text-orange-700">
                    {validationData.filter(d => d.status === 'CONFLICT' || d.status === 'SINGLE').length}개
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
