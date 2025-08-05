import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ClipboardEntry, Statistics } from '../types/clipboard';

interface ClipboardStore {
  entries: ClipboardEntry[];
  statistics: Statistics | null;
  isMonitoring: boolean;
  searchTerm: string;
  loading: boolean;
  error: string | null;

  // Actions
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  fetchHistory: (limit?: number, offset?: number) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  copyToClipboard: (content: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setupEventListener: () => void;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  entries: [],
  statistics: null,
  isMonitoring: false,
  searchTerm: '',
  loading: false,
  error: null,

  startMonitoring: async () => {
    try {
      set({ loading: true, error: null });
      await invoke('start_monitoring');
      set({ isMonitoring: true });
      get().fetchHistory();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ loading: false });
    }
  },

  stopMonitoring: async () => {
    try {
      await invoke('stop_monitoring');
      set({ isMonitoring: false });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchHistory: async (limit = 50, offset = 0) => {
    try {
      set({ loading: true, error: null });
      const entries = await invoke<ClipboardEntry[]>('get_clipboard_history', {
        limit,
        offset,
        search: get().searchTerm || undefined,
      });
      set({ entries });
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      await invoke('toggle_favorite', { id });
      // 更新本地状态
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? { ...entry, is_favorite: !entry.is_favorite } : entry
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteEntry: async (id: string) => {
    try {
      await invoke('delete_entry', { id });
      // 从本地状态移除
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearHistory: async () => {
    try {
      await invoke('clear_history');
      set({ entries: [] });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await invoke<Statistics>('get_statistics');
      set({ statistics });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  copyToClipboard: async (content: string) => {
    try {
      await invoke('copy_to_clipboard', { content });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
    get().fetchHistory();
  },

  setupEventListener: () => {
    listen<ClipboardEntry>('clipboard-update', (event) => {
      set((state) => {
        // 检查是否已存在
        const existingIndex = state.entries.findIndex(
          (entry) => entry.content_hash === event.payload.content_hash
        );

        if (existingIndex >= 0) {
          // 更新现有条目
          const newEntries = [...state.entries];
          newEntries[existingIndex] = {
            ...newEntries[existingIndex],
            copy_count: newEntries[existingIndex].copy_count + 1,
            created_at: event.payload.created_at,
          };
          // 移到最前面
          const [updated] = newEntries.splice(existingIndex, 1);
          newEntries.unshift(updated);
          return { entries: newEntries };
        } else {
          // 添加新条目到最前面
          return { entries: [event.payload, ...state.entries] };
        }
      });
    });
  },
}));