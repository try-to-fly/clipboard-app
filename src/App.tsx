import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchBar } from './components/SearchBar/SearchBar';
import { ClipboardList } from './components/ClipboardList/ClipboardList';
import { DetailView } from './components/DetailView/DetailView';
import { MenuEventHandler } from './components/MenuEventHandler/MenuEventHandler';
import { UpdateChecker } from './components/UpdateChecker/UpdateChecker';
import { ClipboardKeyHandler } from './components/ClipboardKeyHandler';
import { useClipboardStore } from './stores/clipboardStore';

const queryClient = new QueryClient();

function AppContent() {
  const { startMonitoring, setupEventListener } = useClipboardStore();

  useEffect(() => {
    setupEventListener();
    startMonitoring();
  }, [startMonitoring, setupEventListener]);

  return (
    <MainLayout>
      <MenuEventHandler />
      <UpdateChecker />
      <ClipboardKeyHandler />
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-3 bg-background border-b">
          <div className="flex-1">
            <SearchBar />
          </div>
          <div className="ml-4">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 gap-4 p-4 overflow-hidden min-h-0">
          <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
            <ClipboardList />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
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