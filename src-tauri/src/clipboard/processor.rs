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
        println!("开始处理图片数据，大小: {} 字节", image_data.len());
        println!("数据前16字节: {:02X?}", &image_data[..image_data.len().min(16)]);
        
        // 首先检查是否是原始像素数据
        if let Some((width, height)) = self.detect_raw_rgba_data(image_data) {
            println!("检测到原始RGBA数据: {}x{}", width, height);
            return self.process_raw_rgba_data(image_data, width, height).await;
        }
        
        // 如果不是标准分辨率，但数据长度是4的倍数，可能仍然是RGBA数据
        if image_data.len() % 4 == 0 && image_data.len() >= 64 {
            println!("数据长度符合RGBA格式，尝试作为原始像素数据处理");
            // 使用简单的正方形或矩形推断
            let pixel_count = image_data.len() / 4;
            let sqrt_pixels = (pixel_count as f64).sqrt() as u32;
            
            // 尝试几种可能的尺寸
            let possible_dimensions = vec![
                (sqrt_pixels, pixel_count as u32 / sqrt_pixels),
                (pixel_count as u32 / sqrt_pixels, sqrt_pixels),
                (sqrt_pixels + 1, pixel_count as u32 / (sqrt_pixels + 1)),
                (pixel_count as u32 / (sqrt_pixels + 1), sqrt_pixels + 1),
            ];
            
            for (w, h) in possible_dimensions {
                if w > 0 && h > 0 && (w * h) as usize == pixel_count {
                    println!("尝试使用推断尺寸: {}x{}", w, h);
                    match self.process_raw_rgba_data(image_data, w, h).await {
                        Ok(result) => return Ok(result),
                        Err(e) => println!("尺寸 {}x{} 处理失败: {}", w, h, e),
                    }
                }
            }
        }
        
        // 使用 infer 库进行标准格式检测
        if let Some(mime_type) = infer::get(image_data) {
            if !mime_type.mime_type().starts_with("image/") {
                eprintln!("跳过非图片数据，检测到类型: {}, 数据前16字节: {:02X?}", 
                         mime_type.mime_type(), &image_data[..image_data.len().min(16)]);
                return Err(anyhow::anyhow!("数据不是图片格式: {}", mime_type.mime_type()));
            }
            
            println!("检测到图片格式: {}", mime_type.mime_type());
        } else {
            // 如果 infer 无法检测，再检查是否可能是图片数据
            if !self.is_likely_image_data(image_data) {
                eprintln!("跳过非图片数据，数据前16字节: {:02X?}", 
                         &image_data[..image_data.len().min(16)]);
                return Err(anyhow::anyhow!("无法识别的数据格式"));
            }
        }

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
                        Err(e) => {
                            println!("尝试格式 {:?} 失败: {}", format, e);
                            last_error = Some(e);
                        }
                    }
                }
                
                // 如果所有格式都失败，但确实是图片数据，保存原始数据
                eprintln!("警告: 检测到图片数据但所有解码尝试都失败，保存原始数据");
                return self.save_raw_image_data(image_data, &file_path).await;
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
    
    async fn process_raw_rgba_data(&self, rgba_data: &[u8], width: u32, height: u32) -> Result<String> {
        // 生成唯一文件名
        let filename = format!("{}.png", Uuid::new_v4());
        let file_path = self.imgs_dir.join(&filename);
        
        // 将RGBA数据转换为图像
        let img_buffer = image::ImageBuffer::from_raw(width, height, rgba_data.to_vec())
            .ok_or_else(|| anyhow::anyhow!("无法从原始RGBA数据创建图像缓冲区"))?;
        
        let dynamic_img = image::DynamicImage::ImageRgba8(img_buffer);
        
        // 保存为PNG
        dynamic_img.save(&file_path)?;
        
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("无法获取文件名"))?;
        
        println!("成功处理原始RGBA数据并保存为: {}", filename);
        Ok(format!("imgs/{}", filename))
    }

    async fn save_raw_image_data(&self, image_data: &[u8], file_path: &std::path::Path) -> Result<String> {
        // 尝试根据检测到的格式使用正确的扩展名
        let (extension, actual_path) = if let Some(mime_type) = infer::get(image_data) {
            let ext = match mime_type.mime_type() {
                "image/png" => "png",
                "image/jpeg" => "jpg", 
                "image/gif" => "gif",
                "image/webp" => "webp",
                "image/bmp" => "bmp",
                "image/tiff" => "tiff",
                _ => "bin", // 未知格式用 .bin
            };
            let new_path = file_path.with_extension(ext);
            (ext.to_string(), new_path)
        } else {
            ("bin".to_string(), file_path.to_path_buf())
        };

        // 将原始数据直接保存为文件
        std::fs::write(&actual_path, image_data)?;
        let filename = actual_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("无法获取文件名"))?;
        
        println!("保存原始图片数据: {} ({})", filename, extension);
        Ok(format!("imgs/{}", filename))
    }
    
    fn detect_raw_rgba_data(&self, data: &[u8]) -> Option<(u32, u32)> {
        // 基本检查：必须是4的倍数且有足够的数据
        if data.len() < 16 || data.len() % 4 != 0 {
            return None;
        }
        
        println!("检测RGBA数据: 总长度 {} 字节, {} 个像素", data.len(), data.len() / 4);
        
        // 简化检测逻辑：如果数据长度是4的倍数，就假设是RGBA数据
        // 现代截图工具通常提供的就是原始像素数据
        let pixel_count = data.len() / 4;
        
        // 推断尺寸的策略：
        // 1. 先尝试常见分辨率
        let common_dimensions = [
            // 常见截图尺寸
            (1920, 1080), (2560, 1440), (3840, 2160), // 常见显示器
            (1366, 768), (1280, 720), (1440, 900), (1680, 1050),
            (800, 600), (1024, 768), (640, 480),
            // 移动设备常见尺寸
            (375, 812), (414, 896), (390, 844), (428, 926),
            // 正方形或接近正方形
            (512, 512), (1024, 1024), (256, 256), (128, 128),
        ];
        
        for &(w, h) in &common_dimensions {
            if (w * h) as usize == pixel_count {
                println!("匹配到常见分辨率: {}x{}", w, h);
                return Some((w, h));
            }
        }
        
        // 2. 尝试找到合理的因数分解
        let sqrt_pixels = (pixel_count as f64).sqrt();
        let sqrt_int = sqrt_pixels as u32;
        
        // 检查是否是完全平方数
        if (sqrt_int * sqrt_int) as usize == pixel_count {
            println!("检测到正方形图像: {}x{}", sqrt_int, sqrt_int);
            return Some((sqrt_int, sqrt_int));
        }
        
        // 3. 尝试常见宽高比，从sqrt附近开始搜索
        let search_range = 50; // 搜索范围
        for width in (sqrt_int.saturating_sub(search_range))..=(sqrt_int + search_range) {
            if width == 0 {
                continue;
            }
            if pixel_count % (width as usize) == 0 {
                let height = (pixel_count / width as usize) as u32;
                let ratio = width as f64 / height as f64;
                
                // 检查是否是合理的宽高比 (0.25 到 4.0)
                if ratio >= 0.25 && ratio <= 4.0 {
                    println!("找到合理尺寸: {}x{} (比例: {:.2})", width, height, ratio);
                    return Some((width, height));
                }
            }
        }
        
        // 4. 最后尝试：如果以上都失败，使用简单的因数分解
        for width in 1..=(pixel_count as f64).sqrt() as u32 + 1 {
            if pixel_count % (width as usize) == 0 {
                let height = (pixel_count / width as usize) as u32;
                println!("使用因数分解得到尺寸: {}x{}", width, height);
                return Some((width, height));
            }
        }
        
        println!("无法推断图像尺寸，像素数: {}", pixel_count);
        None
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
        
        // 检查WebP (RIFF container + WEBP signature)
        if data.len() >= 12 && data.starts_with(&[0x52, 0x49, 0x46, 0x46]) {
            // 检查是否是WebP格式: "WEBP" signature at bytes 8-11
            if &data[8..12] == b"WEBP" {
                return true;
            }
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