'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Alert {
  id: string;
  type: 'consistency_failure' | 'error_rate_threshold' | 'validation_failure' | 'data_source_down' | 'api_key_invalid';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  dataSource: string;
  symbol?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

interface AlertsResponse {
  success: boolean;
  data: {
    alerts: Alert[];
    stats: AlertStats;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(true);

  const fetchAlerts = async () => {
    try {
      const url = new URL('/api/alerts', window.location.origin);
      if (severityFilter !== 'all') {
        url.searchParams.set('severity', severityFilter);
      }
      url.searchParams.set('activeOnly', activeOnly.toString());
      url.searchParams.set('limit', '100');

      const response = await fetch(url.toString());
      const data: AlertsResponse = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', alertId }),
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, activeOnly]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAlerts();
    }, 5000); // 5초마다 자동 갱신

    return () => clearInterval(interval);
  }, [autoRefresh, severityFilter, activeOnly]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'low':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getSeverityEmoji = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '🔴';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'consistency_failure':
        return '정합성 검사 실패';
      case 'error_rate_threshold':
        return '오류율 임계값 초과';
      case 'validation_failure':
        return '검증 실패';
      case 'data_source_down':
        return '데이터 소스 다운';
      case 'api_key_invalid':
        return 'API 키 무효';
      default:
        return type;
    }
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-8 sm:h-12 w-48 sm:w-64 mb-6 sm:mb-8" />
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!alerts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
        <div className="container mx-auto max-w-7xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-sm sm:text-base text-gray-500">알림 데이터를 불러올 수 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.data.alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.data.alerts.filter((a) => a.resolved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">🚨 알림 시스템</h1>
            <p className="text-sm sm:text-base text-gray-600">데이터 품질 문제 모니터링 및 알림</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
            <label className="flex items-center gap-2 text-sm sm:text-base">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded"
              />
              <span>활성 알림만</span>
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg bg-white w-full sm:w-auto"
            >
              <option value="all">모든 심각도</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {autoRefresh ? '🔄 자동 갱신 중' : '⏸️ 일시정지'}
            </Button>
            <Button 
              onClick={fetchAlerts}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              새로고침
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">전체 알림</CardDescription>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl">{alerts.data.stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">활성 알림</CardDescription>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl text-red-600">{alerts.data.stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">해결됨</CardDescription>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl text-green-600">{alerts.data.stats.resolved}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">Critical</CardDescription>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl text-red-700">
                {alerts.data.stats.bySeverity.critical || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs sm:text-sm">High</CardDescription>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl text-orange-600">
                {alerts.data.stats.bySeverity.high || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 활성 알림 */}
        {activeOnly && activeAlerts.length > 0 && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle>활성 알림 ({activeAlerts.length})</CardTitle>
              <CardDescription>해결이 필요한 알림</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 sm:p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xl sm:text-2xl">{getSeverityEmoji(alert.severity)}</span>
                          <h3 className="font-bold text-base sm:text-lg break-words">{alert.title}</h3>
                          <span className="text-xs px-2 py-1 bg-white/50 rounded whitespace-nowrap">
                            {getTypeLabel(alert.type)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm mb-2 break-words">{alert.message}</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>데이터 소스: {alert.dataSource}</div>
                          {alert.symbol && <div>종목: {alert.symbol}</div>}
                          <div>발생 시간: {formatTime(alert.timestamp)}</div>
                        </div>
                        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer">상세 정보</summary>
                            <pre className="text-xs mt-1 p-2 bg-white/50 rounded overflow-auto">
                              {JSON.stringify(alert.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <Button
                        onClick={() => resolveAlert(alert.id)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto sm:ml-4 flex-shrink-0"
                      >
                        해결
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 모든 알림 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeOnly ? '활성 알림' : '모든 알림'} ({alerts.data.alerts.length})
            </CardTitle>
            <CardDescription>알림 이력</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.data.alerts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">알림이 없습니다.</p>
              ) : (
                alerts.data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.resolved
                        ? 'bg-gray-50 border-gray-300 opacity-60'
                        : getSeverityColor(alert.severity)
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span>{getSeverityEmoji(alert.severity)}</span>
                          <span className="font-semibold text-xs sm:text-sm break-words">{alert.title}</span>
                          {alert.resolved && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded whitespace-nowrap">
                              해결됨
                            </span>
                          )}
                        </div>
                        <p className="text-xs mb-1 break-words">{alert.message}</p>
                        <div className="text-xs text-gray-500 break-words">
                          {alert.dataSource} {alert.symbol && `• ${alert.symbol}`} •{' '}
                          {formatTime(alert.timestamp)}
                          {alert.resolvedAt && ` • 해결: ${formatTime(alert.resolvedAt)}`}
                        </div>
                      </div>
                      {!alert.resolved && (
                        <Button
                          onClick={() => resolveAlert(alert.id)}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto sm:ml-4 flex-shrink-0"
                        >
                          해결
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
