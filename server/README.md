# Express.js 服务器

这是魔法少女生成器项目的后端API服务器，基于Express.js构建。

## 功能特性

- 🚀 **高性能**: 基于Express.js的现代化Node.js服务器
- 🔐 **身份验证**: JWT token认证系统
- 🛡️ **安全防护**: Helmet安全头、CORS、速率限制
- 📊 **实时通信**: Socket.IO支持实时战斗更新
- 🗄️ **数据库集成**: MySQL数据库连接和操作
- 📝 **日志记录**: Morgan和Pino日志系统
- 🔄 **API路由**: 完整的RESTful API端点

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量配置文件：

```bash
cp server/env.example server/.env
```

编辑 `.env` 文件，配置必要的环境变量：

- 数据库连接信息
- JWT密钥
- API密钥等

### 3. 启动服务器

#### 开发模式（带热重载）

```bash
npm run dev:server:watch
```

#### 开发模式（单次启动）

```bash
npm run dev:server
```

#### 生产模式

```bash
npm run build:server
npm run start:server
```

## API端点

### 认证相关

- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `PUT /api/users/password` - 修改密码

### 魔法少女

- `POST /api/magical-girls/generate` - 生成魔法少女
- `GET /api/magical-girls` - 获取魔法少女列表
- `GET /api/magical-girls/:id` - 获取魔法少女详情
- `GET /api/magical-girls/user/favorites` - 获取用户收藏
- `POST /api/magical-girls/:id/favorite` - 切换收藏状态

### 残兽

- `POST /api/canshou/generate` - 生成残兽
- `GET /api/canshou` - 获取残兽列表
- `GET /api/canshou/:id` - 获取残兽详情
- `GET /api/canshou/stats/stages` - 获取阶段统计
- `GET /api/canshou/user/favorites` - 获取用户收藏

### 战斗系统

- `POST /api/battles/generate` - 生成战斗故事
- `GET /api/battles` - 获取战斗列表
- `GET /api/battles/:id` - 获取战斗详情
- `GET /api/battles/stats/overview` - 获取战斗统计
- `GET /api/battles/leaderboard` - 获取排行榜

### 立绘生成

- `POST /api/tachie/generate` - 生成立绘
- `GET /api/tachie/status/:taskId` - 获取生成状态
- `GET /api/tachie/user/tasks` - 获取用户任务列表
- `POST /api/tachie/cancel/:taskId` - 取消任务
- `POST /api/tachie/regenerate/:taskId` - 重新生成

## 中间件

### 安全中间件

- **Helmet**: 设置安全HTTP头
- **CORS**: 跨域资源共享配置
- **速率限制**: 防止API滥用
- **身份验证**: JWT token验证

### 功能中间件

- **压缩**: 响应数据压缩
- **日志**: 请求日志记录
- **错误处理**: 统一错误处理
- **JSON解析**: 请求体解析

## 数据库

服务器使用MySQL数据库，支持以下表结构：

- `users` - 用户信息
- `magical_girls` - 魔法少女角色
- `canshou` - 残兽角色
- `battles` - 战斗记录
- `character_battle_history` - 角色战斗历史
- `user_characters` - 用户角色关联
- `tachie_tasks` - 立绘生成任务

## 实时通信

使用Socket.IO实现实时功能：

- 战斗结果广播
- 用户在线状态
- 实时通知

## 开发工具

### 代码检查

```bash
npm run lint:server
```

### 类型检查

```bash
npx tsc --noEmit --project server/tsconfig.json
```

### 测试

```bash
npm test
```

## 部署

### 生产环境

1. 构建服务器代码：
   ```bash
   npm run build:server
   ```

2. 启动生产服务器：
   ```bash
   npm run start:server
   ```

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/server ./dist/server
EXPOSE 3001
CMD ["npm", "run", "start:server"]
```

## 监控和日志

- 健康检查端点：`GET /health`
- 结构化日志输出
- 错误追踪和报告

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证环境变量配置
   - 确认网络连接

2. **JWT验证失败**
   - 检查JWT_SECRET环境变量
   - 验证token格式和过期时间

3. **CORS错误**
   - 检查FRONTEND_URL配置
   - 确认前端域名设置

### 日志查看

服务器启动时会显示详细的启动信息，包括：
- 数据库连接状态
- 服务器端口信息
- 中间件加载状态

## 贡献

欢迎提交Issue和Pull Request来改进服务器功能。

## 许可证

本项目采用MIT许可证。
