// ============================================================
//  lib/politicas-negocio.ts  —  Políticas de negocio y reglas
// ============================================================

import { differenceInDays, parse, isBefore, addDays } from 'date-fns';

// Políticas de cancelación
export const POLITICAS_CANCELACION = {
  FLEXIBLE: {
    nombre: 'Cancelación Flexible',
    descripcion: 'Cancelación gratuita hasta 24 horas antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes >= 1) return 0; // Gratuita 24h antes
      return precioTotal * 0.1; // 10% si es menos de 24h
    }
  },
  MODERADA: {
    nombre: 'Cancelación Moderada',
    descripcion: 'Cancelación gratuita hasta 7 días antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes >= 7) return 0;
      if (diasAntes >= 3) return precioTotal * 0.05; // 5%
      return precioTotal * 0.15; // 15%
    }
  },
  ESTRICTA: {
    nombre: 'Cancelación Estricta',
    descripcion: 'Cancelación gratuita hasta 30 días antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes >= 30) return 0;
      if (diasAntes >= 14) return precioTotal * 0.2; // 20%
      return precioTotal * 0.5; // 50%
    }
  }
};

// Calcular costo de cancelación
export const calcularCostoCancelacion = (
  fechaViaje: string,
  fechaCancelacion: string,
  precioTotal: number,
  politica: keyof typeof POLITICAS_CANCELACION = 'MODERADA'
): { costo: number; reembolsable: number; mensaje: string } => {
  const viaje = parse(fechaViaje, 'dd/MM/yyyy', new Date());
  const cancelacion = parse(fechaCancelacion, 'dd/MM/yyyy', new Date());

  if (isBefore(viaje, cancelacion)) {
    throw new Error('Fecha de cancelación no puede ser después del viaje');
  }

  const diasAntes = differenceInDays(viaje, cancelacion);
  const costo = POLITICAS_CANCELACION[politica].costoCancelacion(diasAntes, precioTotal);
  const reembolsable = precioTotal - costo;

  let mensaje = '';
  if (costo === 0) {
    mensaje = 'Cancelación gratuita';
  } else {
    mensaje = `Costo de cancelación: $${costo.toLocaleString()} (${((costo/precioTotal)*100).toFixed(0)}%)`;
  }

  return { costo, reembolsable, mensaje };
};

// Sistema de referidos
export const SISTEMA_REFERIDOS = {
  CODIGO_DESCUENTO: 50, // $50 de descuento por referido exitoso
  MINIMO_COMPRA_REFERIDO: 500, // Mínimo que debe gastar el referido

  generarCodigoReferido: (userId: string): string => {
    return `MERC${userId.slice(-6).toUpperCase()}`;
  },

  validarCodigoReferido: (codigo: string): boolean => {
    return /^MERC[A-Z0-9]{6}$/.test(codigo);
  },

  calcularRecompensa: (comprasReferido: number): number => {
    if (comprasReferido >= 1000) return 100; // $100 por referido que gasta $1000+
    if (comprasReferido >= 500) return 50;   // $50 por referido que gasta $500+
    return 0;
  }
};

// Programa de fidelidad
export const PROGRAMA_FIDELIDAD = {
  NIVELES: {
    BRONCE: { nombre: 'Bronce', minCompras: 0, descuento: 0 },
    PLATA: { nombre: 'Plata', minCompras: 2000, descuento: 0.05 },
    ORO: { nombre: 'Oro', minCompras: 5000, descuento: 0.1 },
    PLATINO: { nombre: 'Platino', minCompras: 10000, descuento: 0.15 }
  },

  calcularNivel: (totalCompras: number) => {
    if (totalCompras >= 10000) return 'PLATINO';
    if (totalCompras >= 5000) return 'ORO';
    if (totalCompras >= 2000) return 'PLATA';
    return 'BRONCE';
  },

  calcularDescuento: (totalCompras: number): number => {
    const nivel = PROGRAMA_FIDELIDAD.calcularNivel(totalCompras);
    return PROGRAMA_FIDELIDAD.NIVELES[nivel as keyof typeof PROGRAMA_FIDELIDAD.NIVELES].descuento;
  }
};

// Validación de promociones
export const validarPromocion = (codigo: string): {
  valido: boolean;
  descuento: number;
  tipo: 'porcentaje' | 'fijo';
  mensaje: string;
} => {
  const promociones: Record<string, any> = {
    'BIENVENIDO': { descuento: 0.1, tipo: 'porcentaje', descripcion: '10% de descuento para nuevos usuarios' },
    'VERANO2026': { descuento: 200, tipo: 'fijo', descripcion: '$200 de descuento en viajes de verano' },
    'AMIGOS': { descuento: 0.15, tipo: 'porcentaje', descripcion: '15% por referido' }
  };

  const promo = promociones[codigo.toUpperCase()];
  if (!promo) {
    return { valido: false, descuento: 0, tipo: 'porcentaje', mensaje: 'Código inválido' };
  }

  // Aquí podrías agregar validaciones adicionales (fechas, uso único, etc.)

  return {
    valido: true,
    descuento: promo.descuento,
    tipo: promo.tipo,
    mensaje: promo.descripcion
  };
};

// Cálculo de precios dinámicos (temporada alta/baja)
export const calcularPrecioDinamico = (
  precioBase: number,
  fecha: string,
  temporadaAlta: string[] = ['12/25', '01/01', '07/15', '12/31']
): { precioFinal: number; factor: number; razon: string } => {
  const [dia, mes] = fecha.split('/');
  const fechaCorta = `${mes}/${dia}`;

  let factor = 1.0;
  let razon = 'Precio estándar';

  // Temporada alta (+20%)
  if (temporadaAlta.includes(fechaCorta)) {
    factor = 1.2;
    razon = 'Temporada alta';
  }

  // Fin de semana (+10%)
  const fechaObj = parse(fecha, 'dd/MM/yyyy', new Date());
  if (fechaObj.getDay() === 0 || fechaObj.getDay() === 6) {
    factor *= 1.1;
    razon = 'Fin de semana';
  }

  // Días festivos mexicanos (+15%)
  const diasFestivos = ['05/05', '09/16', '11/02', '11/20']; // Ejemplos
  if (diasFestivos.includes(fechaCorta)) {
    factor *= 1.15;
    razon = 'Día festivo';
  }

  return {
    precioFinal: Math.round(precioBase * factor),
    factor,
    razon
  };
};