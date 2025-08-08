import { Copy, Terminal } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';

interface CommandRendererProps {
  content: string;
}

export function CommandRenderer({ content }: CommandRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  // 解析命令
  const lines = content.split('\n');
  
  // 尝试识别命令类型
  let commandType = 'shell';
  if (content.startsWith('git ')) commandType = 'git';
  else if (content.startsWith('npm ') || content.startsWith('yarn ') || content.startsWith('pnpm ')) commandType = 'node';
  else if (content.startsWith('docker ')) commandType = 'docker';
  else if (content.startsWith('kubectl ')) commandType = 'kubernetes';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <Badge variant="secondary">{commandType} 命令</Badge>
          </div>
          <Button onClick={handleCopy} size="sm" variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            复制命令
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="bg-gray-900 text-gray-100 rounded-b-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm text-gray-400">Terminal</span>
            </div>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-4 font-mono text-sm space-y-1">
              {lines.map((line, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-green-400 font-bold select-none">$</span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{line}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}