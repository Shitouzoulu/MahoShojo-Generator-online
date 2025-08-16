// API 统一类型定义和响应格式

// 基础响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationInfo;
  timestamp: string;
  requestId: string;
}

// 错误信息接口
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
  field?: string;
}

// 分页信息接口
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 成功响应创建函数
export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  pagination?: PaginationInfo
): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    timestamp: new Date().toISOString(),
    requestId
  };
}

// 错误响应创建函数
export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number,
  requestId: string,
  details?: any,
  field?: string
): ApiResponse {
  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
      details,
      field
    },
    timestamp: new Date().toISOString(),
    requestId
  };
}

// 分页信息创建函数
export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// 请求ID生成函数
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 标准错误代码
export const ErrorCodes = {
  // 认证相关
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // 验证相关
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // 资源相关
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',
  
  // 业务逻辑相关
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  
  // 系统相关
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // AI生成相关
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  GENERATION_QUEUE_FULL: 'GENERATION_QUEUE_FULL'
} as const;

// 标准HTTP状态码
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// 请求上下文接口
export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
}

// 扩展的Express请求接口
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  context?: RequestContext;
}

// 扩展的Express响应接口
export interface ApiResponse extends Express.Response {
  apiSuccess: <T>(data: T, pagination?: PaginationInfo) => void;
  apiError: (error: ApiError) => void;
}
