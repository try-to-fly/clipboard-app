import { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import queryString from 'query-string';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { UrlParts } from '../../../types/clipboard';

interface UrlRendererProps {
  content: string;
  metadata?: string | null;
}

export function UrlRenderer({ content, metadata }: UrlRendererProps) {
  const { copyToClipboard } = useClipboardStore();
  const [urlParts, setUrlParts] = useState<UrlParts | null>(null);
  const [previewType, setPreviewType] = useState<'none' | 'image' | 'video' | 'json'>('none');
  const [jsonContent, setJsonContent] = useState<string>('');

  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        setUrlParts(parsed.url_parts);
      } catch (e) {
        // 如果metadata解析失败，手动解析URL
        try {
          const url = new URL(content);
          const parsedUrl = queryString.parseUrl(content);
          const queryParams = Object.entries(parsedUrl.query || {}).map(([k, v]) => 
            [k, Array.isArray(v) ? v.join(',') : String(v)] as [string, string]
          );
          
          setUrlParts({
            protocol: url.protocol.replace(':', ''),
            host: url.host,
            path: url.pathname,
            query_params: queryParams,
          });
        } catch (e) {
          console.error('URL解析失败:', e);
        }
      }
    }

    // 检测内容类型
    if (content.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) {
      setPreviewType('image');
    } else if (content.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
      setPreviewType('video');
    } else if (content.match(/\.(json)(\?|$)/i) || content.includes('/api/')) {
      // 可能是JSON API
      fetchJsonContent(content);
    }
  }, [content, metadata]);

  const fetchJsonContent = async (fetchUrl: string) => {
    try {
      // 这里只是模拟，实际需要通过后端代理请求
      setPreviewType('json');
      setJsonContent('// JSON预览功能需要后端支持');
      console.log('预览URL:', fetchUrl);
    } catch (e) {
      console.error('获取JSON失败:', e);
    }
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  const handleOpenUrl = () => {
    window.open(content, '_blank');
  };

  return (
    <div className="url-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={() => handleCopy(content)} title="复制URL">
          <Copy size={16} />
        </button>
        <button className="detail-action-btn" onClick={handleOpenUrl} title="在浏览器中打开">
          <ExternalLink size={16} />
        </button>
      </div>

      <div className="url-content">
        <div className="url-full">
          <span className="url-label">完整URL:</span>
          <code className="url-value">{content}</code>
        </div>

        {urlParts && (
          <div className="url-parts">
            <div className="url-part">
              <span className="url-label">协议:</span>
              <code className="url-value">{urlParts.protocol}</code>
            </div>
            <div className="url-part">
              <span className="url-label">主机:</span>
              <code className="url-value">{urlParts.host}</code>
            </div>
            <div className="url-part">
              <span className="url-label">路径:</span>
              <code className="url-value">{urlParts.path}</code>
            </div>
            
            {urlParts.query_params.length > 0 && (
              <div className="url-params">
                <span className="url-label">查询参数:</span>
                <div className="params-list">
                  {urlParts.query_params.map(([key, value], index) => (
                    <div key={index} className="param-item">
                      <code className="param-key">{key}</code>
                      <span className="param-separator">=</span>
                      <code className="param-value">{value}</code>
                      <button 
                        className="param-copy-btn" 
                        onClick={() => handleCopy(value)}
                        title="复制值"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {previewType === 'image' && (
          <div className="url-preview">
            <span className="url-label">图片预览:</span>
            <img src={content} alt="预览" className="url-preview-image" />
          </div>
        )}

        {previewType === 'video' && (
          <div className="url-preview">
            <span className="url-label">视频预览:</span>
            <video src={content} controls className="url-preview-video" />
          </div>
        )}

        {previewType === 'json' && jsonContent && (
          <div className="url-preview">
            <span className="url-label">JSON预览:</span>
            <pre className="json-preview">{jsonContent}</pre>
          </div>
        )}
      </div>
    </div>
  );
}