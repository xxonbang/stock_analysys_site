'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LoginDialog } from '@/components/login-dialog';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { isAuthenticated, logout } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [highlightLogin, setHighlightLogin] = useState(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // 하이라이트 효과 제거 (로그인 버튼 클릭 시)
  useEffect(() => {
    if (loginDialogOpen) {
      setHighlightLogin(false);
    }
  }, [loginDialogOpen]);

  // 외부에서 하이라이트 트리거 (page.tsx에서 사용)
  useEffect(() => {
    const handleHighlightLogin = () => {
      setLoginDialogOpen(true);
      setHighlightLogin(true);
      setTimeout(() => {
        if (loginButtonRef.current) {
          loginButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    };

    // 전역 이벤트 리스너 등록
    window.addEventListener('highlightLogin', handleHighlightLogin);
    return () => {
      window.removeEventListener('highlightLogin', handleHighlightLogin);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-lg sm:text-xl font-bold text-gray-900"
            >
              📈 종목어때.ai
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap sm:flex-nowrap">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/"
                    className="text-[10px] xs:text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-0.5 sm:px-0"
                  >
                    분석
                  </Link>
                  <Link
                    href="/metrics"
                    className="text-[10px] xs:text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-0.5 sm:px-0"
                  >
                    메트릭
                  </Link>
                  <Link
                    href="/alerts"
                    className="text-[10px] xs:text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-0.5 sm:px-0"
                  >
                    알림
                  </Link>
                  <Link
                    href="/settings"
                    className="text-[10px] xs:text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-0.5 sm:px-0"
                  >
                    설정
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-[10px] xs:text-xs sm:text-sm px-2 sm:px-3"
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button
                  ref={loginButtonRef}
                  variant="default"
                  size="sm"
                  onClick={() => setLoginDialogOpen(true)}
                  className={`text-[10px] xs:text-xs sm:text-sm px-2 sm:px-3 ${highlightLogin ? 'animate-bounce ring-4 ring-blue-500 ring-offset-2' : ''}`}
                >
                  로그인
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        highlight={highlightLogin}
      />
    </>
  );
}
