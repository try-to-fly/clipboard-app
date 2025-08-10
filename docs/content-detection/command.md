# 命令行指令检测 (Command)

## 概述

命令行指令检测能够识别常见的命令行指令和脚本命令，支持各种操作系统的命令格式。

- **内容子类型**: `Command`
- **检测优先级**: 中等（第九优先级）
- **返回元数据**: 无

## 检测逻辑

命令检测使用关键词匹配的方式，识别以常见命令开头的文本：

```rust
fn is_command(text: &str) -> bool {
    let command_patterns = [
        // Unix/Linux 命令
        r"\bls\b", r"\bcd\b", r"\bpwd\b", r"\bmv\b", r"\bcp\b", r"\brm\b",
        r"\bmkdir\b", r"\brmdir\b", r"\bchmod\b", r"\bchown\b", r"\bgrep\b",
        r"\bfind\b", r"\bcat\b", r"\btail\b", r"\bhead\b", r"\bless\b",
        r"\bmore\b", r"\bsort\b", r"\buniq\b", r"\bwc\b", r"\bawk\b",
        r"\bsed\b", r"\bcut\b", r"\bps\b", r"\btop\b", r"\bkill\b",
        r"\bssh\b", r"\bscp\b", r"\brsync\b", r"\btar\b", r"\bgzip\b",
        r"\bcurl\b", r"\bwget\b", r"\bgit\b", r"\bdocker\b", r"\bkubectl\b",

        // Windows 命令
        r"\bdir\b", r"\bcopy\b", r"\bmove\b", r"\bdel\b", r"\brd\b",
        r"\bmd\b", r"\battrib\b", r"\btype\b", r"\bmore\b",

        // 编程相关命令
        r"\bnpm\b", r"\byarn\b", r"\bpip\b", r"\bcargo\b", r"\bmake\b",
        r"\bmaven\b", r"\bgradle\b", r"\bnode\b", r"\bpython\b",
        r"\brushto\b", r"\bgo\b", r"\bjavac\b", r"\bjava\b",
    ];

    for pattern in command_patterns.iter() {
        if Regex::new(pattern).unwrap().is_match(text) {
            return true;
        }
    }
    false
}
```

### 检测特点

1. **边界匹配**: 使用词边界 `\b` 确保命令的完整性
2. **多平台支持**: 包含 Unix/Linux、Windows 和跨平台命令
3. **开发工具**: 包含常见的开发和构建工具命令
4. **前缀匹配**: 检查文本是否以命令关键词开头

## 能识别的内容

### ✅ 有效示例

基于测试用例，以下命令格式会被正确识别：

#### Unix/Linux 系统命令

```bash
ls -la /home/user
cd /var/log
pwd
mv old_file.txt new_file.txt
cp source.txt destination.txt
rm unwanted_file.txt
mkdir new_directory
chmod 755 script.sh
grep "error" logfile.txt
find / -name "*.log"
cat /etc/passwd
tail -f /var/log/syslog
ps aux | grep nginx
ssh user@remote-server.com
```

#### 文件操作命令

```bash
tar -xzf archive.tar.gz
gzip large_file.txt
rsync -av source/ destination/
scp file.txt user@server:/path/
curl -X GET https://api.example.com
wget https://example.com/file.zip
```

#### 开发工具命令

```bash
git clone https://github.com/user/repo.git
git commit -m "Update documentation"
git push origin main
npm install express
npm run build
yarn add react
pip install requests
pip install -r requirements.txt
cargo build --release
cargo test
make clean
make install
node app.js
python script.py
java -jar application.jar
```

#### 容器和部署命令

```bash
docker build -t myapp:latest .
docker run -p 8080:80 nginx
docker ps -a
kubectl get pods
kubectl apply -f deployment.yaml
kubectl logs -f pod-name
```

#### Windows 命令

```cmd
dir C:\Users
copy file.txt backup.txt
move old.txt new_location\
del temporary.txt
md new_folder
type readme.txt
attrib +h secret.txt
```

### ❌ 无效示例

以下格式不会被识别为命令：

```text
This is a list of items          # 包含 "ls" 但不是命令
I can do it                      # 包含 "cd" 但不是命令
Let's copy this text            # 包含 "cp" 但不是命令
Remove this sentence            # 包含 "rm" 但不是命令
```

## 解析出的内容

命令检测不提供额外的元数据解析，返回的元数据为空：

```rust
ContentMetadata {
    detected_language: None,
    url_parts: None,
    color_formats: None,
    timestamp_formats: None,
    base64_metadata: None,
}
```

命令的结构相对简单，应用可以根据需要自行解析命令名、参数和选项。

## 测试用例

### 基础命令测试

```rust
#[test]
fn test_command_detection() {
    let valid_commands = vec![
        "ls -la",
        "cd /home/user",
        "git clone https://github.com/user/repo.git",
        "npm install",
        "docker run nginx",
        "python script.py",
        "curl -X GET https://api.example.com",
        "grep 'error' logfile.txt",
        "chmod 755 script.sh",
        "ssh user@server.com",
    ];

    for command in valid_commands {
        let (sub_type, _) = ContentDetector::detect(command);
        assert_eq!(sub_type, ContentSubType::Command);
    }
}
```

### 复合命令测试

```rust
#[test]
fn test_complex_commands() {
    let complex_commands = vec![
        "find /var/log -name '*.log' -exec grep 'ERROR' {} \\;",
        "ps aux | grep nginx | awk '{print $2}'",
        "tar -czf backup.tar.gz /home/user/documents",
        "git log --oneline --graph --all",
        "docker run -d -p 8080:80 --name web nginx:latest",
        "kubectl get pods -n production -o wide",
    ];

    for command in complex_commands {
        let (sub_type, _) = ContentDetector::detect(command);
        assert_eq!(sub_type, ContentSubType::Command);
    }
}
```

### Windows 命令测试

```rust
#[test]
fn test_windows_commands() {
    let windows_commands = vec![
        "dir C:\\Users",
        "copy file.txt backup.txt",
        "move old.txt new_location\\",
        "del temp.txt",
        "md new_folder",
        "type readme.txt",
    ];

    for command in windows_commands {
        let (sub_type, _) = ContentDetector::detect(command);
        assert_eq!(sub_type, ContentSubType::Command);
    }
}
```

### 非命令文本测试

```rust
#[test]
fn test_non_commands() {
    let non_commands = vec![
        "This is a list of items",        // 包含 "ls" 但不是命令
        "I can do it",                    // 包含 "cd" 但不是命令
        "Let's copy this text",           // 包含 "cp" 但不是命令
        "Remove this sentence",           // 包含 "rm" 但不是命令
        "Hello world",                    // 普通文本
    ];

    for text in non_commands {
        let (sub_type, _) = ContentDetector::detect(text);
        assert_ne!(sub_type, ContentSubType::Command);
    }
}
```

## 使用场景

命令检测主要用于：

1. **终端历史**: 识别和保存终端命令历史记录
2. **脚本识别**: 自动识别 shell 脚本内容
3. **执行快捷键**: 为命令提供一键执行功能
4. **语法高亮**: 为命令行内容提供语法高亮显示
5. **教程文档**: 识别教程中的命令示例

## 命令解析

虽然不提供结构化元数据，但可以手动解析命令的组成部分：

### 解析示例

```rust
fn parse_command(command_text: &str) -> Option<(String, Vec<String>)> {
    let parts: Vec<&str> = command_text.split_whitespace().collect();
    if parts.is_empty() {
        return None;
    }

    let command = parts[0].to_string();
    let args = parts[1..].iter().map(|s| s.to_string()).collect();

    Some((command, args))
}

// 使用示例
let (cmd, args) = parse_command("git commit -m 'Initial commit'").unwrap();
// cmd: "git"
// args: ["commit", "-m", "'Initial", "commit'"]
```

### 选项和参数分离

```rust
fn separate_options_and_args(args: Vec<String>) -> (Vec<String>, Vec<String>) {
    let mut options = Vec::new();
    let mut arguments = Vec::new();

    for arg in args {
        if arg.starts_with('-') {
            options.push(arg);
        } else {
            arguments.push(arg);
        }
    }

    (options, arguments)
}

// 使用示例
let args = vec!["commit".to_string(), "-m".to_string(), "message".to_string()];
let (options, arguments) = separate_options_and_args(args);
// options: ["-m"]
// arguments: ["commit", "message"]
```

## 注意事项

1. **词边界匹配**: 使用 `\b` 确保完整的命令名匹配，避免误判
2. **大小写敏感**: 命令通常区分大小写，特别是 Unix/Linux 系统
3. **路径和参数**: 包含路径和参数的完整命令行
4. **管道和重定向**: 支持包含管道 `|` 和重定向 `>` 的复合命令
5. **跨平台兼容**: 同时支持 Unix/Linux 和 Windows 命令

## 与其他类型的区别

1. **与代码的区别**: 命令更简洁，通常是单行的可执行指令
2. **检测优先级**: 命令检测优先级低于 URL、IP 等特定格式
3. **语法特点**: 以命令关键词开头，包含选项和参数

## 性能特点

- **检测速度**: 中等（需要多个正则表达式匹配）
- **内存使用**: 低（无元数据存储）
- **准确性**: 中等（基于关键词匹配，可能有误判）
- **扩展性**: 高（易于添加新的命令模式）
