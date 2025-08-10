import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dance - 优雅的数据之舞',
  description: '让每一次复制粘贴都成为一场优雅的数据之舞，让效率与美感在您的工作流中和谐共舞。',
  keywords: ['剪切板', 'clipboard', 'macOS', '免费', '开源', 'Tauri', '效率工具'],
  authors: [{ name: 'smile' }],
  creator: 'smile',
  publisher: 'smile',
  openGraph: {
    title: 'Dance - 优雅的数据之舞',
    description: '让每一次复制粘贴都成为一场优雅的数据之舞，让效率与美感在您的工作流中和谐共舞。',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dance - 优雅的数据之舞',
    description: '让每一次复制粘贴都成为一场优雅的数据之舞，让效率与美感在您的工作流中和谐共舞。',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
