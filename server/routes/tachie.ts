import { Router, Request, Response } from 'express';
import { aiGenerationLimiter } from '../middleware/rateLimiter';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { executeQuery, generateUUID } from '../../lib/database';
import { generateTachie } from '../../lib/tachie/manager';

const router = Router();

// 生成立绘
router.post('/generate', aiGenerationLimiter, optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterData, style, size, userPreferences } = req.body;
    
    if (!characterData || !style) {
      return res.status(400).json({
        success: false,
        error: {
          message: '角色数据和风格是必需的',
          statusCode: 400
        }
      });
    }

    // 验证风格参数
    const validStyles = ['anime', 'realistic', 'cartoon', 'watercolor'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        error: {
          message: '无效的风格参数',
          statusCode: 400
        }
      });
    }

    // 验证尺寸参数
    const validSizes = ['small', 'medium', 'large', 'ultra'];
    if (size && !validSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        error: {
          message: '无效的尺寸参数',
          statusCode: 400
        }
      });
    }

    // 生成任务ID
    const taskId = generateUUID();
    
    // 保存生成任务到数据库（这里可以扩展为任务队列系统）
    const sql = `
      INSERT INTO tachie_tasks (id, character_data, style, size, user_preferences, status, user_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `;
    
    await executeQuery(sql, [
      taskId,
      JSON.stringify(characterData),
      style,
      size || 'medium',
      JSON.stringify(userPreferences || {}),
      req.user?.id || null
    ]);

    // 异步生成立绘
    generateTachie({
      taskId,
      characterData,
      style,
      size: size || 'medium',
      userPreferences
    }).catch(error => {
      console.error('立绘生成失败:', error);
      // 更新任务状态为失败
      executeQuery(
        'UPDATE tachie_tasks SET status = ?, error_message = ? WHERE id = ?',
        ['failed', error.message, taskId]
      );
    });

    res.status(202).json({
      success: true,
      data: {
        taskId,
        message: '立绘生成任务已提交',
        estimatedTime: '2-5分钟'
      }
    });
  } catch (error) {
    console.error('提交立绘生成任务失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '提交立绘生成任务失败',
        statusCode: 500
      }
    });
  }
});

// 获取立绘生成状态
router.get('/status/:taskId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const sql = 'SELECT * FROM tachie_tasks WHERE id = ?';
    const [task] = await executeQuery(sql, [taskId]);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: '任务不存在',
          statusCode: 404
        }
      });
    }
    
    // 检查权限（只有任务创建者或管理员可以查看）
    if (req.user && task.user_id && task.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: '没有权限查看此任务',
          statusCode: 403
        }
      });
    }
    
    // 解析JSON字段
    task.character_data = JSON.parse(task.character_data);
    task.user_preferences = JSON.parse(task.user_preferences || '{}');
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取立绘生成状态失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取立绘生成状态失败',
        statusCode: 500
      }
    });
  }
});

// 获取用户立绘任务列表
router.get('/user/tasks', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要登录才能查看任务列表',
          statusCode: 401
        }
      });
    }
    
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = 'SELECT * FROM tachie_tasks WHERE user_id = ?';
    const params: any[] = [req.user.id];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const tasks = await executeQuery(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM tachie_tasks WHERE user_id = ?';
    const countParams: any[] = [req.user.id];
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const [{ total }] = await executeQuery(countSql, countParams);
    
    // 解析JSON字段
    tasks.forEach((task: any) => {
      task.character_data = JSON.parse(task.character_data);
      task.user_preferences = JSON.parse(task.user_preferences || '{}');
    });
    
    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取用户立绘任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户立绘任务列表失败',
        statusCode: 500
      }
    });
  }
});

// 取消立绘生成任务
router.post('/cancel/:taskId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要登录才能取消任务',
          statusCode: 401
        }
      });
    }
    
    const { taskId } = req.params;
    
    // 检查任务是否存在且属于当前用户
    const checkSql = 'SELECT * FROM tachie_tasks WHERE id = ? AND user_id = ?';
    const [task] = await executeQuery(checkSql, [taskId, req.user.id]);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: '任务不存在或无权限',
          statusCode: 404
        }
      });
    }
    
    // 只能取消待处理或进行中的任务
    if (!['pending', 'processing'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: '只能取消待处理或进行中的任务',
          statusCode: 400
        }
      });
    }
    
    // 更新任务状态
    const updateSql = 'UPDATE tachie_tasks SET status = ?, cancelled_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(updateSql, ['cancelled', taskId]);
    
    res.json({
      success: true,
      data: {
        message: '任务已取消'
      }
    });
  } catch (error) {
    console.error('取消立绘生成任务失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '取消立绘生成任务失败',
        statusCode: 500
      }
    });
  }
});

// 重新生成立绘
router.post('/regenerate/:taskId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: '需要登录才能重新生成',
          statusCode: 401
        }
      });
    }
    
    const { taskId } = req.params;
    const { style, size, userPreferences } = req.body;
    
    // 检查原任务是否存在且属于当前用户
    const checkSql = 'SELECT * FROM tachie_tasks WHERE id = ? AND user_id = ?';
    const [originalTask] = await executeQuery(checkSql, [taskId, req.user.id]);
    
    if (!originalTask) {
      return res.status(404).json({
        success: false,
        error: {
          message: '原任务不存在或无权限',
          statusCode: 404
        }
      });
    }
    
    // 创建新的重新生成任务
    const newTaskId = generateUUID();
    const sql = `
      INSERT INTO tachie_tasks (id, character_data, style, size, user_preferences, status, user_id, parent_task_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `;
    
    await executeQuery(sql, [
      newTaskId,
      originalTask.character_data,
      style || originalTask.style,
      size || originalTask.size,
      JSON.stringify(userPreferences || JSON.parse(originalTask.user_preferences || '{}')),
      req.user.id,
      taskId
    ]);
    
    // 异步生成立绘
    const characterData = JSON.parse(originalTask.character_data);
    generateTachie({
      taskId: newTaskId,
      characterData,
      style: style || originalTask.style,
      size: size || originalTask.size,
      userPreferences
    }).catch(error => {
      console.error('立绘重新生成失败:', error);
      executeQuery(
        'UPDATE tachie_tasks SET status = ?, error_message = ? WHERE id = ?',
        ['failed', error.message, newTaskId]
      );
    });
    
    res.status(202).json({
      success: true,
      data: {
        taskId: newTaskId,
        message: '立绘重新生成任务已提交',
        estimatedTime: '2-5分钟'
      }
    });
  } catch (error) {
    console.error('提交立绘重新生成任务失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '提交立绘重新生成任务失败',
        statusCode: 500
      }
    });
  }
});

// 获取立绘生成统计
router.get('/stats/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 总任务数
    const [{ totalTasks }] = await executeQuery('SELECT COUNT(*) as totalTasks FROM tachie_tasks');
    
    // 各状态任务数
    const statusStats = await executeQuery(`
      SELECT status, COUNT(*) as count
      FROM tachie_tasks
      GROUP BY status
    `);
    
    // 各风格任务数
    const styleStats = await executeQuery(`
      SELECT style, COUNT(*) as count
      FROM tachie_tasks
      GROUP BY style
    `);
    
    // 最近7天任务数
    const recentTasks = await executeQuery(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tachie_tasks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    res.json({
      success: true,
      data: {
        totalTasks: totalTasks.totalTasks,
        statusStats,
        styleStats,
        recentTasks
      }
    });
  } catch (error) {
    console.error('获取立绘生成统计失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取立绘生成统计失败',
        statusCode: 500
      }
    });
  }
});

// 下载立绘
router.get('/download/:taskId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const sql = 'SELECT * FROM tachie_tasks WHERE id = ?';
    const [task] = await executeQuery(sql, [taskId]);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: '任务不存在',
          statusCode: 404
        }
      });
    }
    
    // 检查权限
    if (req.user && task.user_id && task.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: '没有权限下载此立绘',
          statusCode: 403
        }
      });
    }
    
    // 检查任务是否完成
    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: '立绘尚未生成完成',
          statusCode: 400
        }
      });
    }
    
    // 这里应该返回立绘文件
    // 由于是示例，我们返回任务信息
    res.json({
      success: true,
      data: {
        taskId,
        downloadUrl: `/api/tachie/download/${taskId}/file`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
      }
    });
  } catch (error) {
    console.error('获取立绘下载链接失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取立绘下载链接失败',
        statusCode: 500
      }
    });
  }
});

export default router;
