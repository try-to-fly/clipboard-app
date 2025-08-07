import { Copy } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

interface TextRendererProps {
  content: string;
}

export function TextRenderer({ content }: TextRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  return (
    <div className="text-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制">
          <Copy size={16} />
        </button>
      </div>
      <div className="text-content">
        <pre className="detail-text">{content}</pre>
      </div>
    </div>
  );
}