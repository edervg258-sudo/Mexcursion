// ============================================================
//  lib/push-notifications.ts — Infraestructura de push
// ============================================================
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { supabase } from './supabase';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;

  const executionEnvironment = Constants.executionEnvironment;
  const isExpoGo =
    executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';
  const pushHabilitado =
    Constants.expoConfig?.extra?.enableNativePushNotifications === true;

  // Las push nativas solo se activan explícitamente en builds que ya incluyen
  // el módulo. En Expo Go o sin esta bandera, se deshabilitan por seguridad.
  const pushTokenManager = requireOptionalNativeModule('ExpoPushTokenManager');
  if (!pushHabilitado || isExpoGo || !pushTokenManager) {
    notificationsModule = null;
    return notificationsModule;
  }

  try {
    // Cargar de forma diferida evita romper el arranque cuando el módulo nativo
    // no está presente en Expo Go o en un binario no reconstruido.
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

  // Crear canal Android en arranque, antes de cualquier notificación o solicitud de permiso
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'General',
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#3AB7A5',
    });
  }

  return true;
}

// ── Solicitar permisos y registrar token ─────────────────────────────────────
export async function registrarParaPush(usuarioId: string): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  // Solo en dispositivo físico
  const { data: esFisico } = await Notifications.getDevicePushTokenAsync().catch(() => ({ data: null }));
  if (!esFisico) return null;  // simulador

  const { status: existente } = await Notifications.getPermissionsAsync();
  let estadoFinal = existente;

  if (existente !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    estadoFinal = status;
  }
  if (estadoFinal !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Persistir token en Supabase (columna push_token en tabla usuarios)
  const { error: tokenError } = await supabase
    .from('usuarios')
    .update({ push_token: token })
    .eq('id', usuarioId);
  if (tokenError) {
    console.error('[push] Error al guardar push_token:', tokenError.message);
  }

  return token;
}

// ── Enviar notificación local ─────────────────────────────────────────────────
export async function mostrarNotificacionLocal(titulo: string, cuerpo: string) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger:  null, // inmediata
  });
}

// ── Limpiar badge ─────────────────────────────────────────────────────────────
export async function limpiarBadge() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await Notifications.setBadgeCountAsync(0);
}
