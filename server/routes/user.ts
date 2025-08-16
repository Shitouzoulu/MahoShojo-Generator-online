import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginLimiter } from '../middleware/rateLimiter';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { executeQuery, generateUUID } from '../../lib/database';

const router = Router();

// 用户注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: '用户名、邮箱和密码都是必需的',
          statusCode: 400
        }
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: '密码长度至少6位',
          statusCode: 400
        }
      });
    }
    
    // 检查用户名和邮箱是否已存在
    const checkSql = 'SELECT id FROM users WHERE username = ? OR email = ?';
    const existing = await executeQuery(checkSql, [username, email]);
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: '用户名或邮箱已存在',
          statusCode: 400
        }
      });
    }
    
    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const userId = generateUUID();
    const insertSql = `
      INSERT INTO users (id, username, email, password_hash)
      VALUES (?, ?, ?, ?)
    `;
    
    await executeQuery(insertSql, [userId, username, email, passwordHash]);
    
    // 生成JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET环境变量未设置');
    }
    
    const token = jwt.sign(
      { id: userId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          username,
          email
        },
        token
      }
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '用户注册失败',
        statusCode: 500
      }
    });
  }
});

// 用户登录
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: '用户名和密码都是必需的',
          statusCode: 400
        }
      });
    }
    
    // 查找用户
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const [user] = await executeQuery(sql, [username, username]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '用户名或密码错误',
          statusCode: 401
        }
      });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: '用户名或密码错误',
          statusCode: 401
        }
      });
    }
    
    // 生成JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET环境变量未设置');
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '用户登录失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户信息
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sql = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?';
    const [user] = await executeQuery(sql, [req.user!.id]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: '用户不存在',
          statusCode: 404
        }
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户信息失败',
        statusCode: 500
      }
    });
  }
});

// 更新用户信息
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    
    if (!username && !email) {
      return res.status(400).json({
        success: false,
        error: {
          message: '至少需要提供一个要更新的字段',
          statusCode: 400
        }
      });
    }
    
    // 检查用户名和邮箱是否已被其他用户使用
    if (username || email) {
      const checkSql = 'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?';
      const existing = await executeQuery(checkSql, [username || '', email || '', req.user!.id]);
      
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: '用户名或邮箱已被其他用户使用',
            statusCode: 400
          }
        });
      }
    }
    
    // 更新用户信息
    let updateSql = 'UPDATE users SET';
    const params: any[] = [];
    
    if (username) {
      updateSql += ' username = ?';
      params.push(username);
    }
    
    if (email) {
      if (username) updateSql += ',';
      updateSql += ' email = ?';
      params.push(email);
    }
    
    updateSql += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(req.user!.id);
    
    await executeQuery(updateSql, params);
    
    res.json({
      success: true,
      data: {
        message: '用户信息更新成功'
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '更新用户信息失败',
        statusCode: 500
      }
    });
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: '当前密码和新密码都是必需的',
          statusCode: 400
        }
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: '新密码长度至少6位',
          statusCode: 400
        }
      });
    }
    
    // 获取当前用户信息
    const userSql = 'SELECT password_hash FROM users WHERE id = ?';
    const [user] = await executeQuery(userSql, [req.user!.id]);
    
    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: '当前密码错误',
          statusCode: 401
        }
      });
    }
    
    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    const updateSql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(updateSql, [newPasswordHash, req.user!.id]);
    
    res.json({
      success: true,
      data: {
        message: '密码修改成功'
      }
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '修改密码失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户收藏统计
router.get('/stats/favorites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        character_type,
        COUNT(*) as total,
        COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorites
      FROM user_characters
      WHERE user_id = ?
      GROUP BY character_type
    `;
    
    const stats = await executeQuery(sql, [req.user!.id]);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取用户收藏统计失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户收藏统计失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户角色列表
router.get('/characters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, isFavorite } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = `
      SELECT uc.*, 
             CASE 
               WHEN uc.character_type = 'magical_girl' THEN mg.name
               WHEN uc.character_type = 'canshou' THEN c.name
             END as character_name,
             CASE 
               WHEN uc.character_type = 'magical_girl' THEN mg.flower_name
               WHEN uc.character_type = 'canshou' THEN c.stage
             END as character_subtype
      FROM user_characters uc
      LEFT JOIN magical_girls mg ON uc.character_id = mg.id AND uc.character_type = 'magical_girl'
      LEFT JOIN canshou c ON uc.character_id = c.id AND uc.character_type = 'canshou'
      WHERE uc.user_id = ?
    `;
    
    const params: any[] = [req.user!.id];
    
    if (type) {
      sql += ' AND uc.character_type = ?';
      params.push(type);
    }
    
    if (isFavorite !== undefined) {
      sql += ' AND uc.is_favorite = ?';
      params.push(isFavorite === 'true');
    }
    
    sql += ' ORDER BY uc.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const characters = await executeQuery(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM user_characters WHERE user_id = ?';
    const countParams: any[] = [req.user!.id];
    
    if (type) {
      countSql += ' AND character_type = ?';
      countParams.push(type);
    }
    
    if (isFavorite !== undefined) {
      countSql += ' AND is_favorite = ?';
      countParams.push(isFavorite === 'true');
    }
    
    const [{ total }] = await executeQuery(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        characters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取用户角色列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户角色列表失败',
        statusCode: 500
      }
    });
  }
});

// 刷新token
router.post('/refresh-token', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要有效的访问令牌',
          statusCode: 401
        }
      });
    }
    
    // 生成新的JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET环境变量未设置');
    }
    
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    console.error('刷新token失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '刷新token失败',
        statusCode: 500
      }
    });
  }
});

export default router;
