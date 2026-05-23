import React from 'react';
import { InteractionManager, Platform } from 'react-native';

const perfNow = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

export const LIST_PERF_PRESET = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  updateCellsBatchingPeriod: 40,
  removeClippedSubviews: Platform.OS !== 'web',
} as const;

export const initPerformanceMonitoring = () => {};

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
    if (__DEV__ && Math.round(perfNow() - start) >= thresholdMs) {
      console.warn(`[Perf] Slow operation: ${operationName}`);
    }
    return result;
  } catch (error) {
    throw error;
  }
}

export const runAfterInteractions = (task: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    task();
  });
};

export class PerformanceErrorBoundary extends React.Component<{ children: React.ReactNode }, Record<string, never>> {
  componentDidCatch(_error: Error, _info: React.ErrorInfo) {}

  render() {
    return this.props.children;
  }
}

