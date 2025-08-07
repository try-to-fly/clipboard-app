import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type ExpiryOption = 
  | { Days: number }
  | "Never";

export interface TextConfig {
  max_size_mb: number;
  expiry: ExpiryOption;
}

export interface ImageConfig {
  expiry: ExpiryOption;
}

export interface ExcludedApp {
  name: string;
  bundle_id: string;
}

export interface AppConfig {
  text: TextConfig;
  image: ImageConfig;
  excluded_apps?: string[]; // Keep for backward compatibility
  excluded_apps_v2: ExcludedApp[]; // New format with name and bundle_id
  global_shortcut: string;
  auto_startup: boolean;
}

export interface CacheStatistics {
  db_size_bytes: number;
  images_size_bytes: number;
  total_entries: number;
  text_entries: number;
  image_entries: number;
}

interface ConfigStore {
  config: AppConfig | null;
  cacheStats: CacheStatistics | null;
  loading: boolean;
  error: string | null;
  showPreferences: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  updateConfig: (config: AppConfig) => Promise<void>;
  loadCacheStatistics: () => Promise<void>;
  registerGlobalShortcut: (shortcut: string) => Promise<void>;
  setAutoStartup: (enabled: boolean) => Promise<void>;
  getAutoStartupStatus: () => Promise<boolean>;
  cleanupExpiredEntries: () => Promise<void>;
  setShowPreferences: (show: boolean) => void;
  formatBytes: (bytes: number) => string;
  
  // Helper functions for ExpiryOption
  getExpiryDisplayValue: (expiry: ExpiryOption) => string;
  createExpiryOption: (value: string) => ExpiryOption;
}

const defaultConfig: AppConfig = {
  text: {
    max_size_mb: 1.0,
    expiry: "Never",
  },
  image: {
    expiry: "Never",
  },
  excluded_apps_v2: [
    {
      name: '1Password 7 - Password Manager',
      bundle_id: 'com.1password.1password7',
    },
    {
      name: 'Keychain Access',
      bundle_id: 'com.apple.keychainaccess',
    },
  ],
  global_shortcut: 'CmdOrCtrl+Shift+V',
  auto_startup: false,
};

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  cacheStats: null,
  loading: false,
  error: null,
  showPreferences: false,

  loadConfig: async () => {
    try {
      set({ loading: true, error: null });
      const config = await invoke<AppConfig>('get_config');
      set({ config });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ error: String(error), config: defaultConfig });
    } finally {
      set({ loading: false });
    }
  },

  updateConfig: async (config: AppConfig) => {
    try {
      set({ loading: true, error: null });
      await invoke('update_config', { config });
      set({ config });
    } catch (error) {
      console.error('Failed to update config:', error);
      set({ error: String(error) });
    } finally {
      set({ loading: false });
    }
  },

  loadCacheStatistics: async () => {
    try {
      const stats = await invoke<CacheStatistics>('get_cache_statistics');
      set({ cacheStats: stats });
    } catch (error) {
      console.error('Failed to load cache statistics:', error);
      set({ error: String(error) });
    }
  },

  registerGlobalShortcut: async (shortcut: string) => {
    try {
      await invoke('register_global_shortcut', { shortcut });
    } catch (error) {
      console.error('Failed to register global shortcut:', error);
      throw error;
    }
  },

  setAutoStartup: async (enabled: boolean) => {
    try {
      await invoke('set_auto_startup', { enabled });
    } catch (error) {
      console.error('Failed to set auto startup:', error);
      throw error;
    }
  },

  getAutoStartupStatus: async () => {
    try {
      return await invoke<boolean>('get_auto_startup_status');
    } catch (error) {
      console.error('Failed to get auto startup status:', error);
      return false;
    }
  },

  cleanupExpiredEntries: async () => {
    try {
      const result = await invoke('cleanup_expired_entries');
      console.log('Cleanup completed:', result);
      // Refresh cache statistics after cleanup
      get().loadCacheStatistics();
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
      throw error;
    }
  },

  setShowPreferences: (show: boolean) => {
    set({ showPreferences: show });
  },

  formatBytes: (bytes: number) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },
  
  getExpiryDisplayValue: (expiry: ExpiryOption) => {
    if (expiry === "Never") return "never";
    if (typeof expiry === "object" && "Days" in expiry) {
      return expiry.Days.toString();
    }
    return "never";
  },
  
  createExpiryOption: (value: string) => {
    if (value === "never") return "Never";
    const days = parseInt(value);
    if (isNaN(days)) return "Never";
    return { Days: days };
  },
}));