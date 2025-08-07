import { lazy, Suspense } from 'react';
import { Copy, Code } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

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
    <div className="code-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制代码">
          <Copy size={16} />
        </button>
        <span className="code-language">
          <Code size={16} />
          {detectedLanguage}
        </span>
      </div>

      <div className="code-content">
        <Suspense fallback={<div className="code-loading">加载编辑器...</div>}>
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
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}