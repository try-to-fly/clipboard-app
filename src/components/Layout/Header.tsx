import React from 'react';
import { Play, Pause, Trash2, BarChart } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useClipboardStore } from '../../stores/clipboardStore';

export const Header: React.FC = () => {
  const { isMonitoring, startMonitoring, stopMonitoring, clearHistory, fetchStatistics } = useClipboardStore();

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
    } else {
      await startMonitoring();
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="app-title">剪切板管理器</h1>
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
              {isMonitoring ? '停止监听' : '开始监听'}
            </Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className="icon-button"
                onClick={fetchStatistics}
              >
                <BarChart size={20} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="tooltip-content">
              查看统计
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
                清空历史
              </Tooltip.Content>
            </Tooltip.Root>

            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content">
                <Dialog.Title>确认清空</Dialog.Title>
                <Dialog.Description>
                  确定要清空所有剪切板历史记录吗？此操作不可恢复。
                </Dialog.Description>
                <div className="dialog-actions">
                  <Dialog.Close asChild>
                    <button className="button button-secondary">取消</button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <button className="button button-danger" onClick={clearHistory}>
                      确认清空
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Tooltip.Provider>
      </div>
    </header>
  );
};