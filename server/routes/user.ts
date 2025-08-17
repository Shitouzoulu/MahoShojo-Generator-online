import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, requireRole, UserRole, registerUser, loginUser, logoutUser, refreshToken, AuthenticatedRequest } from '../middleware/auth';
import { createSuccessResponse, createErrorResponse, ErrorCodes, HttpStatus, generateRequestId } from '../../lib/types/api';
import { getLogger } from '../../lib/logger';

const router = Router();
const logger = getLogger('userRoutes');

// 用户注册验证schema
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  username: z.string().min(3, '用户名至少3个字符').max(100, '用户名最多100个字符'),
  password: z.string().min(6, '密码至少6个字符').max(128, '密码最多128个字符')
});

// 用户登录验证schema
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空')
});

// 用户信息更新schema
const updateProfileSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(100, '用户名最多100个字符').optional(),
  bio: z.string().max(500, '个人简介最多500个字符').optional(),
  avatar_url: z.string().url('头像URL格式不正确').optional()
});

// 密码修改schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6个字符').max(128, '新密码最多128个字符')
});

// 用户注册
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  
  try {
    // 验证请求数据
    const validatedData = registerSchema.parse(req.body);
    
    // 注册用户
    const user = await registerUser(
      validatedData.email,
      validatedData.username,
      validatedData.password
    );

    logger.info('用户注册成功', { requestId, email: user.email, username: user.username });

    const response = createSuccessResponse(
      {
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          created_at: user.created_at
        }
      },
      requestId
    );

    res.status(HttpStatus.CREATED).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createErrorResponse(
        '数据验证失败',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId,
        error.errors
      );
      return res.status(HttpStatus.BAD_REQUEST).json(validationError);
    }

    logger.error('用户注册失败', { requestId, error });
    throw error;
  }
}));

// 用户登录
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  
  try {
    // 验证请求数据
    const validatedData = loginSchema.parse(req.body);
    
    // 用户登录
    const { user, token } = await loginUser(
      validatedData.email,
      validatedData.password
    );

    logger.info('用户登录成功', { requestId, userId: user.id, username: user.username });

    const response = createSuccessResponse(
      {
        message: '登录成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          avatar_url: user.avatar_url,
          bio: user.bio,
          last_login_at: user.last_login_at,
          login_count: user.login_count
        },
        token,
        expires_in: '7d'
      },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createErrorResponse(
        '数据验证失败',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId,
        error.errors
      );
      return res.status(HttpStatus.BAD_REQUEST).json(validationError);
    }

    logger.error('用户登录失败', { requestId, error });
    throw error;
  }
}));

// 用户登出
router.post('/logout', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  const token = req.headers.authorization?.substring(7);
  
  if (token) {
    await logoutUser(token);
    logger.info('用户登出成功', { requestId, userId: req.user?.id });
  }

  const response = createSuccessResponse(
    { message: '登出成功' },
    requestId
  );

  res.status(HttpStatus.OK).json(response);
}));

// 刷新令牌
router.post('/refresh-token', asyncHandler(async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  const { token } = req.body;
  
  if (!token) {
    const error = createErrorResponse(
      '缺少令牌',
      ErrorCodes.MISSING_FIELD,
      HttpStatus.BAD_REQUEST,
      requestId
    );
    return res.status(HttpStatus.BAD_REQUEST).json(error);
  }

  try {
    const newToken = await refreshToken(token);
    
    logger.info('令牌刷新成功', { requestId });

    const response = createSuccessResponse(
      {
        message: '令牌刷新成功',
        token: newToken,
        expires_in: '7d'
      },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    logger.error('令牌刷新失败', { requestId, error });
    throw error;
  }
}));

// 获取当前用户信息
router.get('/profile', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  
  const response = createSuccessResponse(
    {
      user: {
        id: req.user?.id,
        email: req.user?.email,
        username: req.user?.username,
        role: req.user?.role,
        status: req.user?.status
      }
    },
    requestId
  );

  res.status(HttpStatus.OK).json(response);
}));

// 更新用户资料
router.put('/profile', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  
  try {
    // 验证请求数据
    const validatedData = updateProfileSchema.parse(req.body);
    
    // 构建更新SQL
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (validatedData.username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(validatedData.username);
    }
    
    if (validatedData.bio !== undefined) {
      updateFields.push('bio = ?');
      updateValues.push(validatedData.bio);
    }
    
    if (validatedData.avatar_url !== undefined) {
      updateFields.push('avatar_url = ?');
      updateValues.push(validatedData.avatar_url);
    }
    
    if (updateFields.length === 0) {
      const error = createErrorResponse(
        '没有需要更新的字段',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId
      );
      return res.status(HttpStatus.BAD_REQUEST).json(error);
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(req.user?.id);
    
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    // 执行更新
    await require('../../lib/database').executeQuery(sql, updateValues);
    
    logger.info('用户资料更新成功', { requestId, userId: req.user?.id });

    const response = createSuccessResponse(
      { message: '资料更新成功' },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createErrorResponse(
        '数据验证失败',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId,
        error.errors
      );
      return res.status(HttpStatus.BAD_REQUEST).json(validationError);
    }

    logger.error('用户资料更新失败', { requestId, error });
    throw error;
  }
}));

// 修改密码
router.put('/change-password', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  
  try {
    // 验证请求数据
    const validatedData = changePasswordSchema.parse(req.body);
    
    // 验证当前密码
    const bcrypt = require('bcryptjs');
    const { executeQuery } = require('../../lib/database');
    
    const users = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user?.id]
    );
    
    if (users.length === 0) {
      const error = createErrorResponse(
        '用户不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        requestId
      );
      return res.status(HttpStatus.NOT_FOUND).json(error);
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      users[0].password_hash
    );
    
    if (!isCurrentPasswordValid) {
      const error = createErrorResponse(
        '当前密码错误',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId
      );
      return res.status(HttpStatus.BAD_REQUEST).json(error);
    }
    
    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, saltRounds);
    
    // 更新密码
    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, req.user?.id]
    );
    
    logger.info('用户密码修改成功', { requestId, userId: req.user?.id });

    const response = createSuccessResponse(
      { message: '密码修改成功' },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createErrorResponse(
        '数据验证失败',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        requestId,
        error.errors
      );
      return res.status(HttpStatus.BAD_REQUEST).json(validationError);
    }

    logger.error('用户密码修改失败', { requestId, error });
    throw error;
  }
}));

// 获取用户统计信息
router.get('/stats', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  
  try {
    const { executeQuery } = require('../../lib/database');
    
    // 获取用户创建的角色数量
    const magicalGirlsCount = await executeQuery(
      'SELECT COUNT(*) as count FROM magical_girls WHERE user_id = ?',
      [req.user?.id]
    );
    
    const canshouCount = await executeQuery(
      'SELECT COUNT(*) as count FROM canshou WHERE user_id = ?',
      [req.user?.id]
    );
    
    // 获取用户参与的战斗数量
    const battlesCount = await executeQuery(
      'SELECT COUNT(*) as count FROM battles WHERE user_id = ?',
      [req.user?.id]
    );
    
    // 获取用户收藏数量
    const favoritesCount = await executeQuery(
      'SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?',
      [req.user?.id]
    );

    const response = createSuccessResponse(
      {
        stats: {
          magical_girls: magicalGirlsCount[0].count,
          canshou: canshouCount[0].count,
          battles: battlesCount[0].count,
          favorites: favoritesCount[0].count
        }
      },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    logger.error('获取用户统计信息失败', { requestId, error });
    throw error;
  }
}));

// 管理员：获取所有用户列表
router.get('/admin/users', authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  const { page = 1, limit = 20, role, status, search } = req.query;
  
  try {
    const { executeQuery } = require('../../lib/database');
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = 'SELECT id, email, username, role, status, created_at, last_login_at, login_count FROM users WHERE 1=1';
    const params: any[] = [];
    
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      sql += ' AND (username LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // 获取总数
    const countSql = sql.replace('SELECT id, email, username, role, status, created_at, last_login_at, login_count', 'SELECT COUNT(*) as total');
    const totalResult = await executeQuery(countSql, params);
    const total = totalResult[0].total;
    
    // 获取分页数据
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const users = await executeQuery(sql, params);
    
    const response = createSuccessResponse(
      { users },
      requestId,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1
      }
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    logger.error('获取用户列表失败', { requestId, error });
    throw error;
  }
}));

// 管理员：更新用户状态
router.put('/admin/users/:id/status', authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = generateRequestId();
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['active', 'suspended', 'banned'].includes(status)) {
    const error = createErrorResponse(
      '无效的用户状态',
      ErrorCodes.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      requestId
    );
    return res.status(HttpStatus.BAD_REQUEST).json(error);
  }
  
  try {
    const { executeQuery } = require('../../lib/database');
    
    await executeQuery(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    logger.info('用户状态更新成功', { requestId, userId: id, newStatus: status });

    const response = createSuccessResponse(
      { message: '用户状态更新成功' },
      requestId
    );

    res.status(HttpStatus.OK).json(response);
  } catch (error) {
    logger.error('更新用户状态失败', { requestId, error });
    throw error;
  }
}));

export default router;
