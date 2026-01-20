'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ValidationResult {
  success: boolean;
  mode: string;
  market: string;
  confidence: number;
  validationStatus: 'MATCH' | 'PARTIAL' | 'CONFLICT' | 'SINGLE' | 'EMPTY';
  matchedFields: number;
  conflictFields: number;
  supplementedFields: number;
  sources: string[];
  totalTime: number;
  data: {
    basicInfo: {
      symbol: string;
      name: string;
      market: string;
      exchange: string;
    };
    priceData: {
      currentPrice: number;
      change: number;
      changePercent: number;
      volume: number;
    };
    valuationData: {
      per: number | null;
      pbr: number | null;
      eps: number | null;
      roe: number | null;
    };
    supplyDemandData: {
      foreignNetBuy: number | null;
      institutionalNetBuy: number | null;
      individualNetBuy: number | null;
    };
  };
  validation: {
    status: string;
    matchedFields: string[];
    conflictFields: string[];
    supplementedFields: string[];
    confidence: number;
  };
  error?: string;
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
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 권한 체크
  useEffect(() => {
    if (!isAuthenticated || username !== 'xxonbang') {
      router.push('/');
    }
  }, [isAuthenticated, username, router]);

  const handleValidation = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/dual-source-test?symbol=${encodeURIComponent(symbol.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '검증 실패');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || username !== 'xxonbang') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            듀얼소스 검증
          </h1>
          <p className="text-gray-600">
            두 개의 독립적인 데이터 소스에서 수집한 데이터를 교차 검증합니다.
          </p>
        </div>

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

        {/* 종목 입력 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">검증 테스트</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                종목 코드
              </label>
              <Input
                id="symbol"
                type="text"
                placeholder="예: 005930, AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidation()}
                disabled={loading}
              />
            </div>
            <Button onClick={handleValidation} disabled={loading || !symbol.trim()}>
              {loading ? '검증 중...' : '검증 시작'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            한국 주식: 6자리 숫자 (예: 005930), 미국 주식: 티커 심볼 (예: AAPL)
          </p>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-700 font-medium">오류 발생</div>
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {/* 검증 결과 */}
        {result && (
          <div className="space-y-6">
            {/* 요약 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">검증 결과 요약</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 신뢰도 */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">신뢰도</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                {/* 검증 상태 */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">검증 상태</div>
                  <div className={`text-xl font-bold ${statusConfig[result.validationStatus]?.color || 'text-gray-700'}`}>
                    {statusConfig[result.validationStatus]?.label || result.validationStatus}
                  </div>
                </div>

                {/* 시장 */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">시장</div>
                  <div className="text-xl font-bold text-gray-900">{result.market}</div>
                </div>

                {/* 소요 시간 */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">소요 시간</div>
                  <div className="text-xl font-bold text-gray-900">{(result.totalTime / 1000).toFixed(1)}초</div>
                </div>
              </div>
            </div>

            {/* 필드 분석 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">필드 분석</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">일치 필드</div>
                  <div className="text-2xl font-bold text-green-700">{result.matchedFields}개</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-600">충돌 필드</div>
                  <div className="text-2xl font-bold text-orange-700">{result.conflictFields}개</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">보완 필드</div>
                  <div className="text-2xl font-bold text-blue-700">{result.supplementedFields}개</div>
                </div>
              </div>

              {/* 상세 필드 목록 */}
              {result.validation && (
                <div className="space-y-4">
                  {result.validation.matchedFields?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-green-700 mb-2">일치 필드 목록</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.validation.matchedFields.map((field) => (
                          <span key={field} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.validation.conflictFields?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-orange-700 mb-2">충돌 필드 목록</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.validation.conflictFields.map((field) => (
                          <span key={field} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.validation.supplementedFields?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-blue-700 mb-2">보완 필드 목록</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.validation.supplementedFields.map((field) => (
                          <span key={field} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 수집 데이터 */}
            {result.data && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">수집된 데이터</h2>

                {/* 기본 정보 */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">기본 정보</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500">종목코드</div>
                      <div className="font-semibold">{result.data.basicInfo?.symbol}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">종목명</div>
                      <div className="font-semibold">{result.data.basicInfo?.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">시장</div>
                      <div className="font-semibold">{result.data.basicInfo?.market}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">거래소</div>
                      <div className="font-semibold">{result.data.basicInfo?.exchange}</div>
                    </div>
                  </div>
                </div>

                {/* 가격 데이터 */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">가격 데이터</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500">현재가</div>
                      <div className="font-semibold">{result.data.priceData?.currentPrice?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">등락</div>
                      <div className={`font-semibold ${(result.data.priceData?.change || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {(result.data.priceData?.change || 0) >= 0 ? '+' : ''}{result.data.priceData?.change?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">등락률</div>
                      <div className={`font-semibold ${(result.data.priceData?.changePercent || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {(result.data.priceData?.changePercent || 0) >= 0 ? '+' : ''}{result.data.priceData?.changePercent?.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">거래량</div>
                      <div className="font-semibold">{result.data.priceData?.volume?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* 밸류에이션 */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">밸류에이션</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500">PER</div>
                      <div className="font-semibold">{result.data.valuationData?.per?.toFixed(2) || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">PBR</div>
                      <div className="font-semibold">{result.data.valuationData?.pbr?.toFixed(2) || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">EPS</div>
                      <div className="font-semibold">{result.data.valuationData?.eps?.toLocaleString() || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">ROE</div>
                      <div className="font-semibold">{result.data.valuationData?.roe ? `${result.data.valuationData.roe.toFixed(2)}%` : '-'}</div>
                    </div>
                  </div>
                </div>

                {/* 수급 데이터 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">수급 데이터</h3>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500">외국인 순매수</div>
                      <div className={`font-semibold ${(result.data.supplyDemandData?.foreignNetBuy || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {result.data.supplyDemandData?.foreignNetBuy?.toLocaleString() || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">기관 순매수</div>
                      <div className={`font-semibold ${(result.data.supplyDemandData?.institutionalNetBuy || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {result.data.supplyDemandData?.institutionalNetBuy?.toLocaleString() || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">개인 순매수</div>
                      <div className={`font-semibold ${(result.data.supplyDemandData?.individualNetBuy || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {result.data.supplyDemandData?.individualNetBuy?.toLocaleString() || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 사용된 소스 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">사용된 데이터 소스</h2>
              <div className="flex gap-2">
                {result.sources?.map((source) => (
                  <span
                    key={source}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
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
        )}
      </main>
    </div>
  );
}
