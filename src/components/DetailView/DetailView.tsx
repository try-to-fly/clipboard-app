import { useEffect, useState } from 'react';
import { useClipboardStore } from '../../stores/clipboardStore';
import { ContentSubType, ContentMetadata } from '../../types/clipboard';
import {
  TextRenderer,
  UrlRenderer,
  ColorRenderer,
  CodeRenderer,
  IpRenderer,
  EmailRenderer,
  TimeRenderer,
  JsonRenderer,
  MarkdownRenderer,
  CommandRenderer,
} from './ContentRenderers';
import { ImagePreview } from './ImagePreview';
import './DetailView.css';
import './ContentRenderers/ContentRenderers.css';


const parseMetadata = (metadataString?: string | null): ContentMetadata | null => {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString) as ContentMetadata;
  } catch {
    return null;
  }
};

export function DetailView() {
  const { selectedEntry, getImageUrl, openFileWithSystem } = useClipboardStore();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [contentSubType, setContentSubType] = useState<ContentSubType>('plain_text');

  useEffect(() => {
    const loadImage = async () => {
      if (selectedEntry?.file_path && selectedEntry.content_type.toLowerCase().includes('image')) {
        try {
          console.log('[DetailView] 开始加载图片:', selectedEntry.file_path);
          const url = await getImageUrl(selectedEntry.file_path);
          console.log('[DetailView] 图片URL获取成功，长度:', url.length);
          setImageUrl(url);
        } catch (error) {
          console.error('[DetailView] 图片加载失败:', error);
          console.error('[DetailView] 文件路径:', selectedEntry.file_path);
          setImageUrl('');
        }
      } else {
        setImageUrl('');
      }
    };
    
    loadImage();

    // 解析内容子类型
    if (selectedEntry?.content_subtype) {
      try {
        const subtype = JSON.parse(selectedEntry.content_subtype);
        console.log('[DetailView] 解析到的子类型:', subtype);
        setContentSubType(subtype as ContentSubType);
      } catch (e) {
        console.error('[DetailView] 子类型解析失败:', e, selectedEntry.content_subtype);
        setContentSubType('plain_text');
      }
    } else {
      console.log('[DetailView] 没有子类型信息，使用默认值');
      setContentSubType('plain_text');
    }
  }, [selectedEntry, getImageUrl]);

  if (!selectedEntry) {
    return (
      <div className="detail-view">
        <div className="detail-empty">
          <p>选择一个项目查看详情</p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getContentType = () => {
    const type = selectedEntry.content_type.toLowerCase();
    
    // 如果是文本类型，显示具体的子类型
    if (type.includes('text') || type.includes('string')) {
      const subtypeMap: Record<ContentSubType, string> = {
        'plain_text': '纯文本',
        'url': 'URL链接',
        'ip_address': 'IP地址',
        'email': '邮箱地址',
        'color': '颜色值',
        'code': '代码片段',
        'command': '命令行',
        'timestamp': '时间戳',
        'json': 'JSON数据',
        'markdown': 'Markdown',
      };
      return subtypeMap[contentSubType] || '文本';
    }
    
    if (type.includes('image')) return '图片';
    if (type.includes('file')) return '文件';
    return '未知';
  };

  const handleImageClick = async () => {
    if (selectedEntry?.file_path) {
      try {
        await openFileWithSystem(selectedEntry.file_path);
      } catch (error) {
        console.error('Failed to open image with system viewer:', error);
      }
    }
  };

  const renderContent = () => {
    if (!selectedEntry) return null;

    // 图片类型
    if (selectedEntry.content_type.toLowerCase().includes('image')) {
      const metadata = parseMetadata(selectedEntry.metadata);
      const imageMetadata = metadata?.image_metadata;
      
      if (imageUrl && selectedEntry.file_path) {
        return (
          <ImagePreview
            imageUrl={imageUrl}
            filePath={selectedEntry.file_path}
            metadata={imageMetadata}
            onOpenWithSystem={handleImageClick}
          />
        );
      } else {
        return (
          <div className="detail-image-loading">
            <p>加载图片中...</p>
            {selectedEntry.file_path && (
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
                {selectedEntry.file_path}
              </p>
            )}
          </div>
        );
      }
    }

    // 文件类型
    if (selectedEntry.content_type.toLowerCase().includes('file')) {
      return (
        <div className="detail-file">
          <div className="detail-file-icon">📁</div>
          <p className="detail-file-path">{selectedEntry.file_path || selectedEntry.content_data}</p>
        </div>
      );
    }

    // 文本类型 - 根据子类型选择不同的渲染器
    const content = selectedEntry.content_data || '';
    const metadata = selectedEntry.metadata;

    switch (contentSubType) {
      case 'url':
        return <UrlRenderer content={content} metadata={metadata} />;
      case 'ip_address':
        return <IpRenderer content={content} />;
      case 'email':
        return <EmailRenderer content={content} />;
      case 'color':
        return <ColorRenderer content={content} metadata={metadata} />;
      case 'code':
        return <CodeRenderer content={content} metadata={metadata} />;
      case 'command':
        return <CommandRenderer content={content} />;
      case 'timestamp':
        return <TimeRenderer content={content} metadata={metadata} />;
      case 'json':
        return <JsonRenderer content={content} />;
      case 'markdown':
        return <MarkdownRenderer content={content} />;
      case 'plain_text':
      default:
        return <TextRenderer content={content} />;
    }
  };

  return (
    <div className="detail-view">
      <div className="detail-header">
        <h3 className="detail-title">详情预览</h3>
        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-label">类型:</span>
            <span className="detail-meta-value">{getContentType()}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">来源:</span>
            <span className="detail-meta-value">{selectedEntry.source_app || '未知'}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">时间:</span>
            <span className="detail-meta-value">{formatDate(selectedEntry.created_at)}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">复制次数:</span>
            <span className="detail-meta-value">{selectedEntry.copy_count}</span>
          </div>
        </div>
      </div>

      <div className="detail-content">
        {renderContent()}
      </div>
    </div>
  );
}