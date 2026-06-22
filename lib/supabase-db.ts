// lib/supabase-db.ts — API compatible con todas las pantallas
import { supabase } from './supabase';
import { enqueueOfflineOperation, registerOfflineHandler } from './offline-cache';

// ══════════════════════════════════════════════════════════════════════════
//  TIPOS
// ══════════════════════════════════════════════════════════════════════════

export interface Usuario {
  id: string;                  // UUID de Supabase Auth
  nombre: string | null;
  nombre_usuario: string | null;
  correo: string;              // mapeado desde email
  telefono: string | null;
  idioma: string;
  notificaciones: number;
  tipo?: string;
  activo?: number;
  foto_url?: string | null;
}

export type Itinerario = {
  id: number;
  usuario_id: string;
  nombre: string;
  items?: string[];
};

export type GuardarReservaResultado = 'saved' | 'idempotent' | 'queued_offline' | 'failed';

const isNetworkLikeError = (error: unknown) => {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('offline');
};

let _offlineHandlersReady = false;
const ensureOfflineHandlers = () => {
  if (_offlineHandlersReady) return;
  _offlineHandlersReady = true;

  registerOfflineHandler('TOGGLE_FAVORITO', async payload => {
    const usuarioId = String(payload.usuarioId ?? '');
    const estadoId = Number(payload.estadoId ?? 0);
    if (!usuarioId || !estadoId) return;
    const { data: existe } = await supabase
      .from('favoritos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('estado_id', estadoId)
      .maybeSingle();
    if (existe) {
      await supabase.from('favoritos').delete().eq('usuario_id', usuarioId).eq('estado_id', estadoId);
    } else {
      await supabase.from('favoritos').insert({ usuario_id: usuarioId, estado_id: estadoId });
    }
  });

  registerOfflineHandler('CREAR_RESERVA', async payload => {
    await supabase.from('reservas').insert(payload);
  });
};
ensureOfflineHandlers();

// ══════════════════════════════════════════════════════════════════════════
//  AUTENTICACIÓN
// ══════════════════════════════════════════════════════════════════════════

export async function registrarUsuario(
  nombre: string,
  nombre_usuario: string,
  correo: string,
  contrasena: string,
  telefono: string = ''
): Promise<{ exito: boolean; confirmar?: boolean; error?: string }> {
  try {
    const email = (correo ?? '').trim().toLowerCase();

    // Validación rápida antes de llamar a Supabase
    if (!/\S+@\S+\.\S+/.test(email)) {
      return { exito: false, error: 'Ingresa un correo electrónico válido.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: contrasena,
      options: { data: { nombre, nombre_usuario, telefono } },
    });

    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('already')) return { exito: false, error: 'Ya existe una cuenta con ese correo.' };
      if (msg.includes('invalid') || msg.includes('email')) return { exito: false, error: 'Correo inválido.' };
      return { exito: false, error: error.message };
    }

    // Guardamos el perfil si hay usuario (con o sin sesión activa)
    // Sin sesión = email pendiente de confirmación, pero el row se crea igualmente
    if (data?.user) {
      const { error: insertError } = await supabase.from('usuarios').insert({
        id: data.user.id,
        email,
        nombre,
        nombre_usuario,
        telefono,
        idioma: 'es',
        notificaciones: 1,
        tipo: 'normal',
        activo: 1,
      });
      if (insertError) {
        if (__DEV__) console.error('registrarUsuario: fallo al crear perfil', insertError);
        return { exito: false, error: 'Cuenta creada pero no se pudo guardar el perfil. Contacta soporte.' };
      }
      if (data.session) return { exito: true };
      return { exito: true, confirmar: true };
    }

    return { exito: true, confirmar: true };
  } catch (err) {
    if (__DEV__) console.error('registrarUsuario error', err);
    return { exito: false, error: 'Error al registrar.' };
  }
}

export async function iniciarSesion(
  correo: string,
  contrasena: string
): Promise<{ exito: boolean; usuario?: Usuario; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) {
      if (__DEV__) console.log('Error de login:', error.message);

      // Manejar específicamente errores de refresh token
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
        return { exito: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      return { exito: false, error: 'Correo o contraseña incorrectos.' };
    }

    // Obtener usuario activo inmediatamente
    const usuario = await obtenerUsuarioActivo();
    
    return { exito: true, usuario: usuario ?? undefined };
  } catch (error) {
    if (__DEV__) console.log('Error inesperado en login:', error);
    return { exito: false, error: 'Error al iniciar sesión.' };
  }
}

export async function cerrarSesion(): Promise<void> {
  _sessionCache = null; // invalidar caché al cerrar sesión
  try { await supabase.auth.signOut(); } catch (err) { if (__DEV__) console.error('cerrarSesion error:', err); }
}

// ── Verificación rápida — solo auth, sin query a BD (para routing inicial) ─
export async function haySesionActiva(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch {
    return false;
  }
}

// ── Caché de sesión — evita llamar getSession() en cada useFocusEffect ────
let _sessionCache: { usuario: Usuario | null; ts: number } | null = null;
const SESSION_TTL = 30_000; // 30 segundos

export function invalidarSesionCache() {
  _sessionCache = null;
}

export async function obtenerUsuarioActivo(): Promise<Usuario | null> {
  // Devolver caché si aún es válido
  if (_sessionCache && Date.now() - _sessionCache.ts < SESSION_TTL) {
    return _sessionCache.usuario;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut();
      }
      return null; // no cachear errores
    }

    if (!session?.user) {
      return null; // no cachear ausencia de sesión — puede ser timing de AsyncStorage
    }

    const user = session.user;

    try {
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (dbError) console.error('obtenerUsuarioActivo BD error:', dbError.message);

      if (data) {
        const usuario: Usuario = {
          id: data.id,
          nombre: data.nombre ?? null,
          nombre_usuario: data.nombre_usuario ?? null,
          correo: data.email ?? user.email ?? '',
          telefono: data.telefono ?? null,
          idioma: data.idioma ?? 'es',
          notificaciones: data.notificaciones ?? 1,
          tipo: data.tipo ?? 'normal',
          activo: data.activo ?? 1,
          foto_url: data.foto_url ?? null,
        };
        _sessionCache = { usuario, ts: Date.now() };
        return usuario;
      }
    } catch (e) {
      console.error('obtenerUsuarioActivo perfil error:', e);
    }

    // fallback si no hay datos en BD
    const fallback: Usuario = {
      id: user.id,
      nombre: null,
      nombre_usuario: null,
      correo: user.email ?? '',
      telefono: null,
      idioma: 'es',
      notificaciones: 1,
      tipo: 'normal',
      activo: 1,
      foto_url: null,
    };
    _sessionCache = { usuario: fallback, ts: Date.now() };
    return fallback;

  } catch (e) {
    return null;
  }
}
export async function buscarUsuarioPorCorreo(correo: string): Promise<any | null> {
  try {
    const email = (correo ?? '').trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return null;
    }
    return { email };
  } catch (err) {
    console.error('buscarUsuarioPorCorreo error:', err);
    return null;
  }
}

export async function solicitarRecuperacionContrasena(
  correo: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const email = (correo ?? '').trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return { exito: false, error: 'Ingresa un correo electrónico válido.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { exito: false, error: 'No se pudo enviar el correo de recuperación.' };
    }

    return { exito: true };
  } catch (err) {
    console.error('solicitarRecuperacionContrasena error:', err);
    return { exito: false, error: 'No se pudo enviar el correo de recuperación.' };
  }
}

export async function resetContrasena(
  _correo: string,
  nueva_contrasena: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    // Requiere sesión de recuperación activa (el usuario llegó por el link del email)
    const { error } = await supabase.auth.updateUser({ password: nueva_contrasena });
    if (error) return { exito: false, error: 'Error al restablecer contraseña.' };
    return { exito: true };
  } catch (err) {
    console.error('resetContrasena error:', err);
    return { exito: false, error: 'Error al restablecer contraseña.' };
  }
}

export async function actualizarPerfil(
  usuario_id: string,
  campos: { nombre?: string; nombre_usuario?: string; telefono?: string; foto_url?: string | null }
): Promise<{ exito: boolean; error?: string }> {
  try {
    const update: Record<string, any> = {};
    if (campos.nombre          !== undefined) update.nombre          = campos.nombre;
    if (campos.nombre_usuario  !== undefined) update.nombre_usuario  = campos.nombre_usuario;
    if (campos.telefono        !== undefined) update.telefono        = campos.telefono;
    if (campos.foto_url        !== undefined) update.foto_url        = campos.foto_url;

    const { error } = await supabase.from('usuarios').update(update).eq('id', usuario_id);
    if (error) return { exito: false, error: 'Error al actualizar perfil.' };
    invalidarSesionCache(); // forzar recarga del perfil
    return { exito: true };
  } catch (err) {
    console.error('actualizarPerfil error:', err);
    return { exito: false, error: 'Error al actualizar perfil.' };
  }
}

// Lee una URI local (file://, content://, data:) y la devuelve como Blob.
// fetch() falla en Android con URIs locales; XMLHttpRequest las maneja correctamente
// en todas las plataformas (iOS, Android, web).
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('No se pudo leer la imagen'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

// Sube una imagen a Supabase Storage (bucket "avatares") y guarda la URL en usuarios.foto_url.
// Recibe el URI local (file://, content:// o data:) y el id del usuario; devuelve la URL pública.
export async function subirAvatar(
  usuario_id: string,
  uriLocal: string
): Promise<{ exito: boolean; url?: string; error?: string }> {
  try {
    const blob = await uriToBlob(uriLocal);
    const ext  = (blob.type?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const mime = blob.type || 'image/jpeg';
    const path = `${usuario_id}/${Date.now()}.${ext}`;

    const { error: errSubida } = await supabase.storage
      .from('avatares')
      .upload(path, blob, { contentType: mime, upsert: true });
    if (errSubida) {
      console.error('subirAvatar upload error:', errSubida);
      return { exito: false, error: 'No se pudo subir la imagen.' };
    }

    const { data } = supabase.storage.from('avatares').getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) {
      return { exito: false, error: 'No se obtuvo la URL pública.' };
    }

    const r = await actualizarPerfil(usuario_id, { foto_url: url });
    if (!r.exito) {
      return { exito: false, error: r.error ?? 'No se pudo guardar el avatar.' };
    }
    return { exito: true, url };
  } catch (err) {
    console.error('subirAvatar error:', err);
    return { exito: false, error: 'Error al subir avatar.' };
  }
}

export async function actualizarPreferencias(
  usuario_id: string,
  campos: { idioma?: string; notificaciones?: number }
): Promise<void> {
  try {
    const update: Record<string, any> = {};
    if (campos.idioma          !== undefined) update.idioma          = campos.idioma;
    if (campos.notificaciones  !== undefined) update.notificaciones  = campos.notificaciones;
    await supabase.from('usuarios').update(update).eq('id', usuario_id);
    invalidarSesionCache();
  } catch (err) { console.error('actualizarPreferencias error:', err); }
}

export async function cambiarContrasena(
  _usuario_id: string,
  contrasena_actual: string,
  contrasena_nueva: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { exito: false, error: 'Sesión no válida.' };

    // Verifica la contraseña actual re-autenticando
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: contrasena_actual,
    });
    if (signInError) return { exito: false, error: 'La contraseña actual es incorrecta.' };

    const { error } = await supabase.auth.updateUser({ password: contrasena_nueva });
    if (error) return { exito: false, error: 'Error al cambiar contraseña.' };
    return { exito: true };
  } catch (err) {
    console.error('cambiarContrasena error:', err);
    return { exito: false, error: 'Error al cambiar contraseña.' };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  FAVORITOS
// ══════════════════════════════════════════════════════════════════════════

export async function cargarFavoritos(usuarioId: string): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('favoritos')
      .select('estado_id')
      .eq('usuario_id', usuarioId);
    if (error) return [];
    return data?.map((f: any) => f.estado_id) ?? [];
  } catch (err) {
    console.error('cargarFavoritos error:', err);
    return [];
  }
}

export async function alternarFavorito(usuarioId: string, estadoId: number): Promise<number[]> {
  try {
    const { data: existe } = await supabase
      .from('favoritos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('estado_id', estadoId)
      .maybeSingle();

    if (existe) {
      await supabase
        .from('favoritos')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('estado_id', estadoId);
    } else {
      await supabase
        .from('favoritos')
        .insert({ usuario_id: usuarioId, estado_id: estadoId });
    }
    return cargarFavoritos(usuarioId);
  } catch (err) {
    console.error('alternarFavorito error:', err);
    if (isNetworkLikeError(err)) {
      await enqueueOfflineOperation({
        type: 'TOGGLE_FAVORITO',
        payload: { usuarioId, estadoId },
      });
      return cargarFavoritos(usuarioId);
    }
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  ITINERARIOS
// ══════════════════════════════════════════════════════════════════════════

export async function obtenerItinerarios(usuario_id: string): Promise<Itinerario[]> {
  try {
    // Una sola query con join — antes era N+1 (1 query por itinerario)
    const { data, error } = await supabase
      .from('itinerarios')
      .select('id, usuario_id, nombre, itinerario_items(clave_paquete, orden_visita)')
      .eq('usuario_id', usuario_id)
      .order('id', { ascending: false });

    if (error || !data) return [];

    return data.map((iti: any) => ({
      id: iti.id,
      usuario_id: iti.usuario_id,
      nombre: iti.nombre,
      items: (iti.itinerario_items ?? [])
        .sort((a: any, b: any) => a.orden_visita - b.orden_visita)
        .map((i: any) => i.clave_paquete),
    }));
  } catch (err) {
    console.error('obtenerItinerarios error:', err);
    return [];
  }
}

// ── Helper: cualquier mutación + refresco automático de la lista
const mutarItinerarios = async (usuario_id: string, fn: () => any): Promise<Itinerario[]> => {
  await fn();
  return obtenerItinerarios(usuario_id);
};

export const crearItinerario = (usuario_id: string, nombre: string) =>
  mutarItinerarios(usuario_id, () =>
    supabase.from('itinerarios').insert({ usuario_id, nombre }));

export const renombrarItinerario = (usuario_id: string, itinerario_id: number, nuevo_nombre: string) =>
  mutarItinerarios(usuario_id, () =>
    supabase.from('itinerarios').update({ nombre: nuevo_nombre }).eq('id', itinerario_id).eq('usuario_id', usuario_id));

export const eliminarItinerario = (usuario_id: string, itinerario_id: number) =>
  mutarItinerarios(usuario_id, async () => {
    await supabase.from('itinerario_items').delete().eq('itinerario_id', itinerario_id);
    await supabase.from('itinerarios').delete().eq('id', itinerario_id).eq('usuario_id', usuario_id);
  });

export const alternarDestinoItinerario = (usuario_id: string, itinerario_id: number, clave_paquete: string) =>
  mutarItinerarios(usuario_id, async () => {
    const { data: existente } = await supabase
      .from('itinerario_items').select('id')
      .eq('itinerario_id', itinerario_id).eq('clave_paquete', clave_paquete).maybeSingle();
    if (existente) {
      await supabase.from('itinerario_items').delete().eq('id', existente.id);
    } else {
      const { data: maxRow } = await supabase
        .from('itinerario_items').select('orden_visita')
        .eq('itinerario_id', itinerario_id).order('orden_visita', { ascending: false }).limit(1).maybeSingle();
      await supabase.from('itinerario_items').insert({
        itinerario_id, clave_paquete,
        orden_visita: (maxRow?.orden_visita ?? 0) + 1,
      });
    }
  });

export const reordenarItinerarioItems = (usuario_id: string, itinerario_id: number, claves_ordenadas: string[]) =>
  mutarItinerarios(usuario_id, () =>
    Promise.all(claves_ordenadas.map((clave, i) =>
      supabase.from('itinerario_items').update({ orden_visita: i + 1 })
        .eq('itinerario_id', itinerario_id).eq('clave_paquete', clave)
    )));

export const duplicarItinerario = (usuario_id: string, itinerario_id: number, nuevo_nombre: string) =>
  mutarItinerarios(usuario_id, async () => {
    const { data: items } = await supabase
      .from('itinerario_items').select('clave_paquete, orden_visita')
      .eq('itinerario_id', itinerario_id).order('orden_visita', { ascending: true });
    const { data: nuevo } = await supabase
      .from('itinerarios').insert({ usuario_id, nombre: nuevo_nombre }).select('id').single();
    if (nuevo && items?.length) {
      await supabase.from('itinerario_items').insert(
        (items as any[]).map(item => ({
          itinerario_id: nuevo.id,
          clave_paquete: item.clave_paquete,
          orden_visita: item.orden_visita,
        }))
      );
    }
  });

// ══════════════════════════════════════════════════════════════════════════
//  RUTAS SUGERIDAS
// ══════════════════════════════════════════════════════════════════════════

export async function obtenerRutasSugeridas(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sugerencias_rutas')
      .select('*')
      .order('id', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('obtenerRutasSugeridas error:', err);
    return [];
  }
}

export async function crearRutaSugerida(ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').insert({ ...ruta, activo: 1 });
  } catch (err) { console.error('crearRutaSugerida error:', err); }
}

export async function actualizarRutaSugerida(id: string, ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').update(ruta).eq('id', id);
  } catch (err) { console.error('actualizarRutaSugerida error:', err); }
}

export async function eliminarRutaSugerida(id: string): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').delete().eq('id', id);
  } catch (err) { console.error('eliminarRutaSugerida error:', err); }
}

// ── Helper: toggle campo activo en cualquier tabla
const toggleActivo = async (tabla: string, campo: string, valor: any): Promise<void> => {
  try {
    const { data } = await supabase.from(tabla).select('activo').eq(campo, valor).maybeSingle();
    await supabase.from(tabla).update({ activo: data?.activo === 1 ? 0 : 1 }).eq(campo, valor);
  } catch (err) { console.error(`toggleActivo(${tabla}) error:`, err); }
};

export const toggleActivoRutaSugerida  = (id: string)         => toggleActivo('sugerencias_rutas', 'id', id);

// ══════════════════════════════════════════════════════════════════════════
//  DESTINOS (tabla `estados` en Supabase)
// ══════════════════════════════════════════════════════════════════════════

export async function obtenerTodosLosDestinos(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('estados').select('*').order('id', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('obtenerTodosLosDestinos error:', err);
    return [];
  }
}

export async function crearDestino(destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    await supabase.from('estados').insert({ ...destino, activo: 1 });
  } catch (err) { console.error('crearDestino error:', err); }
}

export async function actualizarDestino(id: number, destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    await supabase.from('estados').update(destino).eq('id', id);
  } catch (err) { console.error('actualizarDestino error:', err); }
}

export const toggleActivoDestinoAdmin  = (id: number)          => toggleActivo('estados', 'id', id);

export async function eliminarDestino(id: number): Promise<void> {
  try {
    await supabase.from('estados').delete().eq('id', id);
  } catch (err) { console.error('eliminarDestino error:', err); }
}

// ══════════════════════════════════════════════════════════════════════════
//  RESERVAS
// ══════════════════════════════════════════════════════════════════════════

export async function guardarReserva(
  usuario_id: string,
  folio: string,
  destino: string,
  paquete: string,
  fecha: string,
  personas: number,
  total: number,
  metodo: string,
  estado: string = 'confirmada',
  notas?: string
): Promise<GuardarReservaResultado> {
  const METODOS_PERMITIDOS = new Set(['tarjeta', 'spei', 'oxxo']);
  const ESTADOS_PERMITIDOS = new Set(['confirmada', 'pendiente', 'cancelada']);

  try {
    const folioNormalizado = (folio ?? '').trim().toUpperCase().slice(0, 40);
    if (!folioNormalizado || folioNormalizado.length < 4) {
      return 'failed';
    }
    if (!METODOS_PERMITIDOS.has((metodo ?? '').toLowerCase())) {
      return 'failed';
    }
    if (!ESTADOS_PERMITIDOS.has((estado ?? '').toLowerCase())) {
      return 'failed';
    }
    if (!usuario_id || !destino?.trim() || !paquete?.trim()) {
      return 'failed';
    }
    if (!Number.isFinite(personas) || personas < 1 || personas > 20) {
      return 'failed';
    }
    if (!Number.isFinite(total) || total < 0) {
      return 'failed';
    }

    // Convierte DD/MM/AAAA → YYYY-MM-DD si viene en formato mexicano
    const fechaISO = /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)
      ? fecha.split('/').reverse().join('-')
      : fecha;

    // Delega a la Edge Function: valida, inserta atómicamente, crea notificación y envía email
    const { data, error } = await supabase.functions.invoke<{ resultado: string; error?: string }>(
      'confirmar-reserva',
      {
        body: {
          folio:    folioNormalizado,
          destino:  destino.trim(),
          paquete:  paquete.trim(),
          fecha:    fechaISO,
          personas,
          total,
          metodo:   metodo.toLowerCase(),
          estado:   estado.toLowerCase(),
          notas:    notas?.trim() ?? '',
        },
      },
    );

    if (error) {
      if (isNetworkLikeError(error)) {
        // Sin red: encolar para reintentar offline
        await enqueueOfflineOperation({
          type: 'CREAR_RESERVA',
          payload: { usuario_id, folio: folioNormalizado, destino, paquete, fecha: fechaISO, personas, total, metodo, estado, notas },
        });
        return 'queued_offline';
      }
      console.error('guardarReserva error:', error);
      return 'failed';
    }

    const resultado = data?.resultado;
    if (resultado === 'idempotent') {
      return 'idempotent';
    }
    if (resultado !== 'saved') return 'failed';
    return 'saved';
  } catch (err) {
    console.error('guardarReserva error:', err);
    return 'failed';
  }
}

export async function cargarReservas(usuario_id: string, limite = 20, offset = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('creado_en', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('cargarReservas error:', err);
    return [];
  }
}

export async function cargarTodasLasReservas(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*, usuarios(nombre)')
      .order('creado_en', { ascending: false });
    if (error) return [];
    return (data ?? []).map((r: any) => ({
      ...r,
      nombre_usuario: r.usuarios?.nombre ?? '',
    }));
  } catch (err) {
    console.error('cargarTodasLasReservas error:', err);
    return [];
  }
}

export async function actualizarEstadoReserva(id: number, estado: string): Promise<{ exito: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', id);
    if (error) {
      console.error('actualizarEstadoReserva error:', error.message);
      return { exito: false, error: error.message };
    }
    if (estado === 'confirmada' || estado === 'cancelada') {
      supabase.functions
        .invoke('enviar-email-reserva', { body: { reserva_id: id, tipo: estado } })
        .catch(e => console.warn('email invoke failed:', e));
    }
    return { exito: true };
  } catch (err) {
    console.error('actualizarEstadoReserva exception:', err);
    return { exito: false, error: String(err) };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  RESEÑAS
// ══════════════════════════════════════════════════════════════════════════

export async function cargarResenas(destino: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('resenas')
      .select('*, usuarios(nombre)')
      .eq('destino', destino)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map((r: any) => ({ ...r, nombre: r.usuarios?.nombre ?? 'Anónimo' }));
  } catch (err) {
    console.error('cargarResenas error:', err);
    return [];
  }
}

export async function cargarResenasPaginadas(
  destino: string,
  limite: number = 10,
  offset: number = 0
): Promise<{ resenas: any[]; total: number }> {
  try {
    const { data, error, count } = await supabase
      .from('resenas')
      .select('*, usuarios(nombre)', { count: 'exact' })
      .eq('destino', destino)
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return { resenas: [], total: 0 };
    return {
      resenas: (data ?? []).map((r: any) => ({ ...r, nombre: r.usuarios?.nombre ?? 'Anónimo' })),
      total: count ?? 0,
    };
  } catch (err) {
    console.error('cargarResenasPaginadas error:', err);
    return { resenas: [], total: 0 };
  }
}

export async function cargarResumenResenas(destinos: string[]): Promise<Record<string, { promedio: number; total: number }>> {
  const nombres = destinos
    .map(destino => destino?.trim())
    .filter((destino): destino is string => !!destino);

  if (!nombres.length) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('resenas')
      .select('destino, calificacion')
      .in('destino', nombres);

    if (error || !data) {
      return {};
    }

    return data.reduce((acc: Record<string, { promedio: number; total: number; suma?: number }>, item: any) => {
      const destino = String(item.destino ?? '');
      if (!destino) {
        return acc;
      }

      const actual = acc[destino] ?? { promedio: 0, total: 0, suma: 0 };
      actual.total += 1;
      actual.suma = (actual.suma ?? 0) + Number(item.calificacion ?? 0);
      actual.promedio = actual.total > 0 ? actual.suma / actual.total : 0;
      acc[destino] = actual;
      return acc;
    }, {});
  } catch (err) {
    console.error('cargarResumenResenas error:', err);
    return {};
  }
}

export async function guardarResena(
  usuario_id: string,
  destino: string,
  calificacion: number,
  comentario: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('resenas')
      .insert({ usuario_id, destino, calificacion, comentario });
    if (error) return { exito: false, error: 'Error al guardar reseña.' };
    await crearNotificacion(
      usuario_id, 'resena', 'Gracias por tu reseña',
      `Tu reseña de ${destino} ayuda a otros viajeros a decidir.`
    );
    return { exito: true };
  } catch (err) {
    console.error('guardarResena error:', err);
    return { exito: false, error: 'Error al guardar reseña.' };
  }
}

export async function editarResena(
  id: number,
  usuario_id: string,
  calificacion: number,
  comentario: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('resenas')
      .update({ calificacion, comentario })
      .eq('id', id)
      .eq('usuario_id', usuario_id);
    if (error) return { exito: false, error: 'Error al editar reseña.' };
    return { exito: true };
  } catch (err) {
    console.error('editarResena error:', err);
    return { exito: false, error: 'Error al editar reseña.' };
  }
}

export async function borrarResena(
  id: number,
  usuario_id: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('resenas')
      .delete()
      .eq('id', id)
      .eq('usuario_id', usuario_id);
    if (error) return { exito: false, error: 'Error al borrar reseña.' };
    return { exito: true };
  } catch (err) {
    console.error('borrarResena error:', err);
    return { exito: false, error: 'Error al borrar reseña.' };
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════════════════════════════════════════

export async function agregarHistorial(
  usuario_id: string,
  tipo: string,
  titulo: string,
  detalle: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('historial')
      .insert({ usuario_id, tipo, titulo, detalle });
    if (error) console.warn('agregarHistorial warn:', error.message);
  } catch (err) { console.warn('agregarHistorial error (ignorado):', err); }
}

export async function cargarHistorial(usuario_id: string, limite = 30, offset = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('historial')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('creado_en', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('cargarHistorial error:', err);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  NOTIFICACIONES
// ══════════════════════════════════════════════════════════════════════════

export async function crearNotificacion(
  _usuario_id: string,
  _tipo: string,
  _titulo: string,
  _mensaje: string
): Promise<void> {
  // Las notificaciones se crean server-side en la Edge Function confirmar-reserva
}

export async function cargarNotificaciones(usuario_id: string, limite = 20, offset = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return [];
    // Mapear leida boolean → 0/1 para compatibilidad con las pantallas
    return (data ?? []).map((n: any) => ({ ...n, leida: n.leida ? 1 : 0 }));
  } catch (err) {
    console.error('cargarNotificaciones error:', err);
    return [];
  }
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
  } catch (err) { console.error('marcarNotificacionLeida error:', err); }
}

export async function marcarTodasLeidas(usuario_id: string): Promise<void> {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', usuario_id);
  } catch (err) { console.error('marcarTodasLeidas error:', err); }
}

// ══════════════════════════════════════════════════════════════════════════
//  ADMIN — USUARIOS
// ══════════════════════════════════════════════════════════════════════════

export async function cargarTodosLosUsuarios(): Promise<any[]> {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre');
    if (error || !usuarios) return [];

    const { data: reservas } = await supabase.from('reservas').select('usuario_id');

    const conteoReservas = new Map<string, number>();
    for (const r of reservas ?? []) {
      conteoReservas.set(r.usuario_id, (conteoReservas.get(r.usuario_id) ?? 0) + 1);
    }

    return usuarios.map((u: any) => ({
      ...u,
      correo: u.email,
      tipo: u.tipo ?? 'normal',
      activo: u.activo ?? 1,
      reservas_count: conteoReservas.get(u.id) ?? 0,
    }));
  } catch (err) {
    console.error('cargarTodosLosUsuarios error:', err);
    return [];
  }
}

export async function cambiarTipoUsuario(usuario_id: string, tipo: string): Promise<void> {
  try {
    await supabase.from('usuarios').update({ tipo }).eq('id', usuario_id);
  } catch (err) { console.error('cambiarTipoUsuario error:', err); }
}

export const toggleActivoUsuarioAdmin  = (usuario_id: string) => toggleActivo('usuarios', 'id', usuario_id);

// ══════════════════════════════════════════════════════════════════════════
//  BÚSQUEDA Y FILTRADO AVANZADO
// ══════════════════════════════════════════════════════════════════════════

export async function cargarReservasPorRangoFechas(
  usuario_id: string,
  fecha_inicio: string,
  fecha_fin: string,
  limite = 20,
  offset = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin)
      .order('fecha', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('cargarReservasPorRangoFechas error:', err);
    return [];
  }
}

export async function cargarReservasOrdenadas(
  usuario_id: string,
  sortBy: 'fecha' | 'precio' | 'destino' | 'estado' = 'fecha',
  sortOrder: 'asc' | 'desc' = 'desc',
  limite = 20,
  offset = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('cargarReservasOrdenadas error:', err);
    return [];
  }
}

export async function buscarReservasPorFechaYEstado(
  usuario_id: string,
  fecha_inicio: string,
  fecha_fin: string,
  estado?: string,
  limite = 20,
  offset = 0
): Promise<any[]> {
  try {
    let q = supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (estado) {
      q = q.eq('estado', estado);
    }

    const { data, error } = await q
      .order('fecha', { ascending: false })
      .range(offset, offset + limite - 1);

    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('buscarReservasPorFechaYEstado error:', err);
    return [];
  }
}

export async function cargarDestinosOrdenados(
  sortBy: 'precio' | 'nombre' | 'categoria' = 'precio',
  sortOrder: 'asc' | 'desc' = 'asc',
  limite = 50,
  offset = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('estados')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return data ?? [];
  } catch (err) {
    console.error('cargarDestinosOrdenados error:', err);
    return [];
  }
}

export async function cargarResenasPorRating(
  destino: string,
  ratingMinimo = 1,
  ratingMaximo = 5,
  limite = 10,
  offset = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('resenas')
      .select('*, usuarios(nombre)')
      .eq('destino', destino)
      .gte('calificacion', ratingMinimo)
      .lte('calificacion', ratingMaximo)
      .order('calificacion', { ascending: false })
      .range(offset, offset + limite - 1);
    if (error) return [];
    return (data ?? []).map((r: any) => ({ ...r, nombre: r.usuarios?.nombre ?? 'Anónimo' }));
  } catch (err) {
    console.error('cargarResenasPorRating error:', err);
    return [];
  }
}
