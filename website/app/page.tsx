import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download,
  Github,
  Star,
  Zap,
  Brain,
  Shield,
  Target,
  Monitor,
  Database,
  Palette,
} from 'lucide-react';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Dance
              <span className="block text-primary mt-2">优雅的数据之舞</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              让每一次复制粘贴都成为一场优雅的数据之舞， 让效率与美感在您的工作流中和谐共舞
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="https://github.com/try-to-fly/dance/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="w-full sm:w-auto">
                  <Download className="mr-2 h-5 w-5" />
                  下载应用
                </Button>
              </Link>
              <Link
                href="https://github.com/try-to-fly/dance"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Github className="mr-2 h-5 w-5" />
                  查看源码
                </Button>
              </Link>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-4 max-w-4xl mx-auto">
              <img
                src="https://github.com/user-attachments/assets/fc399fe1-20a0-42a9-baa5-f0b281687b16"
                alt="Dance 应用截图"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">核心功能特性</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              专为 macOS 设计的现代化剪切板管理工具，提供智能化的内容处理和管理功能
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">实时监听</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  深度集成 macOS 系统剪切板，非轮询方式实时监听，系统级监听更高效
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">智能识别</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动识别 URL、颜色、邮箱、代码、JSON 等 9 种内容类型，智能分类管理
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">来源追踪</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  记录每次复制的来源应用，包含应用图标和使用统计，让你了解复制习惯
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">持久存储</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  SQLite 数据库本地存储，智能去重和统计，数据安全且访问快速
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="container mx-auto px-4 py-16 bg-muted/50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">技术亮点</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              基于现代化技术栈构建，提供卓越的性能和用户体验
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Rust + Tauri</h3>
              <p className="text-muted-foreground">
                Rust 后端提供极致性能，Tauri 框架确保应用体积小巧且安全
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">React + TypeScript</h3>
              <p className="text-muted-foreground">
                现代化前端技术栈，提供类型安全和优秀的开发体验
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">现代化 UI</h3>
              <p className="text-muted-foreground">
                基于 Radix UI 和 Tailwind CSS，响应式设计适配各种屏幕尺寸
              </p>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              100% 开源免费
            </div>
            <h2 className="text-3xl font-bold mb-4">完全开源，永远免费</h2>
            <p className="text-lg text-muted-foreground mb-8">
              MIT 许可证开源，代码完全透明，欢迎贡献代码和提出建议。
              你的隐私数据完全本地存储，绝不上传到任何服务器。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://github.com/try-to-fly/dance/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="w-full sm:w-auto">
                  <Download className="mr-2 h-5 w-5" />
                  立即下载
                </Button>
              </Link>
              <Link
                href="https://github.com/try-to-fly/dance"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Github className="mr-2 h-5 w-5" />
                  GitHub 仓库
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/30 mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="font-semibold">Dance</h3>
                <p className="text-sm text-muted-foreground">
                  让每一次复制粘贴都成为一场优雅的数据之舞
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="https://github.com/try-to-fly/dance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">© 2025 smile. MIT License.</p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
