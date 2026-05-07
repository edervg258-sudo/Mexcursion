import { supabase } from '../supabase';
import type { Usuario } from './shared';

let _sessionCache: { usuario: Usuario | null; ts: number } | null = null;
const SESSION_TTL = 30_000;

export function invalidarSesionCache(): void {
  _sessionCache = null;
}

export async function obtenerUsuarioActivo(): Promise<Usuario | null> {
  if (_sessionCache && Date.now() - _sessionCache.ts < SESSION_TTL) {
    return _sessionCache.usuario;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut();
      }
      return null;
    }

    if (!session?.user) return null;

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
    const email = (correo ?? '').trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) return null;
    return { email };
  } catch (err) {
    console.error('buscarUsuarioPorCorreo error:', err);
    return null;
  }
}

export async function registrarUsuario(
  nombre: string,
  nombre_usuario: string,
  correo: string,
  contrasena: string,
  telefono: string = ''
): Promise<{ exito: boolean; confirmar?: boolean; error?: string }> {
  try {
    const email = (correo ?? '').trim().toLowerCase();
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
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
        return { exito: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      return { exito: false, error: 'Correo o contraseña incorrectos.' };
    }

    console.log('✅ Login exitoso para:', correo);
    const usuario = await obtenerUsuarioActivo();
    return { exito: true, usuario: usuario ?? undefined };
  } catch (error) {
    console.log('❌ Error inesperado en login:', error);
    return { exito: false, error: 'Error al iniciar sesión.' };
  }
}

export async function cerrarSesion(): Promise<void> {
  _sessionCache = null;
  try { await supabase.auth.signOut(); } catch (err) { console.error('cerrarSesion error:', err); }
}

export async function haySesionActiva(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch {
    return false;
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
    if (error) return { exito: false, error: 'No se pudo enviar el correo de recuperación.' };
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
    if (campos.nombre         !== undefined) update.nombre         = campos.nombre;
    if (campos.nombre_usuario !== undefined) update.nombre_usuario = campos.nombre_usuario;
    if (campos.telefono       !== undefined) update.telefono       = campos.telefono;

    const { error } = await supabase.from('usuarios').update(update).eq('id', usuario_id);
    if (error) return { exito: false, error: 'Error al actualizar perfil.' };
    invalidarSesionCache();
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
    if (campos.idioma         !== undefined) update.idioma         = campos.idioma;
    if (campos.notificaciones !== undefined) update.notificaciones = campos.notificaciones;
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
