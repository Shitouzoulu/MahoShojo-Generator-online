import mysql from 'mysql2/promise';
import { getLogger } from './logger';

const logger = getLogger('database');

// 数据库连接配置 - 生产环境优化
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mahoshojo',
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // 连接池配置 - 生产环境优化
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '50'), // 增加连接数
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '100'), // 增加队列限制
  
  // 超时配置
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
  reconnect: true,
  
  // 字符集和编码
  charset: 'utf8mb4',
  
  // 生产环境安全配置
  multipleStatements: false, // 禁用多语句查询防止SQL注入
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
  
  // 连接池优化配置
  minIdle: parseInt(process.env.DB_MIN_IDLE || '10'), // 最小空闲连接
  maxIdle: parseInt(process.env.DB_MAX_IDLE || '20'), // 最大空闲连接
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'), // 空闲超时
  
  // 重试配置
  maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'), // 增加重试次数
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
  
  // SSL配置（生产环境）
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  
  // 连接验证配置
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// 创建连接池
let pool: mysql.Pool | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;
let poolStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  waitingConnections: 0,
  lastHealthCheck: null as Date | null,
};

// 获取数据库连接池
async function getConnection(): Promise<mysql.Pool> {
  if (!pool) {
    if (isInitializing) {
      // 等待初始化完成
      await initPromise;
      if (!pool) {
        throw new Error('数据库连接池初始化失败');
      }
      return pool;
    }
    
    isInitializing = true;
    initPromise = initializePool();
    await initPromise;
    if (!pool) {
      throw new Error('数据库连接池初始化失败');
    }
  }
  return pool;
}

// 初始化连接池
async function initializePool(): Promise<void> {
  try {
    logger.info('初始化数据库连接池...', { 
      host: dbConfig.host, 
      database: dbConfig.database,
      connectionLimit: dbConfig.connectionLimit,
      environment: process.env.NODE_ENV
    });

    pool = mysql.createPool(dbConfig);

    // 设置连接池事件监听
    pool.on('connection', () => {
      logger.debug('新的数据库连接已创建');
      poolStats.totalConnections++;
    });

    pool.on('acquire', () => {
      poolStats.activeConnections++;
      poolStats.idleConnections = Math.max(0, poolStats.idleConnections - 1);
    });

    pool.on('release', () => {
      poolStats.activeConnections = Math.max(0, poolStats.activeConnections - 1);
      poolStats.idleConnections++;
    });

    pool.on('enqueue', () => {
      poolStats.waitingConnections++;
    });

    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info('数据库连接池初始化成功');
    poolStats.lastHealthCheck = new Date();
  } catch (error: any) {
    logger.error('数据库连接池初始化失败', { error: error.message });
    pool = null;
    throw error;
  } finally {
    isInitializing = false;
  }
}

// 执行查询（带重试机制和性能监控）
async function executeQuery<T>(
  query: string, 
  params: any[] = [], 
  retryCount = 0
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(query, params);
    
    const executionTime = Date.now() - startTime;
    
    // 记录慢查询
    if (executionTime > 1000) { // 超过1秒的查询
      logger.warn('检测到慢查询', {
        query: query.substring(0, 200) + '...',
        executionTime: `${executionTime}ms`,
        params: params.length > 0 ? '有参数' : '无参数'
      });
    }
    
    return rows as T;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    // 检查是否为可重试的错误
    if (isRetryableError(error) && retryCount < dbConfig.maxRetries) {
      logger.warn(`数据库查询失败，正在重试 (${retryCount + 1}/${dbConfig.maxRetries})`, {
        error: error.message,
        query: query.substring(0, 100) + '...',
        executionTime: `${executionTime}ms`
      });
      
      await new Promise(resolve => setTimeout(resolve, dbConfig.retryDelay * (retryCount + 1)));
      return executeQuery(query, params, retryCount + 1);
    }
    
    logger.error('数据库查询执行失败', { 
      error: error.message, 
      query: query.substring(0, 200) + '...',
      params: params.length > 0 ? '有参数' : '无参数',
      executionTime: `${executionTime}ms`
    });
    throw error;
  }
}

// 判断是否为可重试的错误
function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
    'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_CONNECTION_KILLED'
  ];
  
  return retryableCodes.includes(error.code) || 
         error.message.includes('Connection lost') ||
         error.message.includes('Connection refused') ||
         error.message.includes('Connection killed');
}

// 获取连接池状态 - 增强版
function getPoolStatus() {
  if (!pool) {
    return { 
      status: 'not_initialized',
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    status: 'active',
    timestamp: new Date().toISOString(),
    config: {
      totalConnections: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit,
      minIdle: dbConfig.minIdle,
      maxIdle: dbConfig.maxIdle
    },
    current: {
      totalConnections: poolStats.totalConnections,
      activeConnections: poolStats.activeConnections,
      idleConnections: poolStats.idleConnections,
      waitingConnections: poolStats.waitingConnections
    },
    lastHealthCheck: poolStats.lastHealthCheck
  };
}

// 健康检查 - 增强版
async function healthCheck(): Promise<{ healthy: boolean; details: any }> {
  try {
    const startTime = Date.now();
    const connection = await getConnection();
    const conn = await connection.getConnection();
    await conn.ping();
    conn.release();
    
    const responseTime = Date.now() - startTime;
    poolStats.lastHealthCheck = new Date();
    
    return {
      healthy: true,
      details: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        poolStatus: getPoolStatus()
      }
    };
  } catch (error: any) {
    logger.error('数据库健康检查失败', { error: error.message });
    return {
      healthy: false,
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
        poolStatus: getPoolStatus()
      }
    };
  }
}

// 关闭连接池
async function closePool(): Promise<void> {
  if (pool) {
    logger.info('正在关闭数据库连接池...');
    await pool.end();
    pool = null;
    poolStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      lastHealthCheck: null,
    };
    logger.info('数据库连接池已关闭');
  }
}

// 定期健康检查
function startHealthCheck(intervalMs: number = 30000) {
  setInterval(async () => {
    try {
      const health = await healthCheck();
      if (!health.healthy) {
        logger.error('数据库健康检查失败', health.details);
      }
    } catch (error) {
      logger.error('健康检查执行失败', { error });
    }
  }, intervalMs);
}

// 初始化数据库表
async function initDatabase() {
  try {
    logger.info('开始初始化数据库表...');
    
    // 创建魔法少女角色表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS magical_girls (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        flower_name VARCHAR(100) NOT NULL,
        appearance JSON NOT NULL,
        spell TEXT NOT NULL,
        main_color VARCHAR(20) NOT NULL,
        first_page_color VARCHAR(7) NOT NULL,
        second_page_color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_flower_name (flower_name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建残兽表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS canshou (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stage VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        appearance JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_stage (stage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建战斗记录表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS battles (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        participants JSON NOT NULL,
        winner VARCHAR(100),
        battle_report JSON NOT NULL,
        mode ENUM('normal', 'daily', 'kizuna') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_winner (winner),
        INDEX idx_mode (mode),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建角色战斗历史表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS character_battle_history (
        id VARCHAR(36) PRIMARY KEY,
        character_id VARCHAR(36) NOT NULL,
        character_type ENUM('magical_girl', 'canshou') NOT NULL,
        battle_id VARCHAR(36) NOT NULL,
        role VARCHAR(20) NOT NULL,
        result ENUM('win', 'lose', 'draw') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_character (character_id),
        INDEX idx_battle (battle_id),
        INDEX idx_result (result)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
        status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NULL,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户会话表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建API请求日志表
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS api_request_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INT NOT NULL,
        response_time INT NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_endpoint (endpoint),
        INDEX idx_status_code (status_code),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('数据库表初始化完成');
  } catch (error: any) {
    logger.error('数据库表初始化失败', { error: error.message });
    throw error;
  }
}

export {
  getConnection,
  executeQuery,
  getPoolStatus,
  healthCheck,
  closePool,
  initDatabase,
  startHealthCheck
};

