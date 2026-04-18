// ============================================================
//  lib/sentry.ts  —  Sentry Configuration
// ============================================================

import * as Sentry from '@sentry/react-native';

type BreadcrumbInput = {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
};

type ApiErrorInput = {
  feature: string;
  action: string;
  error: unknown;
  metadata?: Record<string, unknown>;
};

export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.includes('your-sentry-dsn')) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN no configurado — crashes en producción no serán registrados. Crea un proyecto en sentry.io y añade el DSN a .env');
    }
    return;
  }
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    enableNativeCrashHandling: true,
    enableNativeNagger: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
  });
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) => {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureMessage(message, level);
  });
};

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = ({ category, message, level = 'info', data }: BreadcrumbInput) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
};

export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

export const captureApiError = ({ feature, action, error, metadata }: ApiErrorInput) => {
  Sentry.withScope(scope => {
    scope.setTag('feature', feature);
    scope.setTag('action', action);
    if (metadata) {
      scope.setContext('api_metadata', metadata);
    }
    Sentry.captureException(error);
  });
};
