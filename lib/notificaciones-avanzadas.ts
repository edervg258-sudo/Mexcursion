// ============================================================
//  lib/notificaciones-avanzadas.ts  —  Sistema avanzado de notificaciones
// ============================================================

import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Configuración avanzada de notificaciones
export const configurarNotificacionesAvanzadas = async () => {
  // Solicitar permisos
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permisos de notificación denegados');
  }

  // Configuración de canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reservas', {
      name: 'Reservas y recordatorios',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3AB7A5',
      sound: true,
    });

    await Notifications.setNotificationChannelAsync('ofertas', {
      name: 'Ofertas especiales',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#e9c46a',
      sound: false,
    });
  }

  // Configurar manejadores
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Notificaciones programadas
export const programarRecordatorioViaje = async (
  userId: string,
  fechaViaje: string,
  destino: string
) => {
  const fechaRecordatorio = new Date(fechaViaje);
  fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 1); // 1 día antes

  if (fechaRecordatorio <= new Date()) return; // No programar si es pasado

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '¡Tu viaje está cerca! ✈️',
      body: `Recuerda preparar tu viaje a ${destino} mañana`,
      data: { tipo: 'recordatorio_viaje', destino },
      sound: true,
    },
    trigger: { date: fechaRecordatorio },
  });
};

export const programarNotificacionOferta = async (
  userId: string,
  titulo: string,
  descripcion: string,
  destino: string
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: descripcion,
      data: { tipo: 'oferta', destino },
      sound: false,
    },
    trigger: { seconds: 1 }, // Enviar inmediatamente
  });
};

// Sistema de notificaciones push desde servidor
export const suscribirseANotificacionesServidor = (userId: string) => {
  const channel = supabase
    .channel(`notificaciones_${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notificaciones',
      filter: `usuario_id=eq.${userId}`,
    }, (payload) => {
      mostrarNotificacionPush(payload.new);
    })
    .subscribe();

  return channel;
};

const mostrarNotificacionPush = async (notificacion: any) => {
  await Notifications.presentNotificationAsync({
    title: notificacion.titulo,
    body: notificacion.mensaje,
    data: notificacion.datos || {},
  });
};

// Limpiar notificaciones programadas
export const cancelarNotificacionesProgramadas = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Obtener estado de permisos
export const obtenerEstadoPermisos = async () => {
  return await Notifications.getPermissionsAsync();
};