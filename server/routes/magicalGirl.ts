import { Router, Request, Response } from 'express';
import { aiGenerationLimiter } from '../middleware/rateLimiter';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { executeQuery, generateUUID } from '../../lib/database';
import { generateMagicalGirl } from '../../lib/ai';

const router = Router();

// 生成魔法少女
router.post('/generate', aiGenerationLimiter, optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { flowerName, mainColor, userPreferences } = req.body;
    
    if (!flowerName || !mainColor) {
      return res.status(400).json({
        success: false,
        error: {
          message: '花朵名称和主色调是必需的',
          statusCode: 400
        }
      });
    }

    // 调用AI生成魔法少女
    const magicalGirl = await generateMagicalGirl({
      flowerName,
      mainColor,
      userPreferences
    });

    // 保存到数据库
    const id = generateUUID();
    const sql = `
      INSERT INTO magical_girls (id, name, flower_name, appearance, spell, main_color, first_page_color, second_page_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(sql, [
      id,
      magicalGirl.name,
      magicalGirl.flowerName,
      JSON.stringify(magicalGirl.appearance),
      magicalGirl.spell,
      magicalGirl.mainColor,
      magicalGirl.firstPageColor,
      magicalGirl.secondPageColor
    ]);

    // 如果用户已登录，记录到用户角色关联表
    if (req.user) {
      const userCharSql = `
        INSERT INTO user_characters (id, user_id, character_id, character_type)
        VALUES (?, ?, ?, 'magical_girl')
      `;
      await executeQuery(userCharSql, [generateUUID(), req.user.id, id]);
    }

    res.status(201).json({
      success: true,
      data: {
        id,
        ...magicalGirl
      }
    });
  } catch (error) {
    console.error('生成魔法少女失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '生成魔法少女失败',
        statusCode: 500
      }
    });
  }
});

// 获取魔法少女列表
router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, flowerName, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = 'SELECT * FROM magical_girls WHERE 1=1';
    const params: any[] = [];
    
    if (flowerName) {
      sql += ' AND flower_name = ?';
      params.push(flowerName);
    }
    
    if (search) {
      sql += ' AND (name LIKE ? OR flower_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const magicalGirls = await executeQuery(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM magical_girls WHERE 1=1';
    const countParams: any[] = [];
    
    if (flowerName) {
      countSql += ' AND flower_name = ?';
      countParams.push(flowerName);
    }
    
    if (search) {
      countSql += ' AND (name LIKE ? OR flower_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const [{ total }] = await executeQuery(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        magicalGirls,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取魔法少女列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取魔法少女列表失败',
        statusCode: 500
      }
    });
  }
});

// 获取单个魔法少女详情
router.get('/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const sql = 'SELECT * FROM magical_girls WHERE id = ?';
    const [magicalGirl] = await executeQuery(sql, [id]);
    
    if (!magicalGirl) {
      return res.status(404).json({
        success: false,
        error: {
          message: '魔法少女不存在',
          statusCode: 404
        }
      });
    }
    
    // 解析JSON字段
    magicalGirl.appearance = JSON.parse(magicalGirl.appearance);
    
    res.json({
      success: true,
      data: magicalGirl
    });
  } catch (error) {
    console.error('获取魔法少女详情失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取魔法少女详情失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户收藏的魔法少女
router.get('/user/favorites', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
      SELECT mg.*, uc.is_favorite
      FROM magical_girls mg
      JOIN user_characters uc ON mg.id = uc.character_id
      WHERE uc.user_id = ? AND uc.character_type = 'magical_girl' AND uc.is_favorite = true
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
router.post('/:id/favorite', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
      WHERE user_id = ? AND character_id = ? AND character_type = 'magical_girl'
    `;
    const existing = await executeQuery(checkSql, [req.user.id, id]);
    
    if (existing.length > 0) {
      // 更新收藏状态
      const updateSql = `
        UPDATE user_characters 
        SET is_favorite = NOT is_favorite 
        WHERE user_id = ? AND character_id = ? AND character_type = 'magical_girl'
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
        VALUES (?, ?, ?, 'magical_girl', true)
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
