import { supabase } from '../supabase';
import { toggleActivo } from './shared';

// ── Destinos (tabla `estados`) ────────────────────────────────────────────────

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

export const toggleActivoDestinoAdmin = (id: number) => toggleActivo('estados', 'id', id);

export async function eliminarDestino(id: number): Promise<void> {
  try {
    await supabase.from('estados').delete().eq('id', id);
  } catch (err) { console.error('eliminarDestino error:', err); }
}

// ── Rutas sugeridas ───────────────────────────────────────────────────────────

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

export const toggleActivoRutaSugerida = (id: string) => toggleActivo('sugerencias_rutas', 'id', id);

// ── Usuarios admin ────────────────────────────────────────────────────────────

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

export const toggleActivoUsuarioAdmin = (usuario_id: string) => toggleActivo('usuarios', 'id', usuario_id);
