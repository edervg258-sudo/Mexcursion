import React from 'react';
import { Platform } from 'react-native';
import * as Performance from './performance';
import { logEvent } from './analytics';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
  Platform: {
    OS: 'android',
  },
}));

jest.mock('./analytics', () => ({
  logEvent: jest.fn(),
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
    it('should initialize performance monitoring and log event', () => {
      Performance.initPerformanceMonitoring();

      expect(logEvent).toHaveBeenCalledWith('perf_monitoring_initialized', {
        platform: Platform.OS,
      });
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
    it('should track async operation below threshold without logging', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await Performance.trackAsyncOperation('quick-op', operation, 500);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(logEvent).not.toHaveBeenCalled();
    });

    it('should log slow operation exceeding threshold', async () => {
      const operation = jest.fn(
        () => new Promise((resolve) => {
          setTimeout(() => resolve('slow'), 400);
        })
      );

      const result = await Performance.trackAsyncOperation('slow-op', operation, 300);

      expect(result).toBe('slow');
      expect(logEvent).toHaveBeenCalledWith(
        'perf_slow_operation',
        expect.objectContaining({
          operationName: 'slow-op',
        })
      );
    });

    it('should log failed operations', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        Performance.trackAsyncOperation('failed-op', operation, 350)
      ).rejects.toThrow('Operation failed');

      expect(logEvent).toHaveBeenCalledWith(
        'perf_failed_operation',
        expect.objectContaining({
          operationName: 'failed-op',
        })
      );
    });

    it('should use default threshold of 350ms', async () => {
      const operation = jest.fn(
        () => new Promise((resolve) => {
          setTimeout(() => resolve('data'), 360);
        })
      );

      await Performance.trackAsyncOperation('default-threshold', operation);

      expect(logEvent).toHaveBeenCalledWith(
        'perf_slow_operation',
        expect.any(Object)
      );
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
      const TestComponent = () => <div>Test Content</div>;

      const boundary = new PerformanceErrorBoundary(
        { children: <TestComponent /> },
        {}
      );

      expect(boundary.render()).toBeTruthy();
    });

    it('should catch errors and log them', () => {
      const { PerformanceErrorBoundary } = Performance;
      const testError = new Error('Test error');
      const errorInfo = { componentStack: 'Component > Child' };

      const boundary = new PerformanceErrorBoundary({ children: null }, {});

      boundary.componentDidCatch(testError, errorInfo);

      expect(logEvent).toHaveBeenCalledWith(
        'error_boundary_caught',
        expect.objectContaining({
          error: 'Test error',
          stack: 'Component > Child',
        })
      );
    });

    it('should log error boundary with empty stack if not provided', () => {
      const { PerformanceErrorBoundary } = Performance;
      const testError = new Error('Test error');
      const errorInfo = { componentStack: undefined };

      const boundary = new PerformanceErrorBoundary({ children: null }, {});

      boundary.componentDidCatch(testError, errorInfo);

      expect(logEvent).toHaveBeenCalledWith(
        'error_boundary_caught',
        expect.objectContaining({
          error: 'Test error',
          stack: '',
        })
      );
    });
  });

  describe('perfNow fallback', () => {
    it('should handle missing performance.now gracefully', async () => {
      const originalPerformance = global.performance;
      (global as any).performance = undefined;

      const operation = jest.fn().mockResolvedValue('success');
      const result = await Performance.trackAsyncOperation('fallback-test', operation, 100);

      expect(result).toBe('success');

      global.performance = originalPerformance;
    });
  });
});
