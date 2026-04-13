// ============================================================
//  lib/offline-cache.ts  —  Estrategias de cache offline avanzado
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Estado, Sugerencia } from './tipos';
import { addBreadcrumb, captureApiError } from './sentry';

// Keys para AsyncStorage
const CACHE_KEYS = {
  DESTINOS: '@cache_destinos',
  SUGERENCIAS: '@cache_sugerencias',
  USUARIO: '@cache_usuario',
  RESERVAS: '@cache_reservas',
  FAVORITOS: '@cache_favoritos',
  TIMESTAMP: '@cache_timestamp',
};

// Tiempo de expiración del cache (24 horas)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Estado de conectividad
let isOnline = true;

// Monitorear conectividad
NetInfo.addEventListener(state => {
  isOnline = state.isConnected ?? false;
});

// Cache inteligente con expiración
export class CacheManager {
  static async set(key: string, data: any, expiryMinutes = 1440): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiry: expiryMinutes * 60 * 1000,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error guardando cache:', error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      const isExpired = now - cacheData.timestamp > cacheData.expiry;

      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Error leyendo cache:', error);
      return null;
    }
  }

  static async clear(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.warn('Error limpiando cache:', error);
    }
  }

  static async clearExpired(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      const now = Date.now();

      for (const key of keys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (now - cacheData.timestamp > cacheData.expiry) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Error limpiando cache expirado:', error);
    }
  }
}

// Funciones específicas para datos de la app
export const cacheDestinos = {
  async guardar(destinos: Estado[]): Promise<void> {
    await CacheManager.set(CACHE_KEYS.DESTINOS, destinos);
  },

  async obtener(): Promise<Estado[] | null> {
    return await CacheManager.get<Estado[]>(CACHE_KEYS.DESTINOS);
  },

  async limpiar(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEYS.DESTINOS);
  }
};

export const cacheSugerencias = {
  async guardar(sugerencias: Sugerencia[]): Promise<void> {
    await CacheManager.set(CACHE_KEYS.SUGERENCIAS, sugerencias);
  },

  async obtener(): Promise<Sugerencia[] | null> {
    return await CacheManager.get<Sugerencia[]>(CACHE_KEYS.SUGERENCIAS);
  }
};

// Queue para operaciones offline
class OfflineQueue {
  private static readonly QUEUE_KEY = '@offline_queue';
  private static queue: OfflineOperation[] = [];
  private static handlers: Record<string, (payload: Record<string, unknown>) => Promise<void>> = {};

  static async add(operation: OfflineOperation): Promise<void> {
    try {
      const op: OfflineOperation = { ...operation, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now(), attempts: operation.attempts ?? 0 };
      this.queue.push(op);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
      addBreadcrumb({
        category: 'offline_queue',
        message: 'operation_enqueued',
        data: { type: op.type, id: op.id },
      });
    } catch (error) {
      console.warn('Error agregando a queue offline:', error);
    }
  }

  static async process(): Promise<void> {
    if (!isOnline || this.queue.length === 0) return;

    try {
      const operations = [...this.queue];
      this.queue = [];

      for (const operation of operations) {
        try {
          // Procesar cada operación
          await this.processOperation(operation);
        } catch (error) {
          console.warn('Error procesando operación offline:', error);
          const nextAttempts = (operation.attempts ?? 0) + 1;
          if (nextAttempts < 5) {
            // Re-agregar al queue si falla (máximo 5 intentos)
            this.queue.push({ ...operation, attempts: nextAttempts });
          } else {
            captureApiError({
              feature: 'offline_queue',
              action: 'drop_failed_operation',
              error,
              metadata: { type: operation.type, id: operation.id },
            });
          }
        }
      }

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Error procesando queue offline:', error);
    }
  }

  private static async processOperation(operation: OfflineOperation): Promise<void> {
    const handler = this.handlers[operation.type];
    if (!handler) {
      throw new Error(`Operación no soportada: ${operation.type}`);
    }
    await handler(operation.payload);
  }

  static async load(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error cargando queue offline:', error);
    }
  }

  static registerHandler(type: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
    this.handlers[type] = handler;
  }

  static getSize() {
    return this.queue.length;
  }
}

// Inicializar queue offline
OfflineQueue.load();

// Monitorear conectividad y procesar queue
NetInfo.addEventListener(state => {
  const wasOffline = !isOnline;
  isOnline = state.isConnected ?? false;

  if (wasOffline && isOnline) {
    // Volvió la conexión, procesar queue
    setTimeout(() => OfflineQueue.process(), 1000);
  }
});

// Funciones de utilidad
export const isConnected = (): boolean => isOnline;

export const withOfflineSupport = async <T>(
  onlineOperation: () => Promise<T>,
  offlineFallback?: () => T
): Promise<T> => {
  if (isOnline) {
    try {
      return await onlineOperation();
    } catch (error) {
      console.warn('Error en operación online, usando fallback:', error);
      if (offlineFallback) return offlineFallback();
      throw error;
    }
  } else {
    if (offlineFallback) return offlineFallback();
    throw new Error('Sin conexión a internet');
  }
};

type OfflineOperation = {
  id?: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
  attempts?: number;
};

export const enqueueOfflineOperation = (operation: OfflineOperation) => OfflineQueue.add(operation);
export const processOfflineQueue = () => OfflineQueue.process();
export const registerOfflineHandler = (type: string, handler: (payload: Record<string, unknown>) => Promise<void>) =>
  OfflineQueue.registerHandler(type, handler);
export const getOfflineQueueSize = () => OfflineQueue.getSize();
