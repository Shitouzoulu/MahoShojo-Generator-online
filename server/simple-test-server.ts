import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// 加载环境变量
config();

const app = express();
const PORT = 3001;

// 基础中间件
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'MahoShojo 简单测试服务器运行正常！',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 测试API端点
app.get('/api/test', (_req, res) => {
  res.json({
    success: true,
    message: 'API测试端点正常工作',
    data: {
      server: 'MahoShojo Simple Test Server',
      version: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development'
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
  
  return res.json({
    success: true,
    message: '魔法少女生成成功（测试模式）',
    data: mockMagicalGirl
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 MahoShojo 简单测试服务器运行在端口 ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🧪 测试API: http://localhost:${PORT}/api/test`);
  console.log(`✨ 魔法少女生成: POST http://localhost:${PORT}/api/test/generate-magical-girl`);
});

export { app };
