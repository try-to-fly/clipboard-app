import React from 'react';
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
import { ClipboardEntry } from '../../types/clipboard';
import { useClipboardStore } from '../../stores/clipboardStore';
import clsx from 'clsx';

interface ClipboardItemProps {
  entry: ClipboardEntry;
}

export const ClipboardItem: React.FC<ClipboardItemProps> = ({ entry }) => {
  const { toggleFavorite, deleteEntry, copyToClipboard } = useClipboardStore();

  const getIcon = () => {
    switch (entry.content_type) {
      case 'text':
        return <FileText size={20} />;
      case 'image':
        return <Image size={20} />;
      case 'file':
        return <File size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const getDisplayContent = () => {
    if (entry.content_type === 'image' && entry.file_path) {
      return `[图片] ${entry.file_path}`;
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
          })}
          onDoubleClick={handleCopy}
        >
          <div className="item-icon">{getIcon()}</div>
          
          <div className="item-content">
            <div className="content-preview">{getDisplayContent()}</div>
            <div className="item-meta">
              <span className="meta-time">{formatDate(entry.created_at)}</span>
              {entry.source_app && (
                <span className="meta-app">来自 {entry.source_app}</span>
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