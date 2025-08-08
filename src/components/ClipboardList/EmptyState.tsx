import React from 'react';
import { Clipboard } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useClipboardStore } from '../../stores/clipboardStore';

export const EmptyState: React.FC = () => {
  const { isMonitoring, startMonitoring } = useClipboardStore();

  return (
    <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <Clipboard size={64} className="text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">暂无剪切板记录</h3>
      {!isMonitoring ? (
        <>
          <p className="text-muted-foreground mb-4">点击开始按钮启动剪切板监听</p>
          <Button onClick={startMonitoring}>
            开始监听
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">复制一些内容试试吧</p>
      )}
    </Card>
  );
};