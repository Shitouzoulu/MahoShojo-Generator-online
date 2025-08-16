const { executeQuery, executeTransaction, generateUUID } = require('../database');

class MagicalGirlService {
  // 创建魔法少女
  static async create(magicalGirlData: any): Promise<any> {
    try {
      const id = generateUUID();
      const sql = `
        INSERT INTO magical_girls (
          id, name, flower_name, appearance, spell, main_color, 
          first_page_color, second_page_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        magicalGirlData.name,
        magicalGirlData.flower_name,
        JSON.stringify(magicalGirlData.appearance),
        magicalGirlData.spell,
        magicalGirlData.main_color,
        magicalGirlData.first_page_color,
        magicalGirlData.second_page_color
      ];

      await executeQuery(sql, params);
      
      const created = await this.getById(id);
      return {
        success: true,
        data: created.data
      };
    } catch (error) {
      console.error('创建魔法少女失败:', error);
      return {
        success: false,
        error: '创建魔法少女失败'
      };
    }
  }

  // 根据ID获取魔法少女
  static async getById(id: string): Promise<any> {
    try {
      const sql = 'SELECT * FROM magical_girls WHERE id = ?';
      const result = await executeQuery(sql, [id]);
      
      if (result.length === 0) {
        return {
          success: false,
          error: '魔法少女不存在'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      console.error('获取魔法少女失败:', error);
      return {
        success: false,
        error: '获取魔法少女失败'
      };
    }
  }

  // 根据姓名获取魔法少女
  static async getByName(name: string): Promise<any> {
    try {
      const sql = 'SELECT * FROM magical_girls WHERE name = ?';
      const result = await executeQuery(sql, [name]);
      
      if (result.length === 0) {
        return {
          success: false,
          error: '魔法少女不存在'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      console.error('获取魔法少女失败:', error);
      return {
        success: false,
        error: '获取魔法少女失败'
      };
    }
  }

  // 获取所有魔法少女（分页）
  static async getAll(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM magical_girls';
      const countResult = await executeQuery(countSql);
      const total = countResult[0].total;
      
      // 获取分页数据
      const sql = 'SELECT * FROM magical_girls ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
      console.error('获取魔法少女列表失败:', error);
      return {
        success: false,
        error: '获取魔法少女列表失败'
      };
    }
  }

  // 更新魔法少女
  static async update(id: string, updateData: any): Promise<any> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      // 动态构建更新字段
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          if (key === 'appearance') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      if (fields.length === 0) {
        return {
          success: false,
          error: '没有可更新的字段'
        };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const sql = `UPDATE magical_girls SET ${fields.join(', ')} WHERE id = ?`;
      await executeQuery(sql, values);
      
      const updated = await this.getById(id);
      return {
        success: true,
        data: updated.data
      };
    } catch (error) {
      console.error('更新魔法少女失败:', error);
      return {
        success: false,
        error: '更新魔法少女失败'
      };
    }
  }

  // 删除魔法少女
  static async delete(id: string): Promise<any> {
    try {
      const sql = 'DELETE FROM magical_girls WHERE id = ?';
      await executeQuery(sql, [id]);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('删除魔法少女失败:', error);
      return {
        success: false,
        error: '删除魔法少女失败'
      };
    }
  }

  // 搜索魔法少女
  static async search(query: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      const searchQuery = `%${query}%`;
      
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM magical_girls WHERE name LIKE ? OR flower_name LIKE ?';
      const countResult = await executeQuery(countSql, [searchQuery, searchQuery]);
      const total = countResult[0].total;
      
      // 获取分页数据
      const sql = 'SELECT * FROM magical_girls WHERE name LIKE ? OR flower_name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const result = await executeQuery(sql, [searchQuery, searchQuery, limit, offset]);
      
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
      console.error('搜索魔法少女失败:', error);
      return {
        success: false,
        error: '搜索魔法少女失败'
      };
    }
  }
}

module.exports = { MagicalGirlService };

