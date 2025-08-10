# URL 链接检测 (URL)

## 概述

URL 检测能够识别各种格式的网址链接，包括完整的协议链接和简化的域名形式。

- **内容子类型**: `Url`
- **检测优先级**: 高（第一优先级）
- **返回元数据**: `UrlParts` - 包含协议、主机、路径、查询参数等详细信息

## 检测逻辑

URL 检测分为两个阶段：

### 1. 协议检测

检测以特定协议开头的完整 URL：

```rust
text.starts_with("http://") ||
text.starts_with("https://") ||
text.starts_with("ftp://")
```

### 2. 域名检测

对于没有协议前缀的文本，使用正则表达式检测域名格式：

```rust
let domain_regex = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}\.[a-zA-Z]{2,}").unwrap();
```

**注意**: 为避免与邮箱地址冲突，包含 `@` 符号的文本不会被识别为 URL。

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下 URL 格式会被正确识别：

#### 完整协议 URL

```text
https://www.example.com
http://example.com
ftp://files.example.com
https://sub.example.co.uk/path/to/resource?param=value#anchor
```

#### 包含端口的 URL

```text
http://localhost:3000
https://192.168.1.1:8080/api
https://example.com:8080/path
```

#### 简化域名格式

```text
github.com/user/repo
www.example.com
example.org
test-site.example.com
```

#### 复杂路径和参数

```text
https://api.github.com/repos/user/repo/issues?state=open&sort=updated
http://example.com/path/to/resource?foo=bar&baz=qux#section
```

### ❌ 无效示例

以下格式不会被识别为 URL：

```text
http://              # 只有协议，没有域名
https://             # 只有协议，没有域名
ftp://               # 只有协议，没有域名
user@example.com     # 包含@符号（可能是邮箱）
just-text            # 普通文本，没有域名格式
```

## 解析出的内容

URL 检测会解析出详细的结构化元数据：

### UrlParts 结构

```rust
pub struct UrlParts {
    pub protocol: String,              // 协议 (http, https, ftp)
    pub host: String,                  // 主机名和端口
    pub path: String,                  // 路径
    pub query_params: Vec<(String, String)>, // 查询参数
}
```

### 解析示例

#### 输入

```text
https://example.com:8080/api/users?page=1&limit=10
```

#### 解析结果

```rust
UrlParts {
    protocol: "https".to_string(),
    host: "example.com:8080".to_string(),    // 包含端口
    path: "/api/users".to_string(),
    query_params: vec![
        ("page".to_string(), "1".to_string()),
        ("limit".to_string(), "10".to_string()),
    ],
}
```

#### 另一个示例

**输入**: `github.com/user/repo`

**解析结果**:

```rust
UrlParts {
    protocol: "".to_string(),              // 无协议的域名
    host: "github.com".to_string(),
    path: "/user/repo".to_string(),
    query_params: vec![],                  // 无查询参数
}
```

## 测试用例

### 基础 URL 检测

```rust
#[test]
fn test_url_detection() {
    let valid_urls = vec![
        "https://www.example.com",
        "http://example.com",
        "ftp://files.example.com",
        "https://sub.example.co.uk/path/to/resource?param=value#anchor",
        "http://localhost:3000",
        "https://192.168.1.1:8080/api",
        "github.com/user/repo",
        "www.example.com",
        "example.org",
        "test-site.example.com",
    ];

    for url in valid_urls {
        let (sub_type, metadata) = ContentDetector::detect(url);
        assert_eq!(sub_type, ContentSubType::Url);
        assert!(metadata.is_some());
    }
}
```

### URL 元数据解析测试

```rust
#[test]
fn test_url_metadata_parsing() {
    let test_cases = vec![
        (
            "https://example.com:8080/path?param=value",
            "https",
            "example.com:8080",
            "/path",
            vec![("param", "value")],
        ),
        // ... 更多测试用例
    ];

    for (url, expected_protocol, expected_host, expected_path, expected_params) in test_cases {
        let (sub_type, metadata) = ContentDetector::detect(url);
        assert_eq!(sub_type, ContentSubType::Url);

        if let Some(meta) = metadata {
            if let Some(url_parts) = meta.url_parts {
                assert_eq!(url_parts.protocol, expected_protocol);
                assert_eq!(url_parts.host, expected_host);
                assert_eq!(url_parts.path, expected_path);
                // 验证查询参数...
            }
        }
    }
}
```

### 无效 URL 测试

```rust
#[test]
fn test_invalid_urls() {
    let invalid_urls = vec![
        "http://",           // 只有协议
        "https://",          // 只有协议
        "ftp://",           // 只有协议
        "user@example.com", // 邮箱地址
        "just text",        // 普通文本
    ];

    for url in invalid_urls {
        let (sub_type, _) = ContentDetector::detect(url);
        assert_ne!(sub_type, ContentSubType::Url);
    }
}
```

## 使用场景

URL 检测主要用于：

1. **链接识别**: 自动识别文本中的网址
2. **快速访问**: 为 URL 提供一键打开功能
3. **元数据提取**: 解析 URL 的各个组成部分
4. **链接验证**: 验证 URL 格式的正确性
5. **域名分析**: 提取主机名和端口信息

## 注意事项

1. **协议优先**: 有协议前缀的 URL 优先识别
2. **邮箱排除**: 包含 `@` 的文本不会被识别为 URL
3. **域名要求**: 简化格式需要符合域名规范（至少包含一个点和有效的顶级域名）
4. **端口保留**: 解析时会保留端口信息在主机名中
5. **大小写敏感**: 协议检测区分大小写

## 性能特点

- **检测速度**: 快（简单的字符串匹配和正则表达式）
- **内存使用**: 中等（需要存储解析后的元数据）
- **解析复杂度**: 使用 `url` 包进行专业解析，准确性高
