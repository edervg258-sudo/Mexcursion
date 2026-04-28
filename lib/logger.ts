// ============================================================
//  lib/logger.ts  —  Logging estructurado
// ============================================================

import * as Sentry from '@sentry/react-native';
import { drainLog } from './observability';

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
  if (ctx.action)  parts.push(`(${ctx.action})`);
  return parts.join(' ');
};

const drain = (level: LogLevel, message: string, ctx?: LogContext) => {
  drainLog({
    level,
    message,
    feature:  ctx?.feature  as string | undefined,
    action:   ctx?.action   as string | undefined,
    user_id:  ctx?.userId   as string | undefined,
    metadata: ctx,
  });
};

export const logger = {
  debug: (message: string, ctx?: LogContext) => {
    if (__DEV__) console.debug(formatMessage(message, ctx), ctx);
  },

  info: (message: string, ctx?: LogContext) => {
    console.info(formatMessage(message, ctx));
    Sentry.captureMessage(formatMessage(message, ctx), 'info');
    drain('info', message, ctx);
  },

  warning: (message: string, ctx?: LogContext) => {
    console.warn(formatMessage(message, ctx));
    Sentry.captureMessage(formatMessage(message, ctx), 'warning');
    drain('warning', message, ctx);
  },

  error: (error: unknown, ctx?: LogContext) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(formatMessage('Error', ctx), error);
    Sentry.withScope(scope => {
      if (ctx?.feature) scope.setTag('feature', ctx.feature as string);
      if (ctx?.action)  scope.setTag('action',  ctx.action  as string);
      if (ctx?.userId)  scope.setUser({ id: ctx.userId as string });
      if (ctx) scope.setContext('extra', ctx);
      Sentry.captureException(error);
    });
    drain('error', msg, ctx);
  },

  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: (ctx?: LogContext) => {
        const duration = Date.now() - start;
        const msg = `${name} took ${duration}ms`;
        if (__DEV__) console.debug(msg);
        Sentry.addBreadcrumb({
          category: 'performance',
          message:  msg,
          level:    'info',
          data:     ctx as Record<string, string>,
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
    message:  eventName,
    level:    'info',
    data:     properties as Record<string, string>,
  });
};
