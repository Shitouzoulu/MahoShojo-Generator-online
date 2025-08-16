import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: '访问令牌缺失',
          statusCode: 401
        }
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET环境变量未设置');
      return res.status(500).json({
        success: false,
        error: {
          message: '服务器配置错误',
          statusCode: 500
        }
      });
    }

    // 验证JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          message: '无效的访问令牌',
          statusCode: 401
        }
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          message: '访问令牌已过期',
          statusCode: 401
        }
      });
    }

    console.error('身份验证中间件错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: '身份验证失败',
        statusCode: 500
      }
    });
  }
};

// 可选的身份验证中间件（不强制要求登录）
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        req.user = {
          id: decoded.id,
          email: decoded.email,
          username: decoded.username
        };
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
};
