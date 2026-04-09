// lib/supabase-db.ts — API compatible con todas las pantallas
import { supabase } from './supabase';

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
      await supabase.from('usuarios').insert({
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
      if (data.session) return { exito: true };
      return { exito: true, confirmar: true };
    }

    return { exito: true, confirmar: true };
  } catch (err) {
    console.error('registrarUsuario error', err);
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
      console.log('❌ Error de login:', error.message);
      
      // Manejar específicamente errores de refresh token
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
        return { exito: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      return { exito: false, error: 'Correo o contraseña incorrectos.' };
    }

    console.log('✅ Login exitoso para:', correo);
    
    // Obtener usuario activo inmediatamente
    const usuario = await obtenerUsuarioActivo();
    
    return { exito: true, usuario: usuario ?? undefined };
  } catch (error) {
    console.log('❌ Error inesperado en login:', error);
    return { exito: false, error: 'Error al iniciar sesión.' };
  }
}

export async function cerrarSesion(): Promise<void> {
  _sessionCache = null; // invalidar caché al cerrar sesión
  try { await supabase.auth.signOut(); } catch (err) { console.error('cerrarSesion error:', err); }
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
    console.error('obtenerUsuarioActivo error:', e);
    return null;
  }
}
export async function buscarUsuarioPorCorreo(correo: string): Promise<any | null> {
  try {
    // Supabase no permite consultar la tabla usuarios sin sesión activa (RLS).
    // Usamos resetPasswordForEmail para verificar si el correo existe:
    // si no existe, Supabase devuelve error; si existe, envía el link y devuelve ok.
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: undefined, // sin redirect, solo queremos el email
    });
    // Devolvemos un objeto truthy si no hay error (correo registrado)
    return error ? null : { email: correo };
  } catch (err) {
    console.error('buscarUsuarioPorCorreo error:', err);
    return null;
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
  campos: { nombre?: string; nombre_usuario?: string; telefono?: string }
): Promise<{ exito: boolean; error?: string }> {
  try {
    const update: Record<string, any> = {};
    if (campos.nombre          !== undefined) update.nombre          = campos.nombre;
    if (campos.nombre_usuario  !== undefined) update.nombre_usuario  = campos.nombre_usuario;
    if (campos.telefono        !== undefined) update.telefono        = campos.telefono;

    const { error } = await supabase.from('usuarios').update(update).eq('id', usuario_id);
    if (error) return { exito: false, error: 'Error al actualizar perfil.' };
    invalidarSesionCache(); // forzar recarga del perfil
    return { exito: true };
  } catch (err) {
    console.error('actualizarPerfil error:', err);
    return { exito: false, error: 'Error al actualizar perfil.' };
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
  try { await fn(); return obtenerItinerarios(usuario_id); }
  catch (err) { console.error('mutarItinerarios error:', err); return []; }
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
): Promise<boolean> {
  try {
    // Convierte DD/MM/AAAA → YYYY-MM-DD si viene en formato mexicano
    const fechaISO = /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)
      ? fecha.split('/').reverse().join('-')
      : fecha;

    const fila: Record<string, any> = { usuario_id, folio, destino, paquete, fecha: fechaISO, personas, total, metodo, estado };
    if (notas?.trim()) fila.notas = notas.trim();

    const { error } = await supabase.from('reservas').insert(fila);
    return !error;
  } catch (err) {
    console.error('guardarReserva error:', err);
    return false;
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

export async function actualizarEstadoReserva(id: number, estado: string): Promise<void> {
  try {
    await supabase.from('reservas').update({ estado }).eq('id', id);
  } catch (err) { console.error('actualizarEstadoReserva error:', err); }
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
    await supabase
      .from('historial')
      .insert({ usuario_id, tipo, titulo, detalle, creado_en: new Date().toISOString() });
  } catch (err) { console.error('agregarHistorial error:', err); }
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
  usuario_id: string,
  tipo: string,
  titulo: string,
  mensaje: string
): Promise<void> {
  try {
    await supabase
      .from('notificaciones')
      .insert({ usuario_id, tipo, titulo, mensaje, leida: false, creado_en: new Date().toISOString() });
  } catch (err) { console.error('crearNotificacion error:', err); }
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

    return usuarios.map((u: any) => ({
      ...u,
      correo: u.email,
      tipo: u.tipo ?? 'normal',
      activo: u.activo ?? 1,
      reservas_count: (reservas ?? []).filter((r: any) => r.usuario_id === u.id).length,
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
