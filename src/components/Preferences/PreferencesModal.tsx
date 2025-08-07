import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import * as Select from '@radix-ui/react-select';
import { X, Settings, Keyboard, Shield, Power, Plus, ChevronDown, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from '../../stores/configStore';
import { ShortcutRecorder } from './ShortcutRecorder';
import './PreferencesModal.css';

export function PreferencesModal() {
  const {
    config,
    cacheStats,
    loading,
    showPreferences,
    loadConfig,
    updateConfig,
    loadCacheStatistics,
    registerGlobalShortcut,
    setAutoStartup,
    getAutoStartupStatus,
    setShowPreferences,
    formatBytes,
    getExpiryDisplayValue,
    createExpiryOption,
  } = useConfigStore();

  const [localConfig, setLocalConfig] = useState(config);
  const [autoStartupEnabled, setAutoStartupEnabled] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(config?.auto_update ?? true);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [availableApps, setAvailableApps] = useState<{name: string, bundle_id: string}[]>([]);

  useEffect(() => {
    if (showPreferences && !config) {
      loadConfig();
      loadCacheStatistics();
    }
  }, [showPreferences, config, loadConfig, loadCacheStatistics]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setAutoUpdateEnabled(config.auto_update ?? true);
    }
  }, [config]);

  useEffect(() => {
    if (showPreferences) {
      getAutoStartupStatus().then(setAutoStartupEnabled);
      // Load available applications
      loadAvailableApps();
    }
  }, [showPreferences, getAutoStartupStatus]);

  const loadAvailableApps = async () => {
    try {
      const apps = await invoke<{name: string, bundle_id: string}[]>('get_installed_applications');
      console.log('Loaded apps:', apps.length);
      setAvailableApps(apps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const validateShortcut = async (shortcut: string): Promise<boolean> => {
    try {
      return await invoke<boolean>('validate_shortcut', { shortcut });
    } catch (error) {
      console.error('Failed to validate shortcut:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!localConfig) return;

    try {
      // Update config with auto_update setting
      const updatedConfig = {
        ...localConfig,
        auto_update: autoUpdateEnabled,
      };
      
      await updateConfig(updatedConfig);
      
      // Update global shortcut if changed
      if (config && localConfig.global_shortcut !== config.global_shortcut) {
        try {
          await registerGlobalShortcut(localConfig.global_shortcut);
          setShortcutError(null);
        } catch (error) {
          setShortcutError(String(error));
          return;
        }
      }

      // Update auto startup if changed
      if (autoStartupEnabled !== (config?.auto_startup || false)) {
        await setAutoStartup(autoStartupEnabled);
      }

      setShowPreferences(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setShortcutError(null);
    setShowPreferences(false);
  };

  if (!localConfig) {
    return null;
  }

  return (
    <Dialog.Root open={showPreferences} onOpenChange={setShowPreferences}>
      <Dialog.Portal>
        <Dialog.Overlay className="preferences-overlay" />
        <Dialog.Content className="preferences-content">
          <div className="preferences-header">
            <Dialog.Title className="preferences-title">
              <Settings size={20} />
              偏好设置
            </Dialog.Title>
            <Dialog.Close className="preferences-close">
              <X size={16} />
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="text" className="preferences-tabs">
            <Tabs.List className="preferences-tab-list">
              <Tabs.Trigger value="text" className="preferences-tab-trigger">
                文本设置
              </Tabs.Trigger>
              <Tabs.Trigger value="image" className="preferences-tab-trigger">
                图片设置
              </Tabs.Trigger>
              <Tabs.Trigger value="security" className="preferences-tab-trigger">
                <Shield size={16} />
                安全
              </Tabs.Trigger>
              <Tabs.Trigger value="shortcuts" className="preferences-tab-trigger">
                <Keyboard size={16} />
                快捷键
              </Tabs.Trigger>
              <Tabs.Trigger value="system" className="preferences-tab-trigger">
                <Power size={16} />
                系统
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="text" className="preferences-tab-content">
              <div className="preference-section">
                <h3>文本限制</h3>
                <div className="preference-item">
                  <label>最大文本大小: {localConfig.text.max_size_mb} MB</label>
                  <Slider.Root
                    value={[localConfig.text.max_size_mb]}
                    onValueChange={([value]: number[]) =>
                      setLocalConfig(prev => prev ? {
                        ...prev,
                        text: { ...prev.text, max_size_mb: value }
                      } : prev)
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="slider-root"
                  >
                    <Slider.Track className="slider-track">
                      <Slider.Range className="slider-range" />
                    </Slider.Track>
                    <Slider.Thumb className="slider-thumb" />
                  </Slider.Root>
                  <span className="slider-hint">
                    超过此大小的文本将不会被记录
                  </span>
                </div>

                <div className="preference-item">
                  <label>文本过期时间</label>
                  <div className="radio-group">
                    {[
                      { value: '7', label: '7 天' },
                      { value: '14', label: '14 天' },
                      { value: '30', label: '30 天' },
                      { value: 'never', label: '永久' }
                    ].map(option => (
                      <label key={option.value} className="radio-item">
                        <input
                          type="radio"
                          name="text-expiry"
                          value={option.value}
                          checked={getExpiryDisplayValue(localConfig.text.expiry) === option.value}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocalConfig(prev => prev ? {
                                ...prev,
                                text: { ...prev.text, expiry: createExpiryOption(option.value) }
                              } : prev);
                            }
                          }}
                          className="radio-input"
                        />
                        <span className="radio-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="image" className="preferences-tab-content">
              <div className="preference-section">
                <h3>图片设置</h3>
                <div className="preference-item">
                  <label>图片过期时间</label>
                  <div className="radio-group">
                    {[
                      { value: '7', label: '7 天' },
                      { value: '14', label: '14 天' },
                      { value: '30', label: '30 天' },
                      { value: 'never', label: '永久' }
                    ].map(option => (
                      <label key={option.value} className="radio-item">
                        <input
                          type="radio"
                          name="image-expiry"
                          value={option.value}
                          checked={getExpiryDisplayValue(localConfig.image.expiry) === option.value}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocalConfig(prev => prev ? {
                                ...prev,
                                image: { ...prev.image, expiry: createExpiryOption(option.value) }
                              } : prev);
                            }
                          }}
                          className="radio-input"
                        />
                        <span className="radio-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="security" className="preferences-tab-content">
              <div className="preference-section">
                <h3>应用排除</h3>
                <p className="section-description">
                  这些应用的剪贴板内容将不会被记录，以保护敏感信息。
                </p>
                <div className="excluded-apps-list">
                  {localConfig.excluded_apps_v2?.map((excludedApp, index) => (
                    <div key={index} className="excluded-app-item">
                      <div className="app-info">
                        <span className="app-name">{excludedApp.name}</span>
                        <span className="app-bundle-id">{excludedApp.bundle_id}</span>
                      </div>
                      <button
                        onClick={() =>
                          setLocalConfig(prev => prev ? {
                            ...prev,
                            excluded_apps_v2: prev.excluded_apps_v2?.filter((_, i) => i !== index) || []
                          } : prev)
                        }
                        className="remove-app-btn"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="add-app-section">
                    <div className="app-selector-label">
                      <Plus size={16} />
                      添加应用
                    </div>
                    <Select.Root
                      value=""
                      onValueChange={(value) => {
                        if (value) {
                          const selectedApp = availableApps.find(app => app.bundle_id === value);
                          if (selectedApp) {
                            setLocalConfig(prev => prev ? {
                              ...prev,
                              excluded_apps_v2: [
                                ...(prev.excluded_apps_v2 || []),
                                { name: selectedApp.name, bundle_id: selectedApp.bundle_id }
                              ]
                            } : prev);
                          }
                        }
                      }}
                    >
                      <Select.Trigger className="select-trigger">
                        <Select.Value placeholder="选择要排除的应用..." />
                        <Select.Icon>
                          <ChevronDown size={16} />
                        </Select.Icon>
                      </Select.Trigger>
                      
                      <Select.Portal>
                        <Select.Content className="select-content">
                          <Select.Viewport className="select-viewport">
                            {availableApps
                              .filter(app => !(localConfig.excluded_apps_v2?.some(excluded => excluded.bundle_id === app.bundle_id)))
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(app => (
                                <Select.Item key={app.bundle_id} value={app.bundle_id} className="select-item">
                                  <Select.ItemText>{app.name}</Select.ItemText>
                                  <Select.ItemIndicator className="select-item-indicator">
                                    <Check size={14} />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))
                            }
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="shortcuts" className="preferences-tab-content">
              <div className="preference-section">
                <h3>全局快捷键</h3>
                <div className="preference-item">
                  <label>唤起应用快捷键</label>
                  <ShortcutRecorder
                    value={localConfig.global_shortcut}
                    onChange={(shortcut) => 
                      setLocalConfig(prev => prev ? {
                        ...prev,
                        global_shortcut: shortcut
                      } : prev)
                    }
                    onValidate={validateShortcut}
                  />
                  {shortcutError && (
                    <span className="error-message">{shortcutError}</span>
                  )}
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="system" className="preferences-tab-content">
              <div className="preference-section">
                <h3>启动设置</h3>
                <div className="preference-item">
                  <div className="switch-item">
                    <Switch.Root
                      checked={autoStartupEnabled}
                      onCheckedChange={setAutoStartupEnabled}
                      className="switch-root"
                    >
                      <Switch.Thumb className="switch-thumb" />
                    </Switch.Root>
                    <label className="switch-label">
                      开机自动启动
                    </label>
                  </div>
                </div>

                <h3>更新设置</h3>
                <div className="preference-item">
                  <div className="switch-item">
                    <Switch.Root
                      checked={autoUpdateEnabled}
                      onCheckedChange={setAutoUpdateEnabled}
                      className="switch-root"
                    >
                      <Switch.Thumb className="switch-thumb" />
                    </Switch.Root>
                    <label className="switch-label">
                      自动检查更新
                    </label>
                  </div>
                  <span className="slider-hint">
                    启用后，应用将在每天首次启动时自动检查更新
                  </span>
                  <button
                    onClick={async () => {
                      const { invoke } = await import('@tauri-apps/api/core');
                      const { ask } = await import('@tauri-apps/plugin-dialog');
                      
                      try {
                        const updateInfo = await invoke<any>('check_for_update');
                        if (updateInfo && updateInfo.available) {
                          const yes = await ask(
                            `发现新版本 ${updateInfo.version}！\n\n${updateInfo.notes || ''}\n\n是否立即更新？`,
                            { title: '软件更新', okLabel: '更新', cancelLabel: '稍后' }
                          );
                          if (yes) {
                            await invoke('install_update');
                          }
                        } else {
                          await ask('当前已是最新版本', { 
                            title: '检查更新',
                            okLabel: '确定',
                            cancelLabel: undefined
                          });
                        }
                      } catch (error) {
                        console.error('Failed to check for updates:', error);
                        await ask('检查更新失败，请稍后重试', { 
                          title: '错误',
                          okLabel: '确定',
                          cancelLabel: undefined
                        });
                      }
                    }}
                    className="action-btn secondary"
                    style={{ marginTop: '10px' }}
                  >
                    立即检查更新
                  </button>
                </div>

                <h3>缓存统计</h3>
                {cacheStats && (
                  <div className="cache-stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-title">数据库大小</div>
                      <div className="stat-card-value">{formatBytes(cacheStats.db_size_bytes)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-title">图片缓存</div>
                      <div className="stat-card-value">{formatBytes(cacheStats.images_size_bytes)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-title">总记录数</div>
                      <div className="stat-card-value">{cacheStats.total_entries}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-title">文本记录</div>
                      <div className="stat-card-value">{cacheStats.text_entries}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-title">图片记录</div>
                      <div className="stat-card-value">{cacheStats.image_entries}</div>
                    </div>
                  </div>
                )}
              </div>
            </Tabs.Content>
          </Tabs.Root>

          <div className="preferences-actions">
            <button onClick={handleCancel} className="action-btn secondary">
              取消
            </button>
            <button onClick={handleSave} className="action-btn primary" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}