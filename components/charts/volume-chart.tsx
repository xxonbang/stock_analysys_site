'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/chart-utils';
import { formatChartDate } from '@/lib/chart-utils';

interface VolumeChartProps {
  data: ChartDataPoint[];
  averageVolume?: number;
}

export function VolumeChart({ data, averageVolume }: VolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        거래량 데이터가 없습니다.
      </div>
    );
  }

  // 최신 60일 데이터만 표시
  const displayData = data.slice(-60).map((d) => ({
    ...d,
    avgVolume: averageVolume,
  }));

  return (
    <ResponsiveContainer width="100%" height={180} className="sm:h-[200px]">
      <ComposedChart
        data={displayData}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toString();
          }}
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
        
        {/* 거래량 바 */}
        <Bar
          dataKey="volume"
          fill="#60a5fa"
          name="거래량"
          radius={[2, 2, 0, 0]}
        />

        {/* 평균 거래량 라인 */}
        {averageVolume && (
          <Line
            type="monotone"
            dataKey="avgVolume"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="평균 거래량"
            strokeDasharray="5 5"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
