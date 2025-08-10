# 颜色值检测 (Color)

## 概述

颜色值检测能够识别多种颜色格式，包括十六进制、RGB、RGBA 和 HSL 格式，并验证数值的有效性。

- **内容子类型**: `Color`
- **检测优先级**: 中等（第四优先级）
- **返回元数据**: `ColorFormats` - 包含具体的颜色格式信息

## 检测逻辑

颜色检测支持四种主要格式，按顺序检测：

### 1. 十六进制颜色 (HEX)

```rust
if text.starts_with('#') && text.len() >= 4 {
    let hex_part = &text[1..];
    if (hex_part.len() == 3 || hex_part.len() == 6)
        && hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        // 有效的十六进制颜色
    }
}
```

### 2. RGB/RGBA 颜色

```rust
let rgb_regex = Regex::new(
    r"^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)$"
).unwrap();

// 验证 RGB 值范围 (0-255)
let r: u8 = captures[1].parse().ok()?;
let g: u8 = captures[2].parse().ok()?;
let b: u8 = captures[3].parse().ok()?;

// 验证 Alpha 值范围 (0.0-1.0)
if let Some(alpha_str) = captures.get(4) {
    let alpha: f32 = alpha_str.as_str().parse().ok()?;
    if alpha < 0.0 || alpha > 1.0 { return None; }
}
```

### 3. HSL 颜色

```rust
let hsl_regex = Regex::new(
    r"^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$"
).unwrap();
```

## 能识别的内容

### ✅ 十六进制颜色

基于测试用例，以下十六进制格式会被正确识别：

#### 短格式 (3位)

```text
#fff    # 白色
#000    # 黑色
#f00    # 红色
#0f0    # 绿色
#00f    # 蓝色
```

#### 长格式 (6位)

```text
#ff0000   # 红色
#00FF00   # 绿色 (大写)
#0000ff   # 蓝色
#123abc   # 混合大小写
#ABCDEF   # 全大写
#ffffff   # 白色
#000000   # 黑色
```

### ✅ RGB/RGBA 颜色

支持标准的 RGB 和 RGBA 格式：

#### RGB 格式

```text
rgb(255, 0, 0)     # 红色
rgb(0, 255, 0)     # 绿色
rgb(0, 0, 255)     # 蓝色
rgb(128, 128, 128) # 灰色
rgb(0, 0, 0)       # 黑色
rgb(255, 255, 255) # 白色
```

#### RGBA 格式

```text
rgba(255, 255, 255, 0.5)  # 半透明白色
rgba(0, 0, 0, 1.0)        # 不透明黑色
rgba(255, 0, 0, 0.8)      # 半透明红色
rgba(100, 200, 50, 0.3)   # 半透明绿色
```

#### 格式要求

- RGB 值：0-255 整数
- Alpha 值：0.0-1.0 浮点数
- 支持空格：`rgb( 255 , 0 , 0 )`

### ✅ HSL 颜色

支持色相-饱和度-亮度格式：

```text
hsl(0, 100%, 50%)     # 红色
hsl(120, 50%, 25%)    # 深绿色
hsl(240, 100%, 100%)  # 白色
hsl(0, 0%, 50%)       # 灰色
hsl(60, 100%, 50%)    # 黄色
```

#### 格式要求

- 色相 (H)：0-360 度
- 饱和度 (S)：0-100%
- 亮度 (L)：0-100%

### ❌ 无效示例

以下格式不会被识别为颜色：

```text
#gg               # 无效的十六进制字符
#12345            # 长度不正确 (5位)
#1234567          # 长度不正确 (7位)
rgb(256, 0, 0)    # RGB 值超出范围
rgb(255, 0)       # 参数数量不正确
rgba(255, 0, 0, 1.5) # Alpha 值超出范围
hsl(400, 100%, 50%)  # 色相值超出范围
rgb(255, 0, 0, 0.5)  # RGB 不应该有 Alpha 值
```

## 解析出的内容

颜色检测会提供详细的颜色格式信息：

### ColorFormats 结构

```rust
pub struct ColorFormats {
    pub hex: Option<String>,    // 十六进制格式
    pub rgb: Option<String>,    // RGB 格式
    pub rgba: Option<String>,   // RGBA 格式
    pub hsl: Option<String>,    // HSL 格式
}
```

### 解析示例

#### 十六进制颜色

**输入**: `#ff0000`

```rust
ColorFormats {
    hex: Some("#ff0000".to_string()),
    rgb: None,
    rgba: None,
    hsl: None,
}
```

#### RGB 颜色

**输入**: `rgb(255, 0, 0)`

```rust
ColorFormats {
    hex: None,
    rgb: Some("rgb(255, 0, 0)".to_string()),
    rgba: None,
    hsl: None,
}
```

#### RGBA 颜色

**输入**: `rgba(255, 255, 255, 0.5)`

```rust
ColorFormats {
    hex: None,
    rgb: None,
    rgba: Some("rgba(255, 255, 255, 0.5)".to_string()),
    hsl: None,
}
```

## 测试用例

### 十六进制颜色测试

```rust
#[test]
fn test_hex_color_detection() {
    let hex_colors = vec![
        "#fff", "#000", "#ff0000",
        "#00FF00", "#0000ff", "#123abc", "#ABCDEF",
    ];

    for color in hex_colors {
        let (sub_type, metadata) = ContentDetector::detect(color);
        assert_eq!(sub_type, ContentSubType::Color);

        if let Some(meta) = metadata {
            if let Some(color_formats) = meta.color_formats {
                assert!(color_formats.hex.is_some());
            }
        }
    }
}
```

### RGB 颜色测试

```rust
#[test]
fn test_rgb_color_detection() {
    let rgb_colors = vec![
        "rgb(255, 0, 0)",
        "rgb(0, 255, 0)",
        "rgb(0, 0, 255)",
        "rgba(255, 255, 255, 0.5)",
        "rgba(0, 0, 0, 1.0)",
    ];

    for color in rgb_colors {
        let (sub_type, metadata) = ContentDetector::detect(color);
        assert_eq!(sub_type, ContentSubType::Color);

        if let Some(meta) = metadata {
            if let Some(color_formats) = meta.color_formats {
                assert!(color_formats.rgb.is_some() || color_formats.rgba.is_some());
            }
        }
    }
}
```

### 无效颜色测试

```rust
#[test]
fn test_invalid_colors() {
    let invalid_colors = vec![
        "#gg",              // 无效十六进制
        "rgb(256, 0, 0)",   // RGB 值超出范围
        "rgba(255, 0, 0, 1.5)", // Alpha 值超出范围
    ];

    for color in invalid_colors {
        let (sub_type, _) = ContentDetector::detect(color);
        assert_ne!(sub_type, ContentSubType::Color);
    }
}
```

## 使用场景

颜色值检测主要用于：

1. **设计工具**: 识别和处理设计文件中的颜色值
2. **代码编辑**: CSS、HTML 等代码中的颜色高亮显示
3. **颜色选择器**: 为颜色值提供可视化预览
4. **格式转换**: 在不同颜色格式之间进行转换
5. **主题设计**: 提取和分析界面配色方案

## 颜色格式转换

虽然检测器本身不提供转换功能，但可以基于识别结果进行格式转换：

### HEX 转 RGB

```rust
fn hex_to_rgb(hex: &str) -> Option<(u8, u8, u8)> {
    let hex = hex.trim_start_matches('#');
    match hex.len() {
        3 => {
            let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
            let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
            let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
            Some((r, g, b))
        },
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            Some((r, g, b))
        },
        _ => None,
    }
}
```

## 注意事项

1. **值范围验证**: 严格验证 RGB (0-255) 和 Alpha (0.0-1.0) 值的范围
2. **格式严格性**: 要求精确的格式匹配，包括括号和逗号
3. **大小写支持**: 十六进制颜色支持大小写混合
4. **空格容忍**: RGB/HSL 格式允许空格变化
5. **单一格式**: 每次检测只返回一种颜色格式的信息

## 性能特点

- **检测速度**: 中等（需要多种格式的模式匹配）
- **内存使用**: 低（只存储匹配的格式字符串）
- **验证准确性**: 高（严格的数值范围验证）
- **格式支持**: 全面（覆盖主要的颜色表示格式）
