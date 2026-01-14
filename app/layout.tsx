import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stock Insight - AI 주식 분석',
  description: 'AI 기반 실시간 주식 분석 리포트',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900">
                📈 Stock Insight
              </Link>
              <div className="flex gap-2 sm:gap-4">
                <Link
                  href="/"
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-1 sm:px-0"
                >
                  분석
                </Link>
                <Link
                  href="/metrics"
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-1 sm:px-0"
                >
                  메트릭
                </Link>
                <Link
                  href="/alerts"
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-1 sm:px-0"
                >
                  알림
                </Link>
                <Link
                  href="/settings"
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-1 sm:px-0"
                >
                  설정
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
