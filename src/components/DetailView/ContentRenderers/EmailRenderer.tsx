import { Copy, Mail, User, AtSign, Send } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';

interface EmailRendererProps {
  content: string;
}

export function EmailRenderer({ content }: EmailRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  // 解析邮箱地址
  const [username, domain] = content.split('@');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <Badge variant="secondary">邮箱地址</Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleCopy(content)} size="sm" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              复制邮箱
            </Button>
            <Button 
              onClick={() => window.location.href = `mailto:${content}`}
              size="sm" 
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              发送邮件
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <code className="block p-3 bg-muted rounded font-mono text-lg text-center">
            {content}
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">用户名:</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                {username}
              </code>
              <Button 
                onClick={() => handleCopy(username)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">域名:</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                {domain}
              </code>
              <Button 
                onClick={() => handleCopy(domain)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}