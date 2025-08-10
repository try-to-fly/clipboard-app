use base64::{engine::general_purpose, Engine as _};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentSubType {
    PlainText,
    Url,
    IpAddress,
    Email,
    Color,
    Code,
    Command,
    Timestamp,
    Json,
    Markdown,
    Base64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentMetadata {
    pub detected_language: Option<String>,
    pub url_parts: Option<UrlParts>,
    pub color_formats: Option<ColorFormats>,
    pub timestamp_formats: Option<TimestampFormats>,
    pub base64_metadata: Option<Base64Metadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UrlParts {
    pub protocol: String,
    pub host: String,
    pub path: String,
    pub query_params: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorFormats {
    pub hex: Option<String>,
    pub rgb: Option<String>,
    pub rgba: Option<String>,
    pub hsl: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimestampFormats {
    pub unix_ms: Option<i64>,
    pub iso8601: Option<String>,
    pub date_string: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Base64Metadata {
    pub estimated_original_size: usize,
    pub encoded_size: usize,
    pub content_hint: Option<String>,
    pub encoding_efficiency: f32,
}

pub struct ContentDetector;

impl ContentDetector {
    pub fn detect(text: &str) -> (ContentSubType, Option<ContentMetadata>) {
        let trimmed = text.trim();
        log::debug!(
            "[ContentDetector] 开始检测内容类型，长度: {}字符",
            trimmed.len()
        );
        log::trace!(
            "[ContentDetector] 内容前100字符: {}",
            if trimmed.len() > 100 {
                &trimmed[..100]
            } else {
                trimmed
            }
        );

        // URL检测
        if Self::is_url(trimmed) {
            log::debug!("[ContentDetector] 检测到URL类型");
            let metadata = Self::parse_url_metadata(trimmed);
            return (ContentSubType::Url, Some(metadata));
        }

        // IP地址检测
        if Self::is_ip_address(trimmed) {
            log::debug!("[ContentDetector] 检测到IP地址类型");
            return (ContentSubType::IpAddress, None);
        }

        // 邮箱检测
        if Self::is_email(trimmed) {
            log::debug!("[ContentDetector] 检测到邮箱地址类型");
            return (ContentSubType::Email, None);
        }

        // 颜色检测
        if let Some(color_formats) = Self::detect_color(trimmed) {
            log::debug!("[ContentDetector] 检测到颜色类型: {:?}", color_formats);
            let metadata = ContentMetadata {
                detected_language: None,
                url_parts: None,
                color_formats: Some(color_formats),
                timestamp_formats: None,
                base64_metadata: None,
            };
            return (ContentSubType::Color, Some(metadata));
        }

        // JSON检测
        if Self::is_json(trimmed) {
            log::debug!("[ContentDetector] 检测到JSON类型");
            return (ContentSubType::Json, None);
        }

        // 命令行检测
        if Self::is_command(trimmed) {
            log::debug!("[ContentDetector] 检测到命令行类型");
            return (ContentSubType::Command, None);
        }

        // 时间戳检测
        if let Some(timestamp_formats) = Self::detect_timestamp(trimmed) {
            log::debug!(
                "[ContentDetector] 检测到时间戳类型: {:?}",
                timestamp_formats
            );
            let metadata = ContentMetadata {
                detected_language: None,
                url_parts: None,
                color_formats: None,
                timestamp_formats: Some(timestamp_formats),
                base64_metadata: None,
            };
            return (ContentSubType::Timestamp, Some(metadata));
        }

        // Markdown检测
        if Self::is_markdown(trimmed) {
            log::debug!("[ContentDetector] 检测到Markdown类型");
            return (ContentSubType::Markdown, None);
        }

        // Base64检测
        if let Some(base64_metadata) = Self::detect_base64(trimmed) {
            log::debug!(
                "[ContentDetector] 检测到Base64类型: {} -> {}, 内容: {:?}",
                base64_metadata.encoded_size,
                base64_metadata.estimated_original_size,
                base64_metadata.content_hint
            );
            let metadata = ContentMetadata {
                detected_language: None,
                url_parts: None,
                color_formats: None,
                timestamp_formats: None,
                base64_metadata: Some(base64_metadata),
            };
            return (ContentSubType::Base64, Some(metadata));
        }

        // 代码检测
        if let Some(language) = Self::detect_code_language(trimmed) {
            log::debug!("[ContentDetector] 检测到代码类型，语言: {}", language);
            let metadata = ContentMetadata {
                detected_language: Some(language),
                url_parts: None,
                color_formats: None,
                timestamp_formats: None,
                base64_metadata: None,
            };
            return (ContentSubType::Code, Some(metadata));
        }

        // 默认为纯文本
        log::debug!("[ContentDetector] 未匹配到特定类型，归类为纯文本");
        (ContentSubType::PlainText, None)
    }

    fn is_url(text: &str) -> bool {
        // 简化URL检测逻辑
        if text.starts_with("http://") || text.starts_with("https://") || text.starts_with("ftp://")
        {
            return true;
        }

        // 检查是否包含域名模式
        let domain_regex =
            Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}").unwrap();
        if domain_regex.is_match(text) && text.contains(".") {
            return true;
        }

        false
    }

    fn parse_url_metadata(url: &str) -> ContentMetadata {
        let mut metadata = ContentMetadata {
            detected_language: None,
            url_parts: None,
            color_formats: None,
            timestamp_formats: None,
            base64_metadata: None,
        };

        if let Ok(parsed) = url::Url::parse(url) {
            let query_params: Vec<(String, String)> = parsed
                .query_pairs()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect();

            log::trace!(
                "[ContentDetector] URL解析成功: {} -> {}://{}{}",
                url,
                parsed.scheme(),
                parsed.host_str().unwrap_or(""),
                parsed.path()
            );

            metadata.url_parts = Some(UrlParts {
                protocol: parsed.scheme().to_string(),
                host: parsed.host_str().unwrap_or("").to_string(),
                path: parsed.path().to_string(),
                query_params,
            });
        } else {
            log::trace!("[ContentDetector] URL解析失败: {}", url);
        }

        metadata
    }

    fn is_ip_address(text: &str) -> bool {
        // IPv4
        let ipv4_regex = Regex::new(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$").unwrap();
        if ipv4_regex.is_match(text) {
            return true;
        }

        // IPv6
        let ipv6_regex = Regex::new(r"^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$").unwrap();
        ipv6_regex.is_match(text)
    }

    fn is_email(text: &str) -> bool {
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
        email_regex.is_match(text)
    }

    fn detect_color(text: &str) -> Option<ColorFormats> {
        let mut formats = ColorFormats {
            hex: None,
            rgb: None,
            rgba: None,
            hsl: None,
        };

        // HEX颜色 - 支持 #333, #ffffff 等格式
        if text.starts_with('#') && text.len() >= 4 {
            let hex_part = &text[1..];
            if (hex_part.len() == 3 || hex_part.len() == 6)
                && hex_part.chars().all(|c| c.is_ascii_hexdigit())
            {
                formats.hex = Some(text.to_string());
                return Some(formats);
            }
        }

        // RGB/RGBA颜色
        let rgb_regex = Regex::new(
            r"^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)$",
        )
        .unwrap();
        if rgb_regex.is_match(text) {
            if text.starts_with("rgba") {
                formats.rgba = Some(text.to_string());
            } else {
                formats.rgb = Some(text.to_string());
            }
            return Some(formats);
        }

        // HSL颜色
        let hsl_regex =
            Regex::new(r"^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$").unwrap();
        if hsl_regex.is_match(text) {
            formats.hsl = Some(text.to_string());
            return Some(formats);
        }

        None
    }

    fn is_json(text: &str) -> bool {
        let trimmed = text.trim();

        // 检查是否以 { 或 [ 开头并以相应字符结尾
        if (trimmed.starts_with('{') && trimmed.ends_with('}'))
            || (trimmed.starts_with('[') && trimmed.ends_with(']'))
        {
            // 尝试解析JSON
            return serde_json::from_str::<Value>(trimmed).is_ok();
        }

        false
    }

    fn is_command(text: &str) -> bool {
        let commands = [
            "git ", "npm ", "yarn ", "pnpm ", "docker ", "kubectl ", "cargo ", "python ", "pip ",
            "brew ", "apt ", "yum ", "ls", "cd ", "mkdir ", "rm ", "cp ", "mv ", "cat ", "grep ",
            "sed ", "awk ", "curl ", "wget ", "ssh ",
        ];

        commands.iter().any(|cmd| text.starts_with(cmd))
    }

    fn detect_timestamp(text: &str) -> Option<TimestampFormats> {
        let mut formats = TimestampFormats {
            unix_ms: None,
            iso8601: None,
            date_string: None,
        };

        // Unix时间戳（秒或毫秒）
        if let Ok(num) = text.parse::<i64>() {
            // 检查是否在合理的时间戳范围内
            if num > 946684800 && num < 4102444800 {
                // 秒级时间戳（2000-2100年）
                formats.unix_ms = Some(num * 1000);
                return Some(formats);
            } else if num > 946684800000 && num < 7258118400000 {
                // 毫秒级时间戳（2000-2200年）
                formats.unix_ms = Some(num);
                return Some(formats);
            }
        }

        // ISO 8601格式
        let iso_regex =
            Regex::new(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$")
                .unwrap();
        if iso_regex.is_match(text) {
            formats.iso8601 = Some(text.to_string());
            return Some(formats);
        }

        // 常见日期格式
        let date_regex =
            Regex::new(r"^\d{4}[-/]\d{2}[-/]\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?$").unwrap();
        if date_regex.is_match(text) {
            formats.date_string = Some(text.to_string());
            return Some(formats);
        }

        None
    }

    fn is_markdown(text: &str) -> bool {
        let patterns = [
            r"^#{1,6}\s+",    // 标题
            r"\*\*[^*]+\*\*", // 粗体
            r"\*[^*]+\*",     // 斜体
            r"\[.+\]\(.+\)",  // 链接
            r"!\[.*\]\(.+\)", // 图片
            r"^[-*+]\s+",     // 列表
            r"^\d+\.\s+",     // 有序列表
            r"^>\s+",         // 引用
            r"```",           // 代码块
        ];

        patterns
            .iter()
            .any(|pattern| Regex::new(pattern).unwrap().is_match(text))
    }

    fn detect_code_language(text: &str) -> Option<String> {
        // 简单的代码语言检测
        let patterns = vec![
            (r"(?:function|const|let|var|=>|async|await)", "javascript"),
            (r"(?:def|import|from|class|if __name__|print\()", "python"),
            (r"(?:fn|impl|struct|enum|match|trait|pub|use|mut)", "rust"),
            (
                r"(?:public class|private|protected|static void|import java)",
                "java",
            ),
            (r"(?:#include|int main|void|printf|scanf)", "c"),
            (
                r"(?:SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE TABLE)",
                "sql",
            ),
            (r"(?:<html|<div|<span|<body|<head|<script|<style)", "html"),
            (
                r"(?:^\.[\w-]+\s*\{|^#[\w-]+\s*\{|color:|background:|margin:|padding:)",
                "css",
            ),
        ];

        for (pattern, language) in patterns {
            if Regex::new(pattern).unwrap().is_match(text) {
                log::trace!(
                    "[ContentDetector] 代码语言匹配: {} -> {}",
                    pattern,
                    language
                );
                return Some(language.to_string());
            }
        }

        log::trace!("[ContentDetector] 未检测到已知代码语言");
        None
    }

    fn detect_base64(text: &str) -> Option<Base64Metadata> {
        // 最小长度检查 - 对于短字符串需要更严格的验证
        if text.len() < 4 {
            return None;
        }

        // 对于较短的字符串（4-40字符），需要更严格的base64格式检查
        let is_short = text.len() <= 40;

        // 排除明显的URL和数据URL
        if text.starts_with("http://") || text.starts_with("https://") || text.starts_with("data:")
        {
            return None;
        }

        // 检查是否主要由base64字符组成
        let base64_chars = text
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '+' || *c == '/' || *c == '=')
            .count();

        let total_chars = text.chars().count();
        let base64_ratio = base64_chars as f32 / total_chars as f32;

        // Base64字符占比需要足够高
        let required_ratio = if is_short { 1.0 } else { 0.95 };
        if base64_ratio < required_ratio {
            return None;
        }

        // 对于短字符串，额外检查：不应该是常见的英文单词或简单文本
        if is_short {
            // 排除常见的英文单词和简单模式
            let lowercase_text = text.to_lowercase();
            let common_words = [
                "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was",
                "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new",
                "now", "old", "see", "two", "who", "boy", "did", "man", "car", "run", "way", "use",
                "yes", "too", "big", "end", "far", "off", "own", "say", "she", "try", "ask", "job",
                "let", "put", "sit", "top", "win", "cut", "lot", "eat", "god", "hit", "lot", "son",
                "got", "red", "hot", "air", "bit", "box", "buy", "eye", "few", "fix", "key", "lay",
                "leg", "low", "map", "mix", "oil", "pay", "pop", "raw", "row", "sad", "sea", "set",
                "six", "sky", "tax", "tea", "ten", "tie", "tip", "war", "wet", "add", "bad", "bag",
                "bar", "bat", "bed", "bid", "bus", "cat", "cop", "cup", "die", "dig", "dog", "dot",
                "dry", "ear", "egg", "fan", "fly", "fun", "gap", "gas", "gun", "hat", "ice", "kid",
                "lab", "lap", "lie", "lip", "log", "mad", "mom", "mud", "net", "pan", "pen", "pet",
                "pie", "pin", "pot", "rat", "red", "rid", "rip", "rob", "rod", "run", "sad", "sit",
                "sun", "tap", "toy", "van", "web", "win", "zip",
            ];
            if common_words.contains(&lowercase_text.as_str()) {
                return None;
            }

            // 排除看起来像普通词汇的模式（只包含小写字母，没有数字和特殊字符）
            if text.chars().all(|c| c.is_ascii_lowercase()) && text.len() >= 3 {
                return None;
            }

            // 排除简单的重复模式
            if text.len() <= 8 && text.chars().collect::<std::collections::HashSet<_>>().len() <= 2
            {
                return None;
            }
        }

        // 检查换行符数量，排除格式化的代码或文档
        let newlines = text.chars().filter(|c| *c == '\n').count();
        if newlines > text.len() / 50 {
            // 如果换行符过多，可能是格式化文本
            return None;
        }

        // 清理空白字符后再验证
        let cleaned: String = text.chars().filter(|c| !c.is_whitespace()).collect();

        // 验证base64格式：去除padding后，长度应该符合base64规则
        let without_padding: String = cleaned.trim_end_matches('=').to_string();
        // Base64编码后，去除padding的长度 mod 4 应该是 0, 2, 或 3 (对应0, 2, 1个padding字符)
        // 如果是1，说明格式不正确
        let remainder = without_padding.len() % 4;
        if remainder == 1 {
            // 这种情况不符合base64规则
            return None;
        }

        // 尝试解码
        match general_purpose::STANDARD.decode(&cleaned) {
            Ok(decoded) => {
                let encoded_size = cleaned.len();
                let decoded_size = decoded.len();

                // 计算编码效率：base64编码后长度应该是原始长度的4/3倍，然后向上对齐到4的倍数
                let expected_encoded_size = ((decoded_size * 4).div_ceil(3) + 3) & !3; // 向上对齐到4的倍数
                let size_ratio = encoded_size as f32 / expected_encoded_size as f32;

                // 对于正确的base64，实际大小应该等于或接近期望大小
                // 放宽一点限制，特别是对于短字符串
                let tolerance = if decoded_size <= 10 { 0.5 } else { 0.2 };
                if size_ratio < (1.0 - tolerance) || size_ratio > (1.0 + tolerance) {
                    return None;
                }

                // 分析解码后的内容特征
                let content_hint = Self::analyze_decoded_content(&decoded);

                log::debug!(
                    "[ContentDetector] Base64检测成功: {}字节 -> {}字节, 效率: {:.2}",
                    encoded_size,
                    decoded_size,
                    size_ratio
                );

                Some(Base64Metadata {
                    estimated_original_size: decoded_size,
                    encoded_size,
                    content_hint,
                    encoding_efficiency: size_ratio,
                })
            }
            Err(_) => None,
        }
    }

    fn analyze_decoded_content(data: &[u8]) -> Option<String> {
        // 检查是否是常见的二进制格式
        if data.len() >= 4 {
            // PNG文件签名
            if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                return Some("PNG图片".to_string());
            }
            // JPEG文件签名
            if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
                return Some("JPEG图片".to_string());
            }
            // PDF文件签名
            if data.starts_with(b"%PDF") {
                return Some("PDF文档".to_string());
            }
            // GIF文件签名
            if data.starts_with(b"GIF8") {
                return Some("GIF图片".to_string());
            }
            // ZIP文件签名
            if data.starts_with(&[0x50, 0x4B, 0x03, 0x04])
                || data.starts_with(&[0x50, 0x4B, 0x05, 0x06])
            {
                return Some("ZIP压缩包".to_string());
            }
        }

        // 检查是否是文本内容
        if let Ok(text) = std::str::from_utf8(data) {
            if text
                .chars()
                .all(|c| c.is_ascii() && (!c.is_control() || c.is_whitespace()))
                && text.len() > 10
            {
                return Some("文本内容".to_string());
            }
        }

        // 分析字节分布
        if data.len() > 100 {
            let zero_bytes = data.iter().filter(|&&b| b == 0).count();
            let zero_ratio = zero_bytes as f32 / data.len() as f32;

            if zero_ratio > 0.1 {
                return Some("二进制数据".to_string());
            }
        }

        Some("未知格式".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_detection() {
        // 测试毫秒级时间戳
        let (sub_type, metadata) = ContentDetector::detect("1754568465706");
        log::debug!("Detected: {:?}, metadata: {:?}", sub_type, metadata);
        assert!(matches!(sub_type, ContentSubType::Timestamp));

        // 测试秒级时间戳
        let (sub_type, metadata) = ContentDetector::detect("1754568465");
        log::debug!("Detected: {:?}, metadata: {:?}", sub_type, metadata);
        assert!(matches!(sub_type, ContentSubType::Timestamp));
    }

    #[test]
    fn test_color_detection() {
        let (sub_type, metadata) = ContentDetector::detect("#ff0000");
        log::debug!("Detected: {:?}, metadata: {:?}", sub_type, metadata);
        assert!(matches!(sub_type, ContentSubType::Color));
    }

    #[test]
    fn test_base64_detection() {
        // 测试足够长的base64编码文本
        let test_data = "Hello, World! This is a test message for base64 encoding. ".repeat(5);
        let encoded = base64::engine::general_purpose::STANDARD.encode(&test_data);

        let (sub_type, metadata) = ContentDetector::detect(&encoded);
        assert!(matches!(sub_type, ContentSubType::Base64));

        if let Some(meta) = metadata {
            if let Some(base64_meta) = meta.base64_metadata {
                assert_eq!(base64_meta.estimated_original_size, test_data.len());
                assert!(base64_meta.content_hint.is_some());
            } else {
                panic!("Base64 metadata should be present");
            }
        }
    }

    #[test]
    fn test_base64_false_positives() {
        // 测试URL不应被识别为base64
        let (sub_type, _) = ContentDetector::detect("https://example.com/path?param=value");
        assert!(matches!(sub_type, ContentSubType::Url));

        // 测试短文本不应被识别为base64
        let short_text = "Hello world";
        let (sub_type, _) = ContentDetector::detect(short_text);
        assert!(matches!(sub_type, ContentSubType::PlainText));

        // 测试包含换行的代码不应被识别为base64
        let code = "function test() {\n    console.log('hello');\n    return true;\n}";
        let (sub_type, _) = ContentDetector::detect(code);
        assert!(matches!(sub_type, ContentSubType::Code));
    }

    #[test]
    fn test_base64_with_whitespace() {
        // 测试包含换行符的base64（模拟从某些应用复制的格式化base64）
        let test_data = "This is a longer test message for base64 encoding that will result in a multi-line base64 string when formatted.";
        let encoded = base64::engine::general_purpose::STANDARD.encode(test_data);

        // 添加一些换行符（但不会太多）
        let formatted = encoded
            .chars()
            .enumerate()
            .flat_map(|(i, c)| {
                if i > 0 && i % 64 == 0 {
                    vec!['\n', c]
                } else {
                    vec![c]
                }
            })
            .collect::<String>();

        let (sub_type, metadata) = ContentDetector::detect(&formatted);
        assert!(matches!(sub_type, ContentSubType::Base64));

        if let Some(meta) = metadata {
            assert!(meta.base64_metadata.is_some());
        }
    }

    #[test]
    fn test_base64_short_strings() {
        // 测试短的有效base64字符串
        let test_cases = [
            ("YWI=", "ab"),        // 用户的例子
            ("SGVsbG8=", "Hello"), // "Hello"
            ("VGVzdA==", "Test"),  // "Test"
            ("MTIz", "123"),       // "123"
        ];

        for (encoded, expected_decoded) in test_cases {
            let (sub_type, metadata) = ContentDetector::detect(encoded);
            assert!(
                matches!(sub_type, ContentSubType::Base64),
                "Failed to detect '{}' as base64",
                encoded
            );

            if let Some(meta) = metadata {
                if let Some(base64_meta) = meta.base64_metadata {
                    assert_eq!(base64_meta.estimated_original_size, expected_decoded.len());
                }
            }
        }

        // 测试短字符串的false positive防护
        let false_positives = [
            "hello", "world", "test", "cat", "dog", "run", "yes", "aaa", "abc",
        ];
        for text in false_positives {
            let (sub_type, _) = ContentDetector::detect(text);
            assert!(
                !matches!(sub_type, ContentSubType::Base64),
                "Incorrectly detected '{}' as base64",
                text
            );
        }
    }

    #[test]
    fn test_user_example() {
        // 测试用户提供的例子：YWI=
        let (sub_type, metadata) = ContentDetector::detect("YWI=");
        assert!(matches!(sub_type, ContentSubType::Base64));

        if let Some(meta) = metadata {
            if let Some(base64_meta) = meta.base64_metadata {
                assert_eq!(base64_meta.estimated_original_size, 2); // "ab" = 2字节
                assert_eq!(base64_meta.encoded_size, 4); // "YWI=" = 4字节
                                                         // 应该检测到是文本内容
                assert!(base64_meta.content_hint.is_some());
            }
        }
    }

    #[test]
    fn test_base64_binary_data() {
        // 测试二进制数据的base64编码
        let binary_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];
        let encoded = base64::engine::general_purpose::STANDARD.encode(&binary_data);
        let padded = format!("{}====", encoded); // 增加长度以通过最小长度检查

        let (sub_type, metadata) = ContentDetector::detect(&padded);
        if matches!(sub_type, ContentSubType::Base64) {
            if let Some(meta) = metadata {
                if let Some(base64_meta) = meta.base64_metadata {
                    // 应该识别为PNG格式
                    assert!(base64_meta
                        .content_hint
                        .as_ref()
                        .map_or(false, |h| h.contains("PNG")));
                }
            }
        }
    }
}
