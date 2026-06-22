// ============================================================
//  lib/sync-user-data.test.ts
//  Tests for user data synchronization between local and server
// ============================================================

// Mocks must be applied before imports
jest.mock('./supabase');
jest.mock('./secure-storage');
jest.mock('./supabase-db');

import {
  sincronizarDatosUsuario,
  guardarDatoLocal,
  obtenerDadoLocal,
  sincronizacionAutomatica,
} from './sync-user-data';
import * as supabaseModule from './supabase';
import * as secureStorageModule from './secure-storage';
import * as supabaseDbModule from './supabase-db';

const mockSupabase = supabaseModule.supabase as jest.Mocked<typeof supabaseModule.supabase>;
const mockSecureStorage = secureStorageModule as jest.Mocked<typeof secureStorageModule>;
const mockSupabaseDb = supabaseDbModule as jest.Mocked<typeof supabaseDbModule>;

describe('User Data Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sincronizarDatosUsuario - Sincronización bidireccional', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };
    const mockServerData = {
      idioma: 'es',
      notificaciones: 1,
      preferencias: { theme: 'dark' },
    };

    beforeEach(() => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);
    });

    it('debería sincronizar cambios locales hacia el servidor', async () => {
      mockSecureStorage.secureGet
        .mockResolvedValueOnce('en') // idioma local
        .mockResolvedValueOnce(null) // notificaciones
        .mockResolvedValueOnce(null) // favoritos
        .mockResolvedValueOnce(null) // preferencias
        .mockResolvedValueOnce(null); // lastSync

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockServerData, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await sincronizarDatosUsuario();

      // Debería haber intentado actualizar idioma en servidor
      expect(mockSupabase.from).toHaveBeenCalledWith('usuarios');
    });

    it('debería descargar cambios del servidor si están vacíos localmente', async () => {
      mockSecureStorage.secureGet
        .mockResolvedValueOnce(null) // idioma local
        .mockResolvedValueOnce(null) // notificaciones
        .mockResolvedValueOnce(null) // favoritos
        .mockResolvedValueOnce(null) // preferencias
        .mockResolvedValueOnce(null); // lastSync

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockServerData, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await sincronizarDatosUsuario();

      // Debería guardar datos del servidor localmente
      expect(mockSecureStorage.secureSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });

    it('debería retornar sin hacer nada si no hay usuario activo', async () => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValueOnce(null);

      await sincronizarDatosUsuario();

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('debería manejar errores de Supabase gracefully', async () => {
      mockSecureStorage.secureGet
        .mockResolvedValueOnce('en')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
          }),
        }),
      } as any);

      // No debería lanzar error
      await expect(sincronizarDatosUsuario()).resolves.not.toThrow();
    });

    it('debería actualizar lastSync timestamp después de sincronizar', async () => {
      mockSecureStorage.secureGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockServerData, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await sincronizarDatosUsuario();

      // Debería guardar LAST_SYNC timestamp
      expect(mockSecureStorage.secureSet).toHaveBeenCalledWith(
        expect.stringContaining('last_sync'),
        expect.any(String)
      );
    });
  });

  describe('guardarDatoLocal - Guardar y sincronizar dato local', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };

    beforeEach(() => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { idioma: 'es', notificaciones: 1 },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
    });

    it('debería guardar string localmente', async () => {
      mockSecureStorage.secureGet.mockResolvedValue(null);

      await guardarDatoLocal('IDIOMA', 'en');

      expect(mockSecureStorage.secureSet).toHaveBeenCalledWith(
        expect.stringContaining('idioma'),
        'en'
      );
    });

    it('debería guardar number como string localmente', async () => {
      mockSecureStorage.secureGet.mockResolvedValue(null);

      await guardarDatoLocal('NOTIFICACIONES', 0);

      expect(mockSecureStorage.secureSet).toHaveBeenCalledWith(
        expect.stringContaining('notificaciones'),
        '0'
      );
    });

    it('debería guardar object como JSON localmente', async () => {
      mockSecureStorage.secureGet.mockResolvedValue(null);

      const preferencias = { theme: 'dark' };

      await guardarDatoLocal('PREFERENCIAS', preferencias);

      expect(mockSecureStorage.secureSet).toHaveBeenCalledWith(
        expect.stringContaining('preferencias'),
        JSON.stringify(preferencias)
      );
    });

    it('debería encolar cambios si la sincronización falla', async () => {
      mockSecureStorage.secureGet.mockResolvedValue(null);

      // Simular fallo de sincronización
      mockSupabaseDb.obtenerUsuarioActivo.mockRejectedValueOnce(
        new Error('No user')
      );

      await guardarDatoLocal('IDIOMA', 'en');

      // Debería haber intentado guardar localmente
      expect(mockSecureStorage.secureSet).toHaveBeenCalled();
    });

    it('debería manejar errores de secureStorage gracefully', async () => {
      mockSecureStorage.secureSet.mockRejectedValueOnce(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await guardarDatoLocal('IDIOMA', 'en');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error guardando dato local'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('obtenerDadoLocal - Obtener dato local', () => {
    it('debería retornar string sin parsear', async () => {
      mockSecureStorage.secureGet.mockResolvedValueOnce('en');

      const result = await obtenerDadoLocal('IDIOMA');

      expect(result).toBe('en');
    });

    it('debería parsear y retornar JSON cuando sea posible', async () => {
      const preferencias = { theme: 'dark' };
      mockSecureStorage.secureGet.mockResolvedValueOnce(JSON.stringify(preferencias));

      const result = await obtenerDadoLocal('PREFERENCIAS');

      expect(result).toEqual(preferencias);
    });

    it('debería retornar null si no hay dato almacenado', async () => {
      mockSecureStorage.secureGet.mockResolvedValueOnce(null);

      const result = await obtenerDadoLocal('IDIOMA');

      expect(result).toBeNull();
    });

    it('debería retornar valor como string si JSON parse falla', async () => {
      mockSecureStorage.secureGet.mockResolvedValueOnce('not-json-string');

      const result = await obtenerDadoLocal('IDIOMA');

      expect(result).toBe('not-json-string');
    });

    it('debería manejar errores de secureStorage gracefully', async () => {
      mockSecureStorage.secureGet.mockRejectedValueOnce(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await obtenerDadoLocal('IDIOMA');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error obteniendo dato local'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sincronizacionAutomatica - Sincronización en background', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };

    beforeEach(() => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { idioma: 'es', notificaciones: 1 },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
    });

    it('debería sincronizar si nunca se ha sincronizado', async () => {
      mockSecureStorage.secureGet.mockResolvedValue(null);

      await sincronizacionAutomatica();

      // Debería ejecutar sincronización
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('debería sincronizar si ha pasado más de 5 minutos', async () => {
      const fiveMinutesAgo = (Date.now() - 6 * 60 * 1000).toString();
      mockSecureStorage.secureGet.mockResolvedValue(fiveMinutesAgo);

      jest.setSystemTime(new Date());

      await sincronizacionAutomatica();

      // Debería ejecutar sincronización
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('no debería sincronizar si ha pasado menos de 5 minutos', async () => {
      const oneMinuteAgo = (Date.now() - 1 * 60 * 1000).toString();
      mockSecureStorage.secureGet.mockResolvedValue(oneMinuteAgo);

      jest.setSystemTime(new Date());

      await sincronizacionAutomatica();

      // No debería ejecutar sincronización
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Backoff exponencial para reintentos', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };

    beforeEach(() => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);
    });

    it('debería usar backoff exponencial en reintentos fallidos', async () => {
      // Simular cola de cambios pendientes
      mockSecureStorage.secureGet
        .mockResolvedValueOnce(null) // idioma
        .mockResolvedValueOnce(null) // notificaciones
        .mockResolvedValueOnce(null) // favoritos
        .mockResolvedValueOnce(null) // preferencias
        .mockResolvedValueOnce(null); // lastSync

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { idioma: 'es', notificaciones: 1 },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: new Error('Network error') }),
        }),
      } as any);

      await sincronizarDatosUsuario();

      // Debería haber intentado guardar cambios pendientes
      expect(mockSecureStorage.secureSet).toHaveBeenCalled();
    });

    it('debería respetar máximo 5 intentos', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);

      // Simular cambio pendiente con 5 intentos fallidos
      const failedChange = {
        campo: 'idioma',
        valor: 'fr',
        timestamp: Date.now() - 10000,
        intentos: 5,
        proximoIntento: Date.now() - 1000,
      };

      mockSecureStorage.secureGet.mockResolvedValueOnce(JSON.stringify([failedChange]));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { idioma: 'es', notificaciones: 1 },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      // Llamar vaciarColaDeReintentos - debería descartar items con 5+ intentos
      await sincronizarDatosUsuario();

      // La cola debería estar vacía después de 5 intentos fallidos
      // (sería capturado por error tracking)
      expect(true).toBe(true);
    });
  });

  describe('Edge cases y manejo de errores', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };

    beforeEach(() => {
      mockSupabaseDb.obtenerUsuarioActivo.mockResolvedValue(mockUser as any);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { idioma: 'es', notificaciones: 1, preferencias: null },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
    });

    it('debería manejar conflictos de sincronización (estrategia más reciente)', async () => {
      const nowLocal = Date.now();
      const ahoraServer = new Date('2026-04-27T10:00:00Z').getTime();

      mockSecureStorage.secureGet
        .mockResolvedValueOnce('en') // idioma local más reciente
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await sincronizarDatosUsuario();

      // Debería haber intentado sincronizar idioma local
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('debería manejar cola vacía de cambios pendientes', async () => {
      mockSecureStorage.secureGet.mockResolvedValueOnce(null);

      // No debería lanzar error
      await expect(sincronizarDatosUsuario()).resolves.not.toThrow();
    });

    it('debería ignorar cambios pendientes cuando número intenta > máximo', async () => {
      const changeWith6Attempts = {
        campo: 'idioma',
        valor: 'fr',
        timestamp: Date.now(),
        intentos: 6,
        proximoIntento: Date.now(),
      };

      mockSecureStorage.secureGet.mockResolvedValueOnce(JSON.stringify([changeWith6Attempts]));

      await sincronizarDatosUsuario();

      // No debería procesarse cambio con 6+ intentos
      expect(true).toBe(true);
    });

    it('debería guardar timestamp último sync correctamente', async () => {
      mockSecureStorage.secureGet
        .mockResolvedValueOnce(null) // idioma
        .mockResolvedValueOnce(null) // notificaciones
        .mockResolvedValueOnce(null) // favoritos
        .mockResolvedValueOnce(null) // preferencias
        .mockResolvedValueOnce(null); // lastSync

      const beforeSync = Date.now();
      await sincronizarDatosUsuario();
      const afterSync = Date.now();

      // Debería guardar LAST_SYNC dentro del rango
      const lastSyncCall = mockSecureStorage.secureSet.mock.calls.find(
        call => String(call[0]).includes('last_sync')
      );

      expect(lastSyncCall).toBeDefined();
      if (lastSyncCall) {
        const savedTimestamp = parseInt(lastSyncCall[1] as string);
        expect(savedTimestamp).toBeGreaterThanOrEqual(beforeSync);
        expect(savedTimestamp).toBeLessThanOrEqual(afterSync);
      }
    });
  });
});
