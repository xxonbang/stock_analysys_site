'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/chart-utils';
import { formatChartDate, formatChartPrice } from '@/lib/chart-utils';

interface PriceChartProps {
  data: ChartDataPoint[];
  symbol: string;
  showMovingAverages?: boolean;
  showBollingerBands?: boolean;
}

export function PriceChart({
  data,
  symbol,
  showMovingAverages = true,
  showBollingerBands = false,
}: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        차트 데이터가 없습니다.
      </div>
    );
  }

  // 최신 60일 데이터만 표시 (가독성 향상)
  const displayData = data.slice(-60);

  return (
    <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
      <LineChart
        data={displayData}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        className="sm:!mr-8 sm:!ml-5"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={formatChartPrice}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          domain={['dataMin - (dataMax - dataMin) * 0.1', 'dataMax + (dataMax - dataMin) * 0.1']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px',
          }}
          formatter={(value: number | undefined) => value?.toLocaleString() ?? ''}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        {/* 주가 라인 (먼저 렌더링하여 범례에서 뒤로 배치) */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="주가"
        />
        
        {/* 이동평균선: MA5, MA20, MA60 순서로 범례 정렬 (5일이 먼저 표시되도록) */}
        {showMovingAverages && (
          <>
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              name="5일 이동평균선"
              strokeDasharray="5 5"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              name="20일 이동평균선"
              strokeDasharray="5 5"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ma60"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
              name="60일 이동평균선"
              strokeDasharray="5 5"
              connectNulls
            />
          </>
        )}

        {/* 범례: 커스텀 순서 지정 (5일 → 20일 → 60일 → 주가) */}
        <Legend 
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            
            // 원하는 순서대로 정렬: 5일 → 20일 → 60일 → 주가 → 볼린저 밴드
            const order = ['5일 이동평균선', '20일 이동평균선', '60일 이동평균선', '주가', '볼린저 밴드 상단선', '볼린저 밴드 중심선', '볼린저 밴드 하단선'];
            const sortedPayload = [...payload].sort((a, b) => {
              const aIndex = order.findIndex(name => a.value === name);
              const bIndex = order.findIndex(name => b.value === name);
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
            
            return (
              <ul className="flex flex-wrap justify-center gap-4 mt-4">
                {sortedPayload.map((entry, index) => (
                  <li key={`item-${index}`} className="flex items-center gap-2">
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '2px',
                        backgroundColor: entry.color,
                        borderStyle: entry.payload?.strokeDasharray ? 'dashed' : 'solid',
                      }}
                    />
                    <span style={{ color: entry.color, fontSize: '12px' }}>
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
            );
          }}
        />

        {/* 볼린저 밴드 */}
        {showBollingerBands && (
          <>
            <Line
              type="monotone"
              dataKey="bbUpper"
              stroke="#ef4444"
              strokeWidth={1}
              dot={false}
              name="볼린저 밴드 상단선"
              strokeDasharray="3 3"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbMiddle"
              stroke="#6b7280"
              strokeWidth={1}
              dot={false}
              name="볼린저 밴드 중심선"
              strokeDasharray="3 3"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbLower"
              stroke="#06b6d4"
              strokeWidth={1}
              dot={false}
              name="볼린저 밴드 하단선"
              strokeDasharray="3 3"
              connectNulls
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
