import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Star } from 'lucide-react';
import { Statistics } from '../../types/clipboard';
import { useClipboardStore } from '../../stores/clipboardStore';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose }) => {
  const { statistics, copyToClipboard } = useClipboardStore();

  if (!statistics) {
    return null;
  }

  const handleCopyContent = async (content: string | null) => {
    if (content) {
      await copyToClipboard(content);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content statistics-dialog">
          <div className="dialog-header">
            <Dialog.Title>剪切板统计</Dialog.Title>
            <Dialog.Close asChild>
              <button className="icon-button">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="statistics-content">
            <div className="statistics-summary">
              <div className="stat-item">
                <div className="stat-value">{statistics.total_entries}</div>
                <div className="stat-label">总条目数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.total_copies}</div>
                <div className="stat-label">总复制次数</div>
              </div>
            </div>

            <div className="statistics-section">
              <h3>最常复制的内容</h3>
              <div className="most-copied-list">
                {statistics.most_copied.length > 0 ? (
                  statistics.most_copied.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="most-copied-item">
                      <div className="item-content">
                        <div className="content-preview">
                          {entry.content_type.includes('image') ? (
                            <span className="content-type-badge">📷 图片</span>
                          ) : entry.content_type.includes('file') ? (
                            <span className="content-type-badge">📄 文件</span>
                          ) : (
                            <span className="content-text">
                              {entry.content_data?.substring(0, 50)}
                              {entry.content_data && entry.content_data.length > 50 ? '...' : ''}
                            </span>
                          )}
                        </div>
                        <div className="item-meta">
                          <span className="copy-count">复制 {entry.copy_count} 次</span>
                          {entry.is_favorite && <Star size={12} className="favorite-icon" />}
                        </div>
                      </div>
                      <button
                        className="icon-button small"
                        onClick={() => handleCopyContent(entry.content_data)}
                        title="复制"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无数据</div>
                )}
              </div>
            </div>

            <div className="statistics-section">
              <h3>应用使用统计</h3>
              <div className="app-usage-list">
                {statistics.recent_apps.length > 0 ? (
                  statistics.recent_apps.slice(0, 8).map((app, index) => (
                    <div key={index} className="app-usage-item">
                      <div className="app-name">{app.app_name || '未知应用'}</div>
                      <div className="app-count">{app.count} 次</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无数据</div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};