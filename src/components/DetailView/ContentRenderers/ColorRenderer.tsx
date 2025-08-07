import { useState, useEffect } from 'react';
import { Copy, Palette } from 'lucide-react';
import colorConvert from 'color-convert';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { ColorFormats } from '../../../types/clipboard';

interface ColorRendererProps {
  content: string;
  metadata?: string | null;
}

export function ColorRenderer({ content, metadata }: ColorRendererProps) {
  const { copyToClipboard } = useClipboardStore();
  const [colorFormats, setColorFormats] = useState<ColorFormats>({});
  const [rgbValues, setRgbValues] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    console.log('[ColorRenderer] content:', content);
    console.log('[ColorRenderer] metadata:', metadata);
    
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata);
        console.log('[ColorRenderer] parsed metadata:', parsed);
        if (parsed.color_formats) {
          setColorFormats(parsed.color_formats);
          console.log('[ColorRenderer] color_formats from metadata:', parsed.color_formats);
        }
      } catch (e) {
        console.error('解析颜色元数据失败:', e);
      }
    }

    // 解析颜色值
    parseColor(content);
  }, [content, metadata]);

  const parseColor = (color: string) => {
    const formats: ColorFormats = {};
    let rgb: [number, number, number] = [0, 0, 0];

    // HEX颜色
    if (color.startsWith('#')) {
      let hex = color.substring(1);
      // 处理3位HEX颜色，转换为6位
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      if (hex.length === 6) {
        formats.hex = '#' + hex;
        try {
          rgb = colorConvert.hex.rgb(hex) as [number, number, number];
        } catch (e) {
          console.error('解析HEX颜色失败:', e);
        }
      }
    }
    // RGB/RGBA颜色
    else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        rgb = [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])];
        if (color.startsWith('rgba') && matches.length === 4) {
          formats.rgba = color;
        } else {
          formats.rgb = color;
        }
      }
    }
    // HSL颜色
    else if (color.startsWith('hsl')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const hsl: [number, number, number] = [
          parseInt(matches[0]),
          parseInt(matches[1]),
          parseInt(matches[2])
        ];
        rgb = colorConvert.hsl.rgb(hsl) as [number, number, number];
        formats.hsl = color;
      }
    }

    setRgbValues(rgb);

    // 生成所有格式
    if (!formats.hex) {
      formats.hex = '#' + colorConvert.rgb.hex(rgb);
    }
    if (!formats.rgb) {
      formats.rgb = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    if (!formats.rgba) {
      formats.rgba = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
    }
    if (!formats.hsl) {
      const hsl = colorConvert.rgb.hsl(rgb);
      formats.hsl = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    }

    setColorFormats(formats);
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  const getContrastColor = () => {
    const brightness = (rgbValues[0] * 299 + rgbValues[1] * 587 + rgbValues[2] * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  return (
    <div className="color-renderer">
      <div className="detail-actions">
        <button className="detail-action-btn" onClick={() => handleCopy(content)} title="复制原始值">
          <Copy size={16} />
        </button>
      </div>

      <div className="color-content">
        <div className="color-preview-section">
          <span className="color-label">颜色预览:</span>
          <div 
            className="color-preview-box"
            style={{ 
              backgroundColor: colorFormats.hex || content,
              color: getContrastColor()
            }}
          >
            <Palette size={32} />
          </div>
        </div>

        <div className="color-formats">
          <span className="color-label">所有格式:</span>
          <div className="formats-list">
            {colorFormats.hex && (
              <div className="format-item">
                <span className="format-label">HEX:</span>
                <code className="format-value">{colorFormats.hex}</code>
                <button 
                  className="format-copy-btn" 
                  onClick={() => handleCopy(colorFormats.hex!)}
                  title="复制HEX"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
            {colorFormats.rgb && (
              <div className="format-item">
                <span className="format-label">RGB:</span>
                <code className="format-value">{colorFormats.rgb}</code>
                <button 
                  className="format-copy-btn" 
                  onClick={() => handleCopy(colorFormats.rgb!)}
                  title="复制RGB"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
            {colorFormats.rgba && (
              <div className="format-item">
                <span className="format-label">RGBA:</span>
                <code className="format-value">{colorFormats.rgba}</code>
                <button 
                  className="format-copy-btn" 
                  onClick={() => handleCopy(colorFormats.rgba!)}
                  title="复制RGBA"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
            {colorFormats.hsl && (
              <div className="format-item">
                <span className="format-label">HSL:</span>
                <code className="format-value">{colorFormats.hsl}</code>
                <button 
                  className="format-copy-btn" 
                  onClick={() => handleCopy(colorFormats.hsl!)}
                  title="复制HSL"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}