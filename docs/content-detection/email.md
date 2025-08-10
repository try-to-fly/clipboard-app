# 邮箱地址检测 (Email)

## 概述

邮箱地址检测能够识别标准的电子邮件地址格式，支持 Unicode 字符，适用于国际化的邮箱地址。

- **内容子类型**: `Email`
- **检测优先级**: 高（第三优先级）
- **返回元数据**: 无

## 检测逻辑

邮箱地址检测使用支持 Unicode 的正则表达式：

```rust
let email_regex = Regex::new(r"^[\w._%+-]+@[\w.-]+\.[\w]{2,}$").unwrap();
```

### 检测规则

1. **本地部分** (`[\w._%+-]+`): 支持字母、数字、下划线、点、百分号、加号、减号
2. **@ 符号**: 必须包含且只能有一个
3. **域名部分** (`[\w.-]+`): 支持字母、数字、点、减号
4. **顶级域名** (`[\w]{2,}`): 至少2个字符的顶级域名

**重要特性**: 使用 `\w` 模式支持 Unicode 字符，能够识别中文、日文等多语言域名。

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下邮箱格式会被正确识别：

#### 标准英文邮箱

```text
user@example.com
firstname.lastname@company.com
user123@test-domain.com
```

#### 带特殊字符的邮箱

```text
test.email@domain.co.uk      # 本地部分包含点
user+tag@example.org         # 本地部分包含加号
user_name@example.com        # 本地部分包含下划线
user-name@example.com        # 本地部分包含减号
user%name@example.com        # 本地部分包含百分号
```

#### Unicode 国际化邮箱

```text
用户@中文域名.测试            # 中文邮箱地址
пользователь@пример.рф      # 俄文邮箱地址
ユーザー@例.テスト           # 日文邮箱地址
```

#### 不同域名格式

```text
user@example.org             # .org 域名
user@example.co.uk           # 二级域名
user@subdomain.example.com   # 子域名
user@test-site.com           # 域名包含减号
```

### ❌ 无效示例

以下格式不会被识别为邮箱地址：

```text
@example.com                 # 缺少本地部分
user@                        # 缺少域名部分
user@@example.com           # 包含多个@符号
user@.com                   # 域名部分以点开头
user space@example.com      # 本地部分包含空格（不在支持字符集中）
user@example                # 缺少顶级域名
user@example.c              # 顶级域名少于2个字符
```

## 解析出的内容

邮箱地址检测不提供额外的元数据解析，返回的元数据为空：

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

邮箱地址的格式已经是标准化的，应用可以根据需要自行解析本地部分和域名部分。

## 测试用例

### 有效邮箱测试

```rust
#[test]
fn test_email_detection() {
    let valid_emails = vec![
        "user@example.com",
        "test.email@domain.co.uk",
        "user+tag@example.org",
        "firstname.lastname@company.com",
        "user123@test-domain.com",
    ];

    for email in valid_emails {
        let (sub_type, _) = ContentDetector::detect(email);
        assert_eq!(sub_type, ContentSubType::Email);
    }
}
```

### 无效邮箱测试

```rust
#[test]
fn test_invalid_emails() {
    let invalid_emails = vec![
        "@example.com",              // 缺少本地部分
        "user@",                     // 缺少域名
        "user@@example.com",         // 多个@符号
        "user@.com",                 // 域名以点开头
        "user space@example.com",    // 包含空格
    ];

    for email in invalid_emails {
        let (sub_type, _) = ContentDetector::detect(email);
        assert_ne!(sub_type, ContentSubType::Email);
    }
}
```

### Unicode 邮箱测试

```rust
#[test]
fn test_unicode_email_detection() {
    let unicode_emails = vec![
        "用户@中文域名.测试",         // 中文邮箱
        "пользователь@пример.рф",   // 俄文邮箱
        "ユーザー@例.テスト",        // 日文邮箱
    ];

    for email in unicode_emails {
        let (sub_type, _) = ContentDetector::detect(email);
        assert_eq!(sub_type, ContentSubType::Email);
    }
}
```

## 使用场景

邮箱地址检测主要用于：

1. **联系信息识别**: 自动识别文本中的邮箱地址
2. **一键邮件**: 为邮箱地址提供快速发送邮件功能
3. **表单验证**: 验证用户输入的邮箱格式
4. **数据清洗**: 从文本中提取邮箱信息
5. **国际化支持**: 处理多语言环境下的邮箱地址

## 邮箱地址解析

虽然不提供结构化元数据，但应用可以手动解析邮箱地址的组成部分：

### 解析示例

```rust
fn parse_email(email: &str) -> Option<(String, String)> {
    if let Some(at_pos) = email.find('@') {
        let local_part = &email[..at_pos];      // 本地部分
        let domain_part = &email[at_pos + 1..]; // 域名部分
        Some((local_part.to_string(), domain_part.to_string()))
    } else {
        None
    }
}

// 使用示例
let (local, domain) = parse_email("user@example.com").unwrap();
// local: "user"
// domain: "example.com"
```

### 域名进一步解析

```rust
fn parse_domain(domain: &str) -> Vec<String> {
    domain.split('.').map(|s| s.to_string()).collect()
}

// 使用示例
let parts = parse_domain("mail.google.com");
// ["mail", "google", "com"]
```

## 注意事项

1. **Unicode 支持**: 使用 `\w` 支持国际化字符，包括中文、日文等
2. **单个 @ 符号**: 严格要求只能包含一个 @ 符号
3. **域名要求**: 必须包含至少一个点和2个字符的顶级域名
4. **空格不支持**: 本地部分和域名部分都不允许包含空格
5. **大小写不敏感**: 邮箱地址通常不区分大小写（由应用层处理）

## 与其他类型的区别

1. **与 URL 的区别**: URL 检测会排除包含 @ 符号的文本，避免冲突
2. **检测优先级**: 邮箱检测优先级高于大多数其他类型
3. **格式严格性**: 比 URL 检测更严格，要求精确的邮箱格式

## 性能特点

- **检测速度**: 快（单次正则表达式匹配）
- **内存使用**: 低（无元数据存储）
- **国际化支持**: 全面（支持各种 Unicode 字符）
- **准确性**: 高（严格的格式验证）
