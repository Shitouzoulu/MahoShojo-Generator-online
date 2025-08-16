#!/bin/bash

# 阿里云Workbench部署脚本
# 使用方法: ./deploy-workbench.sh [ECS公网IP] [ECS用户名]

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
if [ $# -lt 2 ]; then
    echo "使用方法: $0 [ECS公网IP] [ECS用户名]"
    echo "示例: $0 123.456.789.012 root"
    exit 1
fi

ECS_IP=$1
ECS_USER=$2

log_info "开始Workbench部署到阿里云ECS (服务器: $ECS_IP, 用户: $ECS_USER)"

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
DEPLOY_DIR="deploy-workbench-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DEPLOY_DIR

# 复制必要文件
cp -r .next $DEPLOY_DIR/
cp -r dist $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp Dockerfile $DEPLOY_DIR/
cp docker-compose.yml $DEPLOY_DIR/
cp env.production.simple $DEPLOY_DIR/.env
cp -r scripts $DEPLOY_DIR/

# 创建Workbench专用的docker-compose文件
cat > $DEPLOY_DIR/docker-compose-workbench.yml << 'EOF'
version: '3.8'

services:
  # 主应用服务
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - mahoshojo-network

  # MySQL数据库服务（本地安装）
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: mahoshojo123
      MYSQL_DATABASE: mahoshojo
      MYSQL_USER: mahoshojo
      MYSQL_PASSWORD: mahoshojo123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-database.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - mahoshojo-network
    command: --default-authentication-plugin=mysql_native_password

  # Redis缓存服务（本地安装）
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - mahoshojo-network
    command: redis-server --appendonly yes

volumes:
  mysql_data:
  redis_data:

networks:
  mahoshojo-network:
    driver: bridge
EOF

# 创建Workbench部署说明
cat > $DEPLOY_DIR/WORKBENCH_DEPLOY.md << 'EOF'
# 🚀 Workbench部署说明

## 📋 部署步骤

### 1. 在Workbench中执行以下命令：

```bash
# 进入应用目录
cd /var/www/mahoshojo

# 停止现有服务（如果有）
docker-compose -f docker-compose-workbench.yml down || true

# 启动新服务
docker-compose -f docker-compose-workbench.yml up -d

# 等待服务启动
sleep 30

# 检查服务状态
docker-compose -f docker-compose-workbench.yml ps

# 查看应用日志
docker-compose -f docker-compose-workbench.yml logs app
```

### 2. 测试网站访问：

```bash
# 在ECS上测试
curl http://localhost:3000/health

# 在浏览器访问
http://你的ECS公网IP:3000
```

### 3. 常见问题：

- 如果端口被占用：`netstat -tlnp | grep :3000`
- 如果权限问题：`chown -R root:root /var/www/mahoshojo`
- 查看日志：`docker-compose -f docker-compose-workbench.yml logs -f app`

## 🔧 管理命令

```bash
# 查看服务状态
docker-compose -f docker-compose-workbench.yml ps

# 重启服务
docker-compose -f docker-compose-workbench.yml restart

# 停止服务
docker-compose -f docker-compose-workbench.yml down

# 查看日志
docker-compose -f docker-compose-workbench.yml logs -f app
```
EOF

# 压缩部署包
tar -czf $DEPLOY_DIR.tar.gz $DEPLOY_DIR
log_success "部署包创建完成: $DEPLOY_DIR.tar.gz"

# 提供上传说明
log_info "部署包已创建完成！"
log_info ""
log_info "📤 下一步操作："
log_info "1. 将 $DEPLOY_DIR.tar.gz 文件上传到你的ECS实例"
log_info "2. 在Workbench中解压并部署"
log_info ""
log_info "📋 详细步骤："
log_info "1. 在Workbench中进入 /var/www/mahoshojo 目录"
log_info "2. 上传 $DEPLOY_DIR.tar.gz 文件到此目录"
log_info "3. 解压文件：tar -xzf $DEPLOY_DIR.tar.gz"
log_info "4. 复制文件：cp -r $DEPLOY_DIR/* ."
log_info "5. 启动服务：docker-compose -f docker-compose-workbench.yml up -d"
log_info ""
log_info "📖 详细说明请查看 WORKBENCH_DEPLOY.md 文件"

# 清理本地文件
rm -rf $DEPLOY_DIR

log_success "Workbench部署脚本执行完成"
