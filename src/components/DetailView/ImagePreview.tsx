import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Copy, Maximize2 } from 'lucide-react';

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
      alert('图片转换失败: ' + error);
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
      toast.textContent = '已复制转换后的图片到剪贴板';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 2000);
    } catch (error) {
      console.error('Failed to copy converted image:', error);
      alert('复制失败: ' + error);
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
    <div className="image-preview-container">
      {/* 紧凑的转换控制面板 */}
      <div className="compact-controls">
        <div className="controls-row">
          <div className="control-item">
            <label>格式:</label>
            <select 
              value={selectedFormat} 
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="format-select"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          
          <div className="control-item">
            <label>缩放:</label>
            <select 
              value={selectedScale} 
              onChange={(e) => setSelectedScale(parseFloat(e.target.value))}
              className="scale-select"
            >
              <option value={0.3}>30%</option>
              <option value={0.5}>50%</option>
              <option value={0.8}>80%</option>
              <option value={1.0}>100%</option>
            </select>
          </div>

          <button 
            className="convert-btn"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting ? '转换中...' : '转换'}
          </button>

          {convertedMetadata && (
            <>
              <button 
                className="copy-btn"
                onClick={handleCopyConverted}
                title="复制转换后的图片"
              >
                <Copy size={16} />
                复制
              </button>
              <button 
                className="download-btn"
                onClick={handleDownload}
                title="下载转换后的图片"
              >
                <Download size={16} />
              </button>
            </>
          )}
          
          {onOpenWithSystem && (
            <button 
              className="open-btn"
              onClick={onOpenWithSystem}
              title="用系统查看器打开"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 图片信息展示 */}
      {(metadata || convertedMetadata) && (
        <div className="image-info">
          <div className="info-tabs">
            {metadata && (
              <button 
                className={`info-tab ${showOriginal ? 'active' : ''}`}
                onClick={() => {
                  setShowOriginal(true);
                  setPreviewUrl(imageUrl);
                }}
              >
                原图 ({metadata.width}×{metadata.height}, {formatFileSize(metadata.file_size)})
              </button>
            )}
            {convertedMetadata && (
              <button 
                className={`info-tab ${!showOriginal ? 'active' : ''}`}
                onClick={() => {
                  setShowOriginal(false);
                  // previewUrl should already be set to converted data
                }}
              >
                转换后 ({convertedMetadata.width}×{convertedMetadata.height}, {formatFileSize(convertedMetadata.size)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 图片预览 */}
      <div className="image-preview-scroll">
        <img 
          src={showOriginal ? imageUrl : previewUrl} 
          alt={showOriginal ? "原图" : "转换后的图片"} 
          className="preview-image"
          onClick={onOpenWithSystem}
          style={{ cursor: onOpenWithSystem ? 'pointer' : 'default' }}
        />
      </div>
    </div>
  );
};