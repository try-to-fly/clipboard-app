import { useEffect, useState } from 'react';
import { useClipboardStore } from '../../stores/clipboardStore';
import './DetailView.css';

export function DetailView() {
  const { selectedEntry, getImageUrl, openFileWithSystem } = useClipboardStore();
  const [imageUrl, setImageUrl] = useState<string>('');

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

  const handleImageClick = async () => {
    if (selectedEntry?.file_path) {
      try {
        await openFileWithSystem(selectedEntry.file_path);
      } catch (error) {
        console.error('Failed to open image with system viewer:', error);
      }
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
        {selectedEntry.content_type.toLowerCase().includes('image') ? (
          imageUrl ? (
            <div className="detail-image-container">
              <img 
                src={imageUrl} 
                alt="剪贴板图片" 
                className="detail-image"
                onClick={handleImageClick}
                style={{ cursor: 'pointer' }}
                title="点击用系统查看器打开"
                onError={(e) => {
                  console.error('[DetailView] 图片元素加载失败');
                  e.currentTarget.style.display = 'none';
                  const errorDiv = e.currentTarget.parentElement?.querySelector('.detail-image-error');
                  if (errorDiv) {
                    errorDiv.classList.remove('hidden');
                  }
                }}
                onLoad={() => {
                  console.log('[DetailView] 图片元素加载成功');
                }}
              />
              <div className="detail-image-error hidden">
                <p>图片加载失败</p>
                {selectedEntry.file_path && (
                  <>
                    <p className="detail-file-path">文件路径: {selectedEntry.file_path}</p>
                    <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
                      请尝试重新复制图片或检查图片文件是否存在
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-image-loading">
              <p>加载图片中...</p>
              {selectedEntry.file_path && (
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
                  {selectedEntry.file_path}
                </p>
              )}
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