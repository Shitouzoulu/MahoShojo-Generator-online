#!/bin/bash

# 阿里云ECS部署脚本
# 使用方法: ./deploy-aliyun.sh [环境] [服务器IP]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ $# -lt 2 ]; then
    echo "使用方法: $0 [环境] [服务器IP] [SSH密钥路径]"
    echo "环境: production, staging, development"
    echo "示例: $0 production 123.456.789.012 ~/.ssh/aliyun.pem"
    exit 1
fi

ENVIRONMENT=$1
SERVER_IP=$2
SSH_KEY=${3:-~/.ssh/id_rsa}

# 验证环境
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    log_error "无效的环境: $ENVIRONMENT"
    exit 1
fi

log_info "开始部署到 $ENVIRONMENT 环境 (服务器: $SERVER_IP)"

# 检查SSH密钥
if [ ! -f "$SSH_KEY" ]; then
    log_error "SSH密钥文件不存在: $SSH_KEY"
    exit 1
fi

# 构建应用
log_info "构建应用..."
npm run deploy:build

if [ $? -ne 0 ]; then
    log_error "构建失败"
    exit 1
fi

log_success "应用构建完成"

# 创建部署包
log_info "创建部署包..."
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DEPLOY_DIR

# 复制必要文件
cp -r .next $DEPLOY_DIR/
cp -r dist $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp Dockerfile $DEPLOY_DIR/
cp docker-compose.yml $DEPLOY_DIR/
cp .env.production $DEPLOY_DIR/.env

# 创建部署脚本
cat > $DEPLOY_DIR/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "开始部署..."

# 停止现有容器
docker-compose down || true

# 构建新镜像
docker-compose build --no-cache

# 启动服务
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 健康检查
if curl -f http://localhost:3000/health; then
    echo "部署成功！"
else
    echo "部署失败，健康检查未通过"
    exit 1
fi
EOF

chmod +x $DEPLOY_DIR/deploy.sh

# 压缩部署包
tar -czf $DEPLOY_DIR.tar.gz $DEPLOY_DIR
log_success "部署包创建完成: $DEPLOY_DIR.tar.gz"

# 上传到服务器
log_info "上传部署包到服务器..."
scp -i $SSH_KEY $DEPLOY_DIR.tar.gz root@$SERVER_IP:/tmp/

if [ $? -ne 0 ]; then
    log_error "上传失败"
    exit 1
fi

log_success "部署包上传完成"

# 在服务器上执行部署
log_info "在服务器上执行部署..."
ssh -i $SSH_KEY root@$SERVER_IP << EOF
    set -e
    
    echo "开始服务器端部署..."
    
    # 进入部署目录
    cd /tmp
    
    # 解压部署包
    tar -xzf $DEPLOY_DIR.tar.gz
    cd $DEPLOY_DIR
    
    # 创建必要的目录
    mkdir -p /var/www/mahoshojo/{uploads,logs}
    
    # 复制环境配置
    cp .env /var/www/mahoshojo/
    
    # 进入应用目录
    cd /var/www/mahoshojo
    
    # 停止现有服务
    docker-compose down || true
    
    # 启动新服务
    docker-compose up -d
    
    # 等待服务启动
    echo "等待服务启动..."
    sleep 30
    
    # 健康检查
    if curl -f http://localhost:3000/health; then
        echo "部署成功！"
        
        # 清理临时文件
        rm -rf /tmp/$DEPLOY_DIR*
        
        # 显示服务状态
        docker-compose ps
        
        # 显示日志
        echo "应用日志:"
        docker-compose logs --tail=20 app
    else
        echo "部署失败，健康检查未通过"
        echo "查看日志:"
        docker-compose logs app
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    log_success "部署完成！"
    log_info "应用地址: http://$SERVER_IP:3000"
    log_info "健康检查: http://$SERVER_IP:3000/health"
else
    log_error "部署失败"
    exit 1
fi

# 清理本地文件
rm -rf $DEPLOY_DIR $DEPLOY_DIR.tar.gz

log_success "部署脚本执行完成"
