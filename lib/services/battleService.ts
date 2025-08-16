import { executeQuery, executeTransaction, generateUUID } from '../database';

class BattleService {
  // 创建战斗记录
  static async create(battleData: any): Promise<any> {
    try {
      const result = await executeTransaction(async (connection: any) => {
        const battleId = generateUUID();
        
        // 插入战斗记录
        const battleSql = `
          INSERT INTO battles (
            id, title, participants, winner, battle_report, mode
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const battleParams = [
          battleId,
          battleData.title,
          JSON.stringify(battleData.participants),
          battleData.winner,
          JSON.stringify(battleData.battle_report),
          battleData.mode
        ];

        await connection.execute(battleSql, battleParams);

        // 插入角色战斗历史记录
        for (const participant of battleData.participants) {
          const historyId = generateUUID();
          const historySql = `
            INSERT INTO character_battle_history (
              id, character_id, character_type, battle_id, role, result
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          // 确定角色类型
          const characterType = participant.type || 'magical_girl';
          
          // 确定战斗结果
          let result: 'win' | 'lose' | 'draw' = 'lose';
          if (battleData.winner === participant.name || battleData.winner === participant.flower_name) {
            result = 'win';
          } else if (battleData.winner === '平局') {
            result = 'draw';
          }
          
          const historyParams = [
            historyId,
            participant.id || participant.name,
            characterType,
            battleId,
            participant.role || 'participant',
            result
          ];

          await connection.execute(historySql, historyParams);
        }

        return battleId;
      });

      const created = await this.getById(result);
      return {
        success: true,
        data: created.data
      };
    } catch (error) {
      console.error('创建战斗记录失败:', error);
      return {
        success: false,
        error: '创建战斗记录失败'
      };
    }
  }

  // 根据ID获取战斗记录
  static async getById(id: string): Promise<any> {
    try {
      const sql = 'SELECT * FROM battles WHERE id = ?';
      const result = await executeQuery(sql, [id]);
      
      if (result.length === 0) {
        return {
          success: false,
          error: '战斗记录不存在'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      console.error('获取战斗记录失败:', error);
      return {
        success: false,
        error: '获取战斗记录失败'
      };
    }
  }

  // 获取所有战斗记录（分页）
  static async getAll(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM battles';
      const countResult = await executeQuery(countSql);
      const total = countResult[0].total;
      
      // 获取分页数据
      const sql = 'SELECT * FROM battles ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const result = await executeQuery(sql, [limit, offset]);
      
      return {
        success: true,
        data: {
          data: result,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取战斗记录列表失败:', error);
      return {
        success: false,
        error: '获取战斗记录列表失败'
      };
    }
  }

  // 根据模式获取战斗记录
  static async getByMode(mode: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM battles WHERE mode = ?';
      const countResult = await executeQuery(countSql, [mode]);
      const total = countResult[0].total;
      
      // 获取分页数据
      const sql = 'SELECT * FROM battles WHERE mode = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const result = await executeQuery(sql, [mode, limit, offset]);
      
      return {
        success: true,
        data: {
          data: result,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取战斗记录列表失败:', error);
      return {
        success: false,
        error: '获取战斗记录列表失败'
      };
    }
  }

  // 获取角色的战斗历史
  static async getCharacterBattleHistory(characterId: string, characterType: string): Promise<any> {
    try {
      const sql = `
        SELECT * FROM character_battle_history 
        WHERE character_id = ? AND character_type = ? 
        ORDER BY created_at DESC
      `;
      const result = await executeQuery(sql, [characterId, characterType]);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('获取角色战斗历史失败:', error);
      return {
        success: false,
        error: '获取角色战斗历史失败'
      };
    }
  }

  // 获取角色统计信息
  static async getCharacterStats(characterId: string, characterType: string): Promise<any> {
    try {
      const sql = `
        SELECT 
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
          COUNT(*) as total
        FROM character_battle_history 
        WHERE character_id = ? AND character_type = ?
      `;
      const result = await executeQuery(sql, [characterId, characterType]);
      
      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      console.error('获取角色统计信息失败:', error);
      return {
        success: false,
        error: '获取角色统计信息失败'
      };
    }
  }

  // 搜索战斗记录
  static async search(query: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      const searchQuery = `%${query}%`;
      
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM battles WHERE title LIKE ?';
      const countResult = await executeQuery(countSql, [searchQuery]);
      const total = countResult[0].total;
      
      // 获取分页数据
      const sql = 'SELECT * FROM battles WHERE title LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const result = await executeQuery(sql, [searchQuery, limit, offset]);
      
      return {
        success: true,
        data: {
          data: result,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('搜索战斗记录失败:', error);
      return {
        success: false,
        error: '搜索战斗记录失败'
      };
    }
  }

  // 删除战斗记录
  static async delete(id: string): Promise<any> {
    try {
      const result = await executeTransaction(async (connection: any) => {
        // 删除角色战斗历史记录
        const deleteHistorySql = 'DELETE FROM character_battle_history WHERE battle_id = ?';
        await connection.execute(deleteHistorySql, [id]);
        
        // 删除战斗记录
        const deleteBattleSql = 'DELETE FROM battles WHERE id = ?';
        await connection.execute(deleteBattleSql, [id]);
        
        return true;
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('删除战斗记录失败:', error);
      return {
        success: false,
        error: '删除战斗记录失败'
      };
    }
  }
}

module.exports = { BattleService };

