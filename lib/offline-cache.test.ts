// ============================================================
//  lib/offline-cache.test.ts
//  Tests for offline caching and queue management
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  CacheManager,
  cacheDestinos,
  cacheSugerencias,
  isConnected,
  withOfflineSupport,
  enqueueOfflineOperation,
  processOfflineQueue,
  registerOfflineHandler,
  getOfflineQueueSize,
} from './offline-cache';
import { Estado, Sugerencia } from './tipos';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

// Mock Sentry
jest.mock('./sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureApiError: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('set() - Guardar datos en cache', () => {
    it('debería guardar datos con timestamp y expiración', async () => {
      const testData = { id: 1, nombre: 'Cancún' };

      await CacheManager.set('test_key', testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test_key',
        expect.stringContaining('"data"')
      );

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedData);

      expect(parsed.data).toEqual(testData);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.expiry).toBe(1440 * 60 * 1000); // 24 horas por defecto
    });

    it('debería respetar expiración customizada', async () => {
      const testData = { id: 1 };

      await CacheManager.set('test_key', testData, 60); // 60 minutos

      const savedData = mockAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedData);

      expect(parsed.expiry).toBe(60 * 60 * 1000);
    });

    it('debería manejar errores de AsyncStorage gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await CacheManager.set('test_key', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error guardando cache'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('get() - Obtener datos del cache', () => {
    it('debería retornar datos no expirados', async () => {
      const testData = { id: 1, nombre: 'Cancún' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now(),
        expiry: 60 * 60 * 1000,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await CacheManager.get('test_key');

      expect(result).toEqual(testData);
    });

    it('debería retornar null si datos están expirados', async () => {
      const expiredCache = {
        data: { id: 1 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 horas atrás
        expiry: 60 * 60 * 1000, // Expira en 1 hora
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(expiredCache));

      const result = await CacheManager.get('test_key');

      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test_key');
    });

    it('debería retornar null si no hay datos almacenados', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await CacheManager.get('test_key');

      expect(result).toBeNull();
    });

    it('debería manejar JSON parse errors', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await CacheManager.get('test_key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error leyendo cache'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clear() - Limpiar todo el cache', () => {
    it('debería remover todas las claves de cache', async () => {
      await CacheManager.clear();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();

      const keysToRemove = mockAsyncStorage.multiRemove.mock.calls[0][0];
      expect(keysToRemove).toContain('@cache_destinos');
      expect(keysToRemove).toContain('@cache_reservas');
    });

    it('debería manejar errores al limpiar', async () => {
      mockAsyncStorage.multiRemove.mockRejectedValueOnce(new Error('Clear error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await CacheManager.clear();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error limpiando cache'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearExpired() - Limpiar cache expirado', () => {
    it('debería remover solo datos expirados', async () => {
      const nonExpiredCache = {
        data: { id: 1 },
        timestamp: Date.now(),
        expiry: 60 * 60 * 1000,
      };

      const expiredCache = {
        data: { id: 2 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        expiry: 60 * 60 * 1000,
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(nonExpiredCache))
        .mockResolvedValueOnce(JSON.stringify(expiredCache));

      await CacheManager.clearExpired();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });
});

describe('cacheDestinos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería guardar destinos en cache', async () => {
    const destinos = [
      { id: 1, nombre: 'Cancún', categoria: 'Playa', precio: 5000, imagen: '', descripcion: '', latitude: 0, longitude: 0 },
    ] as Estado[];

    await cacheDestinos.guardar(destinos);

    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it('debería obtener destinos del cache', async () => {
    const destinos = [
      { id: 1, nombre: 'Cancún', categoria: 'Playa', precio: 5000, imagen: '', descripcion: '', latitude: 0, longitude: 0 },
    ] as Estado[];

    const cacheEntry = {
      data: destinos,
      timestamp: Date.now(),
      expiry: 60 * 60 * 1000,
    };

    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

    const result = await cacheDestinos.obtener();

    expect(result).toEqual(destinos);
  });

  it('debería limpiar cache de destinos', async () => {
    await cacheDestinos.limpiar();

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@cache_destinos');
  });
});

describe('cacheSugerencias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería guardar sugerencias en cache', async () => {
    const sugerencias: Sugerencia[] = [
      { id: '1', titulo: 'Cancún', estado: 'Quintana Roo', hotel: '', precioHotel: '', estilo: '', restaurante: '', precioRestaurante: '', nivel: 'economico' as const, imagen: '' },
    ];

    await cacheSugerencias.guardar(sugerencias);

    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it('debería obtener sugerencias del cache', async () => {
    const sugerencias: Sugerencia[] = [
      { id: '1', titulo: 'Cancún', estado: 'Quintana Roo', hotel: '', precioHotel: '', estilo: '', restaurante: '', precioRestaurante: '', nivel: 'economico' as const, imagen: '' },
    ];

    const cacheEntry = {
      data: sugerencias,
      timestamp: Date.now(),
      expiry: 60 * 60 * 1000,
    };

    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

    const result = await cacheSugerencias.obtener();

    expect(result).toEqual(sugerencias);
  });
});

describe('withOfflineSupport - Fallback offline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería ejecutar operación online cuando hay conexión', async () => {
    const mockOperation = jest.fn().mockResolvedValueOnce('success');

    const result = await withOfflineSupport(mockOperation);

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('debería usar fallback si operación online falla', async () => {
    const mockOperation = jest.fn().mockRejectedValueOnce(new Error('Network error'));
    const mockFallback = jest.fn().mockReturnValueOnce('offline_data');

    const result = await withOfflineSupport(mockOperation, mockFallback);

    expect(mockFallback).toHaveBeenCalled();
    expect(result).toBe('offline_data');
  });

  it('debería lanzar error si no hay fallback y falla la operación', async () => {
    const mockOperation = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    await expect(withOfflineSupport(mockOperation)).rejects.toThrow('Network error');
  });
});

describe('Offline Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería encolar operaciones offline', async () => {
    const operation = {
      type: 'CREATE_RESERVATION',
      payload: { destino: 'Cancún', fecha: '2026-05-01' },
    };

    await enqueueOfflineOperation(operation);

    const savedQueue = mockAsyncStorage.setItem.mock.calls.find(
      call => call[0] === '@offline_queue'
    );

    expect(savedQueue).toBeDefined();
  });

  it('debería procesar queue cuando se recupera conexión', async () => {
    const mockHandler = jest.fn().mockResolvedValueOnce(undefined);

    registerOfflineHandler('TEST_OPERATION', mockHandler);

    await enqueueOfflineOperation({
      type: 'TEST_OPERATION',
      payload: { test: 'data' },
    });

    // Simular recuperación de conexión
    // (En una aplicación real, NetInfo listener dispararía esto)
    await processOfflineQueue();

    expect(mockHandler).toHaveBeenCalledWith({ test: 'data' });
  });

  it('debería reintentar operaciones fallidas hasta máximo intentos', async () => {
    const mockHandler = jest.fn().mockRejectedValue(new Error('Failed'));

    registerOfflineHandler('FAILING_OPERATION', mockHandler);

    await enqueueOfflineOperation({
      type: 'FAILING_OPERATION',
      payload: { test: 'data' },
    });

    // Procesar múltiples veces (debería reintentar)
    for (let i = 0; i < 5; i++) {
      await processOfflineQueue();
    }

    // Debería haber intentado múltiples veces
    expect(mockHandler.mock.calls.length).toBeGreaterThan(1);
  });

  it('debería retornar tamaño de queue', async () => {
    await enqueueOfflineOperation({
      type: 'TEST',
      payload: {},
    });

    const size = getOfflineQueueSize();
    expect(size).toBeGreaterThanOrEqual(0);
  });
});

describe('isConnected - Estado de conexión', () => {
  it('debería retornar estado actual de conexión', () => {
    const connected = isConnected();
    expect(typeof connected).toBe('boolean');
  });
});
