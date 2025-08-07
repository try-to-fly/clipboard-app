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
  selectedType: string;
  selectedEntry: ClipboardEntry | null;

  // Actions
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  fetchHistory: (limit?: number, offset?: number) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  copyToClipboard: (content: string) => Promise<void>;
  pasteSelectedEntry: (entry: ClipboardEntry) => Promise<void>;
  getImageUrl: (filePath: string) => Promise<string>;
  openFileWithSystem: (filePath: string) => Promise<void>;
  getAppIcon: (bundleId: string) => Promise<string | null>;
  setSearchTerm: (term: string) => void;
  setSelectedType: (type: string) => void;
  setSelectedEntry: (entry: ClipboardEntry | null) => void;
  getFilteredEntries: () => ClipboardEntry[];
  setupEventListener: () => void;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  entries: [],
  statistics: null,
  isMonitoring: false,
  searchTerm: '',
  loading: false,
  error: null,
  selectedType: 'all',
  selectedEntry: null,

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

  pasteSelectedEntry: async (entry: ClipboardEntry) => {
    try {
      if (entry.content_type.toLowerCase().includes('image') && entry.file_path) {
        await invoke('paste_image', { filePath: entry.file_path });
      } else if (entry.content_data) {
        await invoke('paste_text', { content: entry.content_data });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  getImageUrl: async (filePath: string) => {
    try {
      return await invoke<string>('get_image_url', { filePath });
    } catch (error) {
      throw new Error(String(error));
    }
  },

  openFileWithSystem: async (filePath: string) => {
    try {
      await invoke('open_file_with_system', { filePath });
    } catch (error) {
      throw new Error(String(error));
    }
  },

  getAppIcon: async (bundleId: string) => {
    try {
      return await invoke<string | null>('get_app_icon', { bundleId });
    } catch (error) {
      console.error('Failed to get app icon:', error);
      return null;
    }
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
    get().fetchHistory();
  },

  setSelectedType: (type: string) => {
    set({ selectedType: type });
    const filtered = get().getFilteredEntries();
    if (filtered.length > 0) {
      set({ selectedEntry: filtered[0] });
    }
  },

  setSelectedEntry: (entry: ClipboardEntry | null) => {
    set({ selectedEntry: entry });
  },

  getFilteredEntries: () => {
    const state = get();
    let filtered = state.entries;

    if (state.selectedType !== 'all') {
      filtered = filtered.filter(entry => {
        const type = entry.content_type.toLowerCase();
        
        // 处理子类型筛选
        if (state.selectedType.startsWith('text:')) {
          if (!type.includes('text') && !type.includes('string')) {
            return false;
          }
          
          const subtype = state.selectedType.replace('text:', '');
          if (subtype === 'all') {
            return true;
          }
          
          // 检查content_subtype字段
          let entrySubtype = 'plain_text';
          if (entry.content_subtype) {
            // content_subtype直接是字符串，不需要JSON解析
            entrySubtype = entry.content_subtype;
          }
          
          return entrySubtype === subtype;
        }
        
        // 处理主类型筛选
        if (state.selectedType === 'text') {
          return type.includes('text') || type.includes('string');
        } else if (state.selectedType === 'image') {
          return type.includes('image');
        } else if (state.selectedType === 'file') {
          return type.includes('file') && !type.includes('image');
        }
        return true;
      });
    }

    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.content_data?.toLowerCase().includes(searchLower) ||
        entry.source_app?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  },

  setupEventListener: () => {
    listen<ClipboardEntry>('clipboard-update', (event) => {
      set((state) => {
        // 检查是否已存在
        const existingIndex = state.entries.findIndex(
          (entry) => entry.content_hash === event.payload.content_hash
        );

        let newEntries;
        let updatedEntry;

        if (existingIndex >= 0) {
          // 更新现有条目，使用后端发送的正确数据
          newEntries = [...state.entries];
          newEntries[existingIndex] = {
            ...event.payload, // 使用后端发送的完整数据，包括正确的copy_count
          };
          // 移到最前面
          const [updated] = newEntries.splice(existingIndex, 1);
          newEntries.unshift(updated);
          updatedEntry = updated;
        } else {
          // 添加新条目到最前面
          newEntries = [event.payload, ...state.entries];
          updatedEntry = event.payload;
        }

        // 自动选中最新的素材
        return { 
          entries: newEntries,
          selectedEntry: updatedEntry
        };
      });
    });
  },
}));