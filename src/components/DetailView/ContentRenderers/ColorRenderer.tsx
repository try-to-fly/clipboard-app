import { useState, useEffect } from 'react';
import { Copy, Palette } from 'lucide-react';
import colorConvert from 'color-convert';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { ColorFormats } from '../../../types/clipboard';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader } from '../../ui/card';

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
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
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
          parseInt(matches[2]),
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <Badge variant="secondary">颜色值</Badge>
            </div>
            <Button onClick={() => handleCopy(content)} size="sm" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              复制原始值
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-24 h-24 rounded-lg border-2 border-muted flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: colorFormats.hex || content,
                color: getContrastColor(),
              }}
            >
              <Palette className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground mb-2">RGB 值:</div>
              <div className="text-2xl font-mono">
                {rgbValues[0]}, {rgbValues[1]}, {rgbValues[2]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorFormats.hex && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">HEX:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                    {colorFormats.hex}
                  </code>
                  <Button
                    onClick={() => handleCopy(colorFormats.hex!)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {colorFormats.rgb && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">RGB:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                    {colorFormats.rgb}
                  </code>
                  <Button
                    onClick={() => handleCopy(colorFormats.rgb!)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {colorFormats.rgba && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">RGBA:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                    {colorFormats.rgba}
                  </code>
                  <Button
                    onClick={() => handleCopy(colorFormats.rgba!)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {colorFormats.hsl && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">HSL:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                    {colorFormats.hsl}
                  </code>
                  <Button
                    onClick={() => handleCopy(colorFormats.hsl!)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
