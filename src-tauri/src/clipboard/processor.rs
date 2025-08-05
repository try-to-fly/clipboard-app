use anyhow::Result;
use image::ImageFormat;
use std::path::PathBuf;
use uuid::Uuid;

pub struct ContentProcessor {
    imgs_dir: PathBuf,
}

impl ContentProcessor {
    pub fn new() -> Result<Self> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("无法获取配置目录"))?;
        
        let imgs_dir = config_dir.join("clipboard-app").join("imgs");
        std::fs::create_dir_all(&imgs_dir)?;
        
        Ok(Self { imgs_dir })
    }

    pub async fn process_image(&self, image_data: &[u8]) -> Result<String> {
        // 生成唯一文件名
        let filename = format!("{}.png", Uuid::new_v4());
        let file_path = self.imgs_dir.join(&filename);
        
        // 尝试使用多种方式解析并保存图片
        let img = match image::load_from_memory(image_data) {
            Ok(img) => img,
            Err(_) => {
                // 如果无法自动检测格式，尝试指定格式
                let formats = [
                    ImageFormat::Png,
                    ImageFormat::Jpeg,
                    ImageFormat::Gif,
                    ImageFormat::Bmp,
                    ImageFormat::Tiff,
                    ImageFormat::WebP,
                ];
                
                let mut last_error = None;
                for format in formats.iter() {
                    match image::load_from_memory_with_format(image_data, *format) {
                        Ok(img) => return self.save_image(img, &file_path).await,
                        Err(e) => last_error = Some(e),
                    }
                }
                
                // 如果所有格式都失败，尝试将原始数据保存为PNG
                if image_data.len() > 0 {
                    // 检查是否是常见的图片格式标识符
                    if self.is_likely_image_data(image_data) {
                        return self.save_raw_image_data(image_data, &file_path).await;
                    }
                }
                
                return Err(anyhow::anyhow!(
                    "无法识别图片格式: {}", 
                    last_error.map(|e| e.to_string()).unwrap_or_else(|| "未知错误".to_string())
                ));
            }
        };
        
        self.save_image(img, &file_path).await
    }
    
    async fn save_image(&self, img: image::DynamicImage, file_path: &std::path::Path) -> Result<String> {
        img.save(file_path)?;
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("无法获取文件名"))?;
        Ok(format!("imgs/{}", filename))
    }
    
    async fn save_raw_image_data(&self, image_data: &[u8], file_path: &std::path::Path) -> Result<String> {
        // 将原始数据直接保存为文件
        std::fs::write(file_path, image_data)?;
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("无法获取文件名"))?;
        Ok(format!("imgs/{}", filename))
    }
    
    fn is_likely_image_data(&self, data: &[u8]) -> bool {
        if data.len() < 2 {
            return false;
        }
        
        // 检查PNG
        if data.len() >= 4 && data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            return true;
        }
        
        // 检查JPEG (多种变体)
        if data.len() >= 3 && data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            return true;
        }
        
        // 检查GIF
        if data.len() >= 4 && data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
            return true;
        }
        
        // 检查BMP
        if data.len() >= 2 && data.starts_with(&[0x42, 0x4D]) {
            return true;
        }
        
        // 检查TIFF
        if data.len() >= 4 && (
            data.starts_with(&[0x49, 0x49, 0x2A, 0x00]) || // little-endian
            data.starts_with(&[0x4D, 0x4D, 0x00, 0x2A])    // big-endian
        ) {
            return true;
        }
        
        // 检查WebP (RIFF container)
        if data.len() >= 4 && data.starts_with(&[0x52, 0x49, 0x46, 0x46]) {
            return true;
        }
        
        false
    }

    pub fn get_image_full_path(&self, relative_path: &str) -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("无法获取配置目录"))?;
        Ok(config_dir.join("clipboard-app").join(relative_path))
    }

    pub async fn process_text(&self, text: &str) -> Result<String> {
        // 文本内容直接返回，可以在这里添加额外的处理逻辑
        Ok(text.to_string())
    }

    pub async fn process_file_paths(&self, paths: Vec<String>) -> Result<Vec<String>> {
        // 验证文件路径是否存在
        let mut valid_paths = Vec::new();
        
        for path in paths {
            let path_buf = PathBuf::from(&path);
            if path_buf.exists() {
                valid_paths.push(path);
            }
        }
        
        Ok(valid_paths)
    }
}