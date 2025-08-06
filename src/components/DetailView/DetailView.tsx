import { useEffect, useState } from 'react';
import { useClipboardStore } from '../../stores/clipboardStore';
import './DetailView.css';

export function DetailView() {
  const { selectedEntry, getImageUrl } = useClipboardStore();
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const loadImage = async () => {
      if (selectedEntry?.file_path && selectedEntry.content_type.toLowerCase().includes('image')) {
        try {
          const url = await getImageUrl(selectedEntry.file_path);
          setImageUrl(url);
        } catch (error) {
          console.error('Failed to load image:', error);
          setImageUrl('');
        }
      } else {
        setImageUrl('');
      }
    };
    
    loadImage();
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
    if (type.includes('text') || type.includes('string')) return '文本';
    if (type.includes('image')) return '图片';
    if (type.includes('file')) return '文件';
    return '未知';
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
        {selectedEntry.content_type.toLowerCase().includes('image') ? (
          imageUrl ? (
            <div className="detail-image-container">
              <img 
                src={imageUrl} 
                alt="剪贴板图片" 
                className="detail-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const errorDiv = e.currentTarget.parentElement?.querySelector('.detail-image-error');
                  if (errorDiv) {
                    errorDiv.classList.remove('hidden');
                  }
                }}
              />
              <div className="detail-image-error hidden">
                <p>图片加载失败</p>
                {selectedEntry.file_path && (
                  <p className="detail-file-path">{selectedEntry.file_path}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-image-loading">
              <p>加载图片中...</p>
            </div>
          )
        ) : selectedEntry.content_type.toLowerCase().includes('file') ? (
          <div className="detail-file">
            <div className="detail-file-icon">📁</div>
            <p className="detail-file-path">{selectedEntry.file_path || selectedEntry.content_data}</p>
          </div>
        ) : (
          <div className="detail-text-container">
            <pre className="detail-text">{selectedEntry.content_data}</pre>
          </div>
        )}
      </div>
    </div>
  );
}