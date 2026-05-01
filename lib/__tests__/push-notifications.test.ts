// lib/__tests__/push-notifications.test.ts

jest.mock('expo-constants', () => ({
  executionEnvironment: 'standalone',
  appOwnership: null,
  expoConfig: { extra: { enableNativePushNotifications: false } },
}));

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// El módulo se carga una vez con los mocks activos — módulo nativo no disponible.
import {
  notificationsDisponibles,
  configurarNotificaciones,
  registrarParaPush,
  mostrarNotificacionLocal,
  limpiarBadge,
  setTipoNotificacionHabilitado,
  registrarDeepLinkDeNotificacion,
} from '../push-notifications';
import { supabase } from '../supabase';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notificationsDisponibles', () => {
  it('devuelve false cuando el módulo nativo no está disponible', () => {
    expect(notificationsDisponibles()).toBe(false);
  });
});

describe('configurarNotificaciones', () => {
  it('retorna false cuando las notificaciones no están disponibles', async () => {
    const resultado = await configurarNotificaciones();
    expect(resultado).toBe(false);
  });
});

describe('registrarParaPush', () => {
  it('retorna null y no llama a Supabase cuando el módulo no está disponible', async () => {
    const token = await registrarParaPush('usuario-123');
    expect(token).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('mostrarNotificacionLocal', () => {
  it('no lanza error cuando el módulo no está disponible', async () => {
    await expect(
      mostrarNotificacionLocal('Título', 'Cuerpo')
    ).resolves.toBeUndefined();
  });

  it('acepta tipo de notificación y data opcionales', async () => {
    await expect(
      mostrarNotificacionLocal('Oferta', 'Descuento', 'ofertas', { screen: '/detalle' })
    ).resolves.toBeUndefined();
  });
});

describe('limpiarBadge', () => {
  it('no lanza error cuando el módulo no está disponible', async () => {
    await expect(limpiarBadge()).resolves.toBeUndefined();
  });
});

describe('setTipoNotificacionHabilitado', () => {
  it('no lanza error en entorno sin módulo nativo', async () => {
    await expect(
      setTipoNotificacionHabilitado('reservas', false)
    ).resolves.toBeUndefined();
  });

  it('no lanza error al habilitar tipo', async () => {
    await expect(
      setTipoNotificacionHabilitado('ofertas', true)
    ).resolves.toBeUndefined();
  });
});

describe('registrarDeepLinkDeNotificacion', () => {
  it('retorna función de limpieza no-op cuando el módulo no está disponible', () => {
    const navMock = jest.fn();
    const unsub = registrarDeepLinkDeNotificacion(navMock);
    expect(typeof unsub).toBe('function');
    unsub();
    expect(navMock).not.toHaveBeenCalled();
  });
});
