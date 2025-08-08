import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Settings, Keyboard, Shield, Power, Plus, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from '../../stores/configStore';
import { ShortcutRecorder } from './ShortcutRecorder';

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
    <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            偏好设置
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 px-6">
          <Tabs defaultValue="text" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-5 mb-4 flex-shrink-0">
              <TabsTrigger value="text">文本设置</TabsTrigger>
              <TabsTrigger value="image">图片设置</TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                安全
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="flex items-center gap-1">
                <Keyboard className="w-4 h-4" />
                快捷键
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-1">
                <Power className="w-4 h-4" />
                系统
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="flex-1 overflow-y-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="space-y-6 pb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">文本限制</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        最大文本大小: {localConfig.text.max_size_mb} MB
                      </Label>
                      <Slider
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
                        className="w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        超过此大小的文本将不会被记录
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">文本过期时间</Label>
                      <RadioGroup 
                        value={getExpiryDisplayValue(localConfig.text.expiry)}
                        onValueChange={(value) => {
                          setLocalConfig(prev => prev ? {
                            ...prev,
                            text: { ...prev.text, expiry: createExpiryOption(value) }
                          } : prev);
                        }}
                        className="grid grid-cols-2 gap-4"
                      >
                        {[
                          { value: '7', label: '7 天' },
                          { value: '14', label: '14 天' },
                          { value: '30', label: '30 天' },
                          { value: 'never', label: '永久' }
                        ].map(option => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`text-expiry-${option.value}`} />
                            <Label htmlFor={`text-expiry-${option.value}`} className="text-sm font-normal">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="image" className="flex-1 overflow-y-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="space-y-6 pb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">图片设置</h3>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">图片过期时间</Label>
                    <RadioGroup 
                      value={getExpiryDisplayValue(localConfig.image.expiry)}
                      onValueChange={(value) => {
                        setLocalConfig(prev => prev ? {
                          ...prev,
                          image: { ...prev.image, expiry: createExpiryOption(value) }
                        } : prev);
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      {[
                        { value: '7', label: '7 天' },
                        { value: '14', label: '14 天' },
                        { value: '30', label: '30 天' },
                        { value: 'never', label: '永久' }
                      ].map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`image-expiry-${option.value}`} />
                          <Label htmlFor={`image-expiry-${option.value}`} className="text-sm font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="flex-1 overflow-y-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="space-y-6 pb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">应用排除</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    这些应用的剪贴板内容将不会被记录，以保护敏感信息。
                  </p>
                  
                  <div className="space-y-3">
                    {localConfig.excluded_apps_v2?.map((excludedApp, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg border">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{excludedApp.name}</span>
                          <span className="text-xs text-muted-foreground">{excludedApp.bundle_id}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setLocalConfig(prev => prev ? {
                              ...prev,
                              excluded_apps_v2: prev.excluded_apps_v2?.filter((_, i) => i !== index) || []
                            } : prev)
                          }
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        添加应用
                      </Label>
                      <Select
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
                        <SelectTrigger>
                          <SelectValue placeholder="选择要排除的应用..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableApps
                            .filter(app => !(localConfig.excluded_apps_v2?.some(excluded => excluded.bundle_id === app.bundle_id)))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(app => (
                              <SelectItem key={app.bundle_id} value={app.bundle_id}>
                                {app.name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shortcuts" className="flex-1 overflow-y-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="space-y-6 pb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">全局快捷键</h3>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">唤起应用快捷键</Label>
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
                      <p className="text-sm text-destructive">{shortcutError}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-y-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
              <div className="space-y-6 pb-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">启动设置</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoStartupEnabled}
                      onCheckedChange={setAutoStartupEnabled}
                    />
                    <Label className="text-sm font-medium">
                      开机自动启动
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">更新设置</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={autoUpdateEnabled}
                        onCheckedChange={setAutoUpdateEnabled}
                      />
                      <Label className="text-sm font-medium">
                        自动检查更新
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      启用后，应用将在每天首次启动时自动检查更新
                    </p>
                    <Button
                      variant="secondary"
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
                    >
                      立即检查更新
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">缓存统计</h3>
                  {cacheStats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">数据库大小</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-primary">{formatBytes(cacheStats.db_size_bytes)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">图片缓存</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-primary">{formatBytes(cacheStats.images_size_bytes)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">总记录数</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-primary">{cacheStats.total_entries}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">文本记录</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-primary">{cacheStats.text_entries}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">图片记录</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold text-primary">{cacheStats.image_entries}</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t flex-shrink-0 pb-6">
            <Button 
              variant="secondary" 
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}