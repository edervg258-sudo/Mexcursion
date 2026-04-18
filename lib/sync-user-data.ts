// lib/sync-user-data.ts - Sincronización de datos entre plataformas
import { supabase } from './supabase';
import { secureGet, secureRemove, secureSet } from './secure-storage';
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
  PENDING_CHANGES: 'sync_pending_changes',
};

// ── Cola de cambios pendientes ────────────────────────────────────────────────
// Cuando la sincronización falla (sin red), el cambio se encola y se reintenta
// la próxima vez que haya conexión (en sincronizacionAutomatica).

const BASE_DELAY_MS = 5_000; // 5 s base → 10 s, 20 s, 40 s, 80 s...
const MAX_INTENTOS   = 5;

interface PendingChange {
  campo: string;
  valor: string | number | object;
  timestamp: number;
  intentos: number;
  proximoIntento: number;
}

async function encolarCambioPendiente(campo: string, valor: string | number | object): Promise<void> {
  try {
    const raw = await secureGet(SYNC_KEYS.PENDING_CHANGES);
    const cola: PendingChange[] = raw ? JSON.parse(raw) : [];

    // Reemplaza entrada previa del mismo campo (solo importa el valor más reciente)
    const filtrada = cola.filter(c => c.campo !== campo);
    filtrada.push({ campo, valor, timestamp: Date.now(), intentos: 0, proximoIntento: Date.now() });

    await secureSet(SYNC_KEYS.PENDING_CHANGES, JSON.stringify(filtrada));
  } catch {
    // Si falla el encolado no bloqueamos la UI
  }
}

async function vaciarColaDeReintentos(usuarioId: string): Promise<void> {
  try {
    const raw = await secureGet(SYNC_KEYS.PENDING_CHANGES);
    if (!raw) return;

    const cola: PendingChange[] = JSON.parse(raw);
    if (cola.length === 0) return;

    const ahora = Date.now();
    const listas  = cola.filter(c => c.intentos < MAX_INTENTOS && ahora >= c.proximoIntento);
    const diferidas = cola.filter(c => !listas.includes(c));

    if (listas.length === 0) return;

    // Agrupa todos los campos listos en una sola llamada a Supabase
    const update: Record<string, unknown> = {};
    listas.forEach(c => { update[c.campo] = c.valor; });

    const { error } = await supabase
      .from('usuarios')
      .update(update)
      .eq('id', usuarioId);

    if (!error) {
      // Solo persisten los diferidos (que aún no son su turno)
      if (diferidas.length === 0) {
        await secureRemove(SYNC_KEYS.PENDING_CHANGES);
      } else {
        await secureSet(SYNC_KEYS.PENDING_CHANGES, JSON.stringify(diferidas));
      }
    } else {
      // Backoff exponencial: delay = BASE_DELAY_MS * 2^intentos
      const reintentadas = listas.map(c => ({
        ...c,
        intentos: c.intentos + 1,
        proximoIntento: ahora + BASE_DELAY_MS * Math.pow(2, c.intentos),
      }));
      await secureSet(
        SYNC_KEYS.PENDING_CHANGES,
        JSON.stringify([...diferidas, ...reintentadas])
      );
    }
  } catch {
    // Quedará en cola para el próximo intento
  }
}

export async function sincronizarDatosUsuario(): Promise<void> {
  try {
    const usuario = await obtenerUsuarioActivo();
    if (!usuario) return;

    // Vaciar cambios que quedaron pendientes por falta de red
    await vaciarColaDeReintentos(usuario.id);

    // Obtener datos locales
    const datosLocales: Partial<UserData> = {};
    
    const idiomaLocal = await secureGet(SYNC_KEYS.IDIOMA);
    if (idiomaLocal) datosLocales.idioma = idiomaLocal;
    
    const notificacionesLocal = await secureGet(SYNC_KEYS.NOTIFICACIONES);
    if (notificacionesLocal) datosLocales.notificaciones = parseInt(notificacionesLocal);
    
    const favoritosLocal = await secureGet(SYNC_KEYS.FAVORITOS);
    if (favoritosLocal) datosLocales.favoritos = JSON.parse(favoritosLocal);
    
    const preferenciasLocal = await secureGet(SYNC_KEYS.PREFERENCIAS);
    if (preferenciasLocal) datosLocales.preferencias = JSON.parse(preferenciasLocal);

    // Obtener datos del servidor
    const { data: datosServidor } = await supabase
      .from('usuarios')
      .select('idioma, notificaciones, preferencias')
      .eq('id', usuario.id)
      .single();

    if (!datosServidor) return;

    // Estrategia de sincronización: el más reciente gana
    const lastSync = await secureGet(SYNC_KEYS.LAST_SYNC);
    const now = Date.now().toString();
    
    // Helper: sube un campo al servidor; si falla, lo encola para reintento
    const subirCampo = async (campo: string, valor: unknown) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ [campo]: valor })
        .eq('id', usuario.id);
      if (error) {
        await encolarCambioPendiente(campo, valor as string | number | object);
      }
    };

    // Sincronizar idioma
    if (datosLocales.idioma && datosLocales.idioma !== datosServidor.idioma) {
      await subirCampo('idioma', datosLocales.idioma);
    } else if (!datosLocales.idioma && datosServidor.idioma) {
      await secureSet(SYNC_KEYS.IDIOMA, datosServidor.idioma);
    }

    // Sincronizar notificaciones
    if (datosLocales.notificaciones && datosLocales.notificaciones !== datosServidor.notificaciones) {
      await subirCampo('notificaciones', datosLocales.notificaciones);
    } else if (!datosLocales.notificaciones && datosServidor.notificaciones) {
      await secureSet(SYNC_KEYS.NOTIFICACIONES, datosServidor.notificaciones.toString());
    }

    // Sincronizar preferencias
    if (datosLocales.preferencias && JSON.stringify(datosLocales.preferencias) !== JSON.stringify(datosServidor.preferencias)) {
      await subirCampo('preferencias', datosLocales.preferencias);
    } else if (!datosLocales.preferencias && datosServidor.preferencias) {
      await secureSet(SYNC_KEYS.PREFERENCIAS, JSON.stringify(datosServidor.preferencias));
    }

    // Actualizar timestamp de última sincronización
    await secureSet(SYNC_KEYS.LAST_SYNC, now);

  } catch (error) {
    console.error('Error sincronizando datos de usuario:', error);
  }
}

export async function guardarDatoLocal<T>(key: keyof typeof SYNC_KEYS, valor: T): Promise<void> {
  try {
    const storageKey = SYNC_KEYS[key];

    if (typeof valor === 'string') {
      await secureSet(storageKey, valor);
    } else if (typeof valor === 'number') {
      await secureSet(storageKey, valor.toString());
    } else {
      await secureSet(storageKey, JSON.stringify(valor));
    }

    // Intentar sincronizar con el servidor; si no hay red, el cambio
    // quedará encolado en PENDING_CHANGES y se reintentará automáticamente
    // la próxima vez que sincronizarDatosUsuario / sincronizacionAutomatica corra.
    try {
      await sincronizarDatosUsuario();
    } catch {
      // Sin red: encolar el campo para reintento posterior
      const campoSupabase = storageKey.replace('user_', ''); // 'user_idioma' → 'idioma'
      await encolarCambioPendiente(campoSupabase, valor as string | number | object);
    }
  } catch (error) {
    console.error(`Error guardando dato local ${key}:`, error);
  }
}

export async function obtenerDadoLocal<T>(key: keyof typeof SYNC_KEYS): Promise<T | null> {
  try {
    const storageKey = SYNC_KEYS[key];
    const valor = await secureGet(storageKey);
    
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
  const lastSync = await secureGet(SYNC_KEYS.LAST_SYNC);
  const now = Date.now();
  const cincoMinutos = 5 * 60 * 1000;
  
  if (!lastSync || (now - parseInt(lastSync)) > cincoMinutos) {
    await sincronizarDatosUsuario();
  }
}
