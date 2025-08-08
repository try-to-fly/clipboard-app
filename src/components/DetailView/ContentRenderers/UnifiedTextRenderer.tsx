import { lazy, Suspense, useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { ContentSubType } from '../../../types/clipboard';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';
import { defineMonacoThemes } from '../../../utils/monacoTheme';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface UnifiedTextRendererProps {
  content: string;
  contentSubType: ContentSubType;
  metadata?: string | null;
}

// 内容类型到Monaco语言的映射
const getLanguageForContentType = (contentSubType: ContentSubType, metadata?: string | null): string => {
  switch (contentSubType) {
    case 'code':
      // 从metadata中获取检测到的语言
      if (metadata) {
        try {
          const parsed = JSON.parse(metadata);
          if (parsed.detected_language) {
            return parsed.detected_language;
          }
        } catch (e) {
          console.error('解析代码元数据失败:', e);
        }
      }
      return 'plaintext';
    case 'json':
      return 'json';
    case 'markdown':
      return 'markdown';
    case 'command':
      return 'shell';
    case 'plain_text':
    default:
      return 'plaintext';
  }
};

// 内容类型到显示名称的映射
const getDisplayNameForContentType = (contentSubType: ContentSubType): string => {
  switch (contentSubType) {
    case 'code':
      return '代码';
    case 'json':
      return 'JSON';
    case 'markdown':
      return 'Markdown';
    case 'command':
      return '命令';
    case 'plain_text':
    default:
      return '文本';
  }
};

export function UnifiedTextRenderer({ content, contentSubType, metadata }: UnifiedTextRendererProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isCopied, setIsCopied] = useState(false);
  const resolvedTheme = useResolvedTheme();

  // 当content props变化时，更新编辑器内容
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const language = getLanguageForContentType(contentSubType, metadata);
  const displayName = getDisplayNameForContentType(contentSubType);
  const monacoTheme = resolvedTheme === 'dark' ? 'clipboard-dark' : 'clipboard-light';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };


  return (
    <div className="h-full flex flex-col">
      <Card id="text-renderer" className="flex-1 flex flex-col">
        <CardHeader id="text-renderer-header" className="pb-3 flex-shrink-0">
          <div id="text-renderer-toolbar" className="flex items-center justify-between">
            <div id="text-renderer-badges" className="flex items-center gap-2">
              <Badge variant="secondary">{displayName}</Badge>
              {language !== 'plaintext' && (
                <Badge variant="outline" className="text-xs">
                  {language}
                </Badge>
              )}
            </div>
            <Button id="text-renderer-copy-btn" onClick={handleCopy} size="sm" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              {isCopied ? '已复制' : '复制'}
            </Button>
          </div>
        </CardHeader>

        <CardContent id="text-renderer-content" className="p-0 flex-1 flex flex-col">
          <div id="text-renderer-editor-container" className="border-t flex-1">
            <Suspense fallback={
              <div id="text-renderer-loading" className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">加载编辑器...</div>
              </div>
            }>
              <MonacoEditor
                key={`${language}-${resolvedTheme}-${content.substring(0, 50)}`}
                height="100%"
              language={language}
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              theme={monacoTheme}
              beforeMount={(monaco) => {
                defineMonacoThemes(monaco);
              }}
              options={{
                readOnly: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                tabSize: 2,
                insertSpaces: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                wordBasedSuggestions: true,
                parameterHints: { enabled: true },
                folding: true,
                foldingHighlight: true,
                unfoldOnClickAfterEndOfLine: true,
                selectOnLineNumbers: true,
                contextmenu: true,
                cursorBlinking: 'blink',
                cursorSmoothCaretAnimation: true,
              }}
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}