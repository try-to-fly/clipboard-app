import { Copy, Terminal } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

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
    <div className="command-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制命令">
          <Copy size={16} />
        </button>
        <span className="command-type">
          <Terminal size={16} />
          {commandType}
        </span>
      </div>

      <div className="command-content">
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-buttons">
              <span className="terminal-button red"></span>
              <span className="terminal-button yellow"></span>
              <span className="terminal-button green"></span>
            </div>
            <span className="terminal-title">Terminal</span>
          </div>
          <div className="terminal-body">
            <pre className="command-text">
              {lines.map((line, index) => (
                <div key={index} className="command-line">
                  <span className="command-prompt">$</span>
                  <span className="command-content">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}