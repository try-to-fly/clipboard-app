import React from 'react';
import { Clipboard } from 'lucide-react';
import { useClipboardStore } from '../../stores/clipboardStore';

export const EmptyState: React.FC = () => {
  const { isMonitoring, startMonitoring } = useClipboardStore();

  return (
    <div className="empty-state">
      <Clipboard size={64} className="empty-icon" />
      <h3>暂无剪切板记录</h3>
      {!isMonitoring ? (
        <>
          <p>点击开始按钮启动剪切板监听</p>
          <button className="button button-primary" onClick={startMonitoring}>
            开始监听
          </button>
        </>
      ) : (
        <p>复制一些内容试试吧</p>
      )}
    </div>
  );
};