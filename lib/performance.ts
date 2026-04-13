import React from 'react';
import { InteractionManager, Platform } from 'react-native';
import { logEvent } from './analytics';

const perfNow = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

export const LIST_PERF_PRESET = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  updateCellsBatchingPeriod: 40,
  removeClippedSubviews: Platform.OS !== 'web',
} as const;

export const initPerformanceMonitoring = () => {
  // Hook para futuras integraciones; dejamos breadcrumb analítico mínimo.
  void logEvent('perf_monitoring_initialized', { platform: Platform.OS });
};

export const preloadCriticalResources = () => {
  require('../assets/images/logo.png');
  require('../assets/images/favicon.png');
  require('../assets/images/mapa.png');
};

export async function trackAsyncOperation<T>(
  operationName: string,
  fn: () => Promise<T>,
  thresholdMs = 350
): Promise<T> {
  const start = perfNow();
  try {
    const result = await fn();
    const duration = Math.round(perfNow() - start);
    if (duration >= thresholdMs) {
      void logEvent('perf_slow_operation', { operationName, duration });
    }
    return result;
  } catch (error) {
    const duration = Math.round(perfNow() - start);
    void logEvent('perf_failed_operation', { operationName, duration });
    throw error;
  }
}

export const runAfterInteractions = (task: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    task();
  });
};

export class PerformanceErrorBoundary extends React.Component<{ children: React.ReactNode }, Record<string, never>> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void logEvent('error_boundary_caught', {
      error: error.message,
      stack: info.componentStack ?? '',
    });
  }

  render() {
    return this.props.children;
  }
}

