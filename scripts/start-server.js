#!/usr/bin/env node

/**
 * Express.js 服务器启动脚本
 * 支持开发和生产环境
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}错误: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

// 检查环境变量文件
function checkEnvironment() {
  const envPath = path.join(__dirname, '../server/.env');
  const envExamplePath = path.join(__dirname, '../server/env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      logWarning('未找到 .env 文件，正在从 env.example 复制...');
      try {
        fs.copyFileSync(envExamplePath, envPath);
        logSuccess('已创建 .env 文件，请编辑配置后重新启动');
        logInfo('请确保配置了以下必要的环境变量：');
        logInfo('  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
        logInfo('  - JWT_SECRET');
        logInfo('  - 其他API密钥');
        process.exit(1);
      } catch (error) {
        logError(`复制环境变量文件失败: ${error.message}`);
        process.exit(1);
      }
    } else {
      logError('未找到环境变量配置文件');
      process.exit(1);
    }
  }
  
  logSuccess('环境变量配置检查通过');
}

// 检查依赖
function checkDependencies() {
  const packagePath = path.join(__dirname, '../package.json');
  
  if (!fs.existsSync(packagePath)) {
    logError('未找到 package.json 文件');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = [
    'express', 'cors', 'helmet', 'compression', 'morgan',
    'bcryptjs', 'jsonwebtoken', 'socket.io', 'dotenv'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    logError(`缺少必要的依赖: ${missingDeps.join(', ')}`);
    logInfo('请运行: npm install');
    process.exit(1);
  }
  
  logSuccess('依赖检查通过');
}

// 启动服务器
function startServer(mode = 'dev') {
  const isDev = mode === 'dev';
  const isWatch = mode === 'watch';
  
  log(`正在启动 ${isDev ? '开发' : '生产'} 模式服务器...`, 'cyan');
  
  let command, args;
  
  if (isDev) {
    if (isWatch) {
      command = 'npm';
      args = ['run', 'dev:server:watch'];
    } else {
      command = 'npm';
      args = ['run', 'dev:server'];
    }
  } else {
    // 生产模式：先构建再启动
    logInfo('正在构建生产版本...');
    try {
      require('child_process').execSync('npm run build:server', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      logSuccess('构建完成');
    } catch (error) {
      logError('构建失败');
      process.exit(1);
    }
    
    command = 'npm';
    args = ['run', 'start:server'];
  }
  
  const serverProcess = spawn(command, args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
  });
  
  serverProcess.on('error', (error) => {
    logError(`启动服务器失败: ${error.message}`);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      logError(`服务器异常退出，退出码: ${code}`);
      process.exit(code);
    }
  });
  
  // 优雅关闭
  process.on('SIGINT', () => {
    logInfo('正在关闭服务器...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    logInfo('正在关闭服务器...');
    serverProcess.kill('SIGTERM');
  });
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'dev';
  
  log(`${colors.bright}🚀 魔法少女生成器 - Express.js 服务器${colors.reset}`, 'cyan');
  log('', 'reset');
  
  // 验证模式参数
  const validModes = ['dev', 'watch', 'prod'];
  if (!validModes.includes(mode)) {
    logError(`无效的模式: ${mode}`);
    logInfo(`支持的模式: ${validModes.join(', ')}`);
    logInfo('用法: node scripts/start-server.js [dev|watch|prod]');
    process.exit(1);
  }
  
  logInfo('正在检查环境配置...');
  checkEnvironment();
  
  logInfo('正在检查依赖...');
  checkDependencies();
  
  log('', 'reset');
  startServer(mode);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { startServer, checkEnvironment, checkDependencies };
