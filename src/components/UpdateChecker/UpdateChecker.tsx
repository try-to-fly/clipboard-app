import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common']);
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
        console.log('[UpdateChecker] Skipping update check (disabled or checked recently)');
        return;
      }

      console.log('[UpdateChecker] Checking for updates on startup...');
      const info = await invoke<UpdateInfo>('check_for_update');
      
      if (info.available) {
        console.log('[UpdateChecker] Update available, showing notification');
        setUpdateInfo(info);
        setShowToast(true);
      } else {
        console.log('[UpdateChecker] No updates available on startup check');
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to check for updates on startup:', error);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;

    const notes = updateInfo.notes || t('updateChecker.defaultNotes');
    const yes = await ask(
      t('updateChecker.newVersionMessage', { version: updateInfo.version, notes }),
      { 
        title: t('updateChecker.updateTitle'),
        okLabel: t('updateChecker.updateNow'),
        cancelLabel: t('updateChecker.later')
      }
    );

    if (yes) {
      try {
        setDownloading(true);
        await invoke('install_update');
        // App will restart automatically after update
      } catch (error) {
        console.error('Failed to install update:', error);
        await message(t('updateChecker.updateFailed'), { 
          title: t('updateChecker.error'),
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
          {t('updateChecker.newVersionTitle', { version: updateInfo.version })}
        </Toast.Title>
        
        <Toast.Description className="update-toast-description">
          {downloading ? (
            <div className="download-progress">
              <div className="progress-text">{t('updateChecker.updating', { progress: downloadProgress })}</div>
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
                {updateInfo.notes?.split('\n').slice(0, 2).join('\n') || t('updateChecker.updateNotesDefault')}
              </div>
              <div className="update-actions">
                <button 
                  className="update-btn primary"
                  onClick={handleInstallUpdate}
                >
                  {t('updateChecker.updateNow')}
                </button>
                <button 
                  className="update-btn secondary"
                  onClick={handleDismiss}
                >
                  {t('updateChecker.later')}
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