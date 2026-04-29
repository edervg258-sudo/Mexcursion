import {
  estadoReservaPorMetodo,
  fnv1a32,
  generarReferenciaOxxo,
} from './pago';

describe('estadoReservaPorMetodo', () => {
  test('tarjeta queda confirmada (simulacion inmediata)', () => {
    expect(estadoReservaPorMetodo('tarjeta')).toBe('confirmada');
  });
  test('spei queda pendiente hasta verificación bancaria', () => {
    expect(estadoReservaPorMetodo('spei')).toBe('pendiente');
  });
  test('oxxo queda pendiente hasta pago en tienda', () => {
    expect(estadoReservaPorMetodo('oxxo')).toBe('pendiente');
  });
});

describe('fnv1a32', () => {
  test('determinista — mismo input produce mismo hash', () => {
    expect(fnv1a32('abc')).toBe(fnv1a32('abc'));
  });
  test('inputs distintos producen hashes distintos', () => {
    expect(fnv1a32('abc')).not.toBe(fnv1a32('abd'));
  });
  test('cabe en uint32', () => {
    const h = fnv1a32('reserva-cualquiera');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
  test('caso vacío devuelve la base FNV', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
  });
});

describe('generarReferenciaOxxo', () => {
  test('siempre 16 dígitos numéricos', () => {
    const ref = generarReferenciaOxxo('Cancún|premium|01/05/2026|2');
    expect(ref).toMatch(/^\d{16}$/);
  });
  test('prefijo fijo 85700000', () => {
    expect(generarReferenciaOxxo('cualquier-cosa')).toMatch(/^85700000/);
  });
  test('idempotente para el mismo seed (no usa Math.random)', () => {
    const seed = 'CDMX|economico|10/06/2026|3';
    expect(generarReferenciaOxxo(seed)).toBe(generarReferenciaOxxo(seed));
  });
  test('seeds distintos generan referencias distintas', () => {
    const a = generarReferenciaOxxo('A|x|01/01/2026|1');
    const b = generarReferenciaOxxo('B|x|01/01/2026|1');
    expect(a).not.toBe(b);
  });
});

