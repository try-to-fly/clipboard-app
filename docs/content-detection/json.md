# JSON 检测 (Json)

## 概述

JSON 检测能够识别有效的 JSON 格式文本，支持对象、数组和各种数据类型的 JSON 结构验证。

- **内容子类型**: `Json`
- **检测优先级**: 中等（第八优先级）
- **返回元数据**: 无

## 检测逻辑

JSON 检测使用 `serde_json` 库进行严格的格式验证：

```rust
fn is_json(text: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(text).is_ok()
}
```

### 检测特点

1. **严格验证**: 必须是有效的 JSON 格式，不允许 JavaScript 对象字面量语法
2. **完整性检查**: JSON 结构必须完整，不允许截断或不平衡的括号
3. **类型支持**: 支持所有标准 JSON 数据类型

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下 JSON 格式会被正确识别：

#### JSON 对象

```json
{
  "name": "John",
  "age": 30,
  "city": "New York"
}
```

```json
{
  "id": 123,
  "active": true,
  "score": 95.5,
  "tags": null
}
```

#### JSON 数组

```json
[1, 2, 3, 4, 5]
```

```json
[
  { "name": "Alice", "age": 25 },
  { "name": "Bob", "age": 30 }
]
```

#### 嵌套结构

```json
{
  "users": [
    {
      "profile": {
        "name": "Alice",
        "preferences": {
          "theme": "dark",
          "notifications": true
        }
      }
    }
  ]
}
```

#### 简单值

```json
"simple string"
```

```json
42
```

```json
true
```

```json
null
```

#### 空结构

```json
{}
```

```json
[]
```

### ❌ 无效示例

以下格式不会被识别为 JSON：

```text
{name: "John"}              # JavaScript 对象字面量（键未加引号）
{                           # 不完整的 JSON
  "name": "John"
{'name': 'John'}            # 使用单引号
{
  "name": "John",           # 尾随逗号
}
{name: undefined}           # JavaScript 特有的 undefined 值
{/* comment */}             # 包含注释
function() {}               # 函数声明
```

## 解析出的内容

JSON 检测不提供额外的元数据解析，返回的元数据为空：

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

JSON 内容本身已经是结构化的数据格式，应用可以直接使用 JSON 解析库处理。

## 测试用例

### 有效 JSON 测试

```rust
#[test]
fn test_json_detection() {
    let valid_json = vec![
        r#"{"name":"John","age":30,"city":"New York"}"#,
        r#"[1,2,3,4,5]"#,
        r#"{"users":[{"name":"Alice"},{"name":"Bob"}]}"#,
        r#"{"id":123,"active":true,"score":95.5,"tags":null}"#,
        r#""simple string""#,
        r#"42"#,
        r#"true"#,
        r#"null"#,
        r#"{}"#,
        r#"[]"#,
    ];

    for json in valid_json {
        let (sub_type, _) = ContentDetector::detect(json);
        assert_eq!(sub_type, ContentSubType::Json);
    }
}
```

### 复杂嵌套 JSON 测试

```rust
#[test]
fn test_complex_json_detection() {
    let complex_json = vec![
        r#"{
            "users": [
                {
                    "profile": {
                        "name": "Alice",
                        "preferences": {
                            "theme": "dark",
                            "notifications": true
                        }
                    }
                }
            ]
        }"#,
        r#"{
            "api_response": {
                "status": 200,
                "data": {
                    "items": [
                        {"id": 1, "value": "test"},
                        {"id": 2, "value": null}
                    ]
                },
                "meta": {
                    "total": 2,
                    "page": 1
                }
            }
        }"#,
    ];

    for json in complex_json {
        let (sub_type, _) = ContentDetector::detect(json);
        assert_eq!(sub_type, ContentSubType::Json);
    }
}
```

### 无效 JSON 测试

```rust
#[test]
fn test_invalid_json() {
    let invalid_json = vec![
        r#"{name: "John"}"#,            // 键未加引号
        r#"{'name': 'John'}"#,          // 使用单引号
        r#"{"name": "John",}"#,         // 尾随逗号
        r#"{"name": undefined}"#,       // undefined 值
        r#"{/* comment */}"#,           // 包含注释
        r#"function() {}"#,             // 函数声明
        r#"{"unclosed": true"#,         // 不完整的 JSON
    ];

    for json in invalid_json {
        let (sub_type, _) = ContentDetector::detect(json);
        assert_ne!(sub_type, ContentSubType::Json);
    }
}
```

## 使用场景

JSON 检测主要用于：

1. **API 响应**: 识别和处理 API 返回的 JSON 数据
2. **配置文件**: 识别 JSON 格式的配置内容
3. **数据交换**: 验证 JSON 数据的格式正确性
4. **调试工具**: 为 JSON 内容提供格式化和验证功能
5. **数据导入**: 识别待导入的 JSON 数据

## JSON 数据处理

检测到 JSON 后，可以使用标准 JSON 库进行处理：

### 解析示例

```rust
use serde_json::{Value, from_str};

fn parse_json_content(json_text: &str) -> Option<Value> {
    from_str(json_text).ok()
}

// 使用示例
if let Some(json_value) = parse_json_content(r#"{"name":"John","age":30}"#) {
    if let Some(name) = json_value["name"].as_str() {
        println!("Name: {}", name);
    }
    if let Some(age) = json_value["age"].as_u64() {
        println!("Age: {}", age);
    }
}
```

### 格式化输出

```rust
use serde_json::{to_string_pretty, from_str, Value};

fn format_json(json_text: &str) -> Option<String> {
    let value: Value = from_str(json_text).ok()?;
    to_string_pretty(&value).ok()
}

// 使用示例
let formatted = format_json(r#"{"name":"John","age":30}"#);
// 输出：
// {
//   "name": "John",
//   "age": 30
// }
```

## 注意事项

1. **严格模式**: 只接受标准 JSON 格式，不支持 JavaScript 对象字面量
2. **完整性要求**: JSON 结构必须完整和平衡
3. **引号要求**: 所有字符串（包括键名）必须使用双引号
4. **无注释**: 不支持 JSON 中的注释
5. **数据类型**: 只支持标准 JSON 数据类型（string, number, boolean, null, object, array）

## 与其他类型的区别

1. **与代码的区别**: JSON 有严格的语法要求，不是任意代码
2. **检测优先级**: JSON 检测优先级高于纯文本但低于特定格式类型
3. **格式严格性**: 比 Markdown 等格式更严格，必须完全符合 JSON 规范

## 性能特点

- **检测速度**: 中等（需要完整解析验证）
- **内存使用**: 中等（解析过程需要创建中间对象）
- **验证准确性**: 极高（使用专业 JSON 解析库）
- **错误容忍**: 低（严格按照 JSON 规范验证）
