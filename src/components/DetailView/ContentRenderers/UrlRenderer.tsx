import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Globe, FileText, Image, Video, Music } from 'lucide-react';
import queryString from 'query-string';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { UrlParts, ContentSubType } from '../../../types/clipboard';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { UnifiedTextRenderer } from './UnifiedTextRenderer';

interface UrlRendererProps {
  content: string;
  metadata?: string | null;
}

export function UrlRenderer({ content, metadata }: UrlRendererProps) {
  const { copyToClipboard, fetchUrlContent, checkFFprobeAvailable, extractMediaMetadata } =
    useClipboardStore();
  const [urlParts, setUrlParts] = useState<UrlParts | null>(null);
  const [previewType, setPreviewType] = useState<'none' | 'image' | 'video' | 'audio' | 'text'>(
    'none'
  );
  const [textContent, setTextContent] = useState<string>('');
  const [textContentType, setTextContentType] = useState<ContentSubType>('plain_text');
  const [mediaMetadata, setMediaMetadata] = useState<any>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        setUrlParts(parsed.url_parts);
      } catch (e) {
        console.warn('Metadata parsing failed:', e);
        // 如果metadata解析失败，手动解析URL
        try {
          const url = new URL(content);
          const parsedUrl = queryString.parseUrl(content);
          const queryParams = Object.entries(parsedUrl.query || {}).map(
            ([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)] as [string, string]
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
    if (content.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i)) {
      setPreviewType('image');
    } else if (content.match(/\.(mp4|webm|ogg|avi|mov|mkv|flv)(\?|$)/i)) {
      setPreviewType('video');
    } else if (content.match(/\.(mp3|wav|flac|aac|ogg|m4a)(\?|$)/i)) {
      setPreviewType('audio');
    } else if (
      content.match(
        /\.(json|xml|html|htm|css|js|ts|jsx|tsx|py|java|cpp|c|h|php|rb|go|rs|sql|md|txt|log|csv|yaml|yml|toml|ini|conf|sh|bat)(\?|$)/i
      ) ||
      content.includes('/api/')
    ) {
      // 文本类型或API
      fetchTextContent(content);
    }
  }, [content, metadata]);

  const fetchTextContent = async (fetchUrl: string) => {
    setIsLoadingText(true);
    try {
      // 使用Tauri命令获取URL内容，绕过浏览器CORS限制
      const data = await fetchUrlContent(fetchUrl);

      // 根据URL扩展名确定内容类型
      const contentType = getContentTypeFromUrl(fetchUrl);

      // 如果是JSON内容，尝试格式化
      let processedContent = data;
      if (contentType === 'json') {
        try {
          const parsed = JSON.parse(data);
          processedContent = JSON.stringify(parsed, null, 2);
        } catch (jsonError) {
          console.log('JSON 解析失败，显示原始内容:', jsonError);
          // 如果JSON解析失败，就使用原始内容
        }
      }

      setTextContent(processedContent);
      setTextContentType(contentType);
      setPreviewType('text');
    } catch (e) {
      console.error('获取URL内容失败:', e);
      // 如果获取失败，显示提示信息
      setTextContent(`// 无法获取URL内容\n// 错误信息: ${String(e)}`);
      setTextContentType('plain_text');
      setPreviewType('text');
    } finally {
      setIsLoadingText(false);
    }
  };

  const getContentTypeFromUrl = (url: string): ContentSubType => {
    if (url.match(/\.(json)(\?|$)/i) || url.includes('/api/')) {
      return 'json';
    } else if (url.match(/\.(html|htm)(\?|$)/i)) {
      return 'code'; // HTML will be detected by UnifiedTextRenderer
    } else if (url.match(/\.(css)(\?|$)/i)) {
      return 'code';
    } else if (url.match(/\.(js|jsx|ts|tsx)(\?|$)/i)) {
      return 'code';
    } else if (url.match(/\.(py|java|cpp|c|h|php|rb|go|rs)(\?|$)/i)) {
      return 'code';
    } else if (url.match(/\.(md)(\?|$)/i)) {
      return 'markdown';
    } else if (url.match(/\.(sh|bat)(\?|$)/i)) {
      return 'command';
    }
    return 'plain_text';
  };

  // 在组件加载时检查 FFprobe 可用性并自动获取媒体元数据
  useEffect(() => {
    const initialize = async () => {
      const available = await checkFFprobeAvailable();

      // 如果是媒体文件且 FFprobe 可用，自动获取元数据
      if (
        available &&
        (previewType === 'image' || previewType === 'video' || previewType === 'audio')
      ) {
        try {
          const metadata = await extractMediaMetadata(content);
          setMediaMetadata(metadata);
        } catch (error) {
          console.error('自动获取媒体元数据失败:', error);
        }
      }
    };
    initialize();
  }, [previewType, content]);

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
              <Button
                id="url-renderer-copy-btn"
                onClick={() => handleCopy(content)}
                size="sm"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                复制URL
              </Button>
              <Button
                id="url-renderer-open-btn"
                onClick={handleOpenUrl}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                打开链接
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <code className="block p-2 bg-muted rounded text-xs font-mono break-all">
              {content}
            </code>
          </div>

          {urlParts && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                  <span className="text-muted-foreground">协议:</span>
                  <code className="font-mono">{urlParts.protocol}</code>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                  <span className="text-muted-foreground">主机:</span>
                  <code className="font-mono">{urlParts.host}</code>
                </span>
                {urlParts.path && urlParts.path !== '/' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    <span className="text-muted-foreground">路径:</span>
                    <code className="font-mono">{urlParts.path}</code>
                  </span>
                )}
              </div>

              {urlParts.query_params.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    {urlParts.query_params.length} 个查询参数
                  </summary>
                  <div className="mt-2 space-y-1">
                    {urlParts.query_params.map(([key, value], index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 p-1 bg-muted rounded text-xs"
                      >
                        <code className="font-medium text-primary">{key}</code>
                        <span className="text-muted-foreground">=</span>
                        <code className="flex-1 break-all text-muted-foreground">{value}</code>
                        <Button
                          onClick={() => handleCopy(value)}
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {previewType === 'image' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Image className="w-4 h-4" />
                图片预览
              </span>
              {mediaMetadata && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {mediaMetadata.width && mediaMetadata.height && (
                    <span>
                      {mediaMetadata.width}x{mediaMetadata.height}
                    </span>
                  )}
                  {mediaMetadata.format && <span>• {mediaMetadata.format}</span>}
                  {mediaMetadata.size && <span>• {mediaMetadata.size}</span>}
                </div>
              )}
            </div>
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Video className="w-4 h-4" />
                视频预览
              </span>
              {mediaMetadata && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {mediaMetadata.width && mediaMetadata.height && (
                    <span>
                      {mediaMetadata.width}x{mediaMetadata.height}
                    </span>
                  )}
                  {mediaMetadata.fps && <span>• {mediaMetadata.fps}fps</span>}
                  {mediaMetadata.duration && <span>• {mediaMetadata.duration}</span>}
                  {mediaMetadata.codec && <span>• {mediaMetadata.codec}</span>}
                  {mediaMetadata.bitrate && <span>• {mediaMetadata.bitrate}</span>}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <video src={content} controls className="max-w-full h-auto rounded border" />
          </CardContent>
        </Card>
      )}

      {previewType === 'audio' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4" />
                音频预览
              </span>
              {mediaMetadata && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {mediaMetadata.duration && <span>{mediaMetadata.duration}</span>}
                  {mediaMetadata.bitrate && <span>• {mediaMetadata.bitrate}</span>}
                  {mediaMetadata.sample_rate && <span>• {mediaMetadata.sample_rate}Hz</span>}
                  {mediaMetadata.codec && <span>• {mediaMetadata.codec}</span>}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <audio src={content} controls className="w-full" />
          </CardContent>
        </Card>
      )}

      {previewType === 'text' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">内容预览</span>
              {isLoadingText && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {textContent && (
              <div className="h-[500px]">
                <UnifiedTextRenderer content={textContent} contentSubType={textContentType} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
