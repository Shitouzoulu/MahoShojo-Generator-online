#!/usr/bin/env ts-node

// 设置环境变量（如果未设置）
if (!process.env.DB_HOST) {
  process.env.DB_HOST = 'localhost';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = '123456';
  process.env.DB_NAME = 'mahoshojo';
  process.env.DB_PORT = '3306';
}

const { initDatabase, getConnection, closeDatabase } = require('../lib/database');
const { MagicalGirlService } = require('../lib/services/magicalGirlService');
const { BattleService } = require('../lib/services/battleService');

async function testDatabase() {
  console.log('🧪 开始测试数据库连接...\n');
  console.log('📊 数据库配置:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  用户: ${process.env.DB_USER}`);
  console.log(`  数据库: ${process.env.DB_NAME}`);
  console.log(`  端口: ${process.env.DB_PORT}\n`);

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...');
    const connection = await getConnection();
    console.log('✅ 数据库连接成功\n');

    // 2. 初始化数据库表
    console.log('2️⃣ 初始化数据库表...');
    await initDatabase();
    console.log('✅ 数据库表初始化完成\n');

    // 3. 测试魔法少女服务
    console.log('3️⃣ 测试魔法少女服务...');
    
    // 创建测试魔法少女
    const testMagicalGirl = {
      name: '测试角色',
      flower_name: '测试花',
      appearance: {
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
      },
      spell: '测试咒语',
      main_color: '黑色',
      first_page_color: '#000000',
      second_page_color: '#333333'
    };

    const created = await MagicalGirlService.create(testMagicalGirl);
    if (created.success) {
      console.log('✅ 魔法少女创建成功:', created.data?.flower_name);
    } else {
      console.log('❌ 魔法少女创建失败:', created.error);
    }

    // 获取所有魔法少女
    const allMagicalGirls = await MagicalGirlService.getAll(1, 10);
    if (allMagicalGirls.success) {
      console.log(`✅ 获取魔法少女列表成功，共 ${allMagicalGirls.data?.total} 个角色`);
    } else {
      console.log('❌ 获取魔法少女列表失败:', allMagicalGirls.error);
    }

    // 4. 测试战斗服务
    console.log('\n4️⃣ 测试战斗服务...');
    
    const testBattle = {
      title: '测试战斗',
      participants: [
        { name: '测试角色1', type: 'magical_girl', role: '挑战者' },
        { name: '测试角色2', type: 'magical_girl', role: '守卫者' }
      ],
      winner: '测试角色1',
      battle_report: {
        headline: '测试战斗标题',
        article: { body: '测试战斗内容', analysis: '测试分析' },
        officialReport: { winner: '测试角色1', impact: '测试影响' }
      },
      mode: 'normal'
    };

    const createdBattle = await BattleService.create(testBattle);
    if (createdBattle.success) {
      console.log('✅ 战斗记录创建成功:', createdBattle.data?.title);
    } else {
      console.log('❌ 战斗记录创建失败:', createdBattle.error);
    }

    // 获取所有战斗记录
    const allBattles = await BattleService.getAll(1, 10);
    if (allBattles.success) {
      console.log(`✅ 获取战斗记录列表成功，共 ${allBattles.data?.total} 场战斗`);
    } else {
      console.log('❌ 获取战斗记录列表失败:', allBattles.error);
    }

    // 5. 测试搜索功能
    console.log('\n5️⃣ 测试搜索功能...');
    
    const searchResult = await MagicalGirlService.search('测试', 1, 10);
    if (searchResult.success) {
      console.log(`✅ 搜索功能正常，找到 ${searchResult.data?.total} 个结果`);
    } else {
      console.log('❌ 搜索功能失败:', searchResult.error);
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    
    // 提供详细的错误信息和解决方案
    if (error instanceof Error) {
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
    }
  } finally {
    // 关闭数据库连接
    try {
      await closeDatabase();
      console.log('\n🔌 数据库连接已关闭');
    } catch (error) {
      console.log('\n⚠️  关闭数据库连接时发生错误:', error);
    }
  }
}

// 运行测试
if (require.main === module) {
  testDatabase().catch(console.error);
}

module.exports = { testDatabase };
