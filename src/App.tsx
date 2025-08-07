import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchBar } from './components/SearchBar/SearchBar';
import { ClipboardList } from './components/ClipboardList/ClipboardList';
import { DetailView } from './components/DetailView/DetailView';
import { MenuEventHandler } from './components/MenuEventHandler/MenuEventHandler';
import { UpdateChecker } from './components/UpdateChecker/UpdateChecker';
import { useClipboardStore } from './stores/clipboardStore';
import './App.css';

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
      <div className="app-container">
        <div className="app-header">
          <SearchBar />
        </div>
        <div className="app-body">
          <div className="app-list">
            <ClipboardList />
          </div>
          <div className="app-detail">
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
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;