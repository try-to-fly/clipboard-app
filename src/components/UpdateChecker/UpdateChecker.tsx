import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import * as Toast from '@radix-ui/react-toast';
import { Download, X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  notes?: string;
  pub_date?: string;
  available: boolean;
}

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    checkForUpdatesOnStartup();

    // Listen for update download progress
    const unlisten = listen<number>('update-download-progress', (event) => {
      setDownloadProgress(event.payload);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const checkForUpdatesOnStartup = async () => {
    try {
      // Check if we should check for updates (based on auto_update config and last check time)
      const shouldCheck = await invoke<boolean>('should_check_for_updates');
      
      if (!shouldCheck) {
        console.log('Skipping update check (disabled or checked recently)');
        return;
      }

      console.log('Checking for updates on startup...');
      const info = await invoke<UpdateInfo>('check_for_update');
      
      if (info && info.available) {
        setUpdateInfo(info);
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;

    const yes = await ask(
      `发现新版本 ${updateInfo.version}！\n\n${updateInfo.notes || '更新内容：\n- 性能优化\n- 错误修复'}\n\n是否立即更新？`,
      { 
        title: '软件更新',
        okLabel: '立即更新',
        cancelLabel: '稍后提醒'
      }
    );

    if (yes) {
      try {
        setDownloading(true);
        await invoke('install_update');
        // App will restart automatically after update
      } catch (error) {
        console.error('Failed to install update:', error);
        await message('更新失败，请稍后重试', { 
          title: '错误',
          kind: 'error'
        });
        setDownloading(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    setUpdateInfo(null);
  };

  if (!updateInfo || !showToast) {
    return null;
  }

  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        className="update-toast"
        open={showToast}
        onOpenChange={setShowToast}
        duration={downloading ? Infinity : 10000}
      >
        <Toast.Title className="update-toast-title">
          <Download size={16} />
          发现新版本 {updateInfo.version}
        </Toast.Title>
        
        <Toast.Description className="update-toast-description">
          {downloading ? (
            <div className="download-progress">
              <div className="progress-text">正在下载更新... {downloadProgress}%</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="update-notes">
                {updateInfo.notes?.split('\n').slice(0, 2).join('\n') || '包含性能优化和错误修复'}
              </div>
              <div className="update-actions">
                <button 
                  className="update-btn primary"
                  onClick={handleInstallUpdate}
                >
                  立即更新
                </button>
                <button 
                  className="update-btn secondary"
                  onClick={handleDismiss}
                >
                  稍后
                </button>
              </div>
            </>
          )}
        </Toast.Description>

        {!downloading && (
          <Toast.Close className="update-toast-close" onClick={handleDismiss}>
            <X size={14} />
          </Toast.Close>
        )}
      </Toast.Root>

      <Toast.Viewport className="update-toast-viewport" />
    </Toast.Provider>
  );
}