import { Platform } from 'react-native';
import * as Performance from './performance';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
  Platform: {
    OS: 'android',
  },
}));

describe('Performance Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LIST_PERF_PRESET', () => {
    it('should export FlatList optimization constants', () => {
      expect(Performance.LIST_PERF_PRESET).toBeDefined();
      expect(Performance.LIST_PERF_PRESET.initialNumToRender).toBe(6);
      expect(Performance.LIST_PERF_PRESET.maxToRenderPerBatch).toBe(8);
      expect(Performance.LIST_PERF_PRESET.windowSize).toBe(7);
      expect(Performance.LIST_PERF_PRESET.updateCellsBatchingPeriod).toBe(40);
    });

    it('should disable removeClippedSubviews for web', () => {
      const preset = Performance.LIST_PERF_PRESET;
      expect(preset.removeClippedSubviews).toBe(Platform.OS !== 'web');
    });
  });

  describe('initPerformanceMonitoring', () => {
    it('should not throw', () => {
      expect(() => Performance.initPerformanceMonitoring()).not.toThrow();
    });
  });

  describe('preloadCriticalResources', () => {
    it('should preload critical images without throwing', () => {
      expect(() => {
        Performance.preloadCriticalResources();
      }).not.toThrow();
    });
  });

  describe('trackAsyncOperation', () => {
    it('should return the result of the operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await Performance.trackAsyncOperation('quick-op', operation, 500);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should propagate errors from the operation', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      await expect(
        Performance.trackAsyncOperation('failed-op', operation, 350)
      ).rejects.toThrow('Operation failed');
    });

    it('should use default threshold without throwing', async () => {
      const operation = jest.fn().mockResolvedValue('data');
      const result = await Performance.trackAsyncOperation('default-threshold', operation);
      expect(result).toBe('data');
    });
  });

  describe('runAfterInteractions', () => {
    it('should execute task after interactions complete', () => {
      const task = jest.fn();
      Performance.runAfterInteractions(task);
      expect(task).toHaveBeenCalled();
    });

    it('should delegate to InteractionManager.runAfterInteractions', () => {
      const task = jest.fn();
      Performance.runAfterInteractions(task);
      expect(require('react-native').InteractionManager.runAfterInteractions).toHaveBeenCalled();
    });
  });

  describe('PerformanceErrorBoundary', () => {
    it('should render children without errors', () => {
      const { PerformanceErrorBoundary } = Performance;
      const boundary = new PerformanceErrorBoundary({ children: 'test' }, {});
      expect(boundary.render()).toBeTruthy();
    });

    it('should not throw on componentDidCatch', () => {
      const { PerformanceErrorBoundary } = Performance;
      const testError = new Error('Test error');
      const errorInfo = { componentStack: 'Component > Child' };
      const boundary = new PerformanceErrorBoundary({ children: null }, {});
      expect(() => boundary.componentDidCatch(testError, errorInfo)).not.toThrow();
    });
  });

  describe('perfNow fallback', () => {
    it('should handle missing performance.now gracefully', async () => {
      const originalPerformance = global.performance;
      (global as unknown as Record<string, unknown>).performance = undefined;
      const operation = jest.fn().mockResolvedValue('success');
      const result = await Performance.trackAsyncOperation('fallback-test', operation, 100);
      expect(result).toBe('success');
      global.performance = originalPerformance;
    });
  });
});
