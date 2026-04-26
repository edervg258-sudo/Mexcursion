// ============================================================
//  lib/logger.ts  —  Logging estructurado
// ============================================================

import * as Sentry from '@sentry/react-native';

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
    Sentry.captureMessage(formatMessage(message, ctx), 'info');
  },

  warning: (message: string, ctx?: LogContext) => {
    console.warn(formatMessage(message, ctx), ctx);
    Sentry.captureMessage(formatMessage(message, ctx), 'warning');
  },

  error: (error: unknown, ctx?: LogContext) => {
    console.error(formatMessage('Error', ctx), error);
    Sentry.withScope(scope => {
      if (ctx?.feature) scope.setTag('feature', ctx.feature);
      if (ctx?.action) scope.setTag('action', ctx.action);
      if (ctx?.userId) scope.setUser({ id: ctx.userId });
      if (ctx) scope.setContext('extra', ctx);
      Sentry.captureException(error);
    });
  },

  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: (ctx?: LogContext) => {
        const duration = Date.now() - start;
        const msg = `${name} took ${duration}ms`;
        __DEV__ ? console.debug(msg) : console.info(msg, ctx);
        Sentry.addBreadcrumb({
          category: 'performance',
          message: msg,
          level: 'info',
          data: ctx as Record<string, string>,
        });
      },
    };
  },
};

export const track = (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    category: 'track',
    message: eventName,
    level: 'info',
    data: properties as Record<string, string>,
  });
};