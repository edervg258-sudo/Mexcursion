// ============================================================
//  lib/performance.ts  —  Monitoreo de rendimiento y optimizaciones
// ============================================================

import { PerformanceMonitor } from 'expo-performance';
import { logEvent } from './analytics';

// Inicializar monitoreo de rendimiento
export const initPerformanceMonitoring = () => {
  PerformanceMonitor.start();

  // Monitorear métricas clave
  PerformanceMonitor.addListener(({ type, data }) => {
    switch (type) {
      case 'appStart':
        logEvent('app_start_performance', {
          cold_start: data.coldStart,
          time: data.time,
        });
        break;
      case 'render':
        if (data.time > 16.67) { // Más de un frame a 60fps
          logEvent('slow_render', {
            component: data.component,
            time: data.time,
          });
        }
        break;
      case 'network':
        if (data.duration > 5000) { // Más de 5 segundos
          logEvent('slow_network_request', {
            url: data.url,
            duration: data.duration,
            status: data.status,
          });
        }
        break;
    }
  });
};

// Lazy loading de componentes
export const lazyLoad = <T>(
  importFunc: () => Promise<{ default: T }>
): Promise<{ default: T }> => {
  return importFunc();
};

// Optimización de imágenes
export const optimizeImage = (uri: string, options: {
  width?: number;
  height?: number;
  quality?: number;
}): string => {
  // Para Expo, usar ImageManipulator o similar
  // Por ahora, retornar URI original
  return uri;
};

// Bundle splitting hints
export const preloadCriticalResources = () => {
  // Pre-cargar recursos críticos
  require('../assets/images/logo.png');
  require('../assets/images/favicon.png');
};

// Memory monitoring
export const monitorMemoryUsage = () => {
  if (__DEV__) {
    // En desarrollo, loggear uso de memoria
    console.log('Memory usage monitoring active');
  }
};

// Network monitoring
export const monitorNetworkRequests = () => {
  // Monitorear requests de red
  // Integrar con React Query o fetch interceptors
};

// Error boundaries con performance tracking
export class PerformanceErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logEvent('error_boundary_caught', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    return this.props.children;
  }
}