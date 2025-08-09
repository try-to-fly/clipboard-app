import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClipboardStore } from '../../stores/clipboardStore';
import type { Statistics } from '../../types/clipboard';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statistics?: Statistics | null;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  statistics: propStatistics,
}) => {
  const { t } = useTranslation(['statistics', 'common', 'clipboard']);
  const { statistics: storeStatistics, copyToClipboard } = useClipboardStore();

  // Use prop statistics if provided, otherwise fall back to store statistics
  const statistics = propStatistics || storeStatistics;

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
            <Dialog.Title>{t('statistics:title')}</Dialog.Title>
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
                <div className="stat-label">{t('statistics:totalEntries')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{statistics.total_copies}</div>
                <div className="stat-label">{t('statistics:totalCopies')}</div>
              </div>
            </div>

            <div className="statistics-section">
              <h3>{t('statistics:mostCopied')}</h3>
              <div className="most-copied-list">
                {statistics.most_copied.length > 0 ? (
                  statistics.most_copied.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="most-copied-item">
                      <div className="item-content">
                        <div className="content-preview">
                          {entry.content_type.includes('image') ? (
                            <span className="content-type-badge">
                              📷 {t('clipboard:contentTypes.image')}
                            </span>
                          ) : entry.content_type.includes('file') ? (
                            <span className="content-type-badge">
                              📄 {t('clipboard:contentTypes.file')}
                            </span>
                          ) : (
                            <span className="content-text">
                              {entry.content_data?.substring(0, 50)}
                              {entry.content_data && entry.content_data.length > 50 ? '...' : ''}
                            </span>
                          )}
                        </div>
                        <div className="item-meta">
                          <span className="copy-count">
                            {t('statistics:copiedTimes', { count: entry.copy_count })}
                          </span>
                          {entry.is_favorite && <Star size={12} className="favorite-icon" />}
                        </div>
                      </div>
                      <button
                        className="icon-button small"
                        onClick={() => handleCopyContent(entry.content_data)}
                        title={t('common:copy')}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">{t('common:noData')}</div>
                )}
              </div>
            </div>

            <div className="statistics-section">
              <h3>{t('statistics:appUsage')}</h3>
              <div className="app-usage-list">
                {statistics.recent_apps.length > 0 ? (
                  statistics.recent_apps.slice(0, 8).map((app, index) => (
                    <div key={index} className="app-usage-item">
                      <div className="app-name">{app.app_name || t('common:unknownApp')}</div>
                      <div className="app-count">{t('statistics:times', { count: app.count })}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">{t('common:noData')}</div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
