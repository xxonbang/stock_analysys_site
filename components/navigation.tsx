'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoginDialog } from '@/components/login-dialog';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { isAuthenticated, username, logout } = useAuth();
  const pathname = usePathname();
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
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-2 sm:py-3">
          <div className="flex items-center justify-between max-w-[1920px] mx-auto">
            <Link
              href="/"
              className="text-lg sm:text-xl font-bold text-gray-900"
            >
              📈 종목어때.ai
            </Link>
            <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 flex-wrap sm:flex-nowrap">
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
                  {/* 듀얼소스 검증 메뉴: 분석 결과 페이지와 듀얼소스 검증 페이지에서만 표시 */}
                  {username === 'xxonbang' && (pathname === '/report' || pathname === '/dual-source-validation') && (
                    <Link
                      href="/dual-source-validation"
                      className={`text-[10px] xs:text-xs sm:text-sm transition-colors px-0.5 sm:px-0 font-medium ${
                        pathname === '/dual-source-validation'
                          ? 'text-blue-800 underline underline-offset-4'
                          : 'text-blue-600 hover:text-blue-800'
                      }`}
                    >
                      듀얼소스 검증
                    </Link>
                  )}
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
