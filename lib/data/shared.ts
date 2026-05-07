import { supabase } from '../supabase';
import { enqueueOfflineOperation, registerOfflineHandler } from '../offline-cache';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string | null;
  nombre_usuario: string | null;
  correo: string;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

export const isNetworkLikeError = (error: unknown): boolean => {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('offline');
};

export const toggleActivo = async (tabla: string, campo: string, valor: any): Promise<void> => {
  try {
    const { data } = await supabase.from(tabla).select('activo').eq(campo, valor).maybeSingle();
    await supabase.from(tabla).update({ activo: data?.activo === 1 ? 0 : 1 }).eq(campo, valor);
  } catch (err) { console.error(`toggleActivo(${tabla}) error:`, err); }
};

// ── Offline handlers ─────────────────────────────────────────────────────────

let _offlineHandlersReady = false;
export const ensureOfflineHandlers = (): void => {
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

// Re-export enqueueOfflineOperation for domain files
export { enqueueOfflineOperation };
