import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ErrorCodes, HttpStatus, generateRequestId } from '../../lib/types/api';
import { getLogger } from '../../lib/logger';

const logger = getLogger('errorHandler');

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;
  public field?: string;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCodes.INTERNAL_ERROR,
    details?: any,
    field?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.field = field;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 业务逻辑错误
export class BusinessError extends AppError {
  constructor(message: string, details?: any, field?: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCodes.OPERATION_FAILED, details, field);
  }
}

// 验证错误
export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, details, field);
  }
}

// 认证错误
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
  }
}

// 权限错误
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
  }
}

// 资源不存在错误
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}不存在`, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
}

// 冲突错误
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, HttpStatus.CONFLICT, ErrorCodes.ALREADY_EXISTS);
  }
}

// 速率限制错误
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMIT_EXCEEDED);
  }
}

// 主错误处理中间件
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  // 记录错误日志
  logger.error('错误处理中间件捕获到错误', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: (error as AppError).statusCode,
      code: (error as AppError).code
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // 如果是已知的操作性错误
  if (error instanceof AppError && error.isOperational) {
    const errorResponse = createErrorResponse(
      error.message,
      error.code,
      error.statusCode,
      requestId,
      error.details,
      error.field
    );

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // 处理数据库错误
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    const validationError = createErrorResponse(
      '数据验证失败',
      ErrorCodes.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      requestId,
      error.message
    );

    res.status(HttpStatus.BAD_REQUEST).json(validationError);
    return;
  }

  // 处理JWT错误
  if (error.name === 'JsonWebTokenError') {
    const jwtError = createErrorResponse(
      '无效的认证令牌',
      ErrorCodes.INVALID_TOKEN,
      HttpStatus.UNAUTHORIZED,
      requestId
    );

    res.status(HttpStatus.UNAUTHORIZED).json(jwtError);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const tokenExpiredError = createErrorResponse(
      '认证令牌已过期',
      ErrorCodes.TOKEN_EXPIRED,
      HttpStatus.UNAUTHORIZED,
      requestId
    );

    res.status(HttpStatus.UNAUTHORIZED).json(tokenExpiredError);
    return;
  }

  // 处理AI服务错误
  if (error.message.includes('AI') || error.message.includes('generation')) {
    const aiError = createErrorResponse(
      'AI生成服务暂时不可用，请稍后重试',
      ErrorCodes.AI_SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      requestId,
      error.message
    );

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json(aiError);
    return;
  }

  // 默认服务器内部错误
  const internalError = createErrorResponse(
    process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
    ErrorCodes.INTERNAL_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR,
    requestId,
    process.env.NODE_ENV === 'development' ? error.stack : undefined
  );

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(internalError);
}

// 异步错误包装器
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404错误处理
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  const notFoundError = createErrorResponse(
    `路径 ${req.originalUrl} 不存在`,
    ErrorCodes.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    requestId
  );

  res.status(HttpStatus.NOT_FOUND).json(notFoundError);
}

// 请求ID中间件
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

// 响应时间中间件
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const requestId = req.headers['x-request-id'] as string;
    
    logger.info('请求完成', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
}
