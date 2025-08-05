import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchBar } from './components/SearchBar/SearchBar';
import { ClipboardList } from './components/ClipboardList/ClipboardList';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <div className="app-container">
          <SearchBar />
          <ClipboardList />
        </div>
      </MainLayout>
    </QueryClientProvider>
  );
}

export default App;