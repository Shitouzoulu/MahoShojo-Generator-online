#!/bin/bash

# Git部署脚本 - 通过GitHub部署到阿里云ECS
# 使用方法: ./deploy-git.sh [ECS公网IP] [GitHub仓库URL] [分支名]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查参数
if [ $# -lt 3 ]; then
    echo "使用方法: $0 [ECS公网IP] [GitHub仓库URL] [分支名]"
    echo "示例: $0 123.456.789.012 https://github.com/Shitouzoulu/MahoShojo-Generator-online.git dev"
    exit 1
fi

ECS_IP=$1
GITHUB_URL=$2
BRANCH=$3

log_info "开始Git部署到阿里云ECS"
log_info "服务器: $ECS_IP"
log_info "仓库: $GITHUB_URL"
log_info "分支: $BRANCH"

# 创建部署说明文件
cat > GIT_DEPLOY_INSTRUCTIONS.md << EOF
# 🚀 Git部署说明 - 阿里云ECS

## 📋 部署步骤

### 1. 在Workbench中执行以下命令：

\`\`\`bash
# 进入应用目录
cd /var/www/mahoshojo

# 如果目录不存在，创建它
mkdir -p /var/www/mahoshojo

# 进入目录
cd /var/www/mahoshojo

# 克隆GitHub仓库
git clone -b $BRANCH $GITHUB_URL .

# 安装依赖
npm install

# 构建项目
npm run build
npm run build:server

# 配置环境变量
cp env.production.simple .env.production

# 编辑环境变量（重要！）
vim .env.production
\`\`\`

### 2. 修改环境变量：

在 \`.env.production\` 文件中修改以下配置：

\`\`\`bash
# 修改为你的ECS公网IP
FRONTEND_URL=http://$ECS_IP:3000

# 如果有AI API密钥，请填入
AI_PROVIDERS_CONFIG='[
  {
    "name": "gemini_provider", 
    "apiKey": "你的实际API密钥",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
    "model": "gemini-2.5-flash"
  }
]'

# 生成新的JWT密钥
JWT_SECRET=你的新JWT密钥_至少32字符
\`\`\`

### 3. 启动Docker服务：

\`\`\`bash
# 启动服务
docker-compose -f docker-compose-simple.yml up -d

# 等待服务启动
sleep 30

# 检查服务状态
docker-compose -f docker-compose-simple.yml ps

# 查看应用日志
docker-compose -f docker-compose-simple.yml logs app
\`\`\`

### 4. 测试部署：

\`\`\`bash
# 在ECS上测试
curl http://localhost:3000/health

# 在浏览器访问
http://$ECS_IP:3000
\`\`\`

## 🔧 后续更新

当你在本地更新代码后：

\`\`\`bash
# 本地提交代码
git add .
git commit -m "Update: 描述你的更新"
git push origin $BRANCH

# 在ECS上拉取最新代码
cd /var/www/mahoshojo
git pull origin $BRANCH

# 重新构建和部署
npm run build
npm run build:server
docker-compose -f docker-compose-simple.yml restart app
\`\`\`

## 🚨 常见问题

1. **权限问题**：
   \`\`\`bash
   chown -R root:root /var/www/mahoshojo
   chmod -R 755 /var/www/mahoshojo
   \`\`\`

2. **端口被占用**：
   \`\`\`bash
   netstat -tlnp | grep :3000
   docker-compose -f docker-compose-simple.yml down
   \`\`\`

3. **查看日志**：
   \`\`\`bash
   docker-compose -f docker-compose-simple.yml logs -f app
   \`\`\`

## 📊 管理命令

\`\`\`bash
# 查看服务状态
docker-compose -f docker-compose-simple.yml ps

# 重启服务
docker-compose -f docker-compose-simple.yml restart

# 停止服务
docker-compose -f docker-compose-simple.yml down

# 查看资源使用
docker stats
\`\`\`

## 🔒 安全建议

1. 修改默认的数据库密码
2. 配置防火墙规则
3. 定期备份数据
4. 使用强密码和JWT密钥

## 📞 需要帮助？

如果遇到问题，请检查：
1. 环境变量配置是否正确
2. Docker服务是否正常运行
3. 端口是否被占用
4. 查看相关日志信息
EOF

log_success "Git部署说明已创建：GIT_DEPLOY_INSTRUCTIONS.md"
log_info ""
log_info "📤 下一步操作："
log_info "1. 将你的本地代码推送到GitHub仓库"
log_info "2. 在Workbench中按照说明部署"
log_info ""
log_info "📋 快速部署命令："
log_info "在Workbench中执行："
log_info "cd /var/www/mahoshojo && git clone -b $BRANCH $GITHUB_URL ."
log_info ""
log_info "📖 详细说明请查看 GIT_DEPLOY_INSTRUCTIONS.md 文件"

log_success "Git部署脚本执行完成"
