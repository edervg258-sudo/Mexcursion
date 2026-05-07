import { supabase } from '../supabase';
import type { Itinerario } from './shared';

export async function obtenerItinerarios(usuario_id: string): Promise<Itinerario[]> {
  try {
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
