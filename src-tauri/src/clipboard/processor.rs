use anyhow::Result;
use image::{ImageFormat, ImageOutputFormat};
use std::path::PathBuf;
use uuid::Uuid;
use std::io::Cursor;

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
        
        // 尝试解析并保存图片
        let img = image::load_from_memory(image_data)?;
        img.save(&file_path)?;
        
        // 返回相对路径
        Ok(format!("imgs/{}", filename))
    }

    pub fn get_image_full_path(&self, relative_path: &str) -> PathBuf {
        let config_dir = dirs::config_dir().unwrap();
        config_dir.join("clipboard-app").join(relative_path)
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