import { Copy, Globe } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';

interface IpRendererProps {
  content: string;
}

export function IpRenderer({ content }: IpRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  // 判断是IPv4还是IPv6
  const isIPv6 = content.includes(':');
  const ipType = isIPv6 ? 'IPv6' : 'IPv4';

  return (
    <div className="ip-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={handleCopy} title="复制IP地址">
          <Copy size={16} />
        </button>
      </div>

      <div className="ip-content">
        <div className="ip-header">
          <Globe size={24} className="ip-icon" />
          <span className="ip-type">{ipType} 地址</span>
        </div>
        
        <div className="ip-value-section">
          <code className="ip-value">{content}</code>
        </div>

        <div className="ip-info">
          <div className="ip-info-item">
            <span className="ip-info-label">类型:</span>
            <span className="ip-info-value">{ipType}</span>
          </div>
          {!isIPv6 && (
            <div className="ip-info-item">
              <span className="ip-info-label">格式:</span>
              <span className="ip-info-value">
                {content.split('.').map((octet, i) => (
                  <span key={i}>
                    <span className="ip-octet">{octet}</span>
                    {i < 3 && <span className="ip-separator">.</span>}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="ip-actions">
          <button 
            className="ip-action-btn"
            onClick={() => window.open(`https://www.ipaddress.com/ipv4/${content}`, '_blank')}
          >
            查询IP信息
          </button>
        </div>
      </div>
    </div>
  );
}