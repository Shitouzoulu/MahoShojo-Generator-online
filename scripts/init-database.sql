-- 魔法少女生成器数据库初始化脚本
-- 适用于 MySQL 8.0+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS mahoshojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mahoshojo;

-- 创建魔法少女角色表
CREATE TABLE IF NOT EXISTS magical_girls (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '真实姓名',
  flower_name VARCHAR(100) NOT NULL COMMENT '花名',
  appearance JSON NOT NULL COMMENT '外貌设定',
  spell TEXT NOT NULL COMMENT '变身咒语',
  main_color VARCHAR(20) NOT NULL COMMENT '主色调',
  first_page_color VARCHAR(7) NOT NULL COMMENT '第一个渐变色',
  second_page_color VARCHAR(7) NOT NULL COMMENT '第二个渐变色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_name (name),
  INDEX idx_flower_name (flower_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='魔法少女角色表';

-- 创建残兽表
CREATE TABLE IF NOT EXISTS canshou (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '残兽名称',
  stage VARCHAR(20) NOT NULL COMMENT '进化阶段',
  description TEXT NOT NULL COMMENT '残兽描述',
  appearance JSON NOT NULL COMMENT '外观设定',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_name (name),
  INDEX idx_stage (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='残兽表';

-- 创建战斗记录表
CREATE TABLE IF NOT EXISTS battles (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '战斗标题',
  participants JSON NOT NULL COMMENT '参战者信息',
  winner VARCHAR(100) COMMENT '胜利者',
  battle_report JSON NOT NULL COMMENT '战斗报告',
  mode ENUM('normal', 'daily', 'kizuna') NOT NULL COMMENT '战斗模式',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_winner (winner),
  INDEX idx_mode (mode),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战斗记录表';

-- 创建角色战斗历史表
CREATE TABLE IF NOT EXISTS character_battle_history (
  id VARCHAR(36) PRIMARY KEY,
  character_id VARCHAR(36) NOT NULL COMMENT '角色ID',
  character_type ENUM('magical_girl', 'canshou') NOT NULL COMMENT '角色类型',
  battle_id VARCHAR(36) NOT NULL COMMENT '战斗ID',
  role VARCHAR(20) NOT NULL COMMENT '角色在战斗中的角色',
  result ENUM('win', 'lose', 'draw') NOT NULL COMMENT '战斗结果',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_character (character_id),
  INDEX idx_battle (battle_id),
  INDEX idx_result (result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色战斗历史表';

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '邮箱',
  username VARCHAR(100) UNIQUE NOT NULL COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS user_characters (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  character_id VARCHAR(36) NOT NULL COMMENT '角色ID',
  character_type ENUM('magical_girl', 'canshou') NOT NULL COMMENT '角色类型',
  is_favorite BOOLEAN DEFAULT FALSE COMMENT '是否收藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_character (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 插入一些示例数据（可选）
INSERT INTO magical_girls (id, name, flower_name, appearance, spell, main_color, first_page_color, second_page_color) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  '白玫',
  '白玫瑰',
  '{"height": "158cm", "weight": "45kg", "hairColor": "银白色", "hairStyle": "及肩直发，发尾微卷", "eyeColor": "深蓝色", "skinTone": "白皙", "wearing": "白色蕾丝连衣裙，裙摆有玫瑰花纹", "specialFeature": "总是带着温柔的笑容", "mainColor": "白色", "firstPageColor": "#ffffff", "secondPageColor": "#f8f8f8"}',
  '纯白的花瓣，绽放吧！\n白玫瑰的守护者，在此觉醒！',
  '白色',
  '#ffffff',
  '#f8f8f8'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '翠雀',
  '翠雀花',
  '{"height": "162cm", "weight": "48kg", "hairColor": "深蓝色渐变", "hairStyle": "双马尾，发尾有蓝色挑染", "eyeColor": "翠绿色", "skinTone": "白皙", "wearing": "蓝色魔法少女装，有羽毛装饰", "specialFeature": "眼神锐利，行动敏捷", "mainColor": "蓝色", "firstPageColor": "#1e3a8a", "secondPageColor": "#3b82f6"}',
  '翠绿的羽翼，展翅高飞！\n翠雀花的守护者，在此觉醒！',
  '蓝色',
  '#1e3a8a',
  '#3b82f6'
);

-- 插入示例残兽数据
INSERT INTO canshou (id, name, stage, description, appearance) VALUES
(
  '550e8400-e29b-41d4-a716-446655440003',
  '暗影蜘蛛',
  '蛹',
  '由黑暗能量凝聚而成的巨大蜘蛛，能够操控阴影进行攻击',
  '{"form": "巨大的蜘蛛形态", "color": "深黑色", "size": "约3米高", "features": "八只眼睛，能够发射蛛丝"}'
);

-- 创建数据库用户（可选，用于生产环境）
-- CREATE USER 'mahoshojo_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON mahoshojo.* TO 'mahoshojo_user'@'localhost';
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

