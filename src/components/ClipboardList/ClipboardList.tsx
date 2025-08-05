import React, { useEffect } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useClipboardStore } from '../../stores/clipboardStore';
import { ClipboardItem } from './ClipboardItem';
import { EmptyState } from './EmptyState';

export const ClipboardList: React.FC = () => {
  const { entries, loading, fetchHistory, setupEventListener } = useClipboardStore();

  useEffect(() => {
    fetchHistory();
    setupEventListener();
  }, []);

  if (loading && entries.length === 0) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <ScrollArea.Root className="clipboard-list-container">
      <ScrollArea.Viewport className="clipboard-list-viewport">
        <div className="clipboard-list">
          {entries.map((entry) => (
            <ClipboardItem key={entry.id} entry={entry} />
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="scrollbar-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};