// ============================================================
//  lib/politicas-negocio.test.ts
// ============================================================

import {
  calcularCostoCancelacion,
  calcularPrecioDinamico,
  POLITICAS_CANCELACION,
} from './politicas-negocio';

describe('POLITICAS_CANCELACION', () => {
  it('expone las tres políticas soportadas', () => {
    expect(Object.keys(POLITICAS_CANCELACION)).toEqual(['FLEXIBLE', 'MODERADA', 'ESTRICTA']);
  });
});

describe('calcularCostoCancelacion', () => {
  const PRECIO = 3000;

  it('FLEXIBLE: gratis con más de 24h', () => {
    const res = calcularCostoCancelacion('20/06/2026', '18/06/2026', PRECIO, 'FLEXIBLE');
    expect(res.costo).toBe(0);
    expect(res.reembolsable).toBe(PRECIO);
    expect(res.mensaje).toBe('Cancelación gratuita');
  });

  it('MODERADA: cobra 5% entre 3 y 6 días', () => {
    const res = calcularCostoCancelacion('20/06/2026', '17/06/2026', PRECIO, 'MODERADA');
    expect(res.costo).toBe(PRECIO * 0.05);
  });

  it('ESTRICTA: cobra 50% con menos de 14 días', () => {
    const res = calcularCostoCancelacion('20/07/2026', '15/07/2026', PRECIO, 'ESTRICTA');
    expect(res.costo).toBe(PRECIO * 0.5);
  });

  it('lanza error si la cancelación es posterior al viaje', () => {
    expect(() => calcularCostoCancelacion('10/06/2026', '15/06/2026', PRECIO)).toThrow(
      'Fecha de cancelación no puede ser después del viaje'
    );
  });
});

describe('calcularPrecioDinamico', () => {
  const BASE = 2000;

  it('precio estándar en día normal', () => {
    const res = calcularPrecioDinamico(BASE, '10/06/2026');
    expect(res.factor).toBe(1);
    expect(res.precioFinal).toBe(BASE);
    expect(res.razon).toBe('Precio estándar');
  });

  it('acumula razones en temporada alta + fin de semana', () => {
    const res = calcularPrecioDinamico(BASE, '25/12/2021');
    expect(res.factor).toBeCloseTo(1.32);
    expect(res.razon).toContain('Temporada alta');
    expect(res.razon).toContain('Fin de semana');
  });

  it('acumula razones en fin de semana + festivo', () => {
    const res = calcularPrecioDinamico(BASE, '05/05/2024');
    expect(res.factor).toBeCloseTo(1.265);
    expect(res.razon).toContain('Fin de semana');
    expect(res.razon).toContain('Día festivo');
  });
});
