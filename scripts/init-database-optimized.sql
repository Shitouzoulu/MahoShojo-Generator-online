-- 魔法少女生成器数据库优化初始化脚本
-- 适用于 MySQL 8.0+ 生产环境

-- 创建数据库
CREATE DATABASE IF NOT EXISTS mahoshojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mahoshojo;

-- 创建魔法少女角色表（优化版）
CREATE TABLE IF NOT EXISTS magical_girls (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '真实姓名',
  flower_name VARCHAR(100) NOT NULL COMMENT '花名',
  appearance JSON NOT NULL COMMENT '外貌设定',
  spell TEXT NOT NULL COMMENT '变身咒语',
  main_color VARCHAR(20) NOT NULL COMMENT '主色调',
  first_page_color VARCHAR(7) NOT NULL COMMENT '第一个渐变色',
  second_page_color VARCHAR(7) NOT NULL COMMENT '第二个渐变色',
  user_id VARCHAR(36) COMMENT '创建用户ID',
  is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开',
  view_count INT DEFAULT 0 COMMENT '查看次数',
  like_count INT DEFAULT 0 COMMENT '点赞次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引优化
  INDEX idx_name (name),
  INDEX idx_flower_name (flower_name),
  INDEX idx_user_id (user_id),
  INDEX idx_main_color (main_color),
  INDEX idx_created_at (created_at),
  INDEX idx_public_created (is_public, created_at),
  INDEX idx_view_count (view_count),
  INDEX idx_like_count (like_count),
  
  -- 约束
  CONSTRAINT chk_main_color CHECK (main_color IN ('白色', '红色', '蓝色', '绿色', '黄色', '紫色', '粉色', '橙色', '黑色', '灰色')),
  CONSTRAINT chk_colors CHECK (first_page_color REGEXP '^#[0-9A-Fa-f]{6}$' AND second_page_color REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='魔法少女角色表';

-- 创建残兽表（优化版）
CREATE TABLE IF NOT EXISTS canshou (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '残兽名称',
  stage ENUM('卵', '幼虫', '蛹', '成虫') NOT NULL COMMENT '进化阶段',
  description TEXT NOT NULL COMMENT '残兽描述',
  appearance JSON NOT NULL COMMENT '外观设定',
  power_level INT DEFAULT 1 COMMENT '力量等级 1-10',
  user_id VARCHAR(36) COMMENT '创建用户ID',
  is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引优化
  INDEX idx_name (name),
  INDEX idx_stage (stage),
  INDEX idx_user_id (user_id),
  INDEX idx_power_level (power_level),
  INDEX idx_public_stage (is_public, stage),
  
  -- 约束
  CONSTRAINT chk_power_level CHECK (power_level >= 1 AND power_level <= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='残兽表';

-- 创建战斗记录表（优化版）
CREATE TABLE IF NOT EXISTS battles (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '战斗标题',
  participants JSON NOT NULL COMMENT '参战者信息',
  winner VARCHAR(100) COMMENT '胜利者',
  battle_report JSON NOT NULL COMMENT '战斗报告',
  mode ENUM('normal', 'daily', 'kizuna') NOT NULL COMMENT '战斗模式',
  user_id VARCHAR(36) COMMENT '创建用户ID',
  is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开',
  view_count INT DEFAULT 0 COMMENT '查看次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引优化
  INDEX idx_winner (winner),
  INDEX idx_mode (mode),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_public_mode (is_public, mode),
  INDEX idx_participants ((CAST(participants AS CHAR(100)))),
  
  -- 约束
  CONSTRAINT chk_title_length CHECK (CHAR_LENGTH(title) >= 10 AND CHAR_LENGTH(title) <= 200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战斗记录表';

-- 创建角色战斗历史表（优化版）
CREATE TABLE IF NOT EXISTS character_battle_history (
  id VARCHAR(36) PRIMARY KEY,
  character_id VARCHAR(36) NOT NULL COMMENT '角色ID',
  character_type ENUM('magical_girl', 'canshou') NOT NULL COMMENT '角色类型',
  battle_id VARCHAR(36) NOT NULL COMMENT '战斗ID',
  role VARCHAR(20) NOT NULL COMMENT '角色在战斗中的角色',
  result ENUM('win', 'lose', 'draw') NOT NULL COMMENT '战斗结果',
  performance_score INT DEFAULT 0 COMMENT '表现评分 0-100',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引优化
  INDEX idx_character (character_id),
  INDEX idx_battle (battle_id),
  INDEX idx_result (result),
  INDEX idx_character_type (character_type),
  INDEX idx_performance (performance_score),
  INDEX idx_character_battle (character_id, battle_id),
  
  -- 约束
  CONSTRAINT chk_performance_score CHECK (performance_score >= 0 AND performance_score <= 100),
  UNIQUE KEY unique_character_battle (character_id, battle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色战斗历史表';

-- 创建用户表（优化版）
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '邮箱',
  username VARCHAR(100) UNIQUE NOT NULL COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  bio TEXT COMMENT '个人简介',
  role ENUM('guest', 'user', 'premium', 'admin') DEFAULT 'user' COMMENT '用户角色',
  status ENUM('active', 'suspended', 'banned') DEFAULT 'active' COMMENT '账户状态',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  login_count INT DEFAULT 0 COMMENT '登录次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引优化
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_last_login (last_login_at),
  
  -- 约束
  CONSTRAINT chk_username_length CHECK (CHAR_LENGTH(username) >= 3 AND CHAR_LENGTH(username) <= 100),
  CONSTRAINT chk_email_format CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建用户角色关联表（优化版）
CREATE TABLE IF NOT EXISTS user_characters (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  character_id VARCHAR(36) NOT NULL COMMENT '角色ID',
  character_type ENUM('magical_girl', 'canshou') NOT NULL COMMENT '角色类型',
  is_favorite BOOLEAN DEFAULT FALSE COMMENT '是否收藏',
  notes TEXT COMMENT '用户笔记',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引优化
  INDEX idx_user (user_id),
  INDEX idx_character (character_id),
  INDEX idx_favorite (is_favorite),
  INDEX idx_user_type (user_id, character_type),
  INDEX idx_character_user (character_id, user_id),
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_character (user_id, character_id, character_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 创建用户收藏表（新增）
CREATE TABLE IF NOT EXISTS user_favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  target_id VARCHAR(36) NOT NULL COMMENT '目标ID',
  target_type ENUM('magical_girl', 'canshou', 'battle') NOT NULL COMMENT '目标类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  
  -- 索引优化
  INDEX idx_user (user_id),
  INDEX idx_target (target_id, target_type),
  INDEX idx_user_type (user_id, target_type),
  INDEX idx_created_at (created_at),
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_target (user_id, target_id, target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

-- 创建用户会话表（新增）
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  token VARCHAR(500) NOT NULL COMMENT '会话令牌',
  expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引优化
  INDEX idx_user (user_id),
  INDEX idx_token (token(100)),
  INDEX idx_expires (expires_at),
  INDEX idx_user_expires (user_id, expires_at),
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- 创建系统配置表（新增）
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(36) PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  description TEXT COMMENT '配置描述',
  is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引优化
  INDEX idx_config_key (config_key),
  INDEX idx_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入系统默认配置
INSERT INTO system_config (id, config_key, config_value, config_type, description, is_public) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'max_characters_per_user', '100', 'number', '每个用户最大角色数量', true),
('550e8400-e29b-41d4-a716-446655440011', 'max_battles_per_user', '50', 'number', '每个用户最大战斗记录数量', true),
('550e8400-e29b-41d4-a716-446655440012', 'ai_generation_rate_limit', '10', 'number', 'AI生成速率限制（每分钟）', true),
('550e8400-e29b-41d4-a716-446655440013', 'maintenance_mode', 'false', 'boolean', '维护模式开关', true);

-- 创建数据库用户（生产环境使用）
-- CREATE USER 'mahoshojo_user'@'%' IDENTIFIED BY 'your_secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mahoshojo.* TO 'mahoshojo_user'@'%';
-- FLUSH PRIVILEGES;

-- 显示创建的表
SHOW TABLES;

-- 显示表结构
DESCRIBE magical_girls;
DESCRIBE canshou;
DESCRIBE battles;
DESCRIBE character_battle_history;
DESCRIBE users;
DESCRIBE user_characters;
DESCRIBE user_favorites;
DESCRIBE user_sessions;
DESCRIBE system_config;
