'use client';

import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  stocks?: string[];
}

export function LoadingOverlay({ isLoading, stocks = [] }: LoadingOverlayProps) {
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    { text: '데이터 수집 중...', duration: 2000 },
    { text: '기술적 지표 계산 중...', duration: 1500 },
    { text: 'AI 분석 중...', duration: 2500 },
    { text: '리포트 생성 중...', duration: 1000 },
  ];

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      setProgress(0);
      return;
    }

    let currentStep = 0;
    let currentProgress = 0;
    const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);

    const interval = setInterval(() => {
      currentProgress += 50;
      const newProgress = Math.min((currentProgress / totalDuration) * 100, 95);
      setProgress(newProgress);

      // 단계별 진행
      let accumulated = 0;
      for (let i = 0; i < loadingSteps.length; i++) {
        accumulated += loadingSteps[i].duration;
        if (currentProgress <= accumulated) {
          if (currentStep !== i) {
            currentStep = i;
            setLoadingStep(i);
          }
          break;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md mx-4">
        {/* 메인 로딩 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-scale-in">
          {/* 애니메이션 스피너 */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              {/* 외부 회전 링 */}
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
              
              {/* 내부 펄스 원 */}
              <div className="absolute inset-4 bg-blue-600 rounded-full animate-pulse"></div>
              
              {/* 중앙 아이콘 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 로딩 텍스트 */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 animate-pulse">
              {loadingSteps[loadingStep]?.text || '분석 중...'}
            </h3>
            {stocks.length > 0 && (
              <p className="text-sm text-gray-600">
                {stocks.length}개 종목 분석 중
              </p>
            )}
          </div>

          {/* 진행 바 */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>진행 중...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* 단계 인디케이터 */}
          <div className="flex justify-center gap-2">
            {loadingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index <= loadingStep
                    ? 'bg-blue-600 w-8'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 배경 파티클 효과 */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 2)}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
