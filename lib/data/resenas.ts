import { supabase } from '../supabase';
import { crearNotificacion } from './notificaciones';

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
  limite = 10,
  offset = 0
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

export async function cargarResumenResenas(
  destinos: string[]
): Promise<Record<string, { promedio: number; total: number }>> {
  const nombres = destinos
    .map(d => d?.trim())
    .filter((d): d is string => !!d);

  if (!nombres.length) return {};

  try {
    const { data, error } = await supabase
      .from('resenas')
      .select('destino, calificacion')
      .in('destino', nombres);

    if (error || !data) return {};

    return data.reduce((acc: Record<string, { promedio: number; total: number; suma?: number }>, item: any) => {
      const dest = String(item.destino ?? '');
      if (!dest) return acc;
      const actual = acc[dest] ?? { promedio: 0, total: 0, suma: 0 };
      actual.total += 1;
      actual.suma = (actual.suma ?? 0) + Number(item.calificacion ?? 0);
      actual.promedio = actual.total > 0 ? actual.suma / actual.total : 0;
      acc[dest] = actual;
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
