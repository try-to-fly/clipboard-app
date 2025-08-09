import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Download, Copy, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';

interface ImagePreviewProps {
  imageUrl: string;
  filePath: string;
  metadata?: {
    width: number;
    height: number;
    file_size: number;
    format?: string;
  };
  onOpenWithSystem?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  filePath,
  metadata,
  onOpenWithSystem,
}) => {
  const { t } = useTranslation(['common']);
  const [selectedFormat, setSelectedFormat] = useState<string>('png');
  const [selectedScale, setSelectedScale] = useState<number>(1.0);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedMetadata, setConvertedMetadata] = useState<{
    size: number;
    width: number;
    height: number;
  } | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setConvertedMetadata(null);
    setShowOriginal(true);
  }, [imageUrl]);

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const convertedData = await invoke<string>('convert_and_scale_image', {
        filePath,
        format: selectedFormat,
        scale: selectedScale,
        skipRecording: true,
      });
      
      setPreviewUrl(convertedData);
      setShowOriginal(false);
      
      // 计算转换后的大小和分辨率
      const base64Part = convertedData.split(',')[1];
      if (base64Part && metadata) {
        const binarySize = atob(base64Part).length;
        const newWidth = Math.round(metadata.width * selectedScale);
        const newHeight = Math.round(metadata.height * selectedScale);
        
        setConvertedMetadata({
          size: binarySize,
          width: newWidth,
          height: newHeight,
        });
      }
    } catch (error) {
      console.error('Failed to convert image:', error);
      alert(t('imagePreview.convertError', { error: String(error) }));
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyConverted = async () => {
    try {
      await invoke('copy_converted_image', {
        base64Data: previewUrl,
        skipRecording: true,
      });
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.className = 'toast-notification';
      toast.textContent = t('imagePreview.copySuccess');
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 2000);
    } catch (error) {
      console.error('Failed to copy converted image:', error);
      alert(t('imagePreview.copyError', { error: String(error) }));
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    const extension = previewUrl.includes('jpeg') ? 'jpg' : 
                     previewUrl.includes('webp') ? 'webp' : 'png';
    const scaleSuffix = selectedScale !== 1.0 ? `_${Math.round(selectedScale * 100)}` : '';
    link.download = `image${scaleSuffix}.${extension}`;
    link.click();
  };


  return (
    <div id="image-preview" className="space-y-4">
      {/* 控制面板 */}
      <Card id="image-preview-controls">
        <CardContent id="image-preview-controls-content" className="p-4">
          <div id="image-preview-toolbar" className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('imagePreview.format')}</span>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('imagePreview.scale')}</span>
              <Select value={selectedScale.toString()} onValueChange={(value) => setSelectedScale(parseFloat(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">30%</SelectItem>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.8">80%</SelectItem>
                  <SelectItem value="1.0">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleConvert}
              disabled={isConverting}
              size="sm"
            >
              {isConverting ? t('imagePreview.converting') : t('imagePreview.convert')}
            </Button>

            {convertedMetadata && (
              <>
                <Button 
                  onClick={handleCopyConverted}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {t('imagePreview.copy')}
                </Button>
                <Button 
                  onClick={handleDownload}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {onOpenWithSystem && (
              <Button 
                onClick={onOpenWithSystem}
                size="sm"
                variant="outline"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 图片信息 */}
      {(metadata || convertedMetadata) && (
        <div className="flex flex-wrap gap-2">
          {metadata && (
            <Button
              variant={showOriginal ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowOriginal(true);
                setPreviewUrl(imageUrl);
              }}
            >
              <Badge variant="secondary" className="mr-2">{t('imagePreview.original')}</Badge>
              {metadata.width}×{metadata.height} · {formatFileSize(metadata.file_size)}
            </Button>
          )}
          {convertedMetadata && (
            <Button
              variant={!showOriginal ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowOriginal(false);
              }}
            >
              <Badge variant="secondary" className="mr-2">{t('imagePreview.converted')}</Badge>
              {convertedMetadata.width}×{convertedMetadata.height} · {formatFileSize(convertedMetadata.size)}
            </Button>
          )}
        </div>
      )}

      {/* 图片预览 */}
      <Card id="image-preview-display" className="overflow-hidden">
        <CardContent id="image-preview-content" className="p-0">
          <ScrollArea id="image-preview-scroll" className="max-h-[60vh]">
            <div id="image-preview-wrapper" className="p-4">
              <img 
                id="image-preview-img"
                src={showOriginal ? imageUrl : previewUrl} 
                alt={showOriginal ? t('imagePreview.originalAlt') : t('imagePreview.convertedAlt')} 
                className="max-w-full h-auto rounded-md border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={onOpenWithSystem}
              />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};