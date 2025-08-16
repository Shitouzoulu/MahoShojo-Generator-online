const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mahoshojo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// 创建连接池
let pool: any = null;

async function getConnection() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await getConnection();
    
    // 创建魔法少女角色表
    await connection.execute(`
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
    await connection.execute(`
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
    await connection.execute(`
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
    await connection.execute(`
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
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户角色关联表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_characters (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        character_id VARCHAR(36) NOT NULL,
        character_type ENUM('magical_girl', 'canshou') NOT NULL,
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_character (character_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建立绘任务表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tachie_tasks (
        id VARCHAR(36) PRIMARY KEY,
        character_data JSON NOT NULL,
        style VARCHAR(50) NOT NULL,
        size VARCHAR(20) DEFAULT 'medium',
        user_preferences JSON,
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        result_url VARCHAR(500),
        error_message TEXT,
        user_id VARCHAR(36),
        parent_task_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_task_id) REFERENCES tachie_tasks(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_style (style),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 关闭数据库连接
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 数据库操作工具函数
async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw error;
  }
}

async function executeTransaction(callback: (connection: any) => Promise<any>): Promise<any> {
  const connection = await getConnection();
  const conn = await connection.getConnection();
  
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getConnection,
  initDatabase,
  closeDatabase,
  generateUUID,
  executeQuery,
  executeTransaction
};

