# Base64 编码检测 (Base64)

## 概述

Base64 编码检测能够识别 Base64 编码的数据，并提供解码后的数据类型信息，支持各种 Base64 变体格式。

- **内容子类型**: `Base64`
- **检测优先级**: 最低（第十优先级）
- **返回元数据**: `Base64Metadata` - 包含解码后的数据信息

## 检测逻辑

Base64 检测分为格式验证和内容分析两个阶段：

### 1. 格式验证

```rust
fn is_valid_base64_format(text: &str) -> bool {
    // Base64 字符集: A-Z, a-z, 0-9, +, /, =（填充）
    let base64_regex = Regex::new(r"^[A-Za-z0-9+/]*={0,2}$").unwrap();

    if !base64_regex.is_match(text) {
        return false;
    }

    // 长度检查：Base64 长度必须是4的倍数（考虑填充）
    text.len() >= 4 && text.len() % 4 == 0
}
```

### 2. 内容分析

```rust
fn analyze_base64_content(text: &str) -> bool {
    // 避免误识别重复字符或简单模式
    let unique_chars = text.chars().collect::<std::collections::HashSet<_>>();
    let diversity_ratio = unique_chars.len() as f32 / text.len() as f32;

    // Base64 应该有一定的字符多样性
    diversity_ratio > 0.3
}
```

### 3. 解码验证

```rust
fn decode_and_analyze(base64_text: &str) -> Option<Base64Metadata> {
    if let Ok(decoded) = base64::decode(base64_text) {
        let content_type = detect_decoded_content_type(&decoded);
        let size = decoded.len();

        Some(Base64Metadata {
            decoded_size: size,
            content_type,
            is_text: is_likely_text(&decoded),
            is_binary: !is_likely_text(&decoded),
        })
    } else {
        None
    }
}
```

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下 Base64 格式会被正确识别：

#### 文本数据编码

```text
SGVsbG8sIFdvcmxkIQ==         # "Hello, World!" 编码
5L2g5aW977yM5LiW55CGIQ==     # "你好，世界!" 编码（UTF-8）
VGhpcyBpcyBhIHRlc3Q=         # "This is a test" 编码
```

#### 图像数据编码

```text
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==
# 1x1 像素透明 PNG 图像

/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcU...
# JPEG 图像数据开头
```

#### 二进制数据编码

```text
UEsDBBQAAAAIAJuM9lQAAAAAAAAAAAAAAAAHAAAAdGVzdC50eHRLyczPSy0pzy/KSU0uVrJSULJSqOZSAAD//wMA
# ZIP 文件数据

H4sIAAAAAAAAA/NIzcnJVyjPL8pJUQQAlRmFGwAAAA==
# GZip 压缩数据
```

#### JSON 数据编码

```text
eyJuYW1lIjoiSm9obiIsImFnZSI6MzAsImNpdHkiOiJOZXcgWW9yayJ9
# {"name":"John","age":30,"city":"New York"} 编码
```

### ❌ 无效示例

以下格式不会被识别为 Base64：

```text
AAAA                    # 长度不足
AAAAAA                  # 长度不是4的倍数
AAAA====                # 填充符过多
AAAA@AAA                # 包含非Base64字符
Hello World             # 普通文本
aaaaaaaa                # 重复字符过多（缺乏多样性）
AAAAAAAAAAAAAAAAA       # 过于简单的模式
```

## 解析出的内容

Base64 检测会提供详细的解码分析信息：

### Base64Metadata 结构

```rust
pub struct Base64Metadata {
    pub decoded_size: usize,        // 解码后的数据大小
    pub content_type: String,       // 内容类型（image/png, text/plain等）
    pub is_text: bool,              // 是否为文本数据
    pub is_binary: bool,            // 是否为二进制数据
}
```

### 解析示例

#### 文本数据

**输入**: `SGVsbG8sIFdvcmxkIQ==` ("Hello, World!")

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: Some(Base64Metadata {
        decoded_size: 13,
        content_type: "text/plain".to_string(),
        is_text: true,
        is_binary: false,
    }),
}
```

#### 图像数据

**输入**: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: Some(Base64Metadata {
        decoded_size: 68,
        content_type: "image/png".to_string(),
        is_text: false,
        is_binary: true,
    }),
}
```

#### JSON 数据

**输入**: `eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9` ({"name":"John","age":30})

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: Some(Base64Metadata {
        decoded_size: 25,
        content_type: "application/json".to_string(),
        is_text: true,
        is_binary: false,
    }),
}
```

## 测试用例

### 文本 Base64 测试

```rust
#[test]
fn test_text_base64_detection() {
    let text_base64_samples = vec![
        "SGVsbG8sIFdvcmxkIQ==",           // "Hello, World!"
        "VGhpcyBpcyBhIHRlc3Q=",           // "This is a test"
        "5L2g5aW977yM5LiW55CGIQ==",       // "你好，世界!"
    ];

    for sample in text_base64_samples {
        let (sub_type, metadata) = ContentDetector::detect(sample);
        assert_eq!(sub_type, ContentSubType::Base64);

        if let Some(meta) = metadata {
            if let Some(base64_meta) = meta.base64_metadata {
                assert!(base64_meta.is_text);
                assert!(!base64_meta.is_binary);
                assert_eq!(base64_meta.content_type, "text/plain");
            }
        }
    }
}
```

### 二进制 Base64 测试

```rust
#[test]
fn test_binary_base64_detection() {
    let binary_base64_samples = vec![
        // PNG 图像（1x1透明像素）
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        // PDF 文件头
        "JVBERi0xLjQKJcOkw7zDtsO7Cg==",
        // ZIP 文件头
        "UEsDBBQAAAAIAA==",
    ];

    for sample in binary_base64_samples {
        let (sub_type, metadata) = ContentDetector::detect(sample);
        assert_eq!(sub_type, ContentSubType::Base64);

        if let Some(meta) = metadata {
            if let Some(base64_meta) = meta.base64_metadata {
                assert!(!base64_meta.is_text);
                assert!(base64_meta.is_binary);
                assert!(base64_meta.decoded_size > 0);
            }
        }
    }
}
```

### JSON Base64 测试

```rust
#[test]
fn test_json_base64_detection() {
    let json_base64_samples = vec![
        "eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9",         // {"name":"John","age":30}
        "WyJhcHBsZSIsImJhbmFuYSIsImNoZXJyeSJd",       // ["apple","banana","cherry"]
    ];

    for sample in json_base64_samples {
        let (sub_type, metadata) = ContentDetector::detect(sample);
        assert_eq!(sub_type, ContentSubType::Base64);

        if let Some(meta) = metadata {
            if let Some(base64_meta) = meta.base64_metadata {
                assert!(base64_meta.is_text);
                assert_eq!(base64_meta.content_type, "application/json");
            }
        }
    }
}
```

### 无效 Base64 测试

```rust
#[test]
fn test_invalid_base64() {
    let invalid_base64_samples = vec![
        "AAAA",                      // 长度不足
        "AAAAAA",                    // 长度不正确
        "AAAA====",                  // 填充过多
        "AAAA@AAA",                  // 非法字符
        "aaaaaaaa",                  // 重复字符
        "Hello World",               // 普通文本
    ];

    for sample in invalid_base64_samples {
        let (sub_type, _) = ContentDetector::detect(sample);
        assert_ne!(sub_type, ContentSubType::Base64);
    }
}
```

## 使用场景

Base64 检测主要用于：

1. **数据传输**: 识别网络传输中的 Base64 编码数据
2. **图像处理**: 识别 Base64 编码的图像数据（如 Data URLs）
3. **文件解码**: 自动解码 Base64 编码的文件内容
4. **API 数据**: 处理 API 响应中的 Base64 编码数据
5. **邮件附件**: 识别邮件中的 Base64 编码附件

## Base64 数据处理

基于识别的 Base64 数据，可以进行各种处理操作：

### 解码操作

```rust
use base64::{decode, encode};

fn decode_base64_content(base64_text: &str) -> Result<Vec<u8>, base64::DecodeError> {
    decode(base64_text)
}

fn encode_to_base64(data: &[u8]) -> String {
    encode(data)
}

// 使用示例
let decoded = decode_base64_content("SGVsbG8sIFdvcmxkIQ==").unwrap();
let text = String::from_utf8(decoded).unwrap();
// text: "Hello, World!"
```

### 内容类型检测

```rust
fn detect_content_type(data: &[u8]) -> String {
    // PNG 图像
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return "image/png".to_string();
    }

    // JPEG 图像
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return "image/jpeg".to_string();
    }

    // PDF 文件
    if data.starts_with(b"%PDF-") {
        return "application/pdf".to_string();
    }

    // ZIP 文件
    if data.starts_with(&[0x50, 0x4B, 0x03, 0x04]) {
        return "application/zip".to_string();
    }

    // JSON 数据（文本检查）
    if let Ok(text) = String::from_utf8(data.to_vec()) {
        if text.trim_start().starts_with('{') || text.trim_start().starts_with('[') {
            return "application/json".to_string();
        }
        return "text/plain".to_string();
    }

    "application/octet-stream".to_string()
}
```

### 数据 URL 生成

```rust
fn create_data_url(base64_data: &str, content_type: &str) -> String {
    format!("data:{};base64,{}", content_type, base64_data)
}

// 使用示例
let data_url = create_data_url(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "image/png"
);
// 结果: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
```

## 注意事项

1. **格式验证**: 严格验证 Base64 字符集和长度要求
2. **字符多样性**: 避免误识别重复字符或简单模式
3. **解码验证**: 通过实际解码来确认数据有效性
4. **内容分析**: 分析解码后的数据类型和特征
5. **性能考虑**: Base64 解码可能消耗较多计算资源

## 与其他类型的区别

1. **最低优先级**: Base64 检测优先级最低，避免误判其他格式
2. **二进制友好**: 专门处理二进制数据的文本表示
3. **解码验证**: 通过实际解码验证数据有效性
4. **内容多样性**: 可以包含各种类型的编码数据

## 性能特点

- **检测速度**: 中等到慢（需要解码验证）
- **内存使用**: 高（需要存储解码后的数据信息）
- **验证准确性**: 高（通过实际解码验证）
- **处理能力**: 强（支持各种二进制和文本数据）

## Base64 变体支持

标准 Base64 使用字符集 `A-Za-z0-9+/`，某些变体可能使用不同的字符：

### URL 安全 Base64

- 字符集: `A-Za-z0-9-_`（使用 `-` 和 `_` 替代 `+` 和 `/`）
- 通常不使用填充符 `=`

### 自定义 Base64

- 可能使用不同的字符集
- 需要根据具体应用场景调整检测逻辑
