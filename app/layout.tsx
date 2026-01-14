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
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-gray-900">
                📈 Stock Insight
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  분석
                </Link>
                <Link
                  href="/metrics"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  메트릭
                </Link>
                <Link
                  href="/alerts"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  알림
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
