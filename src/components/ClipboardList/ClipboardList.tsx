import React, { useEffect, useCallback, useRef } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useClipboardStore } from '../../stores/clipboardStore';
import { ClipboardItem } from './ClipboardItem';
import { EmptyState } from './EmptyState';

export const ClipboardList: React.FC = () => {
  const { loading, fetchHistory, setupEventListener, getFilteredEntries, selectedEntry, setSelectedEntry, pasteSelectedEntry } = useClipboardStore();
  const entries = getFilteredEntries();
  const [showNumbers, setShowNumbers] = React.useState(false);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 9 });
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
    setupEventListener();
  }, []);

  useEffect(() => {
    if (entries.length > 0 && !selectedEntry) {
      setSelectedEntry(entries[0]);
    }
  }, [entries, selectedEntry, setSelectedEntry]);

  const updateVisibleRange = useCallback(() => {
    if (scrollViewportRef.current && entries.length > 0) {
      const itemHeight = 82; // 预估每个item的高度（包含margin）
      const viewportHeight = scrollViewportRef.current.clientHeight;
      const scrollTop = scrollViewportRef.current.scrollTop;
      
      const start = Math.floor(scrollTop / itemHeight);
      const visibleItemsCount = Math.ceil(viewportHeight / itemHeight) + 1; // +1 for partial items
      const end = Math.min(start + visibleItemsCount, entries.length);
      
      setVisibleRange({ start, end });
    }
  }, [entries.length]);

  const scrollToSelectedEntry = useCallback((index: number, direction?: 'up' | 'down') => {
    if (scrollViewportRef.current) {
      const container = scrollViewportRef.current;
      const items = container.querySelectorAll('.clipboard-item');
      
      if (items[index]) {
        const item = items[index] as HTMLElement;
        const itemRect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const itemHeight = itemRect.height;
        const containerHeight = containerRect.height;
        const currentScrollTop = container.scrollTop;
        
        let targetScrollTop: number;
        
        if (direction === 'down') {
          // 向下切换时，保持选中项在倒数第二个位置
          // 计算目标位置：让item底部距离容器底部约1.5个item高度
          const itemOffsetTop = item.offsetTop;
          const idealBottomPadding = itemHeight * 1.5;
          targetScrollTop = itemOffsetTop - containerHeight + itemHeight + idealBottomPadding;
          
          // 但是如果是最后几个元素，不要留太多空白
          const maxScroll = container.scrollHeight - containerHeight;
          targetScrollTop = Math.min(targetScrollTop, maxScroll);
          targetScrollTop = Math.max(0, targetScrollTop);
        } else if (direction === 'up') {
          // 向上切换时，保持选中项在第二个位置
          const itemOffsetTop = item.offsetTop;
          const idealTopPadding = itemHeight * 1;
          targetScrollTop = itemOffsetTop - idealTopPadding;
          targetScrollTop = Math.max(0, targetScrollTop);
        } else {
          // 没有方向时，只确保元素在视口内
          const itemTop = itemRect.top - containerRect.top;
          const itemBottom = itemRect.bottom - containerRect.top;
          
          if (itemTop < 0) {
            targetScrollTop = currentScrollTop + itemTop - 10;
          } else if (itemBottom > containerHeight) {
            targetScrollTop = currentScrollTop + (itemBottom - containerHeight) + 10;
          } else {
            // 已经在视口内，不需要滚动
            setTimeout(updateVisibleRange, 50);
            return;
          }
        }
        
        // 使用平滑滚动
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        // 更新可见范围
        setTimeout(updateVisibleRange, 100);
      }
    }
  }, [updateVisibleRange]);

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
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', updateVisibleRange);
      // 初始化时计算可见范围
      setTimeout(updateVisibleRange, 100);
      
      return () => {
        viewport.removeEventListener('scroll', updateVisibleRange);
      };
    }
  }, [updateVisibleRange]);

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
      <ScrollArea.Viewport className="clipboard-list-viewport" ref={scrollViewportRef}>
        <div className="clipboard-list">
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
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="scrollbar-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};