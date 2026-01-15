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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={displayData}
        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
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
          formatter={(value: number) => value.toLocaleString()}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        <Legend />
        
        {/* 이동평균선: MA5, MA20, MA60 순서로 범례 정렬을 위해 최상단 배치 */}
        {showMovingAverages && (
          <>
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              name="MA5"
              strokeDasharray="5 5"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              name="MA20"
              strokeDasharray="5 5"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ma60"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
              name="MA60"
              strokeDasharray="5 5"
              connectNulls
            />
          </>
        )}

        {/* 주가 라인 */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="종가"
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
              name="BB 상단"
              strokeDasharray="3 3"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbMiddle"
              stroke="#6b7280"
              strokeWidth={1}
              dot={false}
              name="BB 중심"
              strokeDasharray="3 3"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbLower"
              stroke="#3b82f6"
              strokeWidth={1}
              dot={false}
              name="BB 하단"
              strokeDasharray="3 3"
              connectNulls
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
