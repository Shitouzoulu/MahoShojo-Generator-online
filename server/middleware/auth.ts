import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { executeQuery, generateUUID } from '../../lib/database';
import { AuthenticationError, AuthorizationError, ValidationError } from './errorHandler';
import { getLogger } from '../../lib/logger';

const logger = getLogger('auth');

// 用户角色枚举
export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  PREMIUM = 'premium',
  ADMIN = 'admin'
}

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

// 用户接口
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  bio?: string;
  last_login_at?: Date;
  login_count: number;
  created_at: Date;
  updated_at: Date;
}

// 扩展的请求接口
export interface AuthenticatedRequest extends Request {
  user?: User;
  context?: {
    requestId: string;
    userId?: string;
    userRole?: UserRole;
    ipAddress?: string;
    userAgent?: string;
    startTime: number;
  };
}

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生成JWT令牌
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status
  };

  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN });
}

// 验证JWT令牌
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret);
  } catch (error) {
    throw new AuthenticationError('无效的认证令牌');
  }
}

// 从请求头提取令牌
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// 主认证中间件
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('缺少认证令牌');
    }

    const decoded = verifyToken(token);
    
    // 检查用户状态
    if (decoded.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('账户已被禁用');
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      status: decoded.status
    } as User;

    next();
  } catch (error) {
    next(error);
  }
}

// 可选认证中间件（不强制要求认证）
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded.status === UserStatus.ACTIVE) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role,
          status: decoded.status
        } as User;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
}

// 角色权限检查中间件
export function requireRole(roles: UserRole | UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('需要登录'));
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('权限不足'));
    }

    next();
  };
}

// 管理员权限检查
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole([UserRole.ADMIN])(req, res, next);
}

// 高级用户权限检查（管理员和高级用户）
export function requirePremium(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole([UserRole.PREMIUM, UserRole.ADMIN])(req, res, next);
}

// 资源所有权检查中间件
export function requireOwnership(resourceType: 'magical_girl' | 'canshou' | 'battle'): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('需要登录'));
    }

    const resourceId = req.params.id || req.body.id;
    
    if (!resourceId) {
      return next(new ValidationError('缺少资源ID'));
    }

    try {
      let sql: string;
      let params: any[];

      switch (resourceType) {
        case 'magical_girl':
          sql = 'SELECT user_id FROM magical_girls WHERE id = ?';
          params = [resourceId];
          break;
        case 'canshou':
          sql = 'SELECT user_id FROM canshou WHERE id = ?';
          params = [resourceId];
          break;
        case 'battle':
          sql = 'SELECT user_id FROM battles WHERE id = ?';
          params = [resourceId];
          break;
        default:
          return next(new ValidationError('无效的资源类型'));
      }

      const result = await executeQuery(sql, params);
      
      if (result.length === 0) {
        return next(new ValidationError('资源不存在'));
      }

      const resource = result[0];
      
      // 检查是否是资源所有者或管理员
      if (resource.user_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
        return next(new AuthorizationError('只能操作自己的资源'));
      }

      next();
    } catch (error) {
      logger.error('资源所有权检查失败', { error, resourceId, resourceType });
      next(error);
    }
  };
}

// 用户注册
export async function registerUser(email: string, username: string, password: string): Promise<User> {
  // 验证输入
  if (!email || !username || !password) {
    throw new ValidationError('所有字段都是必需的');
  }

  if (password.length < 6) {
    throw new ValidationError('密码长度至少6位');
  }

  if (username.length < 3 || username.length > 100) {
    throw new ValidationError('用户名长度必须在3-100字符之间');
  }

  // 检查邮箱和用户名是否已存在
  const existingUser = await executeQuery(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );

  if (existingUser.length > 0) {
    throw new ValidationError('邮箱或用户名已存在');
  }

  // 加密密码
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 创建用户
  const userId = generateUUID();
  const sql = `
    INSERT INTO users (id, email, username, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
    userId,
    email,
    username,
    passwordHash,
    UserRole.USER,
    UserStatus.ACTIVE
  ]);

  // 返回用户信息（不包含密码）
  const newUser = await executeQuery(
    'SELECT id, email, username, role, status, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );

  return newUser[0] as User;
}

// 用户登录
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  if (!email || !username || !password) {
    throw new ValidationError('邮箱和密码都是必需的');
  }

  // 查找用户
  const users = await executeQuery(
    'SELECT * FROM users WHERE email = ? OR username = ?',
    [email, email]
  );

  if (users.length === 0) {
    throw new ValidationError('邮箱或密码错误');
  }

  const user = users[0];

  // 检查账户状态
  if (user.status !== UserStatus.ACTIVE) {
    throw new ValidationError('账户已被禁用');
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isPasswordValid) {
    throw new ValidationError('邮箱或密码错误');
  }

  // 更新登录信息
  await executeQuery(
    'UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = ?',
    [user.id]
  );

  // 生成令牌
  const token = generateToken(user);

  // 创建会话记录
  const sessionId = generateUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期
  
  await executeQuery(
    'INSERT INTO user_sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [sessionId, user.id, token, expiresAt, null, null]
  );

  // 返回用户信息和令牌
  const userInfo: User = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    avatar_url: user.avatar_url,
    bio: user.bio,
    last_login_at: user.last_login_at,
    login_count: user.login_count + 1,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  return { user: userInfo, token };
}

// 用户登出
export async function logoutUser(token: string): Promise<void> {
  try {
    await executeQuery(
      'DELETE FROM user_sessions WHERE token = ?',
      [token]
    );
  } catch (error) {
    logger.error('用户登出失败', { error, token });
    // 登出失败不影响用户体验
  }
}

// 刷新令牌
export async function refreshToken(oldToken: string): Promise<string> {
  try {
    const decoded = verifyToken(oldToken);
    
    // 检查用户是否存在且状态正常
    const users = await executeQuery(
      'SELECT * FROM users WHERE id = ? AND status = ?',
      [decoded.id, UserStatus.ACTIVE]
    );

    if (users.length === 0) {
      throw new AuthenticationError('用户不存在或已被禁用');
    }

    const user = users[0];
    
    // 生成新令牌
    const newToken = generateToken(user);
    
    // 更新会话记录
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // 更新会话记录
    await executeQuery(
      'UPDATE user_sessions SET token = ?, expires_at = ? WHERE token = ?',
      [newToken, expiresAt, oldToken]
    );

    return newToken;
  } catch (error) {
    throw new AuthenticationError('令牌刷新失败');
  }
}

// 清理过期会话
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await executeQuery(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    
    logger.info('过期会话清理完成');
  } catch (error) {
    logger.error('清理过期会话失败', { error });
  }
}

// 定期清理过期会话（每小时执行一次）
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
