# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + TypeScript)
- `pnpm install` - Install all dependencies
- `pnpm dev` - Start Vite development server (frontend only)
- `pnpm build` - Build production frontend bundle (TypeScript compilation + Vite build)
- `pnpm preview` - Preview production build

### Full Application (Tauri)
- `./start.sh` - Automated startup script (installs deps + runs dev)
- `pnpm tauri dev` - Start full development environment (Rust backend + React frontend)
- `pnpm tauri build` - Build production application bundle

### Rust Backend
- `cd src-tauri && cargo check` - Verify Rust code compiles
- `cd src-tauri && cargo test` - Run Rust unit tests (if any)
- `cd src-tauri && cargo clippy` - Run Rust linter

## Architecture Overview

This is a macOS clipboard management application built with a Tauri (Rust + React) hybrid architecture.

### Backend Architecture (Rust)
The Rust backend (`src-tauri/`) follows a modular async architecture:

- **AppState**: Central application state using `Arc<T>` and `tokio::sync` primitives for thread-safe async operations
- **Clipboard Monitor**: Uses macOS NSPasteboard API directly via `cocoa` and `objc` crates for system-level clipboard monitoring (non-polling)
- **Database Layer**: SQLx with SQLite for async database operations, stored in `~/.config/clipboard-app/`
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
- Image processing via `image` crate with PNG output format
- Content deduplication using SHA256 hashing (`sha2` crate)

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