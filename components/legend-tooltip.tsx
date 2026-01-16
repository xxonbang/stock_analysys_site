'use client';

import { useState, useRef, useEffect } from 'react';

interface LegendTooltipProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

export function LegendTooltip({ label, description, children }: LegendTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 툴팁 위치 조정 (화면 밖으로 나가지 않도록)
  useEffect(() => {
    if (isOpen && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current;
      const container = containerRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // 초기 위치 계산
      const leftOffset = containerRect.left + (containerRect.width / 2) - (tooltipRect.width / 2);
      
      // 왼쪽 경계 체크 및 조정
      if (leftOffset < 8) {
        // 왼쪽으로 넘어가면 컨테이너 왼쪽에 맞춤
        tooltip.style.left = '0';
        tooltip.style.transform = 'translateX(0)';
      } else if (leftOffset + tooltipRect.width > window.innerWidth - 8) {
        // 오른쪽으로 넘어가면 컨테이너 오른쪽에 맞춤
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
        tooltip.style.transform = 'translateX(0)';
      } else {
        // 중앙 정렬 유지
        tooltip.style.left = '50%';
        tooltip.style.right = 'auto';
        tooltip.style.transform = 'translateX(-50%)';
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="cursor-help hover:text-blue-600 transition-colors relative group px-1 py-0.5 rounded"
      >
        {children}
        {/* 호버 시 배경 효과 (밑줄 대신 배경색 변경) */}
        <span className="absolute inset-0 bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></span>
      </button>
      {isOpen && (
        <div 
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 sm:w-72 pointer-events-auto"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl animate-fade-in">
            <div className="font-semibold mb-1 text-white">{label}</div>
            <div className="text-gray-200 leading-relaxed">{description}</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
