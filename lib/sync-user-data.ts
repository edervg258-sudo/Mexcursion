// lib/sync-user-data.ts - Sincronización de datos entre plataformas
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { obtenerUsuarioActivo } from './supabase-db';

export interface UserData {
  idioma: string;
  notificaciones: number;
  favoritos?: string[];
  preferencias?: Record<string, any>;
}

const SYNC_KEYS = {
  IDIOMA: 'user_idioma',
  NOTIFICACIONES: 'user_notificaciones',
  FAVORITOS: 'user_favoritos',
  PREFERENCIAS: 'user_preferencias',
  LAST_SYNC: 'last_sync_timestamp',
};

export async function sincronizarDatosUsuario(): Promise<void> {
  try {
    const usuario = await obtenerUsuarioActivo();
    if (!usuario) return;

    // Obtener datos locales
    const datosLocales: Partial<UserData> = {};
    
    const idiomaLocal = await AsyncStorage.getItem(SYNC_KEYS.IDIOMA);
    if (idiomaLocal) datosLocales.idioma = idiomaLocal;
    
    const notificacionesLocal = await AsyncStorage.getItem(SYNC_KEYS.NOTIFICACIONES);
    if (notificacionesLocal) datosLocales.notificaciones = parseInt(notificacionesLocal);
    
    const favoritosLocal = await AsyncStorage.getItem(SYNC_KEYS.FAVORITOS);
    if (favoritosLocal) datosLocales.favoritos = JSON.parse(favoritosLocal);
    
    const preferenciasLocal = await AsyncStorage.getItem(SYNC_KEYS.PREFERENCIAS);
    if (preferenciasLocal) datosLocales.preferencias = JSON.parse(preferenciasLocal);

    // Obtener datos del servidor
    const { data: datosServidor } = await supabase
      .from('usuarios')
      .select('idioma, notificaciones, preferencias')
      .eq('id', usuario.id)
      .single();

    if (!datosServidor) return;

    // Estrategia de sincronización: el más reciente gana
    const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
    const now = Date.now().toString();
    
    // Sincronizar idioma
    if (datosLocales.idioma && datosLocales.idioma !== datosServidor.idioma) {
      await supabase
        .from('usuarios')
        .update({ idioma: datosLocales.idioma })
        .eq('id', usuario.id);
    } else if (!datosLocales.idioma && datosServidor.idioma) {
      await AsyncStorage.setItem(SYNC_KEYS.IDIOMA, datosServidor.idioma);
    }

    // Sincronizar notificaciones
    if (datosLocales.notificaciones && datosLocales.notificaciones !== datosServidor.notificaciones) {
      await supabase
        .from('usuarios')
        .update({ notificaciones: datosLocales.notificaciones })
        .eq('id', usuario.id);
    } else if (!datosLocales.notificaciones && datosServidor.notificaciones) {
      await AsyncStorage.setItem(SYNC_KEYS.NOTIFICACIONES, datosServidor.notificaciones.toString());
    }

    // Sincronizar preferencias
    if (datosLocales.preferencias && JSON.stringify(datosLocales.preferencias) !== JSON.stringify(datosServidor.preferencias)) {
      await supabase
        .from('usuarios')
        .update({ preferencias: datosLocales.preferencias })
        .eq('id', usuario.id);
    } else if (!datosLocales.preferencias && datosServidor.preferencias) {
      await AsyncStorage.setItem(SYNC_KEYS.PREFERENCIAS, JSON.stringify(datosServidor.preferencias));
    }

    // Actualizar timestamp de última sincronización
    await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, now);

  } catch (error) {
    console.error('Error sincronizando datos de usuario:', error);
  }
}

export async function guardarDatoLocal<T>(key: keyof typeof SYNC_KEYS, valor: T): Promise<void> {
  try {
    const storageKey = SYNC_KEYS[key];
    
    if (typeof valor === 'string') {
      await AsyncStorage.setItem(storageKey, valor);
    } else if (typeof valor === 'number') {
      await AsyncStorage.setItem(storageKey, valor.toString());
    } else {
      await AsyncStorage.setItem(storageKey, JSON.stringify(valor));
    }

    // Intentar sincronizar con el servidor
    await sincronizarDatosUsuario();
  } catch (error) {
    console.error(`Error guardando dato local ${key}:`, error);
  }
}

export async function obtenerDadoLocal<T>(key: keyof typeof SYNC_KEYS): Promise<T | null> {
  try {
    const storageKey = SYNC_KEYS[key];
    const valor = await AsyncStorage.getItem(storageKey);
    
    if (!valor) return null;
    
    // Intentar parsear como JSON, si falla devolver como string
    try {
      return JSON.parse(valor) as T;
    } catch {
      return valor as T;
    }
  } catch (error) {
    console.error(`Error obteniendo dato local ${key}:`, error);
    return null;
  }
}

// Sincronización automática al iniciar la app
export async function sincronizacionAutomatica(): Promise<void> {
  // Solo sincronizar si ha pasado más de 5 minutos desde la última sincronización
  const lastSync = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
  const now = Date.now();
  const cincoMinutos = 5 * 60 * 1000;
  
  if (!lastSync || (now - parseInt(lastSync)) > cincoMinutos) {
    await sincronizarDatosUsuario();
  }
}
