import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getSystemLanguage } from './i18n/config';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { SettingsButton } from './components/settings-button';
import { PreferencesModal } from './components/Preferences/PreferencesModal';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchBar } from './components/SearchBar/SearchBar';
import { ClipboardList } from './components/ClipboardList/ClipboardList';
import { DetailView } from './components/DetailView/DetailView';
import { MenuEventHandler } from './components/MenuEventHandler/MenuEventHandler';
import { UpdateChecker } from './components/UpdateChecker/UpdateChecker';
import { ClipboardMenuHandler } from './components/ClipboardMenuHandler';
import { useClipboardStore } from './stores/clipboardStore';
import { useConfigStore } from './stores/configStore';
import { analytics, ANALYTICS_EVENTS } from './services/analytics';

const queryClient = new QueryClient();

function AppContent() {
  const { i18n } = useTranslation(['common']);
  const { startMonitoring, setupEventListener } = useClipboardStore();
  const { loadConfig } = useConfigStore();

  // Function to update window title
  const updateWindowTitle = async (language: string) => {
    try {
      // Get the translation without changing the current language
      let title;
      if (language === 'zh') {
        title = '剪切板管理器';
      } else {
        title = 'Clipboard Manager';
      }
      
      // Call the Tauri command to update window title
      await invoke('set_window_title', { title });
    } catch (error) {
      console.error('Failed to update window title:', error);
    }
  };

  useEffect(() => {
    // Track app opened event
    const startTime = Date.now();
    analytics.track(ANALYTICS_EVENTS.APP_OPENED);
    
    setupEventListener();
    startMonitoring();
    
    // Load config and set language
    loadConfig().then(async () => {
      // Config is loaded, check if we have a language preference
      const savedConfig = useConfigStore.getState().config;
      if (savedConfig?.language) {
        const targetLanguage = savedConfig.language === 'system' ? getSystemLanguage() : savedConfig.language;
        await i18n.changeLanguage(targetLanguage);
        // Update window title after language change
        await updateWindowTitle(targetLanguage);
      } else {
        // Set initial window title
        await updateWindowTitle(i18n.language);
      }
    });
    
    // Track startup time
    const startupTime = Date.now() - startTime;
    analytics.trackPerformance(ANALYTICS_EVENTS.STARTUP_TIME, startupTime);
  }, [startMonitoring, setupEventListener, loadConfig, i18n]);

  // Listen for language changes and update window title
  useEffect(() => {
    const handleLanguageChange = async (language: string) => {
      await updateWindowTitle(language);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return (
    <MainLayout>
      <MenuEventHandler />
      <UpdateChecker />
      <ClipboardMenuHandler />
      <PreferencesModal />
      <div id="app-container" className="flex flex-col h-screen">
        <div id="app-header" className="flex items-center justify-between p-3 bg-background border-b">
          <div id="search-container" className="flex-1">
            <SearchBar />
          </div>
          <div id="controls-container" className="ml-4 flex items-center gap-2">
            <ThemeToggle />
            <SettingsButton />
          </div>
        </div>
        <div id="main-content" className="flex flex-1 gap-4 p-4 overflow-hidden min-h-0">
          <div id="clipboard-list-container" className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
            <ClipboardList />
          </div>
          <div id="detail-view-container" className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <DetailView />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="clipboard-app-theme">
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;