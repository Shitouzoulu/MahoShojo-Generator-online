import { Router, Request, Response } from 'express';
import { aiGenerationLimiter } from '../middleware/rateLimiter';
import { optionalAuthMiddleware } from '../middleware/auth';
import { executeQuery, generateUUID } from '../../lib/database';
import { generateCanshou } from '../../lib/ai';

const router = Router();

// 生成残兽
router.post('/generate', aiGenerationLimiter, async (req: Request, res: Response) => {
  try {
    const { stage, description, userPreferences } = req.body;
    
    if (!stage || !description) {
      return res.status(400).json({
        success: false,
        error: {
          message: '残兽阶段和描述是必需的',
          statusCode: 400
        }
      });
    }

    // 调用AI生成残兽
    const canshou = await generateCanshou({
      stage,
      description,
      userPreferences
    });

    // 保存到数据库
    const id = generateUUID();
    const sql = `
      INSERT INTO canshou (id, name, stage, description, appearance)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await executeQuery(sql, [
      id,
      canshou.name,
      canshou.stage,
      canshou.description,
      JSON.stringify(canshou.appearance)
    ]);

    // 如果用户已登录，记录到用户角色关联表
    if (req.user) {
      const userCharSql = `
        INSERT INTO user_characters (id, user_id, character_id, character_type)
        VALUES (?, ?, ?, 'canshou')
      `;
      await executeQuery(userCharSql, [generateUUID(), req.user.id, id]);
    }

    res.status(201).json({
      success: true,
      data: {
        id,
        ...canshou
      }
    });
  } catch (error) {
    console.error('生成残兽失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '生成残兽失败',
        statusCode: 500
      }
    });
  }
});

// 获取残兽列表
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, stage, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = 'SELECT * FROM canshou WHERE 1=1';
    const params: any[] = [];
    
    if (stage) {
      sql += ' AND stage = ?';
      params.push(stage);
    }
    
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const canshouList = await executeQuery(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM canshou WHERE 1=1';
    const countParams: any[] = [];
    
    if (stage) {
      countSql += ' AND stage = ?';
      countParams.push(stage);
    }
    
    if (search) {
      countSql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const [{ total }] = await executeQuery(countSql, countParams);
    
    // 解析JSON字段
    canshouList.forEach((item: any) => {
      item.appearance = JSON.parse(item.appearance);
    });
    
    res.json({
      success: true,
      data: {
        canshou: canshouList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取残兽列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取残兽列表失败',
        statusCode: 500
      }
    });
  }
});

// 获取单个残兽详情
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sql = 'SELECT * FROM canshou WHERE id = ?';
    const [canshou] = await executeQuery(sql, [id]);
    
    if (!canshou) {
      return res.status(404).json({
        success: false,
        error: {
          message: '残兽不存在',
          statusCode: 404
        }
      });
    }
    
    // 解析JSON字段
    canshou.appearance = JSON.parse(canshou.appearance);
    
    res.json({
      success: true,
      data: canshou
    });
  } catch (error) {
    console.error('获取残兽详情失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取残兽详情失败',
        statusCode: 500
      }
    });
  }
});

// 获取残兽阶段统计
router.get('/stats/stages', async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT stage, COUNT(*) as count
      FROM canshou
      GROUP BY stage
      ORDER BY count DESC
    `;
    
    const stats = await executeQuery(sql);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取残兽阶段统计失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取残兽阶段统计失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户收藏的残兽
router.get('/user/favorites', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要登录才能查看收藏',
          statusCode: 401
        }
      });
    }
    
    const sql = `
      SELECT c.*, uc.is_favorite
      FROM canshou c
      JOIN user_characters uc ON c.id = uc.character_id
      WHERE uc.user_id = ? AND uc.character_type = 'canshou' AND uc.is_favorite = true
      ORDER BY uc.created_at DESC
    `;
    
    const favorites = await executeQuery(sql, [req.user.id]);
    
    // 解析JSON字段
    favorites.forEach((item: any) => {
      item.appearance = JSON.parse(item.appearance);
    });
    
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('获取用户收藏失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户收藏失败',
        statusCode: 500
      }
    });
  }
});

// 切换收藏状态
router.post('/:id/favorite', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要登录才能收藏',
          statusCode: 401
        }
      });
    }
    
    const { id } = req.params;
    
    // 检查是否已存在关联记录
    const checkSql = `
      SELECT * FROM user_characters 
      WHERE user_id = ? AND character_id = ? AND character_type = 'canshou'
    `;
    const existing = await executeQuery(checkSql, [req.user.id, id]);
    
    if (existing.length > 0) {
      // 更新收藏状态
      const updateSql = `
        UPDATE user_characters 
        SET is_favorite = NOT is_favorite 
        WHERE user_id = ? AND character_id = ? AND character_type = 'canshou'
      `;
      await executeQuery(updateSql, [req.user.id, id]);
      
      const newStatus = !existing[0].is_favorite;
      res.json({
        success: true,
        data: {
          isFavorite: newStatus,
          message: newStatus ? '已添加到收藏' : '已取消收藏'
        }
      });
    } else {
      // 创建新的关联记录
      const insertSql = `
        INSERT INTO user_characters (id, user_id, character_id, character_type, is_favorite)
        VALUES (?, ?, ?, 'canshou', true)
      `;
      await executeQuery(insertSql, [generateUUID(), req.user.id, id]);
      
      res.json({
        success: true,
        data: {
          isFavorite: true,
          message: '已添加到收藏'
        }
      });
    }
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '切换收藏状态失败',
        statusCode: 500
      }
    });
  }
});

export default router;
