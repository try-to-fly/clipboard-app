# 剪切板管理器

一个基于 Tauri + React + @radix-ui 的 macOS 剪切板管理工具。
<img width="1800" height="1406" alt="17448f00d5f3f2d3afd2c17773d06adb" src="https://github.com/user-attachments/assets/fc399fe1-20a0-42a9-baa5-f0b281687b16" />

## 功能特性

### 🚀 核心功能

- 🎯 **实时监听**：深度集成 macOS 系统剪切板，非轮询方式监听
- 📝 **多类型支持**：支持文本、图片、文件路径等内容类型
- 🔍 **智能去重**：通过 SHA256 哈希自动识别重复内容并累加计数
- 📱 **来源追踪**：记录每次复制的来源应用，包含应用图标和 Bundle ID
- 🖼️ **图片管理**：自动保存图片到本地配置目录，支持多种图片格式
- 💾 **持久存储**：使用 SQLite 数据库保存历史记录
- 🔎 **搜索筛选**：支持按内容和应用名称搜索
- ⭐ **收藏功能**：标记重要的剪切板内容
- 📊 **使用统计**：查看复制频率和应用使用情况

### 🧠 智能内容识别

- 🌐 **URL 识别**：自动识别并解析 URL，提取协议、主机、路径等信息
- 🎨 **颜色识别**：支持 HEX、RGB、RGBA、HSL 等多种颜色格式
- 📧 **邮箱识别**：自动识别邮箱地址
- 🖥️ **代码识别**：识别代码片段并提供语法高亮
- 💻 **命令识别**：识别终端命令和脚本
- ⏰ **时间识别**：识别时间戳、ISO8601 格式等多种时间格式
- 📄 **JSON 识别**：格式化显示 JSON 数据
- 📝 **Markdown 识别**：支持 Markdown 内容的格式化显示
- 🌐 **IP 地址识别**：自动识别 IPv4 和 IPv6 地址

### 💡 特色功能

- 🖱️ **双击粘贴**：双击条目即可复制到剪切板
- 🎛️ **类型过滤**：按内容类型快速筛选（文本、图片、文件等）
- 🕐 **时间排序**：按复制时间倒序显示，最新内容优先
- 📈 **统计面板**：详细的使用数据统计和分析
- 🔄 **自动更新**：实时同步剪切板变化，无需刷新

## 快速开始

### 前置要求

- macOS 系统
- Node.js 16+
- pnpm（推荐）或 npm
- Rust 环境（用于编译 Tauri）

### 安装依赖

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 启动应用

```bash
# 使用启动脚本
./start.sh

# 或手动启动
pnpm tauri dev
```

### 构建应用

```bash
# 构建生产版本
pnpm tauri build
```

## 安装与运行

### macOS 安装说明

当您在 macOS 上运行应用时，可能会遇到以下错误提示：

- "clipboard-app已损坏，无法打开"
- "无法打开clipboard-app，因为无法验证开发者"

这是 macOS 的安全机制导致的，请按以下步骤解决：

#### 方法一：系统设置解决

1. 打开 **系统设置** > **隐私与安全性**
2. 在 **安全性** 部分找到被阻止的应用提示
3. 点击 **仍要打开** 按钮
4. 在弹出的确认对话框中点击 **打开**

#### 方法二：终端命令解决

如果方法一无效，可以使用终端命令移除隔离属性：

```bash
# 移除应用的隔离属性
sudo xattr -rd com.apple.quarantine /Applications/clipboard-app.app

# 如果应用在其他位置，替换为实际路径
sudo xattr -rd com.apple.quarantine /path/to/clipboard-app.app

# 如果是DMG中的应用，先拖拽到Applications后再执行上述命令
```

#### 方法三：开发者签名
如果您是开发者，可以对应用进行代码签名：

```bash
# 使用开发者证书签名
codesign --force --deep --sign "Developer ID Application: Your Name" /Applications/clipboard-app.app

# 或者使用自签名证书（用于开发测试）
codesign --force --deep --sign - /Applications/clipboard-app.app
```

### 权限设置

应用需要以下系统权限才能正常工作：

1. **辅助功能权限**：
   - 打开 **系统设置** > **隐私与安全性** > **辅助功能**
   - 将 **clipboard-app** 添加到允许列表中并启用

2. **完全磁盘访问权限**（可选）：
   - 如果需要监听所有应用的剪切板变化
   - 打开 **系统设置** > **隐私与安全性** > **完全磁盘访问权限**
   - 添加并启用 **clipboard-app**

## 使用说明

1. **启动监听**：点击顶部工具栏的播放按钮开始监听剪切板
2. **复制内容**：在任意应用中复制内容，会自动记录到列表中
3. **查看历史**：主界面显示所有剪切板历史，按时间倒序排列
4. **搜索内容**：使用搜索框快速查找特定内容或应用
5. **操作条目**：
   - 双击条目：复制到剪切板
   - 右键菜单：复制、收藏、删除
   - 收藏图标：快速标记重要内容

## 数据存储

- 数据库位置：`~/.config/clipboard-app/clipboard.db`
- 图片存储：`~/.config/clipboard-app/imgs/`

## 技术栈

- **后端**：Rust + Tauri + SQLite
- **前端**：React + TypeScript + @radix-ui
- **状态管理**：Zustand
- **样式**：CSS Variables + 响应式设计

## 注意事项

- 首次运行时需要授予应用辅助功能权限
- 图片文件会自动保存到本地，请定期清理避免占用过多空间
- 敏感信息请谨慎处理，建议定期清理历史记录

## 开发指南

### 项目结构

```
clipboard-app/
├── src/                    # React 前端代码
│   ├── components/         # UI 组件
│   ├── stores/            # 状态管理
│   └── types/             # TypeScript 类型定义
├── src-tauri/             # Rust 后端代码
│   ├── src/
│   │   ├── clipboard/     # 剪切板监听和处理
│   │   ├── database/      # 数据库操作
│   │   ├── models/        # 数据模型
│   │   └── utils/         # 工具函数
│   └── Cargo.toml         # Rust 依赖配置
└── package.json           # 前端依赖配置
```

### 主要模块

- **剪切板监听**：使用 macOS NSPasteboard API 实现系统级监听
- **内容处理**：自动识别内容类型，处理图片保存等
- **数据库管理**：使用 SQLx 进行异步数据库操作
- **实时更新**：通过 Tauri 事件系统实现前后端实时通信

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

smile
