# PowerShell脚本：同步项目到GitHub仓库
# 使用方法: .\sync-to-github.ps1

param(
    [string]$CommitMessage = "Update: 同步项目到GitHub",
    [string]$Branch = "dev"
)

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

# 检查git是否可用
try {
    $gitVersion = git --version
    Write-LogSuccess "Git版本: $gitVersion"
} catch {
    Write-LogError "Git未安装或不在PATH中，请先安装Git"
    exit 1
}

# 检查当前目录是否为git仓库
if (-not (Test-Path ".git")) {
    Write-LogError "当前目录不是git仓库"
    exit 1
}

# 检查远程仓库
$remoteUrl = git remote get-url origin
if (-not $remoteUrl) {
    Write-LogError "未配置远程仓库origin"
    exit 1
}

Write-LogInfo "远程仓库: $remoteUrl"

# 检查当前分支
$currentBranch = git branch --show-current
Write-LogInfo "当前分支: $currentBranch"

# 如果不在目标分支上，切换到目标分支
if ($currentBranch -ne $Branch) {
    Write-LogInfo "切换到分支: $Branch"
    git checkout $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "切换分支失败"
        exit 1
    }
}

# 拉取最新代码
Write-LogInfo "拉取最新代码..."
git pull origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-LogWarning "拉取代码失败，可能没有远程分支"
}

# 检查状态
Write-LogInfo "检查git状态..."
$status = git status --porcelain
if ($status) {
    Write-LogInfo "发现未提交的更改:"
    Write-Host $status -ForegroundColor $Yellow
    
    # 添加所有文件
    Write-LogInfo "添加所有文件..."
    git add .
    
    # 提交更改
    Write-LogInfo "提交更改: $CommitMessage"
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "提交失败"
        exit 1
    }
    
    Write-LogSuccess "更改已提交"
} else {
    Write-LogInfo "没有未提交的更改"
}

# 推送到远程仓库
Write-LogInfo "推送到远程仓库..."
git push origin $Branch

if ($LASTEXITCODE -eq 0) {
    Write-LogSuccess "项目已成功同步到GitHub仓库！"
    Write-LogInfo "仓库地址: $remoteUrl"
    Write-LogInfo "分支: $Branch"
} else {
    Write-LogError "推送失败"
    exit 1
}

# 显示远程仓库信息
Write-LogInfo "远程仓库信息:"
git remote -v

Write-LogSuccess "同步完成！"
