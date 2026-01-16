'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateLastActivity: () => void; // 활동 시간 업데이트
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 하드코딩된 로그인 정보
const HARDCODED_CREDENTIALS = {
  username: 'xxonbang',
  password: '11223344',
};

// 상수
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10분 (밀리초)
const CHECK_INTERVAL = 60 * 1000; // 1분마다 체크 (밀리초)
const LAST_ACTIVITY_KEY = 'lastActivityTime';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const router = useRouter();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityListenersRef = useRef<boolean>(false);

  // 마지막 활동 시간 업데이트
  const updateLastActivity = useCallback(() => {
    if (typeof window !== 'undefined' && isAuthenticated) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, [isAuthenticated]);

  // 활동 시간 체크 및 자동 로그아웃
  const checkInactivity = useCallback(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      // 활동 시간이 없으면 현재 시간으로 설정
      updateLastActivity();
      return;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      // 10분 경과 시 자동 로그아웃
      console.log('[Auth] 10분간 활동 없음, 자동 로그아웃 처리');
      handleAutoLogout();
    }
  }, [isAuthenticated, updateLastActivity]);

  // 자동 로그아웃 처리
  const handleAutoLogout = useCallback(() => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
    
    // 홈으로 이동
    router.push('/');
    
    // 안내 팝업 표시
    setShowTimeoutDialog(true);
  }, [router]);

  // 사용자 활동 감지 이벤트 리스너 등록
  useEffect(() => {
    if (!isAuthenticated || activityListenersRef.current) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    activityListenersRef.current = true;

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      activityListenersRef.current = false;
    };
  }, [isAuthenticated, updateLastActivity]);

  // 주기적으로 활동 시간 체크
  useEffect(() => {
    if (!isAuthenticated) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // 초기 체크
    checkInactivity();

    // 주기적 체크 (1분마다)
    checkIntervalRef.current = setInterval(() => {
      checkInactivity();
    }, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkInactivity]);

  // 페이지 로드 시 로컬 스토리지에서 로그인 상태 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isAuthenticated');
      if (stored === 'true') {
        setIsAuthenticated(true);
        // 로그인 상태 복원 시 마지막 활동 시간 확인
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity) {
          const lastActivityTime = parseInt(lastActivity, 10);
          const now = Date.now();
          const timeSinceLastActivity = now - lastActivityTime;
          
          // 10분 경과했으면 자동 로그아웃
          if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
            handleAutoLogout();
          } else {
            // 활동 시간 업데이트
            updateLastActivity();
          }
        } else {
          // 활동 시간이 없으면 현재 시간으로 설정
          updateLastActivity();
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (username: string, password: string): boolean => {
    if (username === HARDCODED_CREDENTIALS.username && password === HARDCODED_CREDENTIALS.password) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAuthenticated', 'true');
        // 로그인 시 현재 시간을 활동 시간으로 설정
        updateLastActivity();
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, updateLastActivity }}>
      {children}
      {/* 자동 로그아웃 안내 팝업 */}
      {showTimeoutDialog && (
        <AutoLogoutDialog 
          open={showTimeoutDialog} 
          onClose={() => setShowTimeoutDialog(false)} 
        />
      )}
    </AuthContext.Provider>
  );
}

// 자동 로그아웃 안내 팝업 컴포넌트
function AutoLogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-[calc(100%-2rem)] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13 7l-4.928-4.928c-1.732-1.732-3.464.192-3.464 1.732v13.856c0 1.54 1.732 3.464 3.464 1.732L13 17l4.928-4.928c1.732-1.732-.192-3.464-1.732-3.464H4.072z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">자동 로그아웃</h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          10분간 활동이 없어 자동으로 로그아웃되었습니다.
          <br />
          다시 로그인해주세요.
        </p>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
