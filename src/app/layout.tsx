import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/app/components/ui/toaster';
import { Navbar } from './components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '山',
  description: '私有图片分享（图床）'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <main>
          <Navbar />
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
