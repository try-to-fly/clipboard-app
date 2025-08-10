import React, { useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '../ui/card';
import { useClipboardStore } from '../../stores/clipboardStore';
import { ClipboardItem } from './ClipboardItem';
import { EmptyState } from './EmptyState';

export const ClipboardList: React.FC = () => {
  const {
    loading,
    fetchHistory,
    setupEventListener,
    getFilteredEntries,
    selectedEntry,
    setSelectedEntry,
    pasteSelectedEntry,
    loadMoreEntries,
    hasMore,
    isLoadingMore,
  } = useClipboardStore();
  const entries = getFilteredEntries();
  const [showNumbers, setShowNumbers] = React.useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 82, // Estimated height of each item
    overscan: 3, // Render 3 items outside of the visible area
  });

  useEffect(() => {
    fetchHistory();
    setupEventListener();
  }, []);

  useEffect(() => {
    if (entries.length > 0 && !selectedEntry) {
      setSelectedEntry(entries[0]);
    }
  }, [entries, selectedEntry, setSelectedEntry]);

  // Auto-scroll to newly selected entry when it changes (e.g., from clipboard update)
  useEffect(() => {
    if (selectedEntry && entries.length > 0) {
      const selectedIndex = entries.findIndex((entry) => entry.id === selectedEntry.id);
      if (selectedIndex >= 0 && selectedIndex === 0) {
        // Only auto-scroll if the selected entry is at the top (newly added)
        virtualizer.scrollToIndex(0, { behavior: 'smooth' });
      }
    }
  }, [selectedEntry, entries, virtualizer]);

  // Infinite scroll detection
  useEffect(() => {
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    const handleScroll = () => {
      const scrollElement = scrollContainerRef.current;
      if (!scrollElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Load more when user scrolls to 90% of the content
      if (scrollPercentage > 0.9) {
        loadMoreEntries();
      }
    };

    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, isLoadingMore, loading, loadMoreEntries]);

  const scrollToSelectedEntry = useCallback(
    (index: number, direction?: 'up' | 'down') => {
      const align = direction === 'up' ? 'start' : direction === 'down' ? 'end' : 'auto';
      virtualizer.scrollToIndex(index, { align, behavior: 'smooth' });
    },
    [virtualizer]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (entries.length === 0) return;

      const currentIndex = entries.findIndex((entry) => entry.id === selectedEntry?.id);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          setSelectedEntry(entries[prevIndex]);
          scrollToSelectedEntry(prevIndex, 'up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex =
            currentIndex < entries.length - 1 ? currentIndex + 1 : entries.length - 1;
          setSelectedEntry(entries[nextIndex]);
          scrollToSelectedEntry(nextIndex, 'down');
          break;
        case 'Alt':
          setShowNumbers(true);
          break;
        default:
          // 检查是否是Alt+数字组合
          if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const visibleItems = virtualizer.getVirtualItems();
            const visibleIndex = parseInt(e.key) - 1;
            if (visibleIndex < visibleItems.length) {
              const actualIndex = visibleItems[visibleIndex].index;
              setSelectedEntry(entries[actualIndex]);
              if (pasteSelectedEntry) {
                pasteSelectedEntry(entries[actualIndex]);
              }
            }
          }
          break;
      }
    },
    [
      entries,
      selectedEntry,
      setSelectedEntry,
      pasteSelectedEntry,
      virtualizer,
      scrollToSelectedEntry,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      setShowNumbers(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  if (loading && entries.length === 0) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">加载中...</p>
      </Card>
    );
  }

  if (entries.length === 0) {
    return <EmptyState />;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Card id="clipboard-list" className="flex-1 flex flex-col overflow-hidden border">
      <div
        ref={scrollContainerRef}
        id="clipboard-list-scroll"
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
        }}
      >
        <div
          id="clipboard-list-items"
          className="relative"
          style={{
            height: `${virtualizer.getTotalSize() + (isLoadingMore ? 60 : 0)}px`,
          }}
        >
          {virtualItems.map((virtualItem) => {
            const entry = entries[virtualItem.index];
            const visibleIndex = virtualItems.findIndex((vi) => vi.index === virtualItem.index) + 1;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  padding: '0 8px',
                }}
              >
                <div style={{ paddingBottom: '8px' }}>
                  <ClipboardItem
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    showNumber={showNumbers && visibleIndex <= 9}
                    number={visibleIndex}
                  />
                </div>
              </div>
            );
          })}

          {/* Loading indicator for infinite scroll */}
          {isLoadingMore && (
            <div
              className="flex justify-center items-center py-4"
              style={{
                position: 'absolute',
                top: virtualizer.getTotalSize(),
                left: 0,
                width: '100%',
                height: '60px',
              }}
            >
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">加载更多...</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
