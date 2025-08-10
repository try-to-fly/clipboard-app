# 时间戳检测 (Timestamp)

## 概述

时间戳检测能够识别各种时间格式，包括 Unix 时间戳、ISO 8601 格式、自然语言时间表达等多种时间表示方法。

- **内容子类型**: `Timestamp`
- **检测优先级**: 中等（第七优先级）
- **返回元数据**: `TimestampFormats` - 包含解析后的时间信息

## 检测逻辑

时间戳检测支持多种时间格式的识别：

### 1. Unix 时间戳检测

```rust
fn is_unix_timestamp(text: &str) -> bool {
    if let Ok(timestamp) = text.parse::<i64>() {
        // Unix 时间戳范围：1970-01-01 到 2038-01-19 (32位) 或更远的将来 (64位)
        timestamp >= 946684800 && timestamp <= 4102444800
    } else {
        false
    }
}
```

### 2. ISO 8601 格式检测

```rust
let iso_regex = Regex::new(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$"
).unwrap();
```

### 3. 常见日期格式检测

```rust
let date_patterns = [
    r"^\d{4}-\d{2}-\d{2}$",           // YYYY-MM-DD
    r"^\d{2}/\d{2}/\d{4}$",           // MM/DD/YYYY
    r"^\d{2}-\d{2}-\d{4}$",           // MM-DD-YYYY
    r"^\d{1,2}/\d{1,2}/\d{4}$",       // M/D/YYYY
];
```

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下时间格式会被正确识别：

#### Unix 时间戳

```text
1609459200        # 2021-01-01 00:00:00 UTC
1640995200        # 2022-01-01 00:00:00 UTC
946684800         # 2000-01-01 00:00:00 UTC (边界值)
4102444800        # 2100-01-01 00:00:00 UTC (边界值)
1234567890        # 2009-02-13 23:31:30 UTC
```

#### ISO 8601 格式

```text
2023-12-25T10:30:00Z
2023-12-25T10:30:00+08:00
2023-12-25T10:30:00.123Z
2021-01-01T00:00:00-05:00
2022-06-15T14:30:45.678+09:30
```

#### 标准日期格式

```text
2023-12-25        # ISO 日期格式
12/25/2023        # 美式日期格式
25-12-2023        # 欧式日期格式
1/1/2024          # 简化美式日期
```

#### 时间格式

```text
10:30:00          # HH:MM:SS 格式
14:30:45          # 24小时制
09:15:30          # 带前导零
23:59:59          # 边界时间
```

### ❌ 无效示例

以下格式不会被识别为时间戳：

```text
123               # 过短的数字
-1609459200       # 负数时间戳
946684799         # 小于边界值的时间戳
4102444801        # 大于边界值的时间戳
2023-13-25        # 无效月份
2023-12-32        # 无效日期
25:30:00          # 无效小时
12:60:00          # 无效分钟
12:30:60          # 无效秒数
```

## 解析出的内容

时间戳检测会提供详细的时间格式信息：

### TimestampFormats 结构

```rust
pub struct TimestampFormats {
    pub unix_timestamp: Option<i64>,        // Unix 时间戳
    pub iso_8601: Option<String>,           // ISO 8601 格式
    pub formatted_date: Option<String>,     // 格式化日期
    pub human_readable: Option<String>,     // 人类可读格式
}
```

### 解析示例

#### Unix 时间戳

**输入**: `1609459200`

```rust
TimestampFormats {
    unix_timestamp: Some(1609459200),
    iso_8601: Some("2021-01-01T00:00:00Z".to_string()),
    formatted_date: Some("2021-01-01".to_string()),
    human_readable: Some("January 1, 2021 at 00:00:00 UTC".to_string()),
}
```

#### ISO 8601 格式

**输入**: `2023-12-25T10:30:00Z`

```rust
TimestampFormats {
    unix_timestamp: Some(1703505000),
    iso_8601: Some("2023-12-25T10:30:00Z".to_string()),
    formatted_date: Some("2023-12-25".to_string()),
    human_readable: Some("December 25, 2023 at 10:30:00 UTC".to_string()),
}
```

#### 日期格式

**输入**: `12/25/2023`

```rust
TimestampFormats {
    unix_timestamp: Some(1703462400),  // 假设为UTC午夜
    iso_8601: Some("2023-12-25T00:00:00Z".to_string()),
    formatted_date: Some("2023-12-25".to_string()),
    human_readable: Some("December 25, 2023".to_string()),
}
```

## 测试用例

### Unix 时间戳测试

```rust
#[test]
fn test_unix_timestamp_detection() {
    let valid_timestamps = vec![
        "1609459200",        // 2021-01-01
        "1640995200",        // 2022-01-01
        "946684800",         // 2000-01-01 (边界值)
        "4102444800",        // 2100-01-01 (边界值)
        "1234567890",        // 2009-02-13
    ];

    for timestamp in valid_timestamps {
        let (sub_type, metadata) = ContentDetector::detect(timestamp);
        assert_eq!(sub_type, ContentSubType::Timestamp);

        if let Some(meta) = metadata {
            if let Some(ts_formats) = meta.timestamp_formats {
                assert!(ts_formats.unix_timestamp.is_some());
            }
        }
    }
}
```

### ISO 8601 格式测试

```rust
#[test]
fn test_iso8601_detection() {
    let valid_iso_dates = vec![
        "2023-12-25T10:30:00Z",
        "2023-12-25T10:30:00+08:00",
        "2023-12-25T10:30:00.123Z",
        "2021-01-01T00:00:00-05:00",
    ];

    for date in valid_iso_dates {
        let (sub_type, metadata) = ContentDetector::detect(date);
        assert_eq!(sub_type, ContentSubType::Timestamp);

        if let Some(meta) = metadata {
            if let Some(ts_formats) = meta.timestamp_formats {
                assert!(ts_formats.iso_8601.is_some());
            }
        }
    }
}
```

### 标准日期格式测试

```rust
#[test]
fn test_date_format_detection() {
    let valid_dates = vec![
        "2023-12-25",        // ISO 格式
        "12/25/2023",        // 美式格式
        "25-12-2023",        // 欧式格式
        "1/1/2024",          // 简化格式
    ];

    for date in valid_dates {
        let (sub_type, metadata) = ContentDetector::detect(date);
        assert_eq!(sub_type, ContentSubType::Timestamp);

        if let Some(meta) = metadata {
            if let Some(ts_formats) = meta.timestamp_formats {
                assert!(ts_formats.formatted_date.is_some());
            }
        }
    }
}
```

### 无效时间戳测试

```rust
#[test]
fn test_invalid_timestamps() {
    let invalid_timestamps = vec![
        "123",              // 过短
        "-1609459200",      // 负数
        "946684799",        // 小于边界
        "4102444801",       // 大于边界
        "2023-13-25",       // 无效月份
        "2023-12-32",       // 无效日期
        "25:30:00",         // 无效时间
    ];

    for timestamp in invalid_timestamps {
        let (sub_type, _) = ContentDetector::detect(timestamp);
        assert_ne!(sub_type, ContentSubType::Timestamp);
    }
}
```

## 使用场景

时间戳检测主要用于：

1. **日志分析**: 识别日志文件中的时间戳信息
2. **数据导入**: 处理包含时间信息的数据文件
3. **时间转换**: 在不同时间格式之间进行转换
4. **事件追踪**: 识别和标记事件发生时间
5. **定时任务**: 解析计划任务的时间设置

## 时间处理

基于识别的时间戳，可以进行各种时间操作：

### 时间格式转换

```rust
use chrono::{DateTime, Utc, NaiveDateTime, TimeZone};

fn convert_unix_to_iso(unix_timestamp: i64) -> Option<String> {
    let naive = NaiveDateTime::from_timestamp(unix_timestamp, 0)?;
    let datetime: DateTime<Utc> = DateTime::from_utc(naive, Utc);
    Some(datetime.format("%Y-%m-%dT%H:%M:%SZ").to_string())
}

// 使用示例
let iso_string = convert_unix_to_iso(1609459200);
// 结果: "2021-01-01T00:00:00Z"
```

### 人类可读格式

```rust
fn format_human_readable(unix_timestamp: i64) -> Option<String> {
    let naive = NaiveDateTime::from_timestamp(unix_timestamp, 0)?;
    let datetime: DateTime<Utc> = DateTime::from_utc(naive, Utc);
    Some(datetime.format("%B %d, %Y at %H:%M:%S UTC").to_string())
}

// 使用示例
let human_format = format_human_readable(1609459200);
// 结果: "January 1, 2021 at 00:00:00 UTC"
```

### 时间比较和计算

```rust
fn time_difference(timestamp1: i64, timestamp2: i64) -> i64 {
    (timestamp1 - timestamp2).abs()
}

fn is_recent(timestamp: i64, threshold_hours: i64) -> bool {
    let now = Utc::now().timestamp();
    let diff = now - timestamp;
    diff <= threshold_hours * 3600
}
```

## 注意事项

1. **时间范围**: Unix 时间戳限制在合理的历史和未来范围内
2. **时区处理**: ISO 8601 格式包含时区信息，需要正确解析
3. **格式歧义**: 日期格式可能存在歧义（如 MM/DD/YYYY vs DD/MM/YYYY）
4. **闰年处理**: 需要考虑闰年对日期有效性的影响
5. **精度问题**: 毫秒级时间戳需要特殊处理

## 与其他类型的区别

1. **与数字的区别**: 时间戳是特定范围内的数字，有时间语义
2. **检测优先级**: 时间戳检测优先级中等，低于 URL 等特定格式
3. **结构化输出**: 提供多种时间格式的结构化元数据

## 性能特点

- **检测速度**: 中等（需要多种格式验证和转换）
- **内存使用**: 中等（存储多种格式的时间信息）
- **验证准确性**: 高（严格的数值和格式验证）
- **转换能力**: 强（支持多种时间格式互转）
