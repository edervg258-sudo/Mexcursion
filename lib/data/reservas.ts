import { supabase } from '../supabase';
import { enqueueOfflineOperation } from '../offline-cache';
import { addBreadcrumb, captureApiError } from '../sentry';
import { isNetworkLikeError } from './shared';
import type { GuardarReservaResultado } from './shared';

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
): Promise<GuardarReservaResultado> {
  const METODOS_PERMITIDOS = new Set(['tarjeta', 'spei', 'oxxo']);
  const ESTADOS_PERMITIDOS = new Set(['confirmada', 'pendiente', 'cancelada']);

  try {
    const folioNormalizado = (folio ?? '').trim().toUpperCase().slice(0, 40);
    if (!folioNormalizado || folioNormalizado.length < 4) return 'failed';
    if (!METODOS_PERMITIDOS.has((metodo ?? '').toLowerCase())) return 'failed';
    if (!ESTADOS_PERMITIDOS.has((estado ?? '').toLowerCase())) return 'failed';
    if (!usuario_id || !destino?.trim() || !paquete?.trim()) return 'failed';
    if (!Number.isFinite(personas) || personas < 1 || personas > 20) return 'failed';
    if (!Number.isFinite(total) || total < 0) return 'failed';

    const fechaISO = /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)
      ? fecha.split('/').reverse().join('-')
      : fecha;

    const body: Record<string, any> = {
      usuario_id,
      folio: folioNormalizado,
      destino: destino.trim(),
      paquete: paquete.trim(),
      fecha: fechaISO,
      personas,
      total,
      metodo: metodo.toLowerCase(),
      estado: estado.toLowerCase(),
    };
    if (notas?.trim()) body.notas = notas.trim();

    const { data, error } = await supabase.functions.invoke('confirmar-reserva', { body });

    if (error) {
      if (isNetworkLikeError(error)) {
        await enqueueOfflineOperation({ type: 'CREAR_RESERVA', payload: body });
        return 'queued_offline';
      }
      captureApiError({
        feature: 'reservas',
        action: 'invoke',
        error,
        metadata: { usuario_id, folio: folioNormalizado },
      });
      return 'failed';
    }

    if (data?.resultado === 'idempotent') {
      addBreadcrumb({
        category: 'booking',
        message: 'guardarReserva idempotent hit',
        data: { usuario_id, folio: folioNormalizado },
      });
      return 'idempotent';
    }
    return 'saved';
  } catch (err) {
    console.error('guardarReserva error:', err);
    captureApiError({
      feature: 'reservas',
      action: 'invoke',
      error: err,
      metadata: { usuario_id, folio },
    });
    return 'failed';
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
