import { lazy, Suspense } from 'react';
import { Copy, FileJson } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface JsonRendererProps {
  content: string;
}

export function JsonRenderer({ content }: JsonRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  // 格式化JSON
  let formattedJson = content;
  try {
    const parsed = JSON.parse(content);
    formattedJson = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // 如果解析失败，使用原始内容
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            <Badge variant="secondary">JSON</Badge>
          </div>
          <Button onClick={handleCopy} size="sm" variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            复制JSON
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-t">
          <Suspense fallback={
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">加载编辑器...</div>
            </div>
          }>
            <MonacoEditor
              height="400px"
              language="json"
              value={formattedJson}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                automaticLayout: true,
                folding: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}