import { supabase } from '../supabase';
import { enqueueOfflineOperation } from '../offline-cache';
import { isNetworkLikeError } from './shared';

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
      await supabase.from('favoritos').delete().eq('usuario_id', usuarioId).eq('estado_id', estadoId);
    } else {
      await supabase.from('favoritos').insert({ usuario_id: usuarioId, estado_id: estadoId });
    }
    return cargarFavoritos(usuarioId);
  } catch (err) {
    console.error('alternarFavorito error:', err);
    if (isNetworkLikeError(err)) {
      await enqueueOfflineOperation({ type: 'TOGGLE_FAVORITO', payload: { usuarioId, estadoId } });
      return cargarFavoritos(usuarioId);
    }
    return [];
  }
}
