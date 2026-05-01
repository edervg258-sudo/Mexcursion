// lib/logger.ts — Logging estructurado (sin dependencias externas)

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

type LogContext = {
  feature?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
};

const formatMessage = (message: string, ctx?: LogContext): string => {
  if (!ctx) return message;
  const parts = [message];
  if (ctx.feature) parts.push(`[${ctx.feature}]`);
  if (ctx.action) parts.push(`(${ctx.action})`);
  return parts.join(' ');
};

export const logger = {
  debug: (message: string, ctx?: LogContext) => {
    __DEV__ && console.debug(formatMessage(message, ctx), ctx);
  },

  info: (message: string, ctx?: LogContext) => {
    if (__DEV__) console.info(formatMessage(message, ctx), ctx);
  },

  warning: (message: string, ctx?: LogContext) => {
    console.warn(formatMessage(message, ctx), ctx);
  },

  error: (error: unknown, ctx?: LogContext) => {
    console.error(formatMessage('Error', ctx), error, ctx);
  },

  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: (ctx?: LogContext) => {
        const duration = Date.now() - start;
        if (__DEV__) console.debug(`${name} took ${duration}ms`, ctx);
      },
    };
  },
};

export const track = (eventName: string, properties?: Record<string, unknown>) => {
  if (__DEV__) console.debug('[TRACK]', eventName, properties);
};
