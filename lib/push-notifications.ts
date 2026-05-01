// lib/push-notifications.ts — Infraestructura de push
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { supabase } from './supabase';

type NotificationsModule = typeof import('expo-notifications');

export type TipoNotificacion = 'reservas' | 'ofertas' | 'general';

let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;

  const executionEnvironment = Constants.executionEnvironment;
  const isExpoGo =
    executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';
  const pushHabilitado =
    Constants.expoConfig?.extra?.enableNativePushNotifications === true;

  const pushTokenManager = requireOptionalNativeModule('ExpoPushTokenManager');
  if (!pushHabilitado || isExpoGo || !pushTokenManager) {
    notificationsModule = null;
    return notificationsModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

export function notificationsDisponibles(): boolean {
  return getNotificationsModule() !== null;
}

export function getNotifications(): NotificationsModule | null {
  return getNotificationsModule();
}

// ── Comportamiento cuando la app está en primer plano ────────────────────────
export async function configurarNotificaciones() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('general', {
      name:             'General',
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#3AB7A5',
    });
    await Notifications.setNotificationChannelAsync('reservas', {
      name:             'Reservas y recordatorios',
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#3AB7A5',
    });
    await Notifications.setNotificationChannelAsync('ofertas', {
      name:             'Ofertas especiales',
      importance:       Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor:       '#e9c46a',
    });
  }

  return true;
}

// ── Guardar token con retry (3 intentos, backoff 2s/4s/8s) ──────────────────
async function guardarTokenConRetry(usuarioId: string, token: string): Promise<boolean> {
  const MAX = 3;
  for (let intento = 0; intento < MAX; intento++) {
    const { error } = await supabase
      .from('usuarios')
      .update({ push_token: token })
      .eq('id', usuarioId);
    if (!error) return true;
    if (intento < MAX - 1) {
      await new Promise(r => setTimeout(r, 2000 * Math.pow(2, intento)));
    } else {
      console.error('[push] Error al guardar push_token tras 3 intentos:', error.message);
    }
  }
  return false;
}

// ── Solicitar permisos y registrar token ─────────────────────────────────────
export async function registrarParaPush(usuarioId: string): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  const { data: esFisico } = await Notifications.getDevicePushTokenAsync().catch(() => ({ data: null }));
  if (!esFisico) return null;

  const { status: existente } = await Notifications.getPermissionsAsync();
  let estadoFinal = existente;

  if (existente !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    estadoFinal = status;
  }
  if (estadoFinal !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await guardarTokenConRetry(usuarioId, token);
  return token;
}

// ── Deep linking: registrar handler de toque en notificación ─────────────────
// Llama a esta función desde _layout.tsx pasando el router de expo-router.
// El `data` de la notificación debe incluir: { screen, params }
export function registrarDeepLinkDeNotificacion(
  navigate: (screen: string, params?: Record<string, string>) => void
): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => {};

  const suscripcion = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as {
      screen?: string;
      params?: Record<string, string>;
    };
    if (data?.screen) {
      navigate(data.screen, data.params);
    }
  });

  return () => suscripcion.remove();
}

// ── Habilitar / deshabilitar un canal de notificaciones (Android) ─────────────
// En iOS no existen canales; el usuario controla permisos desde Ajustes del sistema.
export async function setTipoNotificacionHabilitado(
  tipo: TipoNotificacion,
  habilitado: boolean
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  const importance = habilitado
    ? tipo === 'ofertas'
      ? Notifications.AndroidImportance.DEFAULT
      : Notifications.AndroidImportance.HIGH
    : Notifications.AndroidImportance.NONE;

  await Notifications.setNotificationChannelAsync(tipo, {
    name: tipo,
    importance,
  });
}

// ── Enviar notificación local ─────────────────────────────────────────────────
export async function mostrarNotificacionLocal(
  titulo: string,
  cuerpo: string,
  tipo: TipoNotificacion = 'general',
  data?: Record<string, string>
) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      sound: true,
      data: data ?? {},
      ...(Platform.OS === 'android' ? { channelId: tipo } : {}),
    },
    trigger: null,
  });
}

// ── Limpiar badge ─────────────────────────────────────────────────────────────
export async function limpiarBadge() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(0);
}
