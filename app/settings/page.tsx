'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface KRXKeyCheckResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
  note?: string;
}

export default function SettingsPage() {
  const [krxKeyStatus, setKrxKeyStatus] = useState<KRXKeyCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkKRXKey = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/krx-key-check');
      const data: KRXKeyCheckResponse = await response.json();
      setKrxKeyStatus(data);
    } catch (error) {
      console.error('Failed to check KRX key:', error);
      setKrxKeyStatus({
        success: false,
        valid: false,
        error: '키 검사 중 오류가 발생했습니다.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // 페이지 로드 시 자동으로 키 검사
    checkKRXKey();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="container mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">⚙️ 설정</h1>
          <p className="text-gray-600">시스템 설정 및 API 키 관리</p>
        </div>

        {/* KRX API 키 상태 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>KRX API 키 상태</CardTitle>
            <CardDescription>
              한국거래소(KRX) Open API 키의 유효성을 확인합니다. API 키는 1년 유효기간이 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isChecking ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <span className="text-sm text-gray-600">키 검사 중...</span>
              </div>
            ) : krxKeyStatus ? (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-lg border-2 ${
                    krxKeyStatus.valid
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {krxKeyStatus.valid ? '✅' : '❌'}
                        </span>
                        <h3 className="font-bold text-lg">
                          {krxKeyStatus.valid ? 'API 키가 유효합니다' : 'API 키가 유효하지 않습니다'}
                        </h3>
                      </div>
                      <p className="text-sm mb-2">{krxKeyStatus.message || krxKeyStatus.error}</p>
                      {krxKeyStatus.note && (
                        <p className="text-xs text-gray-600 mt-2">
                          <strong>참고:</strong> {krxKeyStatus.note}
                        </p>
                      )}
                      {!krxKeyStatus.valid && (
                        <div className="mt-4 p-3 bg-white rounded border border-red-200">
                          <p className="text-sm font-semibold text-red-700 mb-2">
                            해결 방법:
                          </p>
                          <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                            <li>
                              KRX Open API 웹사이트 접속:{' '}
                              <a
                                href="https://openapi.krx.co.kr/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                https://openapi.krx.co.kr/
                              </a>
                            </li>
                            <li>로그인 후 마이페이지에서 새 API 키 발급</li>
                            <li>
                              환경 변수 파일(.env.local)에 새 키 설정:
                              <code className="block mt-1 p-2 bg-gray-100 rounded">
                                KRX_API_KEY=your_new_api_key_here
                              </code>
                            </li>
                            <li>서버 재시작 또는 Vercel 재배포</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <Button onClick={checkKRXKey} disabled={isChecking}>
              {isChecking ? '검사 중...' : '키 검사 다시 실행'}
            </Button>
          </CardContent>
        </Card>

        {/* 알림 설정 안내 */}
        <Card>
          <CardHeader>
            <CardTitle>알림 설정</CardTitle>
            <CardDescription>
              API 키 무효 등 중요한 알림은 자동으로 생성됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                • KRX API 키가 무효하거나 만료된 경우 자동으로 알림이 생성됩니다.
              </p>
              <p>
                • 알림은 <a href="/alerts" className="text-blue-600 hover:underline">알림 페이지</a>에서
                확인할 수 있습니다.
              </p>
              <p>
                • Slack/Discord 알림을 설정한 경우 외부 채널로도 전송됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
