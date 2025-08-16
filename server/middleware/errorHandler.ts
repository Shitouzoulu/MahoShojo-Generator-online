import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  console.error('错误详情:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // MySQL错误处理
  if (err.name === 'ER_DUP_ENTRY') {
    const message = '数据已存在';
    error = { message, statusCode: 400 } as AppError;
  }

  if (err.name === 'ER_NO_REFERENCED_ROW_2') {
    const message = '引用的数据不存在';
    error = { message, statusCode: 400 } as AppError;
  }

  if (err.name === 'ER_ROW_IS_REFERENCED_2') {
    const message = '数据正在被引用，无法删除';
    error = { message, statusCode: 400 } as AppError;
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    const message = '数据验证失败';
    error = { message, statusCode: 400 } as AppError;
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的令牌';
    error = { message, statusCode: 401 } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = '令牌已过期';
    error = { message, statusCode: 401 } as AppError;
  }

  // 默认错误状态码
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
};
