import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Image, 
  File, 
  Star, 
  Copy, 
  Trash2,
  MoreVertical 
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ClipboardEntry, ContentMetadata } from '../../types/clipboard';
import { useClipboardStore } from '../../stores/clipboardStore';
import clsx from 'clsx';

interface ClipboardItemProps {
  entry: ClipboardEntry;
  isSelected?: boolean;
  onClick?: () => void;
  showNumber?: boolean;
  number?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

const parseMetadata = (metadataString?: string | null): ContentMetadata | null => {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString) as ContentMetadata;
  } catch {
    return null;
  }
};

export const ClipboardItem: React.FC<ClipboardItemProps> = ({ entry, isSelected, onClick, showNumber, number }) => {
  const { toggleFavorite, deleteEntry, copyToClipboard, getImageUrl, pasteSelectedEntry, getAppIcon } = useClipboardStore();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [appIconUrl, setAppIconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (entry.content_type.toLowerCase().includes('image') && entry.file_path) {
      getImageUrl(entry.file_path)
        .then(setImageUrl)
        .catch(() => setImageUrl(null));
    }
  }, [entry.content_type, entry.file_path, getImageUrl]);

  useEffect(() => {
    if (entry.app_bundle_id && getAppIcon) {
      getAppIcon(entry.app_bundle_id)
        .then(setAppIconUrl)
        .catch(() => setAppIconUrl(null));
    }
  }, [entry.app_bundle_id, getAppIcon]);

  const getIcon = () => {
    const type = entry.content_type.toLowerCase();
    
    if (type.includes('image') && imageUrl) {
      return (
        <div className="image-thumbnail">
          <img 
            src={imageUrl} 
            alt="Clipboard image" 
            style={{
              width: '20px',
              height: '20px',
              objectFit: 'cover',
              borderRadius: '2px'
            }}
          />
        </div>
      );
    }

    if (type.includes('image')) {
      return <Image size={20} />;
    } else if (type.includes('file')) {
      return <File size={20} />;
    } else {
      return <FileText size={20} />;
    }
  };

  const getDisplayContent = () => {
    if (entry.content_type.toLowerCase().includes('image') && entry.file_path) {
      const fileName = entry.file_path.split('/').pop() || entry.file_path;
      const metadata = parseMetadata(entry.metadata);
      const imageMetadata = metadata?.image_metadata;
      
      if (imageMetadata) {
        const { width, height, file_size } = imageMetadata;
        const formattedSize = formatFileSize(file_size);
        return `[图片 ${width}×${height}, ${formattedSize}] ${fileName}`;
      }
      
      return `[图片] ${fileName}`;
    }

    // 颜色预览
    if (entry.content_subtype === 'color' && entry.content_data) {
      console.log('[ClipboardItem] Showing color preview for:', entry.content_data, 'subtype:', entry.content_subtype);
      const metadata = parseMetadata(entry.metadata);
      const colorFormats = metadata?.color_formats;
      const colorValue = colorFormats?.hex || entry.content_data;
      
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '2px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: colorValue,
              flexShrink: 0
            }}
          />
          <span>{entry.content_data}</span>
        </div>
      );
    }

    // 时间戳预览
    if (entry.content_subtype === 'timestamp' && entry.content_data) {
      console.log('[ClipboardItem] Showing timestamp preview for:', entry.content_data, 'subtype:', entry.content_subtype);
      const metadata = parseMetadata(entry.metadata);
      const timestampFormats = metadata?.timestamp_formats;
      
      if (timestampFormats?.unix_ms) {
        const date = new Date(timestampFormats.unix_ms);
        const dateStr = date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#888', fontSize: '0.9em' }}>🕐</span>
            <span>{entry.content_data}</span>
            <span style={{ color: '#666', fontSize: '0.8em' }}>({dateStr})</span>
          </div>
        );
      }
    }
    
    if (entry.content_data) {
      return entry.content_data.length > 200
        ? entry.content_data.substring(0, 200) + '...'
        : entry.content_data;
    }
    return '(无内容)';
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MM-dd HH:mm');
  };

  const handleCopy = async () => {
    if (entry.content_data) {
      await copyToClipboard(entry.content_data);
    }
  };

  const handlePaste = async () => {
    if (pasteSelectedEntry) {
      await pasteSelectedEntry(entry);
    }
  };

  const menuContent = (
    <>
      <ContextMenu.Item className="context-menu-item" onClick={handleCopy}>
        <Copy size={16} />
        <span>复制</span>
      </ContextMenu.Item>
      <ContextMenu.Item 
        className="context-menu-item" 
        onClick={() => toggleFavorite(entry.id)}
      >
        <Star size={16} fill={entry.is_favorite ? 'currentColor' : 'none'} />
        <span>{entry.is_favorite ? '取消收藏' : '收藏'}</span>
      </ContextMenu.Item>
      <ContextMenu.Separator className="context-menu-separator" />
      <ContextMenu.Item 
        className="context-menu-item danger" 
        onClick={() => deleteEntry(entry.id)}
      >
        <Trash2 size={16} />
        <span>删除</span>
      </ContextMenu.Item>
    </>
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div 
          className={clsx('clipboard-item', {
            'is-favorite': entry.is_favorite,
            'is-selected': isSelected,
          })}
          onClick={onClick}
          onDoubleClick={handlePaste}
        >
          <div className="item-icon">{getIcon()}</div>
          
          <div className="item-content">
            <div className="content-preview">{getDisplayContent()}</div>
            <div className="item-meta">
              <span className="meta-time">{formatDate(entry.created_at)}</span>
              {entry.source_app && (
                <span className="meta-app">
                  来自
                  {appIconUrl ? (
                    <img 
                      src={appIconUrl} 
                      alt={entry.source_app} 
                      className="app-icon"
                      style={{
                        width: '16px',
                        height: '16px',
                        marginLeft: '4px',
                        marginRight: '4px',
                        borderRadius: '2px',
                        verticalAlign: 'middle'
                      }}
                    />
                  ) : (
                    <span style={{ marginLeft: '4px' }}></span>
                  )}
                  {entry.source_app}
                </span>
              )}
              {entry.copy_count > 1 && (
                <span className="meta-count">复制 {entry.copy_count} 次</span>
              )}
            </div>
          </div>

          <div className="item-actions">
            {entry.is_favorite && (
              <Star size={16} className="favorite-icon" fill="currentColor" />
            )}
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="more-button">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenu.Trigger>
              
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content">
                  {menuContent}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          
          {showNumber && number && number <= 9 && (
            <div className="item-number-badge">{number}</div>
          )}
        </div>
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="context-menu-content">
          {menuContent}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};