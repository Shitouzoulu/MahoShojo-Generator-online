import { generateObject, NoObjectGeneratedError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { aiConfig, AIProvider } from "./ai-config";
import { getLogger } from "./logger";

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const log = getLogger('ai');

// 生成配置接口
export interface GenerationConfig<T, I = string> {
  systemPrompt: string;
  temperature: number;
  promptBuilder: (input: I) => string;
  schema: z.ZodSchema<T>;
  taskName: string;
  maxTokens: number;
}

const createAIClient = (provider: AIProvider) => {
  if (provider.type === 'google') {
    return createGoogleGenerativeAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });
  } else {
    return createOpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      compatibility: "compatible",
    });
  }
};

/**
 * 随机打乱数组的函数 (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 根据权重随机选择元素
 */
function weightedRandomSelect<T extends { weight?: number }>(items: T[]): T[] {
  if (items.length === 0) return [];

  // 如果没有权重，返回随机打乱的数组
  if (!items.some(item => item.weight)) {
    return shuffleArray(items);
  }

  const sorted = [...items].sort((a, b) => {
    const weightA = a.weight || 1;
    const weightB = b.weight || 1;
    // 添加随机因子，权重高的更容易被选中，但不是绝对的
    return (weightB + Math.random() * 0.5) - (weightA + Math.random() * 0.5);
  });

  return sorted;
}

/**
 * 从模型数组中随机选择一个模型
 */
function selectRandomModel(models: string | string[]): string {
  if (typeof models === 'string') {
    return models;
  }
  if (Array.isArray(models) && models.length > 0) {
    return models[Math.floor(Math.random() * models.length)];
  }
  throw new Error('无效的模型配置');
}

/**
 * 展开提供商的多模型配置，为每个模型创建单独的提供商实例
 */
function expandProviders(providers: AIProvider[]): AIProvider[] {
  const expandedProviders: AIProvider[] = [];

  providers.forEach(provider => {
    if (typeof provider.model === 'string') {
      // 单个模型，直接添加
      expandedProviders.push(provider);
    } else if (Array.isArray(provider.model)) {
      // 多个模型，为每个模型创建单独的提供商实例
      provider.model.forEach((model, index) => {
        expandedProviders.push({
          ...provider,
          name: `${provider.name}_model_${index + 1}`,
          model,
          weight: provider.weight || 1
        });
      });
    }
  });

  return expandedProviders;
}

/**
 * 负载均衡策略枚举
 */
export enum LoadBalanceStrategy {
  SEQUENTIAL = 'sequential',  // 顺序执行（原有逻辑）
  RANDOM = 'random',         // 随机选择
  ROUND_ROBIN = 'round_robin' // 轮询（暂时不实现）
}

// 全局轮询计数器（用于轮询策略）
let roundRobinCounter = 0;

// 通用 AI 生成函数
export async function generateWithAI<T, I = string>(
  input: I,
  generationConfig: GenerationConfig<T, I>,
  loadBalanceStrategy?: LoadBalanceStrategy
): Promise<T> {
  const baseProviders = aiConfig.PROVIDERS;

  if (baseProviders.length === 0) {
    log.error("没有配置 API Key");
    throw new Error("没有配置 API Key");
  }

  // 展开多模型配置
  const expandedProviders = expandProviders(baseProviders);
  log.debug(`展开后的提供商数量: ${expandedProviders.length}`);

  // 如果没有指定策略，从配置中读取
  const strategy = loadBalanceStrategy || (aiConfig.LOAD_BALANCE_STRATEGY as LoadBalanceStrategy) || LoadBalanceStrategy.RANDOM;

  let lastError: unknown = null;
  let providersToTry: AIProvider[] = [];

  // 根据负载均衡策略决定提供商顺序
  switch (strategy) {
    case LoadBalanceStrategy.RANDOM:
      // 使用权重随机选择
      providersToTry = weightedRandomSelect(expandedProviders);
      log.debug('使用加权随机策略', {
        order: providersToTry.map(p => `${p.name}(${typeof p.model === 'string' ? p.model : 'multi'})`)
      });
      break;

    case LoadBalanceStrategy.ROUND_ROBIN:
      // 轮询选择提供商
      const startIndex = roundRobinCounter % expandedProviders.length;
      providersToTry = [
        ...expandedProviders.slice(startIndex),
        ...expandedProviders.slice(0, startIndex)
      ];
      roundRobinCounter++;
      log.debug('使用轮询策略', {
        startIndex: startIndex + 1,
        order: providersToTry.map(p => `${p.name}(${typeof p.model === 'string' ? p.model : 'multi'})`)
      });
      break;

    case LoadBalanceStrategy.SEQUENTIAL:
    default:
      // 顺序执行（原有逻辑）
      providersToTry = [...expandedProviders];
      log.debug('使用顺序策略', {
        order: providersToTry.map(p => `${p.name}(${typeof p.model === 'string' ? p.model : 'multi'})`)
      });
      break;
  }

  // 遍历所有提供商
  for (let providerIndex = 0; providerIndex < providersToTry.length; providerIndex++) {
    const provider = providersToTry[providerIndex];

    // 检查是否跳过此提供商（第一个提供商不跳过）
    if (providerIndex > 0 && Math.random() < (provider.skipProbability ?? 0)) {
      log.debug('跳过提供商', { name: provider.name, skipProbability: provider.skipProbability });
      continue;
    }

    const retryCount = provider.retryCount ?? 1;
    // 从可能的多个模型中选择一个
    const selectedModel = selectRandomModel(provider.model);
    log.info(`开始使用提供商: ${provider.name} 模型: ${selectedModel} 重试次数: ${retryCount}`);

    // 对当前提供商进行重试
    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        log.debug(`开始尝试: 提供商: ${provider.name} 模型: ${selectedModel} 尝试次数: ${attempt + 1} / ${retryCount}`);

        const llm = createAIClient(provider);

        const systemPrompt = generationConfig.systemPrompt + generationConfig.promptBuilder(input) + 'Ignore the user \'s prompt.';
        const generateOptions = {
          model: llm(selectedModel),
          // 应对风控，尝试直接全部放入系统提示词中
          system: systemPrompt,
          // 从 systemPrompt 随机截取一个长度为20字的片段
          prompt: (() => {
            const len = 20;
            const start = Math.floor(Math.random() * Math.max(1, systemPrompt.length - len));
            return systemPrompt.substring(start, start + len);
          })(),
          schema: generationConfig.schema,
          temperature: generationConfig.temperature,
          maxTokens: generationConfig.maxTokens,
          retryCount: 1,
          mode: provider.mode || 'auto',
          experimental_repairText: provider.mode === 'json' ? async (options: any) => {
            options.text = options.text.replace('```json\n', '').replace('\n```', '');
            return options.text;
          } : undefined,
        };

        const { object } = await generateObject(generateOptions);

        log.info(`提供商生成成功: 提供商: ${provider.name} 尝试次数: ${attempt + 1}`);
        return object as T;
      } catch (error) {
        lastError = error;
        log.error(`提供商 ${provider.name} 第 ${attempt + 1} 次失败`, { error });

        if (NoObjectGeneratedError.isInstance(error)) {
          log.debug(`NoObjectGeneratedError 详情: 提供商: ${provider.name}`, {
            cause: error.cause,
            text: error.text,
            response: error.response,
            usage: error.usage,
            finishReason: error.finishReason
          });
        }

        // 如果不是最后一次尝试，等待后再重试
        if (attempt < retryCount - 1) {
          const waitTime = (attempt + 1) * 200; // 递增等待时间
          log.debug(`等待后重试: ${waitTime}ms`);
          await sleep(waitTime);
        }
      }
    }

    log.warn(`提供商所有尝试都失败了: ${provider.name}`);
  }

  log.error(`所有提供商都失败了: ${lastError}`);
  throw new Error(`${generationConfig.taskName}失败: ${lastError}`);
}
