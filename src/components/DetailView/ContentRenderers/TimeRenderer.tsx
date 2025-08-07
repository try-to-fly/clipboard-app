import { useState, useEffect } from 'react';
import { Copy, Clock } from 'lucide-react';
import { format, formatRelative, fromUnixTime } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { TimestampFormats } from '../../../types/clipboard';

interface TimeRendererProps {
  content: string;
  metadata?: string | null;
}

export function TimeRenderer({ content, metadata }: TimeRendererProps) {
  const { copyToClipboard } = useClipboardStore();
  const [date, setDate] = useState<Date | null>(null);
  const [formats, setFormats] = useState<string[]>([]);

  useEffect(() => {
    let parsedDate: Date | null = null;
    
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        if (parsed.timestamp_formats) {
          const tsFormats = parsed.timestamp_formats as TimestampFormats;
          if (tsFormats.unix_ms) {
            parsedDate = fromUnixTime(tsFormats.unix_ms / 1000);
          }
        }
      } catch (e) {
        console.error('解析时间元数据失败:', e);
      }
    }

    // 尝试解析时间戳
    if (!parsedDate) {
      const num = parseInt(content);
      if (!isNaN(num)) {
        // 判断是秒还是毫秒
        if (num > 946684800 && num < 4102444800) {
          // 秒级时间戳
          parsedDate = fromUnixTime(num);
        } else if (num > 946684800000 && num < 4102444800000) {
          // 毫秒级时间戳
          parsedDate = fromUnixTime(num / 1000);
        }
      } else {
        // 尝试解析日期字符串
        parsedDate = new Date(content);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = null;
        }
      }
    }

    if (parsedDate) {
      setDate(parsedDate);
      
      // 生成多种格式
      const dateFormats = [
        format(parsedDate, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
        format(parsedDate, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN }),
        format(parsedDate, 'PPpp', { locale: zhCN }),
        parsedDate.toISOString(),
        formatRelative(parsedDate, new Date(), { locale: zhCN }),
        String(Math.floor(parsedDate.getTime() / 1000)), // Unix秒
        String(parsedDate.getTime()), // Unix毫秒
      ];
      setFormats(dateFormats);
    }
  }, [content, metadata]);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  if (!date) {
    return (
      <div className="time-renderer">
        <div className="time-error">无法解析时间格式</div>
      </div>
    );
  }

  return (
    <div className="time-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={() => handleCopy(content)} title="复制原始值">
          <Copy size={16} />
        </button>
      </div>

      <div className="time-content">
        <div className="time-header">
          <Clock size={24} className="time-icon" />
          <span className="time-label">时间戳</span>
        </div>

        <div className="time-formats">
          <div className="format-item">
            <span className="format-label">标准格式:</span>
            <code className="format-value">{formats[0]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[0])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>

          <div className="format-item">
            <span className="format-label">中文格式:</span>
            <code className="format-value">{formats[1]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[1])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>

          <div className="format-item">
            <span className="format-label">相对时间:</span>
            <code className="format-value">{formats[4]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[4])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>

          <div className="format-item">
            <span className="format-label">ISO 8601:</span>
            <code className="format-value">{formats[3]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[3])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>

          <div className="format-item">
            <span className="format-label">Unix秒:</span>
            <code className="format-value">{formats[5]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[5])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>

          <div className="format-item">
            <span className="format-label">Unix毫秒:</span>
            <code className="format-value">{formats[6]}</code>
            <button 
              className="format-copy-btn" 
              onClick={() => handleCopy(formats[6])}
              title="复制"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}