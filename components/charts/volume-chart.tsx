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

interface SupplyDemandData {
  institutional: number;
  foreign: number;
  individual: number;
}

interface VolumeChartProps {
  data: ChartDataPoint[];
  averageVolume?: number;
  supplyDemand?: SupplyDemandData;
}

export function VolumeChart({ data, averageVolume, supplyDemand }: VolumeChartProps) {
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

  // 쌍끌이 여부 확인 (외국인 + 기관 모두 양수)
  const isSsangkkeuli = supplyDemand &&
    supplyDemand.foreign > 0 &&
    supplyDemand.institutional > 0;

  return (
    <div className="space-y-3">
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
            formatter={(value: number | undefined) => value?.toLocaleString() ?? ''}
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

      {/* 외국인/기관 순매수 정보 */}
      {supplyDemand && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs sm:text-sm font-medium text-gray-700">
              당일 수급 현황
            </div>
            {isSsangkkeuli && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                <span>🔥</span>
                <span>쌍끌이</span>
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:text-sm">
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-gray-500 mb-1">외국인</div>
              <div className={`font-bold ${supplyDemand.foreign >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {supplyDemand.foreign >= 0 ? '+' : ''}{supplyDemand.foreign.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-gray-500 mb-1">기관</div>
              <div className={`font-bold ${supplyDemand.institutional >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {supplyDemand.institutional >= 0 ? '+' : ''}{supplyDemand.institutional.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-gray-500 mb-1">개인</div>
              <div className={`font-bold ${supplyDemand.individual >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {supplyDemand.individual >= 0 ? '+' : ''}{supplyDemand.individual.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
