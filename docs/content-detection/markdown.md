# Markdown 格式检测 (Markdown)

## 概述

Markdown 格式检测能够识别常见的 Markdown 语法结构，包括标题、列表、代码块、链接等各种 Markdown 元素。

- **内容子类型**: `Markdown`
- **检测优先级**: 中等（第六优先级）
- **返回元数据**: 无

## 检测逻辑

Markdown 检测通过识别典型的 Markdown 语法模式来判断文本格式：

````rust
fn is_markdown(text: &str) -> bool {
    let markdown_patterns = [
        // 标题
        r"^#{1,6}\s+.+$",              // # 标题
        r"^.+\n=+$",                   // 一级标题下划线
        r"^.+\n-+$",                   // 二级标题下划线

        // 列表
        r"^[\s]*[\*\-\+]\s+.+$",       // 无序列表
        r"^[\s]*\d+\.\s+.+$",          // 有序列表

        // 代码
        r"^```.*$",                    // 代码块开始/结束
        r"^[\s]*`[^`]+`",              // 行内代码
        r"^[\s]{4,}.+$",               // 缩进代码块

        // 链接和图片
        r"\[.+\]\(.+\)",               // 链接格式 [text](url)
        r"!\[.*\]\(.+\)",              // 图片格式 ![alt](url)

        // 引用
        r"^>\s+.+$",                   // 引用块

        // 分隔线
        r"^[\s]*[\*\-_]{3,}[\s]*$",    // 分隔线

        // 表格
        r"^\|.+\|$",                   // 表格行
        r"^[\s]*\|?[\s]*:?-+:?[\s]*\|", // 表格分隔行

        // 强调
        r"\*\*.+\*\*",                 // 粗体
        r"__.+__",                     // 粗体（下划线）
        r"(?<!\*)\*(?!\*)([^*]+)\*(?!\*)", // 斜体
        r"(?<!_)_(?!_)([^_]+)_(?!_)",  // 斜体（下划线）
    ];

    let lines: Vec<&str> = text.lines().collect();
    let mut markdown_indicators = 0;

    for line in &lines {
        for pattern in &markdown_patterns {
            if Regex::new(pattern).unwrap().is_match(line) {
                markdown_indicators += 1;
                break;
            }
        }
    }

    // 如果有足够多的 Markdown 指示器，认为是 Markdown
    markdown_indicators >= (lines.len().min(3) as f32 * 0.3).ceil() as usize
}
````

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下 Markdown 格式会被正确识别：

#### 标题格式

```markdown
# 一级标题

## 二级标题

### 三级标题

# 一级标题

## 二级标题
```

#### 列表格式

```markdown
- 无序列表项1
- 无序列表项2
  - 嵌套列表项

* 另一种无序列表

- 第三种无序列表

1. 有序列表项1
2. 有序列表项2
   1. 嵌套有序列表
```

#### 代码块

````markdown
```javascript
function hello() {
  console.log('Hello, World!');
}
```
````

`行内代码`

    缩进代码块
    另一行代码

````

#### 链接和图片
```markdown
[链接文本](https://example.com)
[链接带标题](https://example.com "标题")
![图片描述](image.jpg)
![图片带标题](image.jpg "图片标题")
````

#### 引用块

```markdown
> 这是一个引用块
> 可以有多行内容
>
> > 嵌套引用
```

#### 强调和格式

```markdown
**粗体文本**
**也是粗体**
_斜体文本_
_也是斜体_
**_粗斜体_**
~~删除线~~
```

#### 分隔线

```markdown
---

---

---
```

#### 表格

```markdown
| 列1   | 列2   | 列3   |
| ----- | ----- | ----- |
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
```

### ❌ 无效示例

以下格式不会被识别为 Markdown：

```text
普通文本段落，没有任何 Markdown 格式标记。
这只是一个简单的句子。
```

```text
123
456
```

```text
email@example.com
http://example.com
```

## 解析出的内容

Markdown 检测不提供额外的元数据解析，返回的元数据为空：

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

Markdown 内容可以使用专门的 Markdown 解析库进行结构化处理。

## 测试用例

### 基础 Markdown 测试

````rust
#[test]
fn test_markdown_detection() {
    let markdown_samples = vec![
        "# 这是一级标题\n\n这是段落文本。",
        "## 标题\n\n- 列表项1\n- 列表项2",
        "```rust\nfn main() {\n    println!(\"Hello\");\n}\n```",
        "[链接](https://example.com)\n\n**粗体** 和 *斜体*",
        "> 引用文本\n> 多行引用",
        "| 列1 | 列2 |\n|-----|-----|\n| 值1 | 值2 |",
    ];

    for markdown in markdown_samples {
        let (sub_type, _) = ContentDetector::detect(markdown);
        assert_eq!(sub_type, ContentSubType::Markdown);
    }
}
````

### 复杂 Markdown 测试

````rust
#[test]
fn test_complex_markdown() {
    let complex_markdown = r#"# 项目文档

## 介绍

这是一个 **重要** 的项目。

### 特性

- [x] 完成的任务
- [ ] 待完成的任务
- 普通列表项

### 代码示例

```python
def hello_world():
    print("Hello, World!")
````

### 链接

访问 [官网](https://example.com) 了解更多信息。

---

> **注意**: 这只是一个示例文档。
> "#;

    let (sub_type, _) = ContentDetector::detect(complex_markdown);
    assert_eq!(sub_type, ContentSubType::Markdown);

}

````

### 非 Markdown 测试
```rust
#[test]
fn test_non_markdown() {
    let non_markdown_texts = vec![
        "普通文本段落，没有格式标记",
        "123",
        "email@example.com",
        "http://example.com",
        "简单的句子。",
    ];

    for text in non_markdown_texts {
        let (sub_type, _) = ContentDetector::detect(text);
        assert_ne!(sub_type, ContentSubType::Markdown);
    }
}
````

### 边界情况测试

````rust
#[test]
fn test_markdown_edge_cases() {
    let edge_cases = vec![
        "#标题（无空格）",              // 无效标题
        "- ",                        // 空列表项
        "```\n```",                 // 空代码块
        "[]()",                     // 空链接
        "> ",                       // 空引用
    ];

    for case in edge_cases {
        let (sub_type, _) = ContentDetector::detect(case);
        // 这些情况可能被识别为 Markdown，取决于具体实现
    }
}
````

## 使用场景

Markdown 检测主要用于：

1. **文档识别**: 自动识别 Markdown 文档内容
2. **语法高亮**: 为 Markdown 内容提供语法高亮
3. **预览功能**: 为 Markdown 内容提供渲染预览
4. **编辑器支持**: 在编辑器中提供 Markdown 特定功能
5. **内容分类**: 区分 Markdown 文档和其他文本类型

## Markdown 处理

检测到 Markdown 后，可以使用专门的库进行处理：

### 解析示例

```rust
// 使用 pulldown-cmark 库解析 Markdown
use pulldown_cmark::{Parser, html};

fn markdown_to_html(markdown_text: &str) -> String {
    let parser = Parser::new(markdown_text);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

// 使用示例
let markdown = "# 标题\n\n这是 **粗体** 文本。";
let html = markdown_to_html(markdown);
// 结果: "<h1>标题</h1>\n<p>这是 <strong>粗体</strong> 文本。</p>\n"
```

### 结构提取

```rust
use pulldown_cmark::{Parser, Event, Tag};

fn extract_headings(markdown_text: &str) -> Vec<String> {
    let parser = Parser::new(markdown_text);
    let mut headings = Vec::new();
    let mut in_heading = false;
    let mut current_heading = String::new();

    for event in parser {
        match event {
            Event::Start(Tag::Heading(_)) => {
                in_heading = true;
                current_heading.clear();
            }
            Event::End(Tag::Heading(_)) => {
                if in_heading {
                    headings.push(current_heading.clone());
                    in_heading = false;
                }
            }
            Event::Text(text) => {
                if in_heading {
                    current_heading.push_str(&text);
                }
            }
            _ => {}
        }
    }

    headings
}
```

### 链接提取

```rust
fn extract_links(markdown_text: &str) -> Vec<(String, String)> {
    let parser = Parser::new(markdown_text);
    let mut links = Vec::new();
    let mut in_link = false;
    let mut link_text = String::new();
    let mut link_url = String::new();

    for event in parser {
        match event {
            Event::Start(Tag::Link(_, url, _)) => {
                in_link = true;
                link_text.clear();
                link_url = url.to_string();
            }
            Event::End(Tag::Link(_, _, _)) => {
                if in_link {
                    links.push((link_text.clone(), link_url.clone()));
                    in_link = false;
                }
            }
            Event::Text(text) => {
                if in_link {
                    link_text.push_str(&text);
                }
            }
            _ => {}
        }
    }

    links
}
```

## 注意事项

1. **语法变体**: 支持标准 Markdown 语法，可能不包括扩展语法
2. **检测阈值**: 使用多个指示器来提高检测准确性
3. **格式完整性**: 不要求 Markdown 格式完全正确，只要有足够的指示器
4. **多行处理**: 考虑多行结构（如代码块、表格）的完整性
5. **嵌套结构**: 处理嵌套的列表和引用结构

## 与其他类型的区别

1. **与代码的区别**: Markdown 包含更多的格式标记和结构
2. **与纯文本的区别**: Markdown 具有明显的格式语法标记
3. **检测优先级**: Markdown 检测优先级中等，低于特定格式类型

## 性能特点

- **检测速度**: 中等（需要多个正则表达式匹配）
- **内存使用**: 低（无元数据存储）
- **准确性**: 中等（基于模式匹配，可能有误判）
- **扩展性**: 高（易于添加新的 Markdown 语法模式）
