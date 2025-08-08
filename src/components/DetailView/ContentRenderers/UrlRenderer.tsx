import { useState, useEffect, lazy, Suspense } from 'react';
import { Copy, ExternalLink, Globe, FileJson } from 'lucide-react';
import queryString from 'query-string';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { UrlParts } from '../../../types/clipboard';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface UrlRendererProps {
  content: string;
  metadata?: string | null;
}

export function UrlRenderer({ content, metadata }: UrlRendererProps) {
  const { copyToClipboard, fetchUrlContent } = useClipboardStore();
  const [urlParts, setUrlParts] = useState<UrlParts | null>(null);
  const [previewType, setPreviewType] = useState<'none' | 'image' | 'video' | 'json'>('none');
  const [jsonContent, setJsonContent] = useState<string>('');

  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        setUrlParts(parsed.url_parts);
      } catch (e) {
        // 如果metadata解析失败，手动解析URL
        try {
          const url = new URL(content);
          const parsedUrl = queryString.parseUrl(content);
          const queryParams = Object.entries(parsedUrl.query || {}).map(([k, v]) => 
            [k, Array.isArray(v) ? v.join(',') : String(v)] as [string, string]
          );
          
          setUrlParts({
            protocol: url.protocol.replace(':', ''),
            host: url.host,
            path: url.pathname,
            query_params: queryParams,
          });
        } catch (e) {
          console.error('URL解析失败:', e);
        }
      }
    }

    // 检测内容类型
    if (content.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) {
      setPreviewType('image');
    } else if (content.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
      setPreviewType('video');
    } else if (content.match(/\.(json)(\?|$)/i) || content.includes('/api/')) {
      // 可能是JSON API
      fetchJsonContent(content);
    }
  }, [content, metadata]);

  const fetchJsonContent = async (fetchUrl: string) => {
    try {
      // 使用Tauri命令获取URL内容，绕过浏览器CORS限制
      const data = await fetchUrlContent(fetchUrl);
      
      // 检查是否是有效的JSON
      try {
        const parsed = JSON.parse(data);
        setJsonContent(JSON.stringify(parsed, null, 2));
        setPreviewType('json');
      } catch (e) {
        // 如果不是JSON，就显示原始内容
        setJsonContent(data);
        setPreviewType('json');
      }
    } catch (e) {
      console.error('获取URL内容失败:', e);
      // 如果获取失败，显示提示信息
      setJsonContent(`// 无法获取URL内容\n// 错误信息: ${String(e)}`);
      setPreviewType('json');
    }
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  const handleOpenUrl = () => {
    window.open(content, '_blank');
  };

  return (
    <div id="url-renderer" className="space-y-4">
      <Card id="url-renderer-info">
        <CardHeader id="url-renderer-header" className="pb-3">
          <div id="url-renderer-toolbar" className="flex items-center justify-between">
            <div id="url-renderer-badges" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <Badge variant="secondary">URL链接</Badge>
            </div>
            <div id="url-renderer-actions" className="flex gap-2">
              <Button id="url-renderer-copy-btn" onClick={() => handleCopy(content)} size="sm" variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                复制URL
              </Button>
              <Button id="url-renderer-open-btn" onClick={handleOpenUrl} size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                打开链接
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <span className="text-sm font-medium text-muted-foreground">完整URL:</span>
            <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono break-all">
              {content}
            </code>
          </div>

          {urlParts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">协议:</span>
                <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono">
                  {urlParts.protocol}
                </code>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">主机:</span>
                <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono">
                  {urlParts.host}
                </code>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-muted-foreground">路径:</span>
                <code className="block mt-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {urlParts.path}
                </code>
              </div>
              
              {urlParts.query_params.length > 0 && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-muted-foreground">查询参数:</span>
                  <ScrollArea className="mt-2 max-h-32">
                    <div className="space-y-1">
                      {urlParts.query_params.map(([key, value], index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                          <code className="font-medium text-primary">{key}</code>
                          <span className="text-muted-foreground">=</span>
                          <code className="flex-1 break-all">{value}</code>
                          <Button 
                            onClick={() => handleCopy(value)}
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {previewType === 'image' && (
        <Card>
          <CardHeader className="pb-3">
            <span className="text-sm font-medium">图片预览</span>
          </CardHeader>
          <CardContent>
            <img 
              src={content} 
              alt="预览" 
              className="max-w-full h-auto rounded border"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </CardContent>
        </Card>
      )}

      {previewType === 'video' && (
        <Card>
          <CardHeader className="pb-3">
            <span className="text-sm font-medium">视频预览</span>
          </CardHeader>
          <CardContent>
            <video 
              src={content} 
              controls 
              className="max-w-full h-auto rounded border"
            />
          </CardContent>
        </Card>
      )}

      {previewType === 'json' && jsonContent && (
        <Card id="url-renderer-json">
          <CardHeader id="url-renderer-json-header" className="pb-3">
            <div id="url-renderer-json-title" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              <span className="text-sm font-medium">内容预览</span>
            </div>
          </CardHeader>
          <CardContent id="url-renderer-json-content" className="p-0">
            <div id="url-renderer-json-editor" className="border-t">
              <Suspense fallback={
                <div id="url-renderer-json-loading" className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">加载编辑器...</div>
                </div>
              }>
                <MonacoEditor
                  height="400px"
                  language="json"
                  value={jsonContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    fontSize: 13,
                    lineNumbers: 'on',
                    automaticLayout: true,
                    folding: true,
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}