# 魔法少女生成器 - 快速同步到GitHub (PowerShell版本)
# 使用方法: .\快速同步.ps1

param(
    [string]$CommitMessage = "Update: 同步项目到GitHub"
)

# 设置控制台标题
$Host.UI.RawUI.WindowTitle = "魔法少女生成器 - 快速同步到GitHub"

# 颜色定义
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# 日志函数
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[信息] $Message" -ForegroundColor $Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[成功] $Message" -ForegroundColor $Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[警告] $Message" -ForegroundColor $Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[错误] $Message" -ForegroundColor $Red
}

function Write-LogStep {
    param([string]$Step, [string]$Message)
    Write-Host "[步骤$Step] $Message" -ForegroundColor $Blue
}

# 显示标题
Write-Host "========================================" -ForegroundColor $White
Write-Host "魔法少女生成器 - 快速同步到GitHub" -ForegroundColor $White
Write-Host "========================================" -ForegroundColor $White
Write-Host ""

# 检查Git环境
Write-LogInfo "正在检查Git环境..."
try {
    $gitVersion = git --version
    Write-LogSuccess "Git环境检查通过: $gitVersion"
} catch {
    Write-LogError "Git未安装或不在PATH中"
    Write-Host "请先安装Git: https://git-scm.com/downloads" -ForegroundColor $Yellow
    Write-Host "安装时请选择'Add to PATH'选项" -ForegroundColor $Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Write-LogInfo "当前目录: $(Get-Location)"
Write-LogInfo "目标仓库: https://github.com/Shitouzoulu/MahoShojo-Generator-online"
Write-LogInfo "目标分支: dev"
Write-Host ""

Write-LogInfo "开始同步流程..."
Write-Host ""

# 步骤1: 切换到dev分支
Write-LogStep "1" "切换到dev分支..."
try {
    git checkout dev
    Write-LogSuccess "已切换到dev分支"
} catch {
    Write-LogWarning "切换分支失败，可能分支不存在"
}

# 步骤2: 拉取最新代码
Write-LogStep "2" "拉取最新代码..."
try {
    git pull origin dev
    Write-LogSuccess "代码拉取完成"
} catch {
    Write-LogWarning "拉取失败，可能没有远程分支"
}

# 步骤3: 检查更改状态
Write-LogStep "3" "检查更改状态..."
$status = git status --porcelain
if ($status) {
    Write-LogInfo "发现未提交的更改，正在处理..."
    Write-Host ""
    
    # 步骤4: 添加所有文件
    Write-LogStep "4" "添加所有文件..."
    git add .
    Write-LogSuccess "文件添加完成"
    
    # 步骤5: 提交更改
    Write-LogStep "5" "提交更改..."
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullMessage = "$CommitMessage - $timestamp"
    git commit -m $fullMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-LogSuccess "更改已提交: $fullMessage"
    } else {
        Write-LogError "提交失败"
        Read-Host "按回车键退出"
        exit 1
    }
} else {
    Write-LogInfo "没有未提交的更改"
}

# 步骤6: 推送到GitHub
Write-LogStep "6" "推送到GitHub..."
try {
    git push origin dev
    Write-LogSuccess "代码推送成功"
} catch {
    Write-LogError "推送失败"
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor $Yellow
    Write-Host "1. 网络连接问题" -ForegroundColor $Yellow
    Write-Host "2. GitHub权限问题" -ForegroundColor $Yellow
    Write-Host "3. 需要配置SSH密钥或Personal Access Token" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "请检查网络连接和GitHub权限设置" -ForegroundColor $Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor $White
Write-LogSuccess "项目已成功同步到GitHub！"
Write-Host "========================================" -ForegroundColor $White
Write-Host ""

Write-LogInfo "仓库地址: https://github.com/Shitouzoulu/MahoShojo-Generator-online"
Write-LogInfo "分支: dev"
Write-LogInfo "同步时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# 显示远程仓库信息
Write-LogInfo "远程仓库信息:"
git remote -v

Write-Host ""
Write-Host "[提示] 您可以在GitHub上查看更新的代码" -ForegroundColor $Yellow
Write-Host "[提示] 如需部署到服务器，请使用项目中的部署脚本" -ForegroundColor $Yellow
Write-Host ""

Read-Host "同步完成！按回车键退出"
