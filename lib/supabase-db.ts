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

    // DEBUG: ver payload (elimina o desactiva en producción)
    console.log('signup payload', { email, passwordLength: contrasena?.length, nombre, nombre_usuario, telefono });

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

    if (data?.user && data?.session) {
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
      return { exito: true };
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
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) return { exito: false, error: 'Correo o contraseña incorrectos.' };

    const usuario = await obtenerUsuarioActivo();
    return { exito: true, usuario: usuario ?? undefined };
  } catch {
    return { exito: false, error: 'Error al iniciar sesión.' };
  }
}

export async function cerrarSesion(): Promise<void> {
  try { await supabase.auth.signOut(); } catch {}
}

export async function obtenerUsuarioActivo(): Promise<Usuario | null> {
  try {
    // getSession() es local (sin red) — mucho más rápido y fiable en mobile
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const user = session.user;

    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Si el perfil no existe todavía, lo creamos con los datos de auth metadata
    if (!data) {
      await supabase.from('usuarios').insert({
        id: user.id,
        email: user.email ?? '',
        nombre: user.user_metadata?.nombre ?? null,
        nombre_usuario: user.user_metadata?.nombre_usuario ?? null,
        idioma: 'es',
        notificaciones: 1,
        tipo: 'normal',
        activo: 1,
      });
      return {
        id: user.id,
        nombre: user.user_metadata?.nombre ?? null,
        nombre_usuario: user.user_metadata?.nombre_usuario ?? null,
        correo: user.email ?? '',
        telefono: null,
        idioma: 'es',
        notificaciones: 1,
        tipo: 'normal',
        activo: 1,
        foto_url: null,
      };
    }

    return {
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
  } catch {
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
  } catch {
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
  } catch {
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
    return { exito: true };
  } catch {
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
  } catch {}
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
  } catch {
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
  } catch {
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
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  ITINERARIOS
// ══════════════════════════════════════════════════════════════════════════

export async function obtenerItinerarios(usuario_id: string): Promise<Itinerario[]> {
  try {
    const { data: itinerarios, error } = await supabase
      .from('itinerarios')
      .select('id, usuario_id, nombre')
      .eq('usuario_id', usuario_id)
      .order('id', { ascending: false });

    if (error || !itinerarios) return [];

    for (const iti of itinerarios as any[]) {
      const { data: items } = await supabase
        .from('itinerario_items')
        .select('clave_paquete')
        .eq('itinerario_id', iti.id)
        .order('orden_visita', { ascending: true });
      iti.items = items?.map((i: any) => i.clave_paquete) ?? [];
    }

    return itinerarios as Itinerario[];
  } catch {
    return [];
  }
}

export async function crearItinerario(usuario_id: string, nombre: string): Promise<Itinerario[]> {
  try {
    await supabase.from('itinerarios').insert({ usuario_id, nombre });
    return obtenerItinerarios(usuario_id);
  } catch {
    return [];
  }
}

export async function eliminarItinerario(usuario_id: string, itinerario_id: number): Promise<Itinerario[]> {
  try {
    await supabase.from('itinerario_items').delete().eq('itinerario_id', itinerario_id);
    await supabase.from('itinerarios').delete().eq('id', itinerario_id).eq('usuario_id', usuario_id);
    return obtenerItinerarios(usuario_id);
  } catch {
    return [];
  }
}

export async function alternarDestinoItinerario(
  usuario_id: string,
  itinerario_id: number,
  clave_paquete: string
): Promise<Itinerario[]> {
  try {
    const { data: existente } = await supabase
      .from('itinerario_items')
      .select('id')
      .eq('itinerario_id', itinerario_id)
      .eq('clave_paquete', clave_paquete)
      .maybeSingle();

    if (existente) {
      await supabase.from('itinerario_items').delete().eq('id', existente.id);
    } else {
      const { data: maxRow } = await supabase
        .from('itinerario_items')
        .select('orden_visita')
        .eq('itinerario_id', itinerario_id)
        .order('orden_visita', { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from('itinerario_items').insert({
        itinerario_id,
        clave_paquete,
        orden_visita: (maxRow?.orden_visita ?? 0) + 1,
      });
    }

    return obtenerItinerarios(usuario_id);
  } catch {
    return [];
  }
}

export async function reordenarItinerarioItems(
  usuario_id: string,
  itinerario_id: number,
  claves_ordenadas: string[]
): Promise<Itinerario[]> {
  try {
    for (let i = 0; i < claves_ordenadas.length; i++) {
      await supabase
        .from('itinerario_items')
        .update({ orden_visita: i + 1 })
        .eq('itinerario_id', itinerario_id)
        .eq('clave_paquete', claves_ordenadas[i]);
    }
    return obtenerItinerarios(usuario_id);
  } catch {
    return [];
  }
}

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
  } catch {
    return [];
  }
}

export async function crearRutaSugerida(ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').insert({ ...ruta, activo: 1 });
  } catch {}
}

export async function actualizarRutaSugerida(id: string, ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').update(ruta).eq('id', id);
  } catch {}
}

export async function eliminarRutaSugerida(id: string): Promise<void> {
  try {
    await supabase.from('sugerencias_rutas').delete().eq('id', id);
  } catch {}
}

export async function toggleActivoRutaSugerida(id: string): Promise<void> {
  try {
    const { data } = await supabase.from('sugerencias_rutas').select('activo').eq('id', id).maybeSingle();
    await supabase.from('sugerencias_rutas').update({ activo: data?.activo === 1 ? 0 : 1 }).eq('id', id);
  } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
//  DESTINOS (tabla `estados` en Supabase)
// ══════════════════════════════════════════════════════════════════════════

export async function obtenerTodosLosDestinos(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('estados').select('*').order('id', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function crearDestino(destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    await supabase.from('estados').insert({ ...destino, activo: 1 });
  } catch {}
}

export async function actualizarDestino(id: number, destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    await supabase.from('estados').update(destino).eq('id', id);
  } catch {}
}

export async function toggleActivoDestinoAdmin(id: number): Promise<void> {
  try {
    const { data } = await supabase.from('estados').select('activo').eq('id', id).maybeSingle();
    await supabase.from('estados').update({ activo: data?.activo === 1 ? 0 : 1 }).eq('id', id);
  } catch {}
}

export async function eliminarDestino(id: number): Promise<void> {
  try {
    await supabase.from('estados').delete().eq('id', id);
  } catch {}
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
  estado: string = 'confirmada'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reservas')
      .insert({ usuario_id, folio, destino, paquete, fecha, personas, total, metodo, estado, creado_en: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

export async function cargarReservas(usuario_id: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('creado_en', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
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
  } catch {
    return [];
  }
}

export async function actualizarEstadoReserva(id: number, estado: string): Promise<void> {
  try {
    await supabase.from('reservas').update({ estado }).eq('id', id);
  } catch {}
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
  } catch {
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
  } catch {
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
  } catch {}
}

export async function cargarHistorial(usuario_id: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('historial')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('creado_en', { ascending: false })
      .limit(50);
    if (error) return [];
    return data ?? [];
  } catch {
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
  } catch {}
}

export async function cargarNotificaciones(usuario_id: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('created_at', { ascending: false });
    if (error) return [];
    // Mapear leida boolean → 0/1 para compatibilidad con las pantallas
    return (data ?? []).map((n: any) => ({ ...n, leida: n.leida ? 1 : 0 }));
  } catch {
    return [];
  }
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
  } catch {}
}

export async function marcarTodasLeidas(usuario_id: string): Promise<void> {
  try {
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', usuario_id);
  } catch {}
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
  } catch {
    return [];
  }
}

export async function cambiarTipoUsuario(usuario_id: string, tipo: string): Promise<void> {
  try {
    await supabase.from('usuarios').update({ tipo }).eq('id', usuario_id);
  } catch {}
}

export async function toggleActivoUsuarioAdmin(usuario_id: string): Promise<void> {
  try {
    const { data } = await supabase.from('usuarios').select('activo').eq('id', usuario_id).maybeSingle();
    await supabase.from('usuarios').update({ activo: data?.activo === 1 ? 0 : 1 }).eq('id', usuario_id);
  } catch {}
}
