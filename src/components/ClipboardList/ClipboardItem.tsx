import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FileText, Image, File, Star, Copy, Trash2, MoreVertical } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ClipboardEntry, ContentMetadata } from '../../types/clipboard';
import { useClipboardStore } from '../../stores/clipboardStore';
import { cn } from '../../lib/utils';

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

export const ClipboardItem: React.FC<ClipboardItemProps> = ({
  entry,
  isSelected,
  onClick,
  showNumber,
  number,
}) => {
  const { t } = useTranslation(['common', 'clipboard']);
  const {
    toggleFavorite,
    deleteEntry,
    copyToClipboard,
    getImageUrl,
    pasteSelectedEntry,
    getAppIcon,
  } = useClipboardStore();
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
        <div className="w-8 h-8 flex items-center justify-center rounded bg-secondary">
          <img src={imageUrl} alt="Clipboard image" className="w-5 h-5 object-cover rounded-sm" />
        </div>
      );
    }

    if (type.includes('image')) {
      return <Image className="w-5 h-5" />;
    } else if (type.includes('file')) {
      return <File className="w-5 h-5" />;
    } else {
      return <FileText className="w-5 h-5" />;
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
      console.log(
        '[ClipboardItem] Showing color preview for:',
        entry.content_data,
        'subtype:',
        entry.content_subtype
      );
      const metadata = parseMetadata(entry.metadata);
      const colorFormats = metadata?.color_formats;
      const colorValue = colorFormats?.hex || entry.content_data;

      return (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm border border-border/20 flex-shrink-0"
            style={{ backgroundColor: colorValue }}
          />
          <span>{entry.content_data}</span>
        </div>
      );
    }

    // 时间戳预览
    if (entry.content_subtype === 'timestamp' && entry.content_data) {
      console.log(
        '[ClipboardItem] Showing timestamp preview for:',
        entry.content_data,
        'subtype:',
        entry.content_subtype
      );
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
          second: '2-digit',
        });

        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">🕐</span>
            <span>{entry.content_data}</span>
            <span className="text-muted-foreground text-xs">({dateStr})</span>
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
      <ContextMenuItem className="flex items-center gap-2" onClick={handleCopy}>
        <Copy className="w-4 h-4" />
        <span>{t('common:copy')}</span>
      </ContextMenuItem>
      <ContextMenuItem className="flex items-center gap-2" onClick={() => toggleFavorite(entry.id)}>
        <Star className="w-4 h-4" fill={entry.is_favorite ? 'currentColor' : 'none'} />
        <span>
          {entry.is_favorite ? t('clipboard:actions.unfavorite') : t('clipboard:actions.favorite')}
        </span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="flex items-center gap-2 text-destructive focus:text-destructive"
        onClick={() => deleteEntry(entry.id)}
      >
        <Trash2 className="w-4 h-4" />
        <span>{t('common:delete')}</span>
      </ContextMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            'clipboard-item p-4 cursor-pointer transition-all duration-200 hover:bg-secondary/50 hover:border-primary/50 relative',
            {
              'border-l-4 border-l-primary': entry.is_favorite,
              'bg-primary text-primary-foreground hover:bg-primary/90': isSelected,
            }
          )}
          onClick={onClick}
          onDoubleClick={handlePaste}
        >
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 flex items-center justify-center rounded bg-secondary text-muted-foreground shrink-0">
              {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-sm line-clamp-2 mb-2 break-words',
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                )}
              >
                {getDisplayContent()}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span
                  className={cn(
                    isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}
                >
                  {formatDate(entry.created_at)}
                </span>
                {entry.source_app && (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {t('common:from')}
                    {appIconUrl && (
                      <img src={appIconUrl} alt={entry.source_app} className="w-4 h-4 rounded-sm" />
                    )}
                    {entry.source_app}
                  </span>
                )}
                {entry.copy_count > 1 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {t('clipboard:actions.copiedTimes', { count: entry.copy_count })}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 absolute top-4 right-4">
              {entry.is_favorite && (
                <Star
                  className={cn('w-4 h-4', isSelected ? 'text-primary-foreground' : 'text-primary')}
                  fill="currentColor"
                />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8',
                      isSelected
                        ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                        : 'hover:bg-secondary text-muted-foreground'
                    )}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuItem className="flex items-center gap-2" onClick={handleCopy}>
                    <Copy className="w-4 h-4" />
                    <span>{t('common:copy')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => toggleFavorite(entry.id)}
                  >
                    <Star className="w-4 h-4" fill={entry.is_favorite ? 'currentColor' : 'none'} />
                    <span>
                      {entry.is_favorite
                        ? t('clipboard:actions.unfavorite')
                        : t('clipboard:actions.favorite')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('common:delete')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showNumber && number && number <= 9 && (
            <Badge
              variant="default"
              className="absolute top-2 right-2 w-6 h-6 rounded-full p-0 text-xs font-semibold flex items-center justify-center"
            >
              {number}
            </Badge>
          )}
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent>{menuContent}</ContextMenuContent>
    </ContextMenu>
  );
};
