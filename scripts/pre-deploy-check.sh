#!/bin/bash

# 部署前检查脚本 - 帮助诊断构建问题
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

echo "=== 部署前检查开始 ==="

# 检查 Node.js 版本
log_info "检查 Node.js 版本..."
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
NODE_MINOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f2)

if [ "$NODE_MAJOR" -ge 18 ] && [ "$NODE_MINOR" -ge 17 ]; then
    log_success "Node.js 版本: $NODE_VERSION ✓"
elif [ "$NODE_MAJOR" -ge 20 ] && [ "$NODE_MINOR" -ge 8 ]; then
    log_success "Node.js 版本: $NODE_VERSION ✓"
else
    log_error "Node.js 版本过低: $NODE_VERSION"
    log_error "需要 Node.js 18.17+ 或 20.8+"
    exit 1
fi

# 检查 npm 版本
log_info "检查 npm 版本..."
NPM_VERSION=$(npm --version)
log_success "npm 版本: $NPM_VERSION"

# 检查系统内存
log_info "检查系统内存..."
if command -v free >/dev/null 2>&1; then
    MEMORY_KB=$(free | grep Mem | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    if [ $MEMORY_GB -ge 2 ]; then
        log_success "系统内存: ${MEMORY_GB}GB ✓"
    else
        log_warning "系统内存较低: ${MEMORY_GB}GB (建议至少2GB)"
    fi
else
    log_warning "无法检查系统内存"
fi

# 检查磁盘空间
log_info "检查磁盘空间..."
DISK_SPACE=$(df . | tail -1 | awk '{print $4}')
DISK_SPACE_GB=$((DISK_SPACE / 1024 / 1024))
if [ $DISK_SPACE_GB -ge 5 ]; then
    log_success "可用磁盘空间: ${DISK_SPACE_GB}GB ✓"
else
    log_warning "磁盘空间较低: ${DISK_SPACE_GB}GB (建议至少5GB)"
fi

# 检查环境变量文件
log_info "检查环境配置文件..."
if [ -f ".env.production" ]; then
    log_success "找到 .env.production 文件 ✓"
else
    log_warning "未找到 .env.production 文件"
    log_info "请复制 env.production.example 为 .env.production 并配置"
fi

# 检查依赖安装
log_info "检查依赖包..."
if [ -d "node_modules" ]; then
    log_success "node_modules 目录存在 ✓"
else
    log_warning "node_modules 目录不存在，正在安装依赖..."
    npm install
fi

# 清理构建缓存
log_info "清理构建缓存..."
rm -rf .next dist

# 尝试构建
log_info "尝试构建应用..."
if npm run build; then
    log_success "构建成功！✓"
else
    log_error "构建失败！"
    log_info "请检查以下可能的问题："
    log_info "1. 环境变量配置是否正确"
    log_info "2. 依赖包是否完整安装"
    log_info "3. Node.js 版本是否兼容"
    log_info "4. 系统资源是否充足"
    exit 1
fi

echo "=== 部署前检查完成 ==="
