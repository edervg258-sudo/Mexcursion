import { supabase } from '../supabase';

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
