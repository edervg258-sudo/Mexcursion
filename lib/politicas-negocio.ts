// ============================================================
//  lib/politicas-negocio.ts  —  Políticas de negocio y reglas
// ============================================================

import { differenceInDays, format, isBefore, parse } from 'date-fns';

export type ResultadoCancelacion = {
  costo: number;
  reembolsable: number;
  mensaje: string;
};

// Políticas de cancelación
export const POLITICAS_CANCELACION = {
  FLEXIBLE: {
    nombre: 'Cancelación Flexible',
    descripcion: 'Cancelación gratuita hasta 24 horas antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes > 1) return 0;
      return precioTotal * 0.1;
    },
  },
  MODERADA: {
    nombre: 'Cancelación Moderada',
    descripcion: 'Cancelación gratuita hasta 7 días antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes >= 7) return 0;
      if (diasAntes >= 3) return precioTotal * 0.05;
      return precioTotal * 0.15;
    },
  },
  ESTRICTA: {
    nombre: 'Cancelación Estricta',
    descripcion: 'Cancelación gratuita hasta 30 días antes',
    costoCancelacion: (diasAntes: number, precioTotal: number): number => {
      if (diasAntes >= 30) return 0;
      if (diasAntes >= 14) return precioTotal * 0.2;
      return precioTotal * 0.5;
    },
  },
};

// Calcular costo de cancelación
export const calcularCostoCancelacion = (
  fechaViaje: string,
  fechaCancelacion: string,
  precioTotal: number,
  politica: keyof typeof POLITICAS_CANCELACION = 'MODERADA'
): ResultadoCancelacion => {
  const viaje = parse(fechaViaje, 'dd/MM/yyyy', new Date());
  const cancelacion = parse(fechaCancelacion, 'dd/MM/yyyy', new Date());

  if (isBefore(viaje, cancelacion)) {
    throw new Error('Fecha de cancelación no puede ser después del viaje');
  }

  const diasAntes = differenceInDays(viaje, cancelacion);
  const costo = POLITICAS_CANCELACION[politica].costoCancelacion(diasAntes, precioTotal);
  const reembolsable = precioTotal - costo;

  if (costo === 0) {
    return { costo, reembolsable, mensaje: 'Cancelación gratuita' };
  }

  return {
    costo,
    reembolsable,
    mensaje: `Costo de cancelación: $${costo.toLocaleString()} (${((costo / precioTotal) * 100).toFixed(0)}%)`,
  };
};

// Cálculo de precios dinámicos (temporada alta/baja)
export const calcularPrecioDinamico = (
  precioBase: number,
  fecha: string,
  temporadaAlta: string[] = ['12/25', '01/01', '07/15', '12/31']
): { precioFinal: number; factor: number; razon: string } => {
  const fechaObj = parse(fecha, 'dd/MM/yyyy', new Date());
  const fechaCorta = format(fechaObj, 'MM/dd');
  const razones: string[] = [];
  let factor = 1.0;

  // Temporada alta (+20%)
  if (temporadaAlta.includes(fechaCorta)) {
    factor *= 1.2;
    razones.push('Temporada alta');
  }

  // Fin de semana (+10%)
  if (fechaObj.getDay() === 0 || fechaObj.getDay() === 6) {
    factor *= 1.1;
    razones.push('Fin de semana');
  }

  // Días festivos mexicanos (+15%)
  const diasFestivos = ['05/05', '09/16', '11/02', '11/20'];
  if (diasFestivos.includes(fechaCorta)) {
    factor *= 1.15;
    razones.push('Día festivo');
  }

  const precioFinal = Math.round((precioBase * factor) * 100) / 100;
  return {
    precioFinal,
    factor,
    razon: razones.length > 0 ? razones.join(' + ') : 'Precio estándar',
  };
};
