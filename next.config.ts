import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境优化配置
  output: 'standalone', // 支持阿里云ECS部署
  
  // 图片优化配置
  images: {
    unoptimized: false, // 启用图片优化
    domains: [], // 允许的图片域名
    formats: ['image/webp', 'image/avif'], // 支持的图片格式
  },
  
  // 构建优化
  experimental: {
    optimizeCss: true, // 优化CSS
    optimizePackageImports: ['lucide-react'], // 优化包导入
  },
  
  // 压缩配置
  compress: true,
  
  // 其他配置
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 重定向配置（可选）
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
