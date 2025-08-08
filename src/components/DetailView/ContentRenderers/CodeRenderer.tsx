import { lazy, Suspense } from 'react';
import { Copy, Code } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface CodeRendererProps {
  content: string;
  metadata?: string | null;
}

export function CodeRenderer({ content, metadata }: CodeRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  // 从metadata中获取检测到的语言
  let detectedLanguage = 'plaintext';
  if (metadata) {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed.detected_language) {
        detectedLanguage = parsed.detected_language;
      }
    } catch (e) {
      console.error('解析代码元数据失败:', e);
    }
  }

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            <Badge variant="secondary">{detectedLanguage}</Badge>
          </div>
          <Button onClick={handleCopy} size="sm" variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            复制代码
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
              language={detectedLanguage}
              value={content}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}