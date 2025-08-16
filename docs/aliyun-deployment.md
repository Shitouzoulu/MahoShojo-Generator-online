# 阿里云ECS部署指南

## 📋 部署前准备

### 1. 阿里云资源准备
- **ECS实例**: 建议2核4GB以上配置
- **RDS实例**: MySQL 8.0，建议2核4GB
- **Redis实例**: 建议1GB内存
- **安全组**: 开放80、443、3000端口
- **域名**: 配置DNS解析到ECS公网IP

### 2. 本地环境准备
- Node.js 18+
- Docker & Docker Compose
- SSH密钥对

## 🚀 快速部署

### 1. 配置环境变量
```bash
# 复制生产环境配置模板
cp env.production.example .env.production

# 编辑配置文件
vim .env.production
```

**重要配置项:**
```env
# 数据库配置
DB_HOST=your-rds-instance.mysql.rds.aliyuncs.com
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=mahoshojo

# Redis配置
REDIS_HOST=your-redis-instance.redis.rds.aliyuncs.com
REDIS_PASSWORD=your_redis_password

# JWT密钥（必须32字符以上）
JWT_SECRET=your_very_long_and_secure_jwt_secret_here_minimum_32_chars

# 前端URL
FRONTEND_URL=120.26.240.50
```

### 2. 执行部署
```bash
# 部署到生产环境
npm run deploy:aliyun production YOUR_SERVER_IP ~/.ssh/your_key.pem

# 或者手动执行
./scripts/deploy-aliyun.sh production YOUR_SERVER_IP ~/.ssh/your_key.pem
```

## 🐳 Docker部署

### 1. 本地构建
```bash
# 构建Docker镜像
npm run docker:build

# 本地测试运行
npm run docker:run
```

### 2. 服务器部署
```bash
# 在服务器上运行
cd /var/www/mahoshojo
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

## 🔧 手动部署步骤

### 1. 服务器环境准备
```bash
# 更新系统
apt update && apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. 项目部署
```bash
# 创建应用目录
mkdir -p /var/www/mahoshojo
cd /var/www/mahoshojo

# 上传项目文件
# 或者使用git clone

# 配置环境变量
cp .env.production .env

# 启动服务
docker-compose up -d
```

## 📊 监控和维护

### 1. 健康检查
```bash
# 检查应用状态
curl -f http://localhost:3000/health

# 检查Docker服务
docker-compose ps
docker-compose logs --tail=50 app
```

### 2. 日志管理
```bash
# 查看应用日志
docker-compose logs -f app

# 查看数据库日志
docker-compose logs -f db

# 查看Redis日志
docker-compose logs -f redis
```

### 3. 备份策略
```bash
# 数据库备份
docker-compose exec db mysqldump -u root -p mahoshojo > backup_$(date +%Y%m%d).sql

# 文件备份
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# 只开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 2. SSL证书配置
```bash
# 使用Let's Encrypt
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 数据库安全
```bash
# 限制数据库访问
# 在RDS安全组中只允许ECS内网IP访问

# 定期更新密码
# 使用强密码策略
```

## 🚨 故障排除

### 1. 常见问题
- **端口被占用**: `netstat -tlnp | grep :3000`
- **权限问题**: `chown -R www-data:www-data /var/www/mahoshojo`
- **磁盘空间**: `df -h`

### 2. 服务重启
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app

# 完全重建
docker-compose down
docker-compose up -d --build
```

### 3. 日志分析
```bash
# 查看错误日志
docker-compose logs app | grep ERROR

# 查看慢查询
docker-compose logs app | grep "慢查询"
```

## 📈 性能优化

### 1. 数据库优化
- 配置连接池参数
- 添加适当的索引
- 定期分析慢查询

### 2. 缓存策略
- 启用Redis缓存
- 配置静态资源缓存
- 使用CDN加速

### 3. 负载均衡
- 配置Nginx反向代理
- 启用Gzip压缩
- 配置静态资源缓存

## 🔄 更新部署

### 1. 自动更新
```bash
# 使用部署脚本
npm run deploy:aliyun production YOUR_SERVER_IP

# 或者手动更新
git pull origin main
docker-compose down
docker-compose up -d --build
```

### 2. 回滚策略
```bash
# 回滚到上一个版本
docker-compose down
git checkout HEAD~1
docker-compose up -d --build
```

## 📞 技术支持

如果遇到部署问题，请检查：
1. 环境变量配置是否正确
2. 数据库连接是否正常
3. 端口是否被占用
4. 日志中的错误信息

更多帮助请参考项目文档或提交Issue。
