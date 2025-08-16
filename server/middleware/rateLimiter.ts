import rateLimit from 'express-rate-limit';

// 通用API速率限制
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP在15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: '15分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: '请求过于频繁，请稍后再试',
        statusCode: 429,
        retryAfter: '15分钟'
      }
    });
  }
});

// 登录接口速率限制
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP在15分钟内最多5次登录尝试
  message: {
    error: '登录尝试次数过多，请稍后再试',
    retryAfter: '15分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: '登录尝试次数过多，请稍后再试',
        statusCode: 429,
        retryAfter: '15分钟'
      }
    });
  }
});

// AI生成接口速率限制
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3, // 限制每个IP在1分钟内最多3次AI生成请求
  message: {
    error: 'AI生成请求过于频繁，请稍后再试',
    retryAfter: '1分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'AI生成请求过于频繁，请稍后再试',
        statusCode: 429,
        retryAfter: '1分钟'
      }
    });
  }
});
