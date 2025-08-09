import React, { useState } from 'react';
import { Play, Pause, Trash2, BarChart } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslation } from 'react-i18next';
import { useClipboardStore } from '../../stores/clipboardStore';
import { StatisticsModal } from '../Statistics/StatisticsModal';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';

export const Header: React.FC = () => {
  const { t } = useTranslation(['common', 'clipboard']);
  const { isMonitoring, startMonitoring, stopMonitoring, clearHistory, fetchStatistics } =
    useClipboardStore();
  const [showStatistics, setShowStatistics] = useState(false);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
    } else {
      await startMonitoring();
    }
  };

  const handleShowStatistics = async () => {
    await fetchStatistics();
    setShowStatistics(true);
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="app-title">{t('common:appTitle')}</h1>
      </div>

      <div className="header-right">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`icon-button ${isMonitoring ? 'active' : ''}`}
                onClick={handleToggleMonitoring}
              >
                {isMonitoring ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="tooltip-content">
              {isMonitoring
                ? t('clipboard:actions.stopMonitoring')
                : t('clipboard:actions.startMonitoring')}
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="icon-button" onClick={handleShowStatistics}>
                <BarChart size={20} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="tooltip-content">
              {t('clipboard:actions.viewStatistics')}
            </Tooltip.Content>
          </Tooltip.Root>

          <Dialog.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Dialog.Trigger asChild>
                  <button className="icon-button danger">
                    <Trash2 size={20} />
                  </button>
                </Dialog.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content className="tooltip-content">
                {t('clipboard:actions.clearHistory')}
              </Tooltip.Content>
            </Tooltip.Root>

            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content">
                <Dialog.Title>{t('clipboard:actions.confirmClear')}</Dialog.Title>
                <Dialog.Description>
                  {t('clipboard:actions.clearConfirmMessage')}
                </Dialog.Description>
                <div className="dialog-actions">
                  <Dialog.Close asChild>
                    <button className="button button-secondary">{t('common:cancel')}</button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <button className="button button-danger" onClick={clearHistory}>
                      {t('clipboard:actions.confirmClear')}
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <LanguageSwitcher />
        </Tooltip.Provider>
      </div>

      <StatisticsModal isOpen={showStatistics} onClose={() => setShowStatistics(false)} />
    </header>
  );
};
