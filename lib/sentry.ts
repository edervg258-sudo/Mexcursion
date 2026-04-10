// ============================================================
//  lib/sentry.ts  —  Sentry Configuration
// ============================================================

import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.includes('your-sentry-dsn')) { return; } // no configurado aún
  Sentry.init({
    dsn,
    enableTracing: true,
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    enableNativeCrashHandling: true,
    enableNativeNagger: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
  });
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  Sentry.captureException(error, context);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) => {
  Sentry.captureMessage(message, level, context);
};

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};