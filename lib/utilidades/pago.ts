// Utilidades puras del flujo de pago — sin dependencias de UI ni red.
// Centralizadas aquí para ser testeables y reusables entre pago.tsx y confirmacion.tsx.

export type MetodoPago = 'tarjeta' | 'spei' | 'oxxo';
export type EstadoReserva = 'confirmada' | 'pendiente' | 'cancelada';

// Métodos que requieren verificación externa (banco / tienda) antes de confirmar.
const METODOS_PENDIENTES: ReadonlySet<MetodoPago> = new Set<MetodoPago>(['spei', 'oxxo']);

export function estadoReservaPorMetodo(metodo: MetodoPago): EstadoReserva {
  return METODOS_PENDIENTES.has(metodo) ? 'pendiente' : 'confirmada';
}

// Hash FNV-1a de 32 bits — determinista, sin Math.random.
// Usado para generar una referencia OXXO estable a partir de los datos de la reserva.
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

// Referencia OXXO simulada: prefijo fijo + 8 dígitos derivados del seed.
export function generarReferenciaOxxo(seed: string): string {
  const h = fnv1a32(seed);
  return '85700000' + (h % 100_000_000).toString().padStart(8, '0');
}

