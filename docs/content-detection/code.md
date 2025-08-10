# 代码检测 (Code)

## 概述

代码检测能够识别各种编程语言的代码片段，支持语言识别和语法特征分析，涵盖主流的编程语言。

- **内容子类型**: `Code`
- **检测优先级**: 中等（第五优先级）
- **返回元数据**: `DetectedLanguage` - 包含识别的编程语言信息

## 检测逻辑

代码检测通过识别特定编程语言的语法模式来判断代码类型：

```rust
fn detect_programming_language(text: &str) -> Option<String> {
    let language_patterns = vec![
        // JavaScript/TypeScript
        ("javascript", vec![
            r"\bfunction\s+\w+\s*\(", r"\bvar\s+\w+", r"\blet\s+\w+", r"\bconst\s+\w+",
            r"console\.log\(", r"=>\s*\{", r"\brequire\(", r"\bexport\s+",
        ]),

        // Python
        ("python", vec![
            r"\bdef\s+\w+\s*\(", r"\bimport\s+\w+", r"\bfrom\s+\w+\s+import",
            r"\bif\s+__name__\s*==\s*['\"]__main__['\"]", r"\bprint\s*\(",
            r"^\s*#.*$", r":\s*$",  // Python 缩进语法
        ]),

        // Java
        ("java", vec![
            r"\bpublic\s+class\s+\w+", r"\bpublic\s+static\s+void\s+main",
            r"\bSystem\.out\.print", r"\bpublic\s+\w+\s+\w+\s*\(",
            r"\bimport\s+java\.", r"\bprivate\s+", r"\bprotected\s+",
        ]),

        // C/C++
        ("cpp", vec![
            r"#include\s*<", r"\bint\s+main\s*\(", r"cout\s*<<", r"cin\s*>>",
            r"\bstd::", r"\bnamespace\s+", r"\bclass\s+\w+\s*\{",
        ]),

        ("c", vec![
            r"#include\s*<", r"\bint\s+main\s*\(", r"\bprintf\s*\(",
            r"\bmalloc\s*\(", r"\bfree\s*\(", r"\bstruct\s+\w+",
        ]),

        // Rust
        ("rust", vec![
            r"\bfn\s+\w+\s*\(", r"\blet\s+mut\s+", r"\blet\s+\w+",
            r"\bmatch\s+", r"println!\s*\(", r"\bimpl\s+", r"\btrait\s+",
            r"\buse\s+\w+::", r"\bpub\s+fn\s+",
        ]),

        // Go
        ("go", vec![
            r"\bfunc\s+\w+\s*\(", r"\bpackage\s+main", r"\bimport\s*\(",
            r"\bvar\s+\w+\s+\w+", r"fmt\.Print", r"\bgo\s+func\s*\(",
            r"\btype\s+\w+\s+struct", r"\bdefer\s+",
        ]),

        // PHP
        ("php", vec![
            r"<\?php", r"\$\w+", r"\becho\s+", r"\bfunction\s+\w+\s*\(",
            r"\bclass\s+\w+", r"->\w+", r"\bnamespace\s+",
        ]),

        // Ruby
        ("ruby", vec![
            r"\bdef\s+\w+", r"\bend\b", r"\bclass\s+\w+", r"\brequire\s+",
            r"\bputs\s+", r"@\w+", r"\bdo\s*\|", r"=>\s*",
        ]),

        // Swift
        ("swift", vec![
            r"\bfunc\s+\w+\s*\(", r"\bvar\s+\w+", r"\blet\s+\w+",
            r"\bclass\s+\w+", r"\bstruct\s+\w+", r"print\s*\(",
            r"\boverride\s+", r"\bextension\s+",
        ]),

        // Kotlin
        ("kotlin", vec![
            r"\bfun\s+\w+\s*\(", r"\bval\s+\w+", r"\bvar\s+\w+",
            r"\bclass\s+\w+", r"println\s*\(", r"\bdata\s+class",
        ]),

        // HTML
        ("html", vec![
            r"<html", r"</html>", r"<body", r"</body>", r"<div", r"</div>",
            r"<p>", r"</p>", r"<h[1-6]>", r"</h[1-6]>",
        ]),

        // CSS
        ("css", vec![
            r"\w+\s*\{[^}]*\}", r":\s*[^;]+;", r"@media\s*",
            r"#\w+\s*\{", r"\.\w+\s*\{", r"!important",
        ]),

        // SQL
        ("sql", vec![
            r"\bSELECT\s+", r"\bFROM\s+", r"\bWHERE\s+", r"\bINSERT\s+INTO\s+",
            r"\bUPDATE\s+", r"\bDELETE\s+FROM\s+", r"\bCREATE\s+TABLE\s+",
            r"\bALTER\s+TABLE\s+", r"\bJOIN\s+",
        ]),

        // Shell/Bash
        ("shell", vec![
            r"#!/bin/bash", r"#!/bin/sh", r"\$\w+", r"\becho\s+",
            r"\bif\s*\[", r"\bthen\b", r"\bfi\b", r"\bfor\s+\w+\s+in",
        ]),
    ];

    for (language, patterns) in language_patterns {
        let mut matches = 0;
        for pattern in patterns {
            if Regex::new(pattern).unwrap().is_match(text) {
                matches += 1;
            }
        }

        // 如果匹配足够多的模式，认为是这种语言
        if matches >= (patterns.len() as f32 * 0.3).ceil() as usize {
            return Some(language.to_string());
        }
    }

    None
}
```

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下代码格式会被正确识别：

#### JavaScript/TypeScript 代码

```javascript
function hello() {
  console.log('Hello, World!');
}

const data = [1, 2, 3];
let result = data.map((x) => x * 2);

import React from 'react';
export default function App() {
  return <div>Hello</div>;
}
```

#### Python 代码

```python
def calculate_sum(numbers):
    return sum(numbers)

import numpy as np
from datetime import datetime

if __name__ == "__main__":
    print("Hello, Python!")

class MyClass:
    def __init__(self):
        self.value = 42
```

#### Java 代码

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }

    private String name;
    protected int age;

    public void setName(String name) {
        this.name = name;
    }
}
```

#### C/C++ 代码

```cpp
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World!" << std::endl;
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    return 0;
}

class MyClass {
public:
    void doSomething();
};
```

#### Rust 代码

```rust
fn main() {
    println!("Hello, World!");
    let mut x = 5;
    let y = &x;

    match x {
        1 => println!("One"),
        _ => println!("Something else"),
    }
}

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

impl MyTrait for MyStruct {
    fn method(&self) -> i32 {
        42
    }
}
```

#### Go 代码

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    fmt.Println("Hello, World!")
    go func() {
        fmt.Println("Goroutine")
    }()
}

type Person struct {
    Name string
    Age  int
}

func (p Person) Greet() string {
    return fmt.Sprintf("Hello, %s", p.Name)
}
```

#### HTML 代码

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <div class="container">
      <h1>Welcome</h1>
      <p>This is a paragraph.</p>
    </div>
  </body>
</html>
```

#### CSS 代码

```css
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

#header {
  background-color: #f0f0f0;
  padding: 10px;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
}
```

#### SQL 代码

```sql
SELECT u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01'
GROUP BY u.id
ORDER BY order_count DESC;

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2)
);
```

### ❌ 无效示例

以下内容不会被识别为代码：

```text
This is just plain text without any code syntax.
```

```text
Hello, world! How are you today?
```

```text
123456789
```

## 解析出的内容

代码检测会提供检测到的编程语言信息：

### DetectedLanguage 结构

```rust
pub struct DetectedLanguage {
    pub language: String,          // 检测到的编程语言
    pub confidence: f32,           // 置信度 (0.0-1.0)
}
```

### 解析示例

#### JavaScript 代码

**输入**: `function hello() { console.log("Hello"); }`

```rust
ContentMetadata {
    detected_language: Some(DetectedLanguage {
        language: "javascript".to_string(),
        confidence: 0.85,
    }),
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

#### Python 代码

**输入**: `def main():\n    print("Hello, World!")`

```rust
ContentMetadata {
    detected_language: Some(DetectedLanguage {
        language: "python".to_string(),
        confidence: 0.92,
    }),
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

## 测试用例

### JavaScript 代码测试

```rust
#[test]
fn test_javascript_detection() {
    let js_codes = vec![
        "function hello() { console.log('Hello'); }",
        "const data = [1, 2, 3]; let result = data.map(x => x * 2);",
        "import React from 'react'; export default App;",
        "var name = 'John'; console.log(`Hello, ${name}`);",
    ];

    for code in js_codes {
        let (sub_type, metadata) = ContentDetector::detect(code);
        assert_eq!(sub_type, ContentSubType::Code);

        if let Some(meta) = metadata {
            if let Some(lang) = meta.detected_language {
                assert_eq!(lang.language, "javascript");
            }
        }
    }
}
```

### Python 代码测试

```rust
#[test]
fn test_python_detection() {
    let python_codes = vec![
        "def hello():\n    print('Hello, World!')",
        "import numpy as np\nfrom datetime import datetime",
        "if __name__ == '__main__':\n    print('Running')",
        "class MyClass:\n    def __init__(self):\n        pass",
    ];

    for code in python_codes {
        let (sub_type, metadata) = ContentDetector::detect(code);
        assert_eq!(sub_type, ContentSubType::Code);

        if let Some(meta) = metadata {
            if let Some(lang) = meta.detected_language {
                assert_eq!(lang.language, "python");
            }
        }
    }
}
```

### 多语言混合测试

```rust
#[test]
fn test_mixed_language_detection() {
    let language_samples = vec![
        ("java", "public class Test { public static void main(String[] args) {} }"),
        ("cpp", "#include <iostream>\nint main() { std::cout << \"Hello\"; }"),
        ("rust", "fn main() { println!(\"Hello\"); let x = 5; }"),
        ("go", "package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"Hello\") }"),
        ("html", "<html><body><div>Hello</div></body></html>"),
        ("css", "body { margin: 0; padding: 20px; } .container { width: 100%; }"),
    ];

    for (expected_lang, code) in language_samples {
        let (sub_type, metadata) = ContentDetector::detect(code);
        assert_eq!(sub_type, ContentSubType::Code);

        if let Some(meta) = metadata {
            if let Some(lang) = meta.detected_language {
                assert_eq!(lang.language, expected_lang);
            }
        }
    }
}
```

### 非代码文本测试

```rust
#[test]
fn test_non_code_text() {
    let non_code_texts = vec![
        "This is just plain text.",
        "Hello, world! How are you?",
        "123456789",
        "user@example.com",
        "https://example.com",
    ];

    for text in non_code_texts {
        let (sub_type, _) = ContentDetector::detect(text);
        assert_ne!(sub_type, ContentSubType::Code);
    }
}
```

## 使用场景

代码检测主要用于：

1. **语法高亮**: 为代码片段提供语法高亮显示
2. **代码格式化**: 根据语言类型进行代码格式化
3. **编辑器集成**: 在代码编辑器中提供语言特定功能
4. **代码分析**: 为代码质量分析提供语言上下文
5. **文档生成**: 自动识别文档中的代码示例

## 代码处理

基于识别的编程语言，可以进行各种代码处理：

### 语法高亮

```rust
fn apply_syntax_highlighting(code: &str, language: &str) -> String {
    match language {
        "javascript" | "typescript" => highlight_js(code),
        "python" => highlight_python(code),
        "rust" => highlight_rust(code),
        "java" => highlight_java(code),
        _ => code.to_string(),
    }
}
```

### 代码格式化

```rust
fn format_code(code: &str, language: &str) -> Option<String> {
    match language {
        "javascript" | "typescript" => format_with_prettier(code),
        "python" => format_with_black(code),
        "rust" => format_with_rustfmt(code),
        "go" => format_with_gofmt(code),
        _ => None,
    }
}
```

### 代码分析

```rust
fn analyze_code_metrics(code: &str, language: &str) -> CodeMetrics {
    let lines = code.lines().count();
    let complexity = calculate_complexity(code, language);
    let functions = extract_functions(code, language);

    CodeMetrics {
        line_count: lines,
        complexity_score: complexity,
        function_count: functions.len(),
        detected_issues: lint_code(code, language),
    }
}
```

## 注意事项

1. **边界匹配**: 使用词边界确保关键词的完整匹配
2. **模式权重**: 不同的语法模式具有不同的识别权重
3. **混合代码**: 处理包含多种语言的代码文件（如 HTML + CSS + JS）
4. **置信度**: 提供检测置信度，帮助应用做出更好的决策
5. **语言演进**: 定期更新语法模式以支持新的语言特性

## 与其他类型的区别

1. **与纯文本的区别**: 代码具有特定的语法结构和关键词
2. **与 Markdown 的区别**: 代码更注重语法正确性而非格式标记
3. **检测优先级**: 代码检测优先级中等，低于特定格式但高于纯文本

## 性能特点

- **检测速度**: 中等（需要多个语言模式匹配）
- **内存使用**: 中等（存储语言检测结果和置信度）
- **准确性**: 高（基于多个语法特征的综合判断）
- **语言支持**: 广泛（覆盖主流编程语言）
