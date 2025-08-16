import pino from 'pino';

// 创建 Pino 日志器配置
const createLogger = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const isEdge = process.env.NEXT_RUNTIME === 'edge';

  // Edge Runtime 环境配置
  if (isEdge) {
    return pino({
      level: isDev ? 'debug' : 'info',
      browser: {
        write: (o: any) => {
          console.log(JSON.stringify(o));
        }
      }
    });
  }

  // Node.js 环境配置
  return pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        messageFormat: '[{caller}] {msg}',
        singleLine: false
      }
    } : undefined,
    formatters: {
      level: (label: string) => {
        return { level: label };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
};

// 创建日志器实例
const logger = createLogger();

// 创建带有文件名的日志实例
export const getLogger = (fileName: string) => ({
  info: (msg: string, ...args: any[]) => {
    const logData = { caller: fileName };
    
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'object' && firstArg !== null) {
        // 如果是对象，合并到logData中
        Object.assign(logData, firstArg);
        // 传递剩余参数
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.info(logData, msg, ...remainingArgs);
        } else {
          logger.info(logData, msg);
        }
      } else {
        // 如果不是对象，作为data字段
        logData.data = firstArg;
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.info(logData, msg, ...remainingArgs);
        } else {
          logger.info(logData, msg);
        }
      }
    } else {
      logger.info(logData, msg);
    }
  },

  error: (msg: string, ...args: any[]) => {
    const logData = { caller: fileName };
    
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'object' && firstArg !== null) {
        Object.assign(logData, firstArg);
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.error(logData, msg, ...remainingArgs);
        } else {
          logger.error(logData, msg);
        }
      } else {
        logData.data = firstArg;
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.error(logData, msg, ...remainingArgs);
        } else {
          logger.error(logData, msg);
        }
      }
    } else {
      logger.error(logData, msg);
    }
  },

  warn: (msg: string, ...args: any[]) => {
    const logData = { caller: fileName };
    
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'object' && firstArg !== null) {
        Object.assign(logData, firstArg);
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.warn(logData, msg, ...remainingArgs);
        } else {
          logger.warn(logData, msg);
        }
      } else {
        logData.data = firstArg;
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.warn(logData, msg, ...remainingArgs);
        } else {
          logger.warn(logData, msg);
        }
      }
    } else {
      logger.warn(logData, msg);
    }
  },

  debug: (msg: string, ...args: any[]) => {
    const logData = { caller: fileName };
    
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'object' && firstArg !== null) {
        Object.assign(logData, firstArg);
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.debug(logData, msg, ...remainingArgs);
        } else {
          logger.debug(logData, msg);
        }
      } else {
        logData.data = firstArg;
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          logger.debug(logData, msg, ...remainingArgs);
        } else {
          logger.debug(logData, msg);
        }
      }
    } else {
      logger.debug(logData, msg);
    }
  }
});

// 默认日志方法（无文件名）
export const log = {
  info: (msg: string, ...args: any[]) => {
    logger.info(msg, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    logger.error(msg, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    logger.warn(msg, ...args);
  },
  debug: (msg: string, ...args: any[]) => {
    logger.debug(msg, ...args);
  }
};