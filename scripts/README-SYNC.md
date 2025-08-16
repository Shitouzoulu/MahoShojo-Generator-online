# 🔄 项目同步到GitHub说明

本文档说明如何将本地项目同步到GitHub仓库 `https://github.com/Shitouzoulu/MahoShojo-Generator-online/tree/dev`

## 📋 前置要求

1. **Git已安装**：确保系统已安装Git并配置好
2. **GitHub账户**：需要有对应仓库的推送权限
3. **SSH密钥或HTTPS认证**：配置好GitHub认证方式

## 🚀 快速同步方法

### 方法1：使用PowerShell脚本（推荐）

```powershell
# 在项目根目录执行
.\scripts\sync-to-github.ps1

# 自定义提交信息
.\scripts\sync-to-github.ps1 -CommitMessage "Update: 添加新功能" -Branch "dev"
```

### 方法2：使用批处理文件

```cmd
# 在项目根目录执行
scripts\sync-to-github.bat
```

### 方法3：手动执行Git命令

```bash
# 1. 检查状态
git status

# 2. 添加所有文件
git add .

# 3. 提交更改
git commit -m "Update: 同步项目到GitHub"

# 4. 推送到远程仓库
git push origin dev
```

## 📁 脚本功能说明

### PowerShell脚本 (`sync-to-github.ps1`)

- ✅ 自动检查Git环境
- ✅ 自动切换分支
- ✅ 自动拉取最新代码
- ✅ 自动检测并提交更改
- ✅ 推送到远程仓库
- ✅ 彩色日志输出
- ✅ 错误处理和回滚

### 批处理文件 (`sync-to-github.bat`)

- ✅ 兼容Windows CMD
- ✅ 中文支持
- ✅ 自动Git操作
- ✅ 错误处理

## 🔧 配置说明

### 远程仓库配置

当前项目已配置远程仓库：
```bash
origin  https://github.com/Shitouzoulu/MahoShojo-Generator-online.git (fetch)
origin  https://github.com/Shitouzoulu/MahoShojo-Generator-online.git (push)
```

### 分支配置

- **默认分支**：`dev`
- **目标分支**：`dev`
- **主分支**：`master`

## 🚨 常见问题解决

### 1. Git未安装
```bash
# 下载并安装Git
# https://git-scm.com/downloads
```

### 2. 权限问题
```bash
# 配置GitHub认证
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱"

# 使用SSH密钥
ssh-keygen -t ed25519 -C "你的邮箱"
# 将公钥添加到GitHub账户
```

### 3. 分支冲突
```bash
# 拉取最新代码
git pull origin dev

# 解决冲突后重新提交
git add .
git commit -m "Resolve conflicts"
git push origin dev
```

### 4. 推送失败
```bash
# 检查远程仓库权限
git remote -v

# 强制推送（谨慎使用）
git push origin dev --force
```

## 📊 同步状态检查

### 检查本地状态
```bash
git status
git log --oneline -5
```

### 检查远程状态
```bash
git remote -v
git branch -a
```

### 检查同步状态
```bash
git fetch origin
git status -uno
```

## 🔄 自动化同步

### 设置定时同步
```bash
# Windows计划任务
# 创建定时任务执行 sync-to-github.bat

# 或使用PowerShell脚本
# 添加到Windows任务计划程序
```

### 钩子同步
```bash
# 在 .git/hooks/ 目录添加钩子脚本
# 实现自动同步功能
```

## 📞 需要帮助？

如果遇到问题：

1. 检查Git版本和配置
2. 确认GitHub仓库权限
3. 查看错误日志信息
4. 参考Git官方文档

## 🎯 下一步

同步完成后，您可以：

1. 在GitHub上查看更新的代码
2. 使用部署脚本部署到服务器
3. 继续开发新功能
4. 创建Pull Request进行代码审查

---

✨ 祝您同步顺利！✨
