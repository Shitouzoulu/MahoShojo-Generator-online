# 🚀 阿里云ECS迁移指南

## 📋 迁移前准备清单

### 1. 阿里云ECS信息
- [ ] ECS公网IP地址
- [ ] 登录密码或SSH密钥
- [ ] 安全组已开放端口（22, 80, 443, 3000）
- [ ] 系统：Ubuntu 20.04 或 CentOS 7+

### 2. 本地环境准备
- [ ] Node.js 18+ 已安装
- [ ] Git 已安装
- [ ] SSH密钥已配置（推荐）

## 🔧 第一步：配置本地环境

### 1. 复制环境配置文件
```bash
# 复制简化版生产环境配置
cp env.production.simple .env.production

# 编辑配置文件
vim .env.production
```

### 2. 修改关键配置项
```bash
# 修改这些重要配置：

# 1. 替换YOUR_ECS_IP为你的实际ECS公网IP
FRONTEND_URL=http://123.456.789.012:3000

# 2. 填入你的AI API密钥（如果有的话）
AI_PROVIDERS_CONFIG='[
  {
    "name": "gemini_provider", 
    "apiKey": "你的实际API密钥",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
    "model": "gemini-2.5-flash"
  }
]'

# 3. 修改JWT密钥（建议生成新的）
JWT_SECRET=你的新JWT密钥_至少32字符_包含数字字母符号
```

### 3. 生成安全的JWT密钥
```bash
# 生成32字符的随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 第二步：配置阿里云ECS

### 1. 登录ECS
```bash
# 使用密码登录
ssh root@你的ECS公网IP

# 或使用SSH密钥登录
ssh -i ~/.ssh/your_key.pem root@你的ECS公网IP
```

### 2. 更新系统
```bash
# Ubuntu系统
apt update && apt upgrade -y

# CentOS系统
yum update -y
```

### 3. 安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh

# 启动Docker服务
systemctl enable docker
systemctl start docker

# 验证安装
docker --version
```

### 4. 安装Docker Compose
```bash
# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 5. 创建应用目录
```bash
# 创建应用目录
mkdir -p /var/www/mahoshojo
cd /var/www/mahoshojo
```

## 📦 第三步：本地构建和部署

### 1. 本地构建项目
```bash
# 安装依赖
npm install

# 构建项目
npm run deploy:build
```

### 2. 执行部署
```bash
# 使用简化部署脚本
npm run deploy:aliyun:simple 你的ECS公网IP

# 或者手动执行
./scripts/deploy-aliyun-simple.sh 你的ECS公网IP
```

## 🔍 第四步：验证部署

### 1. 检查服务状态
```bash
# 在ECS上检查Docker服务
docker-compose -f docker-compose-simple.yml ps

# 应该看到3个服务：
# - app (你的网站)
# - db (MySQL数据库)
# - redis (Redis缓存)
```

### 2. 检查应用日志
```bash
# 查看应用日志
docker-compose -f docker-compose-simple.yml logs app

# 查看数据库日志
docker-compose -f docker-compose-simple.yml logs db
```

### 3. 测试网站访问
```bash
# 在ECS上测试
curl http://localhost:3000/health

# 在本地浏览器访问
http://你的ECS公网IP:3000
```

## 🚨 常见问题解决

### 1. 端口被占用
```bash
# 检查端口占用
netstat -tlnp | grep :3000

# 如果被占用，停止相关服务
docker-compose -f docker-compose-simple.yml down
```

### 2. 权限问题
```bash
# 修复目录权限
chown -R root:root /var/www/mahoshojo
chmod -R 755 /var/www/mahoshojo
```

### 3. 数据库连接失败
```bash
# 检查数据库状态
docker-compose -f docker-compose-simple.yml logs db

# 重启数据库服务
docker-compose -f docker-compose-simple.yml restart db
```

### 4. 内存不足
```bash
# 检查内存使用
free -h

# 如果内存不足，可以关闭一些服务或升级ECS配置
```

## 📊 部署后维护

### 1. 查看服务状态
```bash
# 查看所有服务状态
docker-compose -f docker-compose-simple.yml ps

# 查看资源使用
docker stats
```

### 2. 查看日志
```bash
# 实时查看应用日志
docker-compose -f docker-compose-simple.yml logs -f app

# 查看错误日志
docker-compose -f docker-compose-simple.yml logs app | grep ERROR
```

### 3. 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose-simple.yml restart

# 重启特定服务
docker-compose -f docker-compose-simple.yml restart app
```

### 4. 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重新部署
npm run deploy:aliyun:simple 你的ECS公网IP
```

## 🔒 安全建议

### 1. 修改默认密码
```bash
# 修改MySQL密码
# 在.env.production中修改DB_PASSWORD

# 修改Redis密码（如果需要）
# 在docker-compose-simple.yml中添加Redis密码
```

### 2. 配置防火墙
```bash
# 只开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # 你的应用
ufw enable
```

### 3. 定期备份
```bash
# 备份数据库
docker-compose -f docker-compose-simple.yml exec db mysqldump -u root -p mahoshojo > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## 🎯 下一步计划

部署成功后，你可以考虑：

1. **配置域名**：将你的域名解析到ECS公网IP
2. **配置SSL证书**：使用Let's Encrypt免费SSL证书
3. **配置Nginx反向代理**：优化性能和安全性
4. **监控告警**：配置服务器监控和告警
5. **自动备份**：设置定时备份脚本

## 📞 需要帮助？

如果遇到问题，请检查：

1. 环境变量配置是否正确
2. 端口是否被占用
3. Docker服务是否正常运行
4. 查看相关日志信息

更多帮助请参考项目文档或提交Issue。
