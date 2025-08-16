#!/usr/bin/env node

const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'mahoshojo',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

async function testDatabase() {
  console.log('🧪 开始测试数据库连接...\n');
  console.log('📊 数据库配置:');
  console.log(`  主机: ${dbConfig.host}`);
  console.log(`  用户: ${dbConfig.user}`);
  console.log(`  数据库: ${dbConfig.database}`);
  console.log(`  端口: ${dbConfig.port}\n`);

  let connection;
  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 2. 初始化数据库表
    console.log('2️⃣ 初始化数据库表...');
    
    // 创建魔法少女角色表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS magical_girls (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        flower_name VARCHAR(100) NOT NULL,
        appearance JSON NOT NULL,
        spell TEXT NOT NULL,
        main_color VARCHAR(20) NOT NULL,
        first_page_color VARCHAR(7) NOT NULL,
        second_page_color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_flower_name (flower_name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建残兽表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS canshou (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stage VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        appearance JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_stage (stage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建战斗记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS battles (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        participants JSON NOT NULL,
        winner VARCHAR(100),
        battle_report JSON NOT NULL,
        mode ENUM('normal', 'daily', 'kizuna') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_winner (winner),
        INDEX idx_mode (mode),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建角色战斗历史表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS character_battle_history (
        id VARCHAR(36) PRIMARY KEY,
        character_id VARCHAR(36) NOT NULL,
        character_type ENUM('magical_girl', 'canshou') NOT NULL,
        battle_id VARCHAR(36) NOT NULL,
        role VARCHAR(20) NOT NULL,
        result ENUM('win', 'lose', 'draw') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_character (character_id),
        INDEX idx_battle (battle_id),
        INDEX idx_result (result)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ 数据库表初始化完成\n');

    // 3. 测试插入数据
    console.log('3️⃣ 测试插入数据...');
    
    // 插入测试魔法少女
    const testMagicalGirl = {
      id: generateUUID(),
      name: '测试角色',
      flower_name: '测试花',
      appearance: JSON.stringify({
        height: '160cm',
        weight: '50kg',
        hairColor: '黑色',
        hairStyle: '长发',
        eyeColor: '棕色',
        skinTone: '白皙',
        wearing: '测试服装',
        specialFeature: '测试特征',
        mainColor: '黑色',
        firstPageColor: '#000000',
        secondPageColor: '#333333'
      }),
      spell: '测试咒语',
      main_color: '黑色',
      first_page_color: '#000000',
      second_page_color: '#333333'
    };

    const insertSql = `
      INSERT INTO magical_girls (
        id, name, flower_name, appearance, spell, main_color, 
        first_page_color, second_page_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertSql, [
      testMagicalGirl.id,
      testMagicalGirl.name,
      testMagicalGirl.flower_name,
      testMagicalGirl.appearance,
      testMagicalGirl.spell,
      testMagicalGirl.main_color,
      testMagicalGirl.first_page_color,
      testMagicalGirl.second_page_color
    ]);

    console.log('✅ 魔法少女数据插入成功\n');

    // 4. 测试查询数据
    console.log('4️⃣ 测试查询数据...');
    
    const [rows] = await connection.execute('SELECT * FROM magical_girls');
    console.log(`✅ 查询成功，共找到 ${rows.length} 条记录`);
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      console.log('📋 第一条记录:');
      console.log(`  姓名: ${firstRow.name}`);
      console.log(`  花名: ${firstRow.flower_name}`);
      console.log(`  咒语: ${firstRow.spell}`);
      console.log(`  主色调: ${firstRow.main_color}`);
    }

    // 5. 测试搜索功能
    console.log('\n5️⃣ 测试搜索功能...');
    
    const [searchRows] = await connection.execute(
      'SELECT * FROM magical_girls WHERE name LIKE ? OR flower_name LIKE ?',
      ['%测试%', '%测试%']
    );
    
    console.log(`✅ 搜索成功，找到 ${searchRows.length} 条匹配记录`);

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    
    // 提供详细的错误信息和解决方案
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 解决方案:');
      console.log('   1. 确保MySQL服务正在运行');
      console.log('   2. 检查数据库连接配置');
      console.log('   3. 确认MySQL端口(3306)未被占用');
    } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
      console.log('\n💡 解决方案:');
      console.log('   1. 检查用户名和密码');
      console.log('   2. 确认用户有访问数据库的权限');
    } else if (error.message.includes('ER_BAD_DB_ERROR')) {
      console.log('\n💡 解决方案:');
      console.log('   1. 创建数据库: CREATE DATABASE mahoshojo;');
      console.log('   2. 检查数据库名称是否正确');
    }
  } finally {
    // 关闭数据库连接
    if (connection) {
      try {
        await connection.end();
        console.log('\n🔌 数据库连接已关闭');
      } catch (error) {
        console.log('\n⚠️  关闭数据库连接时发生错误:', error);
      }
    }
  }
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 运行测试
testDatabase().catch(console.error);
