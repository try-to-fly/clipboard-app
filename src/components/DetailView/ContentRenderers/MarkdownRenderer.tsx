import { Copy, FileText } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { copyToClipboard } = useClipboardStore();

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
    <div className="markdown-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制Markdown">
          <Copy size={16} />
        </button>
        <span className="markdown-label">
          <FileText size={16} />
          Markdown
        </span>
      </div>

      <div className="markdown-content">
        <div className="markdown-preview">
          <div className="markdown-rendered">
            {renderSimpleMarkdown(content)}
          </div>
        </div>
        
        <details className="markdown-source">
          <summary>查看源码</summary>
          <pre className="markdown-raw">{content}</pre>
        </details>
      </div>
    </div>
  );
}