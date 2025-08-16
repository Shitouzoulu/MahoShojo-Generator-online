# 🔄 项目同步到GitHub完整指南

## 📋 项目信息

- **项目名称**: MahoShojo-Generator-online
- **GitHub仓库**: https://github.com/Shitouzoulu/MahoShojo-Generator-online
- **目标分支**: `dev`
- **当前状态**: 本地项目需要同步到GitHub

## 🚀 同步方法

### 方法1：使用PowerShell脚本（推荐Windows用户）

1. **打开PowerShell**（以管理员身份运行）
2. **导航到项目目录**：
   ```powershell
   cd "C:\Users\1\OneDrive\AI\GetOffWork MagicalGal\GIT\MahoShojo-Generator-online"
   ```
3. **执行同步脚本**：
   ```powershell
   .\scripts\sync-to-github.ps1
   ```

### 方法2：使用批处理文件

1. **打开命令提示符**（以管理员身份运行）
2. **导航到项目目录**：
   ```cmd
   cd "C:\Users\1\OneDrive\AI\GetOffWork MagicalGal\GIT\MahoShojo-Generator-online"
   ```
3. **执行同步脚本**：
   ```cmd
   scripts\sync-to-github.bat
   ```

### 方法3：手动执行Git命令

如果上述脚本无法运行，请手动执行以下命令：

```bash
# 1. 检查Git状态
git status

# 2. 确保在dev分支上
git checkout dev

# 3. 拉取最新代码
git pull origin dev

# 4. 添加所有更改
git add .

# 5. 提交更改
git commit -m "Update: 同步项目到GitHub"

# 6. 推送到远程仓库
git push origin dev
```

### 方法4：使用Git GUI工具

1. **GitHub Desktop**：下载并安装GitHub Desktop
2. **SourceTree**：使用SourceTree进行可视化Git操作
3. **VS Code**：在VS Code中使用内置的Git功能

## 🔧 前置检查

### 1. 检查Git安装

在命令提示符或PowerShell中运行：
```bash
git --version
```

如果显示版本号，说明Git已安装。如果提示命令未找到，请：
- 下载Git：https://git-scm.com/downloads
- 安装时选择"Add to PATH"选项

### 2. 检查Git配置

```bash
# 检查用户配置
git config --global user.name
git config --global user.email

# 如果没有配置，请设置：
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱地址"
```

### 3. 检查远程仓库

```bash
git remote -v
```

应该显示：
```
origin  https://github.com/Shitouzoulu/MahoShojo-Generator-online.git (fetch)
origin  https://github.com/Shitouzoulu/MahoShojo-Generator-online.git (push)
```

## 🚨 常见问题解决

### 问题1：Git命令未找到
**解决方案**：
1. 重新安装Git，确保选择"Add to PATH"
2. 重启命令提示符或PowerShell
3. 检查系统环境变量PATH是否包含Git路径

### 问题2：权限被拒绝
**解决方案**：
1. 检查GitHub账户权限
2. 配置SSH密钥或使用Personal Access Token
3. 确认仓库访问权限

### 问题3：分支冲突
**解决方案**：
```bash
# 拉取最新代码
git pull origin dev

# 解决冲突后
git add .
git commit -m "Resolve conflicts"
git push origin dev
```

### 问题4：推送失败
**解决方案**：
```bash
# 检查远程仓库状态
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
git fetch origin
git status -uno
```

### 检查分支信息
```bash
git branch -a
git branch --show-current
```

## 🔄 自动化建议

### 1. 设置定时同步
- 使用Windows任务计划程序
- 创建定时任务执行同步脚本
- 建议每天或每次开发后执行

### 2. 使用Git钩子
- 在`.git/hooks/`目录添加钩子脚本
- 实现提交后自动推送
- 配置pre-commit检查

### 3. 集成到开发流程
- 在VS Code中设置自动同步
- 使用GitHub Actions进行CI/CD
- 配置自动部署

## 📞 技术支持

如果遇到问题，请：

1. **检查错误日志**：查看命令输出的错误信息
2. **确认环境配置**：Git版本、网络连接、权限设置
3. **参考文档**：Git官方文档、GitHub帮助
4. **寻求帮助**：在GitHub Issues中提问

## 🎯 同步完成后的操作

1. **验证同步**：在GitHub上查看更新的代码
2. **部署应用**：使用项目中的部署脚本
3. **继续开发**：创建新分支进行功能开发
4. **代码审查**：创建Pull Request进行代码审查

## 📁 相关文件

- `scripts/sync-to-github.ps1` - PowerShell同步脚本
- `scripts/sync-to-github.bat` - 批处理同步脚本
- `scripts/README-SYNC.md` - 详细脚本说明
- `.git/config` - Git配置文件

---

✨ **祝您同步顺利！如果遇到问题，请参考上述解决方案。** ✨
