import { config } from 'dotenv';
import { z } from 'zod';

// 加载环境变量
config();

// 配置验证模式
const configSchema = z.object({
  // 应用配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // 数据库配置
  DB_HOST: z.string().default('localhost'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('mahoshojo'),
  DB_PORT: z.string().transform(Number).default('3306'),
  DB_CONNECTION_LIMIT: z.string().transform(Number).default('50'),
  DB_QUEUE_LIMIT: z.string().transform(Number).default('100'),
  DB_MIN_IDLE: z.string().transform(Number).default('10'),
  DB_MAX_IDLE: z.string().transform(Number).default('20'),
  DB_ACQUIRE_TIMEOUT: z.string().transform(Number).default('60000'),
  DB_TIMEOUT: z.string().transform(Number).default('60000'),
  DB_MAX_RETRIES: z.string().transform(Number).default('5'),
  DB_RETRY_DELAY: z.string().transform(Number).default('1000'),
  
  // JWT配置
  JWT_SECRET: z.string().min(32, 'JWT密钥至少需要32个字符'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // 安全配置
  SESSION_SECRET: z.string().optional(),
  COOKIE_SECURE: z.string().transform(val => val === 'true').default('false'),
  COOKIE_HTTPONLY: z.string().transform(val => val === 'true').default('true'),
  
  // 文件上传配置
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // Redis配置
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).optional(),
  
  // AI配置
  AI_PROVIDERS_CONFIG: z.string().optional(),
  AI_LOAD_BALANCE_STRATEGY: z.enum(['sequential', 'random', 'round_robin']).default('random'),
  
  // 队列配置
  QUEUE_MAX_REQUESTS_PER_MINUTE: z.string().transform(Number).default('10'),
  QUEUE_USER_WAIT_TIME_SECONDS: z.string().transform(Number).default('30'),
  
  // 日志配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
  
  // 监控配置
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('false'),
  METRICS_PORT: z.string().transform(Number).default('9090'),
  
  // 性能配置
  ENABLE_COMPRESSION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CACHING: z.string().transform(val => val === 'true').default('false'),
  CACHE_TTL: z.string().transform(Number).default('3600'),
});

// 验证和解析配置
function parseConfig() {
  try {
    const config = configSchema.parse(process.env);
    
    // 生产环境特殊验证
    if (config.NODE_ENV === 'production') {
      if (config.JWT_SECRET.length < 32) {
        throw new Error('生产环境JWT密钥必须至少32个字符');
      }
      
      if (!config.SESSION_SECRET) {
        throw new Error('生产环境必须设置SESSION_SECRET');
      }
      
      if (!config.REDIS_HOST) {
        console.warn('生产环境建议配置Redis用于会话管理');
      }
    }
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('配置验证失败:', error.errors);
    } else {
      console.error('配置解析失败:', error);
    }
    process.exit(1);
  }
}

// 获取配置实例
const appConfig = parseConfig();

// 配置工具函数
export function getConfig() {
  return appConfig;
}

export function isProduction() {
  return appConfig.NODE_ENV === 'production';
}

export function isDevelopment() {
  return appConfig.NODE_ENV === 'development';
}

export function isTest() {
  return appConfig.NODE_ENV === 'test';
}

// 数据库配置
export function getDatabaseConfig() {
  return {
    host: appConfig.DB_HOST,
    user: appConfig.DB_USER,
    password: appConfig.DB_PASSWORD,
    database: appConfig.DB_NAME,
    port: appConfig.DB_PORT,
    connectionLimit: appConfig.DB_CONNECTION_LIMIT,
    queueLimit: appConfig.DB_QUEUE_LIMIT,
    minIdle: appConfig.DB_MIN_IDLE,
    maxIdle: appConfig.DB_MAX_IDLE,
    acquireTimeout: appConfig.DB_ACQUIRE_TIMEOUT,
    timeout: appConfig.DB_TIMEOUT,
    maxRetries: appConfig.DB_MAX_RETRIES,
    retryDelay: appConfig.DB_RETRY_DELAY,
  };
}

// Redis配置
export function getRedisConfig() {
  if (!appConfig.REDIS_HOST) {
    return null;
  }
  
  return {
    host: appConfig.REDIS_HOST,
    port: appConfig.REDIS_PORT || 6379,
    password: appConfig.REDIS_PASSWORD,
    db: appConfig.REDIS_DB || 0,
  };
}

// 安全配置
export function getSecurityConfig() {
  return {
    jwtSecret: appConfig.JWT_SECRET,
    jwtExpiresIn: appConfig.JWT_EXPIRES_IN,
    sessionSecret: appConfig.SESSION_SECRET,
    cookieSecure: appConfig.COOKIE_SECURE,
    cookieHttpOnly: appConfig.COOKIE_HTTPONLY,
  };
}

// 导出配置
export default appConfig;