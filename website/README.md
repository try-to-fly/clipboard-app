# Clipboard App 官网

这是 Clipboard App 的官方网站，基于 Next.js 构建的 Landing Page。

## 功能特性

- 现代化响应式设计，适配 PC 和移动端
- 基于 Next.js 15 + TypeScript + Tailwind CSS
- 静态导出，适合部署到 Vercel
- 展示 Clipboard App 的核心功能和技术亮点

## 本地开发

### 安装依赖
```bash
cd website
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

在浏览器打开 http://localhost:3000 查看效果。

### 构建生产版本
```bash
pnpm build
```

生产文件会输出到 `out` 目录。

## 部署到 Vercel

### 方法一：通过 Vercel 仪表板

1. 在 Vercel 仪表板中点击 "New Project"
2. 导入你的 GitHub 仓库
3. 在项目设置中：
   - **Root Directory**: 设置为 `website`
   - **Framework**: Next.js（自动检测）
   - **Build Command**: `pnpm build`（可选，会自动检测）
   - **Output Directory**: `out`（可选，会自动检测）

### 方法二：使用项目根目录的 vercel.json

项目根目录已配置 `vercel.json` 文件，支持从仓库根目录直接部署网站子目录。

1. 在 Vercel 仪表板导入整个仓库
2. Vercel 会自动使用 vercel.json 的配置
3. 构建命令会自动切换到 website 目录执行

### Vercel 配置说明

`vercel.json` 文件配置：
- `buildCommand`: 切换到 website 目录并执行构建
- `outputDirectory`: 指定构建输出目录为 `website/out`
- `installCommand`: 在 website 目录安装依赖
- 包含安全头部配置

## 项目结构

```
website/
├── app/
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx          # 首页
├── components/ui/         # UI 组件
├── lib/
│   └── utils.ts          # 工具函数
├── public/               # 静态资源
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind 配置
└── package.json          # 依赖配置
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI库**: Radix UI + Lucide React
- **动画**: Framer Motion
- **构建**: 静态导出 (SSG)