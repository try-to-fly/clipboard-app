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
  Copy,
  Sparkles,
  Workflow,
  MousePointer,
  Link2,
  PaletteIcon,
  Code2,
  FileJson,
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
              <span className="block text-primary mt-2">一次复制，智能处理</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              让每一次复制粘贴都成为一场优雅的数据之舞，自动识别、解析和处理，
              <span className="block mt-2">无需切换工具，让效率与美感在您的工作流中和谐共舞</span>
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

        {/* Core Philosophy Section */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">核心理念：一次复制，无限可能</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Dance 重新定义了复制粘贴的体验。只需一次复制，即可触发智能识别、自动解析和即时处理，
                让您专注于创造，而非工具切换。
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card rounded-lg p-6 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Copy className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">一次复制</h3>
                <p className="text-sm text-muted-foreground">
                  复制即触发，无需额外操作，自然融入您的工作流
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">智能识别</h3>
                <p className="text-sm text-muted-foreground">
                  自动判断内容类型，URL、颜色、代码一目了然
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MousePointer className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">即时处理</h3>
                <p className="text-sm text-muted-foreground">
                  实时解析和格式化，结果立即呈现，无需等待
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Workflow className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">流畅体验</h3>
                <p className="text-sm text-muted-foreground">
                  保持专注，不打断思路，让工作流如舞蹈般流畅
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">核心功能特性</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              每一次复制都会被自动捕获、智能识别、即时处理，让剪切板成为您的生产力加速器
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">复制即捕获</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  复制瞬间自动捕获，深度集成 macOS 系统，无需任何额外操作即可记录每次复制
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">自动分类</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动识别 URL、颜色、代码、JSON 等 9+ 种类型，无需手动整理，内容一目了然
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">智能解析</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  JSON 自动格式化、URL 预览生成、代码语法高亮，复制即可见处理结果
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">零切换体验</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  在 Dance 内直接查看处理结果，无需切换到其他工具，保持工作流连贯性
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-background to-muted/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">使用场景：一次复制，多重价值</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              看看 Dance 如何在不同场景下自动处理您的剪切板内容，让工作更高效
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Link2 className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-lg">复制 URL</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动生成网页预览，提取标题和描述，无需打开浏览器即可了解链接内容
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <PaletteIcon className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle className="text-lg">复制颜色</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动识别 HEX、RGB、HSL 格式，实时显示色块预览，方便设计工作
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <FileJson className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-lg">复制 JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动格式化和语法高亮，支持折叠展开，让数据结构一目了然
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Code2 className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-lg">复制代码</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  自动识别编程语言，语法高亮显示，保留格式和缩进，便于代码审查
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-10">
            <p className="text-lg text-muted-foreground">
              还有更多场景等待您发现：图片处理、邮箱识别、电话号码、路径解析...
            </p>
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
                  一次复制，智能处理 - 让数据舞蹈在您的指尖
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
