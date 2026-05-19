// ============================================================
//  lib/logger.ts  —  Logging estructurado
// ============================================================

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
    console.info(formatMessage(message, ctx), ctx);
  },

  warning: (message: string, ctx?: LogContext) => {
    console.warn(formatMessage(message, ctx), ctx);
  },

  error: (error: unknown, ctx?: LogContext) => {
    console.error(formatMessage('Error', ctx), error);
  },

  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: (ctx?: LogContext) => {
        const duration = Date.now() - start;
        const msg = `${name} took ${duration}ms`;
        __DEV__ ? console.debug(msg) : console.info(msg, ctx);
      },
    };
  },
};

export const track = (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  __DEV__ && console.debug('[track]', eventName, properties);
};
