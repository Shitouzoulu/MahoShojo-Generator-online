import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';

// 加载环境变量
config();

const app = express();
const server = createServer(app);

const PORT = process.env['PORT'] || 3001;

// 基础中间件
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
  origin: process.env['FRONTEND_URL'] || "http://localhost:3000",
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'MahoShojo Backend Test Server is running!'
  });
});

// 测试API端点
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API测试端点正常工作',
    timestamp: new Date().toISOString(),
    data: {
      server: 'MahoShojo Backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// 用户注册测试端点
app.post('/api/test/register', (req, res) => {
  const { email, username, password } = req.body;
  
  if (!email || !username || !password) {
    return res.status(400).json({
      success: false,
      error: '缺少必要字段'
    });
  }
  
  // 模拟用户注册
  const mockUser = {
    id: 'test-user-' + Date.now(),
    email,
    username,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    message: '用户注册成功（测试模式）',
    data: mockUser
  });
});

// 用户登录测试端点
app.post('/api/test/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: '缺少必要字段'
    });
  }
  
  // 模拟用户登录
  const mockToken = 'test-jwt-token-' + Date.now();
  
  res.json({
    success: true,
    message: '用户登录成功（测试模式）',
    data: {
      token: mockToken,
      user: {
        id: 'test-user-123',
        email,
        username: email.split('@')[0],
        role: 'user'
      }
    }
  });
});

// 魔法少女生成测试端点
app.post('/api/test/generate-magical-girl', (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: '缺少姓名参数'
    });
  }
  
  // 模拟魔法少女生成
  const mockMagicalGirl = {
    id: 'mg-' + Date.now(),
    name: name,
    flower_name: '测试花',
    appearance: {
      height: '160cm',
      weight: '50kg',
      hairColor: '黑色',
      hairStyle: '长发',
      eyeColor: '棕色',
      skinTone: '白皙',
      wearing: '魔法少女装',
      specialFeature: '温柔的笑容'
    },
    spell: '测试咒语',
    main_color: '白色',
    first_page_color: '#ffffff',
    second_page_color: '#f0f0f0'
  };
  
  res.json({
    success: true,
    message: '魔法少女生成成功（测试模式）',
    data: mockMagicalGirl
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.originalUrl,
    available_endpoints: [
      'GET /health',
      'GET /api/test',
      'POST /api/test/register',
      'POST /api/test/login',
      'POST /api/test/generate-magical-girl'
    ]
  });
});

// 启动服务器
async function startServer() {
  try {
    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`🚀 MahoShojo 测试服务器运行在端口 ${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🧪 测试API: http://localhost:${PORT}/api/test`);
      console.log(`👤 用户注册: POST http://localhost:${PORT}/api/test/register`);
      console.log(`🔐 用户登录: POST http://localhost:${PORT}/api/test/login`);
      console.log(`✨ 魔法少女生成: POST http://localhost:${PORT}/api/test/generate-magical-girl`);
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

export { app, server };
