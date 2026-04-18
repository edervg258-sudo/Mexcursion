// ============================================================
//  lib/politicas-negocio.test.ts
//  Tests del flujo de negocio: reservas, cancelaciones, precios
// ============================================================

import {
  calcularCostoCancelacion,
  calcularPrecioDinamico,
  POLITICAS_CANCELACION,
  PROGRAMA_FIDELIDAD,
  SISTEMA_REFERIDOS,
  validarPromocion,
} from './politicas-negocio';

// ─── calcularCostoCancelacion ────────────────────────────────────────────────

describe('calcularCostoCancelacion', () => {
  const PRECIO = 3000;

  describe('política FLEXIBLE', () => {
    it('cancela gratis con más de 24h de antelación', () => {
      const res = calcularCostoCancelacion('20/06/2026', '18/06/2026', PRECIO, 'FLEXIBLE');
      expect(res.error).toBeUndefined();
      expect(res.costo).toBe(0);
      expect(res.reembolsable).toBe(PRECIO);
      expect(res.mensaje).toBe('Cancelación gratuita');
    });

    it('cobra 10% con menos de 24h', () => {
      const res = calcularCostoCancelacion('20/06/2026', '20/06/2026', PRECIO, 'FLEXIBLE');
      expect(res.costo).toBe(PRECIO * 0.1);
      expect(res.reembolsable).toBe(PRECIO * 0.9);
    });
  });

  describe('política MODERADA (por defecto)', () => {
    it('cancela gratis con 7+ días', () => {
      const res = calcularCostoCancelacion('20/06/2026', '12/06/2026', PRECIO);
      expect(res.costo).toBe(0);
    });

    it('cobra 5% entre 3 y 6 días antes', () => {
      const res = calcularCostoCancelacion('20/06/2026', '17/06/2026', PRECIO);
      expect(res.costo).toBe(PRECIO * 0.05);
    });

    it('cobra 15% con menos de 3 días', () => {
      const res = calcularCostoCancelacion('20/06/2026', '19/06/2026', PRECIO);
      expect(res.costo).toBe(PRECIO * 0.15);
    });
  });

  describe('política ESTRICTA', () => {
    it('cancela gratis con 30+ días', () => {
      const res = calcularCostoCancelacion('20/07/2026', '15/06/2026', PRECIO, 'ESTRICTA');
      expect(res.costo).toBe(0);
    });

    it('cobra 20% entre 14 y 29 días antes', () => {
      const res = calcularCostoCancelacion('20/07/2026', '05/07/2026', PRECIO, 'ESTRICTA');
      expect(res.costo).toBe(PRECIO * 0.2);
    });

    it('cobra 50% con menos de 14 días', () => {
      const res = calcularCostoCancelacion('20/07/2026', '15/07/2026', PRECIO, 'ESTRICTA');
      expect(res.costo).toBe(PRECIO * 0.5);
    });
  });

  it('devuelve error si la cancelación es posterior al viaje', () => {
    const res = calcularCostoCancelacion('10/06/2026', '15/06/2026', PRECIO);
    expect(res.error).toBeDefined();
    expect(res.costo).toBe(0);
    expect(res.reembolsable).toBe(0);
  });

  it('incluye el porcentaje en el mensaje cuando hay costo', () => {
    const res = calcularCostoCancelacion('20/06/2026', '19/06/2026', PRECIO);
    expect(res.mensaje).toContain('Costo de cancelación');
    expect(res.mensaje).toContain('%');
  });
});

// ─── validarPromocion ────────────────────────────────────────────────────────

describe('validarPromocion', () => {
  it('acepta código válido en mayúsculas', () => {
    const res = validarPromocion('BIENVENIDO');
    expect(res.valido).toBe(true);
    expect(res.tipo).toBe('porcentaje');
    expect(res.descuento).toBe(0.1);
  });

  it('acepta código válido en minúsculas (normaliza)', () => {
    const res = validarPromocion('verano2026');
    expect(res.valido).toBe(true);
    expect(res.tipo).toBe('fijo');
    expect(res.descuento).toBe(200);
  });

  it('acepta código AMIGOS con 15%', () => {
    const res = validarPromocion('AMIGOS');
    expect(res.valido).toBe(true);
    expect(res.descuento).toBe(0.15);
  });

  it('rechaza código inexistente', () => {
    const res = validarPromocion('INVENTADO123');
    expect(res.valido).toBe(false);
    expect(res.descuento).toBe(0);
    expect(res.mensaje).toBe('Código inválido');
  });

  it('rechaza código vacío', () => {
    const res = validarPromocion('');
    expect(res.valido).toBe(false);
  });
});

// ─── calcularPrecioDinamico ──────────────────────────────────────────────────

describe('calcularPrecioDinamico', () => {
  const BASE = 2000;

  it('aplica precio estándar en día de semana normal', () => {
    // 10/06/2026 es miércoles, no es festivo ni temporada alta
    const res = calcularPrecioDinamico(BASE, '10/06/2026');
    expect(res.factor).toBe(1.0);
    expect(res.precioFinal).toBe(BASE);
    expect(res.razon).toBe('Precio estándar');
  });

  it('aplica +20% en temporada alta (Navidad)', () => {
    const res = calcularPrecioDinamico(BASE, '25/12/2026');
    expect(res.factor).toBeCloseTo(1.2);
    expect(res.precioFinal).toBe(Math.round(BASE * 1.2));
    expect(res.razon).toContain('Temporada alta');
  });

  it('aplica +10% en fin de semana', () => {
    // 13/06/2026 es sábado
    const res = calcularPrecioDinamico(BASE, '13/06/2026');
    expect(res.factor).toBeCloseTo(1.1);
    expect(res.razon).toContain('Fin de semana');
  });

  it('acumula factores en fecha festiva + fin de semana', () => {
    // 05/05/2024 es domingo Y festivo
    const res = calcularPrecioDinamico(BASE, '05/05/2024');
    // +10% fin de semana × +15% festivo = ×1.265
    expect(res.factor).toBeCloseTo(1.265);
    expect(res.razon).toContain('Fin de semana');
    expect(res.razon).toContain('Día festivo');
  });

  it('acumula razones en temporada alta + fin de semana', () => {
    // 25/12/2021 es sábado Y temporada alta (Navidad)
    const res = calcularPrecioDinamico(BASE, '25/12/2021');
    // 1.2 × 1.1 = 1.32
    expect(res.factor).toBeCloseTo(1.32);
    expect(res.razon).toContain('Temporada alta');
    expect(res.razon).toContain('Fin de semana');
  });

  it('acepta temporadaAlta personalizada', () => {
    // 13/03/2026 es viernes (día de semana), solo aplica el factor de temporada alta
    const res = calcularPrecioDinamico(BASE, '13/03/2026', ['03/13']);
    expect(res.factor).toBeCloseTo(1.2);
    expect(res.razon).toBe('Temporada alta');
  });

  it('el precioFinal es un entero redondeado', () => {
    const res = calcularPrecioDinamico(999, '13/06/2026'); // sábado
    expect(Number.isInteger(res.precioFinal)).toBe(true);
  });
});

// ─── PROGRAMA_FIDELIDAD ──────────────────────────────────────────────────────

describe('PROGRAMA_FIDELIDAD', () => {
  describe('calcularNivel', () => {
    it('asigna BRONCE con $0', () => expect(PROGRAMA_FIDELIDAD.calcularNivel(0)).toBe('BRONCE'));
    it('asigna PLATA con $2000', () => expect(PROGRAMA_FIDELIDAD.calcularNivel(2000)).toBe('PLATA'));
    it('asigna ORO con $5000', () => expect(PROGRAMA_FIDELIDAD.calcularNivel(5000)).toBe('ORO'));
    it('asigna PLATINO con $10000', () => expect(PROGRAMA_FIDELIDAD.calcularNivel(10000)).toBe('PLATINO'));
    it('asigna PLATINO con más de $10000', () => expect(PROGRAMA_FIDELIDAD.calcularNivel(50000)).toBe('PLATINO'));
  });

  describe('calcularDescuento', () => {
    it('BRONCE = 0%', () => expect(PROGRAMA_FIDELIDAD.calcularDescuento(0)).toBe(0));
    it('PLATA = 5%', () => expect(PROGRAMA_FIDELIDAD.calcularDescuento(3000)).toBe(0.05));
    it('ORO = 10%', () => expect(PROGRAMA_FIDELIDAD.calcularDescuento(7000)).toBe(0.1));
    it('PLATINO = 15%', () => expect(PROGRAMA_FIDELIDAD.calcularDescuento(15000)).toBe(0.15));
  });
});

// ─── SISTEMA_REFERIDOS ───────────────────────────────────────────────────────

describe('SISTEMA_REFERIDOS', () => {
  it('genera código con prefijo MERC y 6 caracteres', () => {
    const codigo = SISTEMA_REFERIDOS.generarCodigoReferido('user-abc123xyz');
    expect(codigo).toMatch(/^MERC[A-Z0-9]{6}$/);
  });

  it('valida un código generado correctamente', () => {
    const codigo = SISTEMA_REFERIDOS.generarCodigoReferido('user-abc123');
    expect(SISTEMA_REFERIDOS.validarCodigoReferido(codigo)).toBe(true);
  });

  it('rechaza código con formato incorrecto', () => {
    expect(SISTEMA_REFERIDOS.validarCodigoReferido('INVALID')).toBe(false);
    expect(SISTEMA_REFERIDOS.validarCodigoReferido('')).toBe(false);
    expect(SISTEMA_REFERIDOS.validarCodigoReferido('merc123456')).toBe(false); // minúsculas
  });

  describe('calcularRecompensa', () => {
    it('$0 si el referido gasta menos de $500', () => {
      expect(SISTEMA_REFERIDOS.calcularRecompensa(499)).toBe(0);
    });
    it('$50 si el referido gasta $500', () => {
      expect(SISTEMA_REFERIDOS.calcularRecompensa(500)).toBe(50);
    });
    it('$100 si el referido gasta $1000+', () => {
      expect(SISTEMA_REFERIDOS.calcularRecompensa(1000)).toBe(100);
      expect(SISTEMA_REFERIDOS.calcularRecompensa(5000)).toBe(100);
    });
  });
});

// ─── Integración: flujo completo reserva ────────────────────────────────────

describe('flujo reserva completo', () => {
  it('aplica promoción + fidelidad + precio dinámico correctamente', () => {
    const precioBase = 3000;

    // 1. Precio dinámico: miércoles 10/06/2026 → factor 1.0
    const { precioFinal: precioConFactor } = calcularPrecioDinamico(precioBase, '10/06/2026');
    expect(precioConFactor).toBe(3000);

    // 2. Aplica promoción BIENVENIDO: -10%
    const promo = validarPromocion('BIENVENIDO');
    expect(promo.valido).toBe(true);
    const precioConPromo = promo.tipo === 'porcentaje'
      ? precioConFactor * (1 - promo.descuento)
      : precioConFactor - promo.descuento;
    expect(precioConPromo).toBe(2700);

    // 3. Usuario nivel ORO ($6000 compras): descuento adicional -10%
    const descuentoFidelidad = PROGRAMA_FIDELIDAD.calcularDescuento(6000);
    const precioFinal = precioConPromo * (1 - descuentoFidelidad);
    expect(precioFinal).toBe(2430);

    // 4. Cancelación MODERADA con 10 días de antelación → gratis
    const cancelacion = calcularCostoCancelacion('10/06/2026', '31/05/2026', precioFinal);
    expect(cancelacion.costo).toBe(0);
    expect(cancelacion.reembolsable).toBe(precioFinal);
  });

  it('cobra penalización completa en cancelación tardía con política ESTRICTA', () => {
    const precio = 5000;
    const res = calcularCostoCancelacion('20/06/2026', '18/06/2026', precio, 'ESTRICTA');
    expect(res.costo).toBe(precio * 0.5);
    expect(res.reembolsable).toBe(precio * 0.5);
  });
});
