# 数据库架构设置指南

## 概述

本项目已从Cloudflare D1数据库迁移到MySQL数据库，支持完整的CRUD操作、事务处理和关系型数据管理。

## 数据库要求

- **MySQL版本**: 8.0+
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **存储引擎**: InnoDB

## 快速开始

### 1. 安装MySQL

#### Windows
```bash
# 下载并安装MySQL 8.0+
# 或使用WSL2安装
wsl --install Ubuntu
wsl
sudo apt update
sudo apt install mysql-server-8.0
```

#### macOS
```bash
# 使用Homebrew
brew install mysql
brew services start mysql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server-8.0
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. 配置MySQL

```bash
# 安全配置
sudo mysql_secure_installation

# 登录MySQL
sudo mysql -u root -p
```

### 3. 创建数据库和用户

```sql
-- 创建数据库
CREATE DATABASE mahoshojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER 'mahoshojo_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON mahoshojo.* TO 'mahoshojo_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. 初始化数据库表

```bash
# 方法1: 直接执行SQL脚本
mysql -u root -p mahoshojo < scripts/init-database.sql

# 方法2: 使用测试脚本自动初始化
npm run test:database
```

### 5. 配置环境变量

复制 `env.example` 为 `.env.local` 并修改数据库配置：

```bash
cp env.example .env.local
```

编辑 `.env.local`：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=mahoshojo
DB_PORT=3306
```

## 数据库架构

### 核心表结构

#### 1. 魔法少女表 (magical_girls)
- `id`: 唯一标识符 (UUID)
- `name`: 真实姓名
- `flower_name`: 花名
- `appearance`: 外貌设定 (JSON)
- `spell`: 变身咒语
- `main_color`: 主色调
- `first_page_color`: 第一个渐变色
- `second_page_color`: 第二个渐变色
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 2. 残兽表 (canshou)
- `id`: 唯一标识符 (UUID)
- `name`: 残兽名称
- `stage`: 进化阶段
- `description`: 残兽描述
- `appearance`: 外观设定 (JSON)
- `created_at`: 创建时间

#### 3. 战斗记录表 (battles)
- `id`: 唯一标识符 (UUID)
- `title`: 战斗标题
- `participants`: 参战者信息 (JSON)
- `winner`: 胜利者
- `battle_report`: 战斗报告 (JSON)
- `mode`: 战斗模式 (normal/daily/kizuna)
- `created_at`: 创建时间

#### 4. 角色战斗历史表 (character_battle_history)
- `id`: 唯一标识符 (UUID)
- `character_id`: 角色ID
- `character_type`: 角色类型 (magical_girl/canshou)
- `battle_id`: 战斗ID
- `role`: 角色在战斗中的角色
- `result`: 战斗结果 (win/lose/draw)
- `created_at`: 创建时间

#### 5. 用户表 (users)
- `id`: 唯一标识符 (UUID)
- `email`: 邮箱
- `username`: 用户名
- `password_hash`: 密码哈希
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 6. 用户角色关联表 (user_characters)
- `id`: 唯一标识符 (UUID)
- `user_id`: 用户ID
- `character_id`: 角色ID
- `character_type`: 角色类型
- `is_favorite`: 是否收藏
- `created_at`: 创建时间

### 索引设计

- 主键索引：所有表的 `id` 字段
- 唯一索引：`users.email`, `users.username`
- 普通索引：`magical_girls.name`, `magical_girls.flower_name`
- 复合索引：`character_battle_history.character_id + character_type`

## 服务层架构

### 1. 数据库连接层 (`lib/database.ts`)
- 连接池管理
- 事务处理
- 通用查询执行器

### 2. 业务服务层
- `MagicalGirlService`: 魔法少女CRUD操作
- `BattleService`: 战斗记录管理
- `CanshouService`: 残兽管理
- `UserService`: 用户管理

### 3. 数据访问模式
- Repository模式
- 事务性操作
- 分页查询
- 搜索功能

## 使用示例

### 创建魔法少女
```typescript
import { MagicalGirlService } from '../lib/services/magicalGirlService';

const magicalGirl = await MagicalGirlService.create({
  name: '张三',
  flower_name: '樱花',
  appearance: { /* ... */ },
  spell: '樱花绽放！',
  main_color: '粉色',
  first_page_color: '#ff69b4',
  second_page_color: '#ff1493'
});
```

### 创建战斗记录
```typescript
import { BattleService } from '../lib/services/battleService';

const battle = await BattleService.create({
  title: '樱花vs玫瑰',
  participants: [/* ... */],
  winner: '樱花',
  battle_report: { /* ... */ },
  mode: 'normal'
});
```

### 查询角色战斗历史
```typescript
const history = await BattleService.getCharacterBattleHistory(
  'character_id', 
  'magical_girl'
);
```

## 性能优化

### 1. 连接池配置
- 最大连接数：10
- 连接超时：60秒
- 自动重连：启用

### 2. 查询优化
- 使用索引字段进行查询
- 分页查询避免大量数据
- JSON字段的合理使用

### 3. 事务管理
- 批量操作使用事务
- 合理的锁粒度
- 避免长事务

## 故障排除

### 常见问题

#### 1. 连接失败
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查端口占用
netstat -tlnp | grep 3306
```

#### 2. 权限问题
```sql
-- 检查用户权限
SHOW GRANTS FOR 'mahoshojo_user'@'localhost';

-- 重新授权
GRANT ALL PRIVILEGES ON mahoshojo.* TO 'mahoshojo_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. 字符集问题
```sql
-- 检查数据库字符集
SHOW CREATE DATABASE mahoshojo;

-- 检查表字符集
SHOW CREATE TABLE magical_girls;
```

### 日志查看
```bash
# MySQL错误日志
sudo tail -f /var/log/mysql/error.log

# 应用日志
npm run dev:pretty
```

## 下一步

完成数据库设置后，您可以：

1. 运行测试脚本验证功能
2. 开始第二步：后端架构重构
3. 配置生产环境数据库
4. 设置数据库备份策略

## 支持

如果遇到问题，请：

1. 检查环境变量配置
2. 查看MySQL错误日志
3. 运行测试脚本诊断
4. 提交Issue到项目仓库

