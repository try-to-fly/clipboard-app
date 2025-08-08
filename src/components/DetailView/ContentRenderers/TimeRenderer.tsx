import { useState, useEffect } from 'react';
import { Copy, Clock } from 'lucide-react';
import { format, formatRelative, fromUnixTime } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { TimestampFormats } from '../../../types/clipboard';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';

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
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p>无法解析时间格式</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatItems = [
    { label: '标准格式', value: formats[0] },
    { label: '中文格式', value: formats[1] },
    { label: '相对时间', value: formats[4] },
    { label: 'ISO 8601', value: formats[3] },
    { label: 'Unix秒', value: formats[5] },
    { label: 'Unix毫秒', value: formats[6] },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <Badge variant="secondary">时间戳</Badge>
          </div>
          <Button onClick={() => handleCopy(content)} size="sm" variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            复制原始值
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{formats[0]}</div>
          <div className="text-sm text-muted-foreground mt-1">{formats[4]}</div>
        </div>

        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {formatItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{item.label}:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm break-all">
                    {item.value}
                  </code>
                  <Button 
                    onClick={() => handleCopy(item.value)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}