import { Copy, Mail, User, AtSign } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

interface EmailRendererProps {
  content: string;
}

export function EmailRenderer({ content }: EmailRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  // 解析邮箱地址
  const [username, domain] = content.split('@');

  return (
    <div className="email-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={() => handleCopy(content)} title="复制邮箱">
          <Copy size={16} />
        </button>
      </div>

      <div className="email-content">
        <div className="email-header">
          <Mail size={24} className="email-icon" />
          <span className="email-label">邮箱地址</span>
        </div>

        <div className="email-value-section">
          <code className="email-value">{content}</code>
        </div>

        <div className="email-parts">
          <div className="email-part">
            <User size={16} className="email-part-icon" />
            <span className="email-part-label">用户名:</span>
            <code className="email-part-value">{username}</code>
            <button 
              className="email-copy-btn" 
              onClick={() => handleCopy(username)}
              title="复制用户名"
            >
              <Copy size={12} />
            </button>
          </div>
          
          <div className="email-part">
            <AtSign size={16} className="email-part-icon" />
            <span className="email-part-label">域名:</span>
            <code className="email-part-value">{domain}</code>
            <button 
              className="email-copy-btn" 
              onClick={() => handleCopy(domain)}
              title="复制域名"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        <div className="email-actions">
          <button 
            className="email-action-btn"
            onClick={() => window.location.href = `mailto:${content}`}
          >
            发送邮件
          </button>
        </div>
      </div>
    </div>
  );
}