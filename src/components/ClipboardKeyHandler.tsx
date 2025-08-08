import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function ClipboardKeyHandler() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 检测 Cmd+C 或 Ctrl+C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        // 检查当前选中的文本
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          const selectedText = selection.toString();
          
          try {
            // 使用多种方法确保复制成功
            
            // 方法1: document.execCommand (兼容性好)
            document.execCommand('copy');
            
            // 方法2: navigator.clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(selectedText);
            }
            
            // 方法3: Tauri 后端复制
            await invoke('copy_to_clipboard', { content: selectedText });
            
          } catch (error) {
            // 静默处理错误，不影响用户体验
            console.error('复制失败:', error);
          }
        }
      }
    };

    // 使用捕获阶段监听，确保能捕获到事件
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}