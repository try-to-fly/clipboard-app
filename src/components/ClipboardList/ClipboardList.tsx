import React, { useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { useClipboardStore } from '../../stores/clipboardStore';
import { ClipboardItem } from './ClipboardItem';
import { EmptyState } from './EmptyState';

export const ClipboardList: React.FC = () => {
  const { loading, fetchHistory, setupEventListener, getFilteredEntries, selectedEntry, setSelectedEntry, pasteSelectedEntry } = useClipboardStore();
  const entries = getFilteredEntries();
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 9 });
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
      const selectedIndex = entries.findIndex(entry => entry.id === selectedEntry.id);
      if (selectedIndex >= 0 && selectedIndex === 0) {
        // Only auto-scroll if the selected entry is at the top (newly added)
        const scrollArea = scrollAreaRef.current;
        if (scrollArea) {
          const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (viewport) {
            const scrollToTop = () => {
              viewport.scrollTop = 0;
              viewport.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            };

            // Execute immediately and with a small delay to ensure DOM updates
            scrollToTop();
            setTimeout(scrollToTop, 50);
            setTimeout(scrollToTop, 200);
          }
        }
      }
    }
  }, [selectedEntry, entries]);

  const updateVisibleRange = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea || entries.length === 0) return;
    
    const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    
    const itemHeight = 82; // 预估每个item的高度（包含margin）
    const viewportHeight = viewport.clientHeight;
    const scrollTop = viewport.scrollTop;
    
    const start = Math.floor(scrollTop / itemHeight);
    const visibleItemsCount = Math.ceil(viewportHeight / itemHeight) + 1; // +1 for partial items
    const end = Math.min(start + visibleItemsCount, entries.length);
    
    setVisibleRange({ start, end });
  }, [entries.length]);

  const scrollToSelectedEntry = useCallback((index: number, direction?: 'up' | 'down') => {
    const items = document.querySelectorAll('.clipboard-item');
    const item = items[index] as HTMLElement;
    
    if (item) {
      // 找到滚动容器
      const scrollArea = scrollAreaRef.current;
      const viewport = scrollArea?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      
      if (!viewport) {
        item.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
        setTimeout(updateVisibleRange, 150);
        return;
      }
      
      // 检查元素是否在滚动容器的视口内
      const itemRect = item.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      
      const isInViewport = itemRect.top >= viewportRect.top && itemRect.bottom <= viewportRect.bottom;
      
      // 如果元素已经在视口内，不需要滚动
      if (isInViewport) {
        setTimeout(updateVisibleRange, 50);
        return;
      }
      
      // 决定滚动位置
      let block: ScrollLogicalPosition = 'nearest';
      
      if (direction === 'up') {
        if (index === 0) {
          // 第一个元素滚动到顶部
          block = 'start';
        } else {
          // 其他向上情况，滚动到视口顶部附近
          block = 'start';
        }
      } else if (direction === 'down') {
        if (index === entries.length - 1) {
          // 最后一个元素滚动到底部
          block = 'end';
        } else {
          // 其他向下情况，滚动到视口底部附近
          block = 'end';
        }
      }
      
      item.scrollIntoView({
        behavior: 'smooth',
        block: block
      });
      
      setTimeout(updateVisibleRange, 150);
    }
  }, [updateVisibleRange, entries.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (entries.length === 0) return;

    const currentIndex = entries.findIndex(entry => entry.id === selectedEntry?.id);
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : entries.length - 1;
        setSelectedEntry(entries[prevIndex]);
        scrollToSelectedEntry(prevIndex, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < entries.length - 1 ? currentIndex + 1 : 0;
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
          const visibleIndex = parseInt(e.key) - 1;
          const actualIndex = visibleRange.start + visibleIndex;
          if (actualIndex < entries.length && actualIndex < visibleRange.end) {
            setSelectedEntry(entries[actualIndex]);
            if (pasteSelectedEntry) {
              pasteSelectedEntry(entries[actualIndex]);
            }
          }
        }
        break;
    }
  }, [entries, selectedEntry, setSelectedEntry, pasteSelectedEntry, visibleRange, scrollToSelectedEntry]);

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

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.addEventListener('scroll', updateVisibleRange);
        // 初始化时计算可见范围
        setTimeout(updateVisibleRange, 100);
        
        return () => {
          viewport.removeEventListener('scroll', updateVisibleRange);
        };
      }
    }
  }, [updateVisibleRange]);

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

  return (
    <Card id="clipboard-list" className="flex-1 flex flex-col overflow-hidden border">
      <ScrollArea ref={scrollAreaRef} id="clipboard-list-scroll" className="flex-1">
        <div 
          id="clipboard-list-items"
          className="p-2 space-y-2" 
          ref={scrollViewportRef}
        >
          {entries.map((entry, index) => {
            const isVisible = index >= visibleRange.start && index < visibleRange.end;
            const visibleIndex = index - visibleRange.start + 1;
            
            return (
              <ClipboardItem 
                key={entry.id} 
                entry={entry} 
                isSelected={selectedEntry?.id === entry.id}
                onClick={() => setSelectedEntry(entry)}
                showNumber={showNumbers && isVisible && visibleIndex <= 9}
                number={visibleIndex}
              />
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};