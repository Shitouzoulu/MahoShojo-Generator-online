# 多阶段构建Dockerfile - 阿里云ECS部署优化
FROM m.daocloud.io/docker.io/library/node:18-alpine AS base

# 使用国内镜像加速 Alpine 软件源
ARG ALPINE_MIRROR=mirrors.aliyun.com
RUN sed -i -e "s/dl-cdn.alpinelinux.org/${ALPINE_MIRROR}/g" /etc/apk/repositories

# 安装必要的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY bun.lock ./

# 安装依赖
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS builder

# 安装开发依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM base AS production

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 创建必要的目录
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nextjs:nodejs /app/uploads /app/logs

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
