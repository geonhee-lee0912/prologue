import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '프롤로그 운영자',
  description: '프롤로그 관리자 도구',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
