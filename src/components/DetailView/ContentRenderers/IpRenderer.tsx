import { Copy, Globe, ExternalLink } from 'lucide-react';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';

interface IpRendererProps {
  content: string;
}

export function IpRenderer({ content }: IpRendererProps) {
  const { copyToClipboard } = useClipboardStore();

  const handleCopy = async () => {
    await copyToClipboard(content);
  };

  // 判断是IPv4还是IPv6
  const isIPv6 = content.includes(':');
  const ipType = isIPv6 ? 'IPv6' : 'IPv4';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <Badge variant="secondary">{ipType} 地址</Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} size="sm" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              复制IP地址
            </Button>
            <Button 
              onClick={() => window.open(`https://www.ipaddress.com/ipv4/${content}`, '_blank')}
              size="sm" 
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              查询IP信息
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">类型:</span>
            <Badge variant="outline">{ipType}</Badge>
          </div>
          
          {!isIPv6 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">IPv4 格式分解:</span>
              <div className="flex items-center justify-center gap-1 p-3 bg-muted rounded">
                {content.split('.').map((octet, i) => (
                  <div key={i} className="flex items-center">
                    <code className="px-2 py-1 bg-background rounded border font-mono font-bold text-primary">
                      {octet}
                    </code>
                    {i < 3 && <span className="mx-2 text-muted-foreground font-bold">·</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}