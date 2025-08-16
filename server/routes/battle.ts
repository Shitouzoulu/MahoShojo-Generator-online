import { Router, Request, Response } from 'express';
import { aiGenerationLimiter } from '../middleware/rateLimiter';
import { optionalAuthMiddleware } from '../middleware/auth';
import { executeQuery, generateUUID, executeTransaction } from '../../lib/database';
import { generateBattleStory } from '../../lib/ai';
import { io } from '../index';

const router = Router();

// 生成战斗故事
router.post('/generate', aiGenerationLimiter, async (req: Request, res: Response) => {
  try {
    const { participants, mode, userPreferences } = req.body;
    
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: '至少需要2个参与者',
          statusCode: 400
        }
      });
    }

    if (!mode || !['normal', 'daily', 'kizuna'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: {
          message: '无效的战斗模式',
          statusCode: 400
        }
      });
    }

    // 调用AI生成战斗故事
    const battleStory = await generateBattleStory({
      participants,
      mode,
      userPreferences
    });

    // 保存到数据库
    const battleId = generateUUID();
    const sql = `
      INSERT INTO battles (id, title, participants, winner, battle_report, mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(sql, [
      battleId,
      battleStory.title,
      JSON.stringify(participants),
      battleStory.winner,
      JSON.stringify(battleStory.battleReport),
      mode
    ]);

    // 记录角色战斗历史
    await executeTransaction(async (connection) => {
      for (const participant of participants) {
        const historyId = generateUUID();
        const result = participant.id === battleStory.winner ? 'win' : 'lose';
        const role = participant.type === 'magical_girl' ? 'protagonist' : 'antagonist';
        
        await connection.execute(`
          INSERT INTO character_battle_history (id, character_id, character_type, battle_id, role, result)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [historyId, participant.id, participant.type, battleId, role, result]);
      }
    });

    // 通过Socket.IO广播战斗结果
    io.emit('battle-completed', {
      battleId,
      title: battleStory.title,
      winner: battleStory.winner,
      mode
    });

    res.status(201).json({
      success: true,
      data: {
        id: battleId,
        ...battleStory
      }
    });
  } catch (error) {
    console.error('生成战斗故事失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '生成战斗故事失败',
        statusCode: 500
      }
    });
  }
});

// 获取战斗列表
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, mode, winner, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let sql = 'SELECT * FROM battles WHERE 1=1';
    const params: any[] = [];
    
    if (mode) {
      sql += ' AND mode = ?';
      params.push(mode);
    }
    
    if (winner) {
      sql += ' AND winner = ?';
      params.push(winner);
    }
    
    if (search) {
      sql += ' AND (title LIKE ? OR winner LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const battles = await executeQuery(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM battles WHERE 1=1';
    const countParams: any[] = [];
    
    if (mode) {
      countSql += ' AND mode = ?';
      countParams.push(mode);
    }
    
    if (winner) {
      countSql += ' AND winner = ?';
      countParams.push(winner);
    }
    
    if (search) {
      countSql += ' AND (title LIKE ? OR winner LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const [{ total }] = await executeQuery(countSql, countParams);
    
    // 解析JSON字段
    battles.forEach((battle: any) => {
      battle.participants = JSON.parse(battle.participants);
      battle.battle_report = JSON.parse(battle.battle_report);
    });
    
    res.json({
      success: true,
      data: {
        battles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取战斗列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取战斗列表失败',
        statusCode: 500
      }
    });
  }
});

// 获取单个战斗详情
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sql = 'SELECT * FROM battles WHERE id = ?';
    const [battle] = await executeQuery(sql, [id]);
    
    if (!battle) {
      return res.status(404).json({
        success: false,
        error: {
          message: '战斗记录不存在',
          statusCode: 404
        }
      });
    }
    
    // 解析JSON字段
    battle.participants = JSON.parse(battle.participants);
    battle.battle_report = JSON.parse(battle.battle_report);
    
    // 获取战斗历史
    const historySql = `
      SELECT cbh.*, 
             CASE 
               WHEN cbh.character_type = 'magical_girl' THEN mg.name
               WHEN cbh.character_type = 'canshou' THEN c.name
             END as character_name
      FROM character_battle_history cbh
      LEFT JOIN magical_girls mg ON cbh.character_id = mg.id AND cbh.character_type = 'magical_girl'
      LEFT JOIN canshou c ON cbh.character_id = c.id AND cbh.character_type = 'canshou'
      WHERE cbh.battle_id = ?
      ORDER BY cbh.created_at
    `;
    
    const history = await executeQuery(historySql, [id]);
    
    res.json({
      success: true,
      data: {
        ...battle,
        history
      }
    });
  } catch (error) {
    console.error('获取战斗详情失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取战斗详情失败',
        statusCode: 500
      }
    });
  }
});

// 获取战斗统计
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    // 总战斗数
    const [{ totalBattles }] = await executeQuery('SELECT COUNT(*) as totalBattles FROM battles');
    
    // 各模式战斗数
    const modeStats = await executeQuery(`
      SELECT mode, COUNT(*) as count
      FROM battles
      GROUP BY mode
    `);
    
    // 胜率统计
    const winStats = await executeQuery(`
      SELECT 
        COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN result = 'lose' THEN 1 END) as losses,
        COUNT(CASE WHEN result = 'draw' THEN 1 END) as draws
      FROM character_battle_history
    `);
    
    // 最近7天战斗数
    const recentBattles = await executeQuery(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM battles
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    res.json({
      success: true,
      data: {
        totalBattles: totalBattles.totalBattles,
        modeStats,
        winStats: winStats[0],
        recentBattles
      }
    });
  } catch (error) {
    console.error('获取战斗统计失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取战斗统计失败',
        statusCode: 500
      }
    });
  }
});

// 获取角色战斗历史
router.get('/character/:characterId/history', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { characterId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const sql = `
      SELECT cbh.*, b.title, b.mode, b.created_at as battle_date
      FROM character_battle_history cbh
      JOIN battles b ON cbh.battle_id = b.id
      WHERE cbh.character_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const history = await executeQuery(sql, [characterId, Number(limit), offset]);
    
    // 获取总数
    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM character_battle_history WHERE character_id = ?',
      [characterId]
    );
    
    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取角色战斗历史失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取角色战斗历史失败',
        statusCode: 500
      }
    });
  }
});

// 获取排行榜
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { type = 'magical_girl', limit = 10 } = req.query;
    
    if (!['magical_girl', 'canshou'].includes(type as string)) {
      return res.status(400).json({
        success: false,
        error: {
          message: '无效的角色类型',
          statusCode: 400
        }
      });
    }
    
    const sql = `
      SELECT 
        cbh.character_id,
        cbh.character_type,
        CASE 
          WHEN cbh.character_type = 'magical_girl' THEN mg.name
          WHEN cbh.character_type = 'canshou' THEN c.name
        END as character_name,
        COUNT(CASE WHEN cbh.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN cbh.result = 'lose' THEN 1 END) as losses,
        COUNT(CASE WHEN cbh.result = 'draw' THEN 1 END) as draws,
        COUNT(*) as total_battles,
        ROUND(COUNT(CASE WHEN cbh.result = 'win' THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate
      FROM character_battle_history cbh
      LEFT JOIN magical_girls mg ON cbh.character_id = mg.id AND cbh.character_type = 'magical_girl'
      LEFT JOIN canshou c ON cbh.character_id = c.id AND cbh.character_type = 'canshou'
      WHERE cbh.character_type = ?
      GROUP BY cbh.character_id, cbh.character_type
      HAVING total_battles >= 3
      ORDER BY win_rate DESC, wins DESC
      LIMIT ?
    `;
    
    const leaderboard = await executeQuery(sql, [type, Number(limit)]);
    
    res.json({
      success: true,
      data: {
        type,
        leaderboard
      }
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取排行榜失败',
        statusCode: 500
      }
    });
  }
});

export default router;
