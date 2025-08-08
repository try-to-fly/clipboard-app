import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clipboard App - 智能剪切板管理器",
  description: "免费开源的 macOS 剪切板管理工具，实时监听、智能识别、来源追踪，让复制粘贴更高效。",
  keywords: ["剪切板", "clipboard", "macOS", "免费", "开源", "Tauri", "效率工具"],
  authors: [{ name: "smile" }],
  creator: "smile",
  publisher: "smile",
  openGraph: {
    title: "Clipboard App - 智能剪切板管理器",
    description: "免费开源的 macOS 剪切板管理工具，实时监听、智能识别、来源追踪，让复制粘贴更高效。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clipboard App - 智能剪切板管理器",
    description: "免费开源的 macOS 剪切板管理工具，实时监听、智能识别、来源追踪，让复制粘贴更高效。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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