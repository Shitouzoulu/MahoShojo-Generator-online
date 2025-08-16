# MySQL 安装指南

## Windows 系统安装 MySQL

### 方法1：使用官方安装包（推荐）

1. **下载 MySQL**
   - 访问 [MySQL 官方下载页面](https://dev.mysql.com/downloads/mysql/)
   - 选择 "MySQL Community Server"
   - 选择 Windows 版本 (x86, 64-bit)
   - 下载 MSI 安装包

2. **安装步骤**
   ```bash
   # 双击下载的 .msi 文件
   # 选择 "Developer Default" 或 "Server only"
   # 设置 root 密码（请记住这个密码！）
   # 完成安装
   ```

3. **验证安装**
   ```bash
   # 打开命令提示符，检查 MySQL 是否安装成功
   mysql --version
   
   # 如果提示找不到命令，需要将 MySQL 添加到系统 PATH
   # 通常路径为：C:\Program Files\MySQL\MySQL Server 8.0\bin
   ```

### 方法2：使用 WSL2（Windows Subsystem for Linux）

1. **安装 WSL2**
   ```bash
   # 以管理员身份运行 PowerShell
   wsl --install
   
   # 重启电脑
   # 重启后会自动安装 Ubuntu
   ```

2. **在 WSL2 中安装 MySQL**
   ```bash
   # 打开 WSL2 终端
   sudo apt update
   sudo apt install mysql-server-8.0
   
   # 启动 MySQL 服务
   sudo systemctl start mysql
   sudo systemctl enable mysql
   
   # 安全配置
   sudo mysql_secure_installation
   ```

3. **配置 MySQL 允许远程连接**
   ```bash
   # 登录 MySQL
   sudo mysql -u root -p
   
   # 创建数据库和用户
   CREATE DATABASE mahoshojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'mahoshojo_user'@'%' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON mahoshojo.* TO 'mahoshojo_user'@'%';
   FLUSH PRIVILEGES;
   EXIT;
   
   # 修改 MySQL 配置允许远程连接
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
   
   # 找到 bind-address 行，修改为：
   bind-address = 0.0.0.0
   
   # 重启 MySQL 服务
   sudo systemctl restart mysql
   ```

### 方法3：使用 Docker（推荐用于开发）

1. **安装 Docker Desktop**
   - 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

2. **运行 MySQL 容器**
   ```bash
   # 创建并运行 MySQL 容器
   docker run --name mysql-mahoshojo \
     -e MYSQL_ROOT_PASSWORD=your_root_password \
     -e MYSQL_DATABASE=mahoshojo \
     -e MYSQL_USER=mahoshojo_user \
     -e MYSQL_PASSWORD=your_password \
     -p 3306:3306 \
     -d mysql:8.0
   
   # 检查容器状态
   docker ps
   
   # 查看容器日志
   docker logs mysql-mahoshojo
   ```

3. **连接到 MySQL 容器**
   ```bash
   # 进入容器
   docker exec -it mysql-mahoshojo mysql -u root -p
   
   # 或者从外部连接
   mysql -h localhost -P 3306 -u root -p
   ```

## 配置环境变量

安装完成后，您需要配置环境变量。由于 `.env.local` 文件被 gitignore 阻止，您可以：

### 方法1：在测试脚本中设置（已实现）
测试脚本已经包含了默认的环境变量设置。

### 方法2：创建环境配置文件
```bash
# 创建 .env.local 文件（如果可能的话）
echo "DB_HOST=localhost" > .env.local
echo "DB_USER=root" >> .env.local
echo "DB_PASSWORD=your_password" >> .env.local
echo "DB_NAME=mahoshojo" >> .env.local
echo "DB_PORT=3306" >> .env.local
```

### 方法3：在系统环境变量中设置
```bash
# Windows PowerShell
$env:DB_HOST = "localhost"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your_password"
$env:DB_NAME = "mahoshojo"
$env:DB_PORT = "3306"
```

## 验证安装

安装完成后，运行以下命令验证：

```bash
# 检查 MySQL 版本
mysql --version

# 连接到 MySQL
mysql -u root -p

# 在 MySQL 中执行
SHOW DATABASES;
CREATE DATABASE mahoshojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mahoshojo;
SHOW TABLES;
```

## 常见问题解决

### 1. 端口被占用
```bash
# 检查端口占用
netstat -ano | findstr :3306

# 如果端口被占用，可以修改 MySQL 配置使用其他端口
# 或者停止占用端口的服务
```

### 2. 权限问题
```bash
# 在 MySQL 中执行
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### 3. 字符集问题
```bash
# 检查字符集
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';

# 如果需要，修改字符集
SET GLOBAL character_set_server = 'utf8mb4';
SET GLOBAL collation_server = 'utf8mb4_unicode_ci';
```

## 下一步

完成 MySQL 安装后：

1. **运行数据库测试**
   ```bash
   npm run test:database
   ```

2. **如果测试成功**，继续下一步：后端架构重构
3. **如果测试失败**，根据错误信息进行相应的配置调整

## 支持

如果遇到问题：

1. 检查 MySQL 服务状态
2. 查看 MySQL 错误日志
3. 确认网络连接和防火墙设置
4. 参考 [MySQL 官方文档](https://dev.mysql.com/doc/)

