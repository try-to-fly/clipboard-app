#!/bin/bash

echo "🚀 启动剪切板管理器..."

# 检查是否安装了必要的依赖
if ! command -v pnpm &> /dev/null; then
    echo "❌ 未找到 pnpm，请先安装 pnpm"
    echo "运行: npm install -g pnpm"
    exit 1
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
pnpm install

# 启动应用
echo "🎯 启动 Tauri 应用..."
pnpm tauri dev