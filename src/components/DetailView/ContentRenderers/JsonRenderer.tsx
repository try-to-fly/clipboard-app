import { lazy, Suspense } from 'react';
import { Copy } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

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
    <div className="json-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制JSON">
          <Copy size={16} />
        </button>
        <span className="json-label">JSON</span>
      </div>

      <div className="json-content">
        <Suspense fallback={<div className="json-loading">加载编辑器...</div>}>
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
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}