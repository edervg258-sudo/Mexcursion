import { supabase } from '../supabase';

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
