import { getConfig } from './config';

// AI 提供商配置接口
export interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string | string[];
  type: 'openai' | 'google';
  retryCount?: number;
  skipProbability?: number;
  mode?: 'json' | 'auto' | 'tool' | undefined;
  weight?: number; // 负载均衡权重，数值越大被选中概率越高
}

// 解析 AI 提供商配置的函数
const parseAIProviders = (): AIProvider[] => {
  const config = getConfig();
  
  // JSON 配置方式
  if (config.AI_PROVIDERS_CONFIG) {
    try {
      const providers = JSON.parse(config.AI_PROVIDERS_CONFIG) as AIProvider[];
      return providers
        .filter(p => p.apiKey && p.baseUrl && p.model && p.type)
        .map(p => ({
          ...p,
          retryCount: p.retryCount ?? 1,
          skipProbability: p.skipProbability ?? 0,
          weight: p.weight ?? 1
        }));
    } catch (error) {
      console.warn('解析 AI_PROVIDERS_CONFIG 失败:', error);
    }
  }

  return [];
};

// 获取有效的 API 提供商（按配置顺序）
const getAPIProviders = (): AIProvider[] => {
  return parseAIProviders();
};

// 为了保持向后兼容，转换为原有的格式
const parseApiPairs = () => {
  const providers = getAPIProviders();
  return providers.map(provider => ({
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    name: provider.name,
    model: provider.model,
    mode: provider?.mode || 'auto'
  }));
};

// 获取第一个提供商的模型
const getDefaultModel = (): string | string[] => {
  const providers = getAPIProviders();
  if (providers.length > 0) {
    return providers[0].model;
  }
  return 'gemini-2.5-flash';
};

// 获取负载均衡策略
const getLoadBalanceStrategy = (): string => {
  const config = getConfig();
  return config.AI_LOAD_BALANCE_STRATEGY;
};

// 获取统计数据显示开关
const getShowStatData = (): boolean => {
  const showStat = process.env.SHOW_STAT_DATA || 'false';
  if (showStat === 'false' || showStat === '0') {
    return false;
  }
  return true; // 默认显示统计数据
};

// 获取排行榜模式
const getLeaderboardMode = (): 'all' | 'preset' | 'user' => {
  const mode = process.env.LEADERBOARD_MODE;
  if (mode === 'preset' || mode === 'user') {
    return mode;
  }
  return 'all'; // 默认为 'all'
};

// 获取竞技场用户引导功能开关
const getEnableArenaUserGuidance = (): boolean => {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ARENA_USER_GUIDANCE ?? 'true';
  return enabled === 'true';
};

// 获取世界观检查功能开关
const getEnableWorldviewCheck = (): boolean => {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_WORLDVIEW_CHECK ?? 'false';
  return enabled === 'true';
};

// 负载均衡选择器
export function selectAIProvider(strategy: string = 'random'): AIProvider | null {
  const providers = getAPIProviders();
  if (providers.length === 0) return null;
  
  switch (strategy) {
    case 'sequential':
      // 顺序选择 - 轮询
      const index = Math.floor(Date.now() / 1000) % providers.length;
      return providers[index];
      
    case 'round_robin':
      // 轮询选择
      let currentIndex = 0;
      return () => {
        const provider = providers[currentIndex];
        currentIndex = (currentIndex + 1) % providers.length;
        return provider;
      }();
      
    case 'random':
    default:
      // 随机选择
      return providers[Math.floor(Math.random() * providers.length)];
  }
}

export const aiConfig = {
  // Vercel AI 配置
  API_PAIRS: parseApiPairs(),
  MODEL: getDefaultModel(),
  PROVIDERS: getAPIProviders(),
  LOAD_BALANCE_STRATEGY: getLoadBalanceStrategy(),

  // 统计数据显示开关配置
  SHOW_STAT_DATA: getShowStatData(),

  // 排行榜模式配置
  LEADERBOARD_MODE: getLeaderboardMode(),

  // 竞技场用户引导功能开关
  ENABLE_ARENA_USER_GUIDANCE: getEnableArenaUserGuidance(),

  // 世界观检查功能开关
  ENABLE_WORLDVIEW_CHECK: getEnableWorldviewCheck(),

  // 魔法少女生成配置
  MAGICAL_GIRL_GENERATION: {
    temperature: 0.8,

    // 系统提示词
    systemPrompt: `你是一个专业的魔法少女角色设计师。请根据用户输入的真实姓名，设计一个独特的魔法少女角色。

设计要求：
1. 魔法少女名字应该以花名为主题，要与用户的真实姓名有某种关联性或呼应
2. 外貌特征要协调统一，符合魔法少女的设定
3. 变身咒语要朗朗上口，充满魔法感

请严格按照提供的 JSON schema 格式返回结果。`
  }
};

export default aiConfig;
