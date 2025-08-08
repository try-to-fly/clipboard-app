import { Copy, FileText, Eye, Code2 } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { copyToClipboard } = useClipboardStore();
  const [showSource, setShowSource] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  // 简单的Markdown渲染（实际项目中可以使用react-markdown）
  const renderSimpleMarkdown = (text: string) => {
    // 这里只做简单的展示，实际需要完整的Markdown解析器
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index}>{line.substring(2)}</h1>;
        } else if (line.startsWith('## ')) {
          return <h2 key={index}>{line.substring(3)}</h2>;
        } else if (line.startsWith('### ')) {
          return <h3 key={index}>{line.substring(4)}</h3>;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={index}>{line.substring(2)}</li>;
        } else if (line.startsWith('> ')) {
          return <blockquote key={index}>{line.substring(2)}</blockquote>;
        } else if (line === '') {
          return <br key={index} />;
        } else {
          return <p key={index}>{line}</p>;
        }
      });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <Badge variant="secondary">Markdown</Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowSource(!showSource)} 
              size="sm" 
              variant="outline"
            >
              {showSource ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  预览
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4 mr-2" />
                  源码
                </>
              )}
            </Button>
            <Button onClick={handleCopy} size="sm" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              复制Markdown
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          {showSource ? (
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed bg-muted">
              {content}
            </pre>
          ) : (
            <div className="p-4 prose prose-sm max-w-none">
              <div className="space-y-3">
                {renderSimpleMarkdown(content)}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}