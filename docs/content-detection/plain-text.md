# 纯文本检测 (PlainText)

## 概述

纯文本是所有内容检测的兜底分类。当输入的文本无法匹配任何特定的内容类型时，就会被归类为纯文本。

- **内容子类型**: `PlainText`
- **检测优先级**: 最低（兜底）
- **返回元数据**: 无

## 检测逻辑

纯文本检测实际上不进行任何模式匹配，而是当所有其他内容类型检测都失败时的默认分类。

```rust
// 伪代码逻辑
if !is_url(text) && !is_ip(text) && !is_email(text) && ... {
    return ContentSubType::PlainText;
}
```

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下内容会被识别为纯文本：

#### 普通文本

```text
Hello, world!
This is a simple text message.
12345 mixed with text
Special characters: @#$%^&*()
```

#### 多语言文本

```text
你好，世界！
こんにちは世界
مرحبا بالعالم
Привет, мир!
```

#### 包含格式的文本

```text
Line breaks
are
here

Tabs	and	spaces
```

#### 空白内容

```text
""           # 空字符串
" "          # 单个空格
"\n"         # 换行符
"\t"         # 制表符
"   \n\t  "  # 混合空白字符
```

#### 格式错误的特定类型内容

```text
http://                    # 不完整的URL
@example.com              # 不完整的邮箱
256.256.256.256           # 无效的IP地址
{incomplete json          # 格式错误的JSON
rgb(256, 0, 0)            # 超出范围的RGB值
user space@example.com    # 包含空格的邮箱
#gg                       # 无效的十六进制颜色
```

## 解析出的内容

纯文本类型不进行任何特殊解析，返回的元数据为空：

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

## 测试用例

### 基础文本测试

```rust
#[test]
fn test_plain_text_detection() {
    let test_cases = vec![
        "Hello, world!",
        "This is a simple text message.",
        "你好，世界！",
        "こんにちは世界",
        "مرحبا بالعالم",
        "Привět, мир!",
        "12345 mixed with text",
        "Special characters: @#$%^&*()",
        "Line breaks\nare\nhere",
        "Tabs\tand\tspaces",
    ];

    for text in test_cases {
        let (sub_type, metadata) = ContentDetector::detect(text);
        assert_eq!(sub_type, ContentSubType::PlainText);
        assert!(metadata.is_none() ||
               (metadata.unwrap().detected_language.is_none() &&
                metadata.unwrap().url_parts.is_none()));
    }
}
```

### 空白内容测试

```rust
#[test]
fn test_empty_and_whitespace() {
    let test_cases = vec!["", " ", "\n", "\t", "   \n\t  "];

    for text in test_cases {
        let (sub_type, _) = ContentDetector::detect(text);
        assert_eq!(sub_type, ContentSubType::PlainText);
    }
}
```

### 格式错误内容测试

```rust
#[test]
fn test_malformed_inputs() {
    let malformed_inputs = vec![
        "http://",                    // 不完整的URL
        "#gg",                        // 无效的十六进制颜色
        "rgb(256, 0, 0)",            // 无效的RGB值
        "{incomplete json",          // 格式错误的JSON
        "not-an-email@",             // 不完整的邮箱
    ];

    for input in malformed_inputs {
        let (sub_type, _) = ContentDetector::detect(input);
        assert_eq!(sub_type, ContentSubType::PlainText);
    }
}
```

## 使用场景

纯文本检测主要用于：

1. **兜底分类**: 确保所有输入都有一个合适的分类
2. **普通笔记**: 用户的日常文字记录
3. **混合内容**: 包含多种元素但不符合特定格式的文本
4. **格式错误的内容**: 用户输入的不完整或错误格式的特定类型内容

## 注意事项

1. **无特殊处理**: 纯文本不进行任何格式化或解析
2. **保持原样**: 内容按原文存储，包括空白字符和换行
3. **Unicode 支持**: 完全支持多语言和特殊字符
4. **兜底功能**: 确保系统的稳定性，任何内容都不会被拒绝

## 性能特点

- **检测速度**: 最快（无需模式匹配）
- **内存使用**: 最低（无需元数据存储）
- **处理能力**: 可处理任意大小的文本内容
