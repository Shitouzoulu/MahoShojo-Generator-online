import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// 加载环境变量
config();

// 导入路由
import magicalGirlRoutes from './routes/magicalGirl';
import canshouRoutes from './routes/canshou';
import battleRoutes from './routes/battle';
import userRoutes from './routes/user';
import tachieRoutes from './routes/tachie';

// 导入中间件
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';

// 导入数据库初始化
import { initDatabase } from '../lib/database';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
app.use(rateLimiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.use('/api/magical-girls', magicalGirlRoutes);
app.use('/api/canshou', canshouRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tachie', tachieRoutes);

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  socket.on('join-battle', (battleId) => {
    socket.join(`battle-${battleId}`);
    console.log(`用户 ${socket.id} 加入战斗 ${battleId}`);
  });
  
  socket.on('leave-battle', (battleId) => {
    socket.leave(`battle-${battleId}`);
    console.log(`用户 ${socket.id} 离开战斗 ${battleId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    console.log('数据库连接成功');
    
    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`🚀 Express服务器运行在端口 ${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO 已启用`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

startServer();

export { app, io };
