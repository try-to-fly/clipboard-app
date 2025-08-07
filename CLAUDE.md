# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Directory Navigation Rules

**IMPORTANT**: This project has two main directories:
- **Project Root**: `./` (contains package.json, CLAUDE.md, src/, src-tauri/)
- **Rust Backend**: `./src-tauri/` (contains Cargo.toml, src/, target/)

**Working Directory Context**:
- The project root contains package.json and CLAUDE.md 
- Most commands assume you're already in the project root directory
- Always verify your current working directory before running commands

**Command Execution Guidelines**:
1. **Frontend commands** (pnpm, npm, node) require project root as working directory
2. **Rust commands** (cargo) require `src-tauri/` directory as working directory  
3. **ALWAYS** check current directory before executing commands
4. Use `pwd` or equivalent to verify your location if unsure

**Correct Command Patterns**:
- ✅ From project root: `cd src-tauri && cargo fmt`
- ✅ From project root: `pnpm build`  
- ❌ From wrong directory: `cargo fmt` (will fail if not in src-tauri)
- ❌ From src-tauri: `pnpm build` (will fail, no package.json)

## Development Commands

### Frontend (React + TypeScript)
**Working Directory**: Project root (where package.json is located)
- `pnpm install` - Install all dependencies
- `pnpm dev` - Start Vite development server (frontend only)
- `pnpm build` - Build production frontend bundle (TypeScript compilation + Vite build)
- `pnpm preview` - Preview production build

### Code Quality & Linting
**Note**: Always run from project root, then navigate to appropriate directory
- `cd src-tauri && cargo fmt` - Format Rust code
- `cd src-tauri && cargo clippy` - Run Rust linter
- TypeScript checking is included in `pnpm build` command

### Full Application (Tauri)
**Working Directory**: Project root (where package.json and start.sh are located)
- `./start.sh` - Automated startup script (installs deps + runs dev)
- `pnpm tauri dev` - Start full development environment (Rust backend + React frontend)
- `pnpm tauri build` - Build production application bundle

### Rust Backend
**Working Directory**: Project root, then navigate to src-tauri/
- `cd src-tauri && cargo check` - Verify Rust code compiles
- `cd src-tauri && cargo test` - Run Rust unit tests (if any)

## Architecture Overview

This is a macOS clipboard management application built with a Tauri (Rust + React) hybrid architecture.

### Backend Architecture (Rust)
The Rust backend (`src-tauri/`) follows a modular async architecture:

- **AppState**: Central application state using `Arc<T>` and `tokio::sync` primitives for thread-safe async operations
- **Clipboard Monitor**: Uses macOS NSPasteboard API directly via `cocoa` and `objc` crates for system-level clipboard monitoring (non-polling)
- **Database Layer**: SQLx with SQLite for async database operations, stored in `~/Library/Application Support/clipboard-app/`
- **Event System**: Tauri's built-in event system for real-time frontend-backend communication via `tauri::Emitter`

Key async patterns:
- `tokio::sync::Mutex` instead of `std::sync::Mutex` for async-safe locking
- `broadcast::channel` for event distribution between clipboard monitor and database workers
- `spawn_blocking` for CPU-bound operations (clipboard access, file I/O)

### Frontend Architecture (React)
The React frontend (`src/`) uses modern patterns:

- **State Management**: Zustand store (`clipboardStore.ts`) with async actions that call Tauri commands
- **UI Components**: @radix-ui for accessible primitives, custom CSS with CSS variables for theming
- **Real-time Updates**: Event listeners via `@tauri-apps/api/event` for live clipboard updates
- **Type Safety**: Full TypeScript integration with shared types (`types/clipboard.ts`)
- **Additional Dependencies**: date-fns for time formatting, lucide-react for icons, clsx for conditional classes

### Critical Integration Points

1. **Tauri Commands**: Defined in `src-tauri/src/commands.rs`, exposed in `lib.rs` invoke_handler
2. **Event Flow**: Clipboard changes → Rust monitor → Database → Frontend event → UI update
3. **Async State Handling**: Frontend Zustand actions directly invoke Tauri commands, with loading/error states
4. **Data Storage**: SQLite with automatic migration on startup, image files saved to filesystem

### macOS-Specific Implementation Details

- **NSPasteboard Integration**: Direct Objective-C bridge via `msg_send!` macros for clipboard access
- **NSWorkspace**: App source detection using macOS workspace APIs
- **File System**: Uses `dirs` crate for proper macOS config directory placement
- **Permissions**: App requires accessibility permissions for system-level clipboard monitoring

### Development Notes

- Rust async runtime is `tokio` with full features enabled
- Frontend uses Vite for development server with HMR
- Database schema auto-migrates on application startup
- Image processing via `image` crate with PNG output format, WebP support enabled
- Content deduplication using SHA256 hashing (`sha2` crate)
- File type detection using `infer` crate for content type identification
- Base64 encoding for binary data transport between frontend and backend

### Common Patterns

When adding new Tauri commands:
1. Add async function to `commands.rs` with `#[tauri::command]`
2. Add to `invoke_handler` in `lib.rs`
3. Create corresponding frontend action in `clipboardStore.ts`
4. Use TypeScript types from `types/clipboard.ts`

When modifying database schema:
- Update `database/mod.rs` init method
- Ensure migrations are backwards compatible
- Update `models/mod.rs` structs with `sqlx::FromRow` derive

### Key File Locations

- Database: `~/Library/Application Support/clipboard-app/clipboard.db`
- Images: `~/Library/Application Support/clipboard-app/imgs/`
- Main Zustand store: `src/stores/clipboardStore.ts`
- Tauri commands: `src-tauri/src/commands.rs`
- TypeScript types: `src/types/clipboard.ts`
- Clipboard monitoring: `src-tauri/src/clipboard/monitor.rs`