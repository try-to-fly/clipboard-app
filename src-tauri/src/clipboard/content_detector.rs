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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentMetadata {
    pub detected_language: Option<String>,
    pub url_parts: Option<UrlParts>,
    pub color_formats: Option<ColorFormats>,
    pub timestamp_formats: Option<TimestampFormats>,
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
            };
            return (ContentSubType::Timestamp, Some(metadata));
        }

        // Markdown检测
        if Self::is_markdown(trimmed) {
            log::debug!("[ContentDetector] 检测到Markdown类型");
            return (ContentSubType::Markdown, None);
        }

        // 代码检测
        if let Some(language) = Self::detect_code_language(trimmed) {
            log::debug!("[ContentDetector] 检测到代码类型，语言: {}", language);
            let metadata = ContentMetadata {
                detected_language: Some(language),
                url_parts: None,
                color_formats: None,
                timestamp_formats: None,
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
}
