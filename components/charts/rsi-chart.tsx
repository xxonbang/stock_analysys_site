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
  ReferenceLine,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/chart-utils';
import { formatChartDate } from '@/lib/chart-utils';

interface RSIChartProps {
  data: ChartDataPoint[];
  currentRSI?: number;
}

export function RSIChart({ data, currentRSI }: RSIChartProps) {
  if (!currentRSI && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        RSI 데이터가 없습니다.
      </div>
    );
  }

  // RSI 데이터 생성 (과거 데이터가 있으면 사용, 없으면 현재값만)
  const rsiData = data
    .filter((d) => d.rsi !== undefined)
    .map((d) => ({
      date: d.date,
      rsi: d.rsi!,
    }));

  // RSI 데이터가 없으면 현재값만 표시
  if (rsiData.length === 0 && currentRSI) {
    rsiData.push({ date: data[0]?.date || '', rsi: currentRSI });
  }

  // 최신 60일 데이터만 표시
  const displayData = rsiData.slice(-60);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={displayData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          domain={[0, 100]}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px',
          }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        

        {/* 기준선 */}
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="과매수 (70)" />
        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label="과매도 (30)" />
        <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="2 2" />

        {/* RSI 라인 */}
        <Line
          type="monotone"
          dataKey="rsi"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          name="RSI"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
