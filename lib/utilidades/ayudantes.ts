// ============================================================
//  lib/utilidades/ayudantes.ts  —  Funciones auxiliares
// ============================================================

import type { Estado, Nivel, Sugerencia } from '../tipos';
import { TODOS_LOS_ESTADOS } from '../datos/estados';
import { SUGERENCIAS_RUTAS, PAQUETES_POR_ESTADO } from '../datos/sugerencias';
import type { Paquete, CategoriaEstado, L, LA } from '../tipos';

/**
 * Obtiene todos los estados de una categoría específica
 */
export const obtenerEstadosPorCategoria = (categoria: CategoriaEstado): Estado[] => {
  return TODOS_LOS_ESTADOS.filter(estado => estado.categoria === categoria);
};

/**
 * Busca estados por texto en nombre o descripción
 */
export const buscarEstados = (texto: string): Estado[] => {
  const textoLower = texto.toLowerCase();
  return TODOS_LOS_ESTADOS.filter(estado =>
    estado.nombre.toLowerCase().includes(textoLower) ||
    estado.descripcion.toLowerCase().includes(textoLower)
  );
};

/**
 * Obtiene un estado por su ID
 */
export const obtenerEstadoPorId = (id: number): Estado | undefined => {
  return TODOS_LOS_ESTADOS.find(estado => estado.id === id);
};

/**
 * Filtra estados por rango de precio
 */
export const filtrarPorPrecio = (min: number, max: number): Estado[] => {
  return TODOS_LOS_ESTADOS.filter(estado =>
    estado.precio >= min && estado.precio <= max
  );
};

/**
 * Ordena estados por precio (ascendente o descendente)
 */
export const ordenarPorPrecio = (ascendente: boolean = true): Estado[] => {
  return [...TODOS_LOS_ESTADOS].sort((a, b) =>
    ascendente ? a.precio - b.precio : b.precio - a.precio
  );
};

/**
 * Parsea una clave de ruta con formato "Estado|nivel" o "Estado-nivel" (legacy).
 * Soporta ambos separadores para retrocompatibilidad con datos ya almacenados.
 */
export const parsearClaveRuta = (clave: string): { estado: string; nivel: Nivel } => {
  // Separador canónico: |
  if (clave.includes('|')) {
    const [estado, nivel = 'medio'] = clave.split('|');
    return { estado, nivel: nivel as Nivel };
  }
  // Separador legacy: - (último guión = separador, lo anterior = nombre del estado)
  const ultimoGuion = clave.lastIndexOf('-');
  if (ultimoGuion > 0) {
    const posibleNivel = clave.slice(ultimoGuion + 1);
    if (['economico', 'medio', 'premium'].includes(posibleNivel)) {
      return { estado: clave.slice(0, ultimoGuion), nivel: posibleNivel as Nivel };
    }
  }
  // Fallback: asumir medio
  return { estado: clave, nivel: 'medio' };
};

/**
 * Genera una clave de ruta estandarizada con el formato canónico "Estado|nivel".
 */
export const generarClaveRuta = (estado: string, nivel: Nivel): string => {
  return `${estado}|${nivel}`;
};

/**
 * Resuelve información completa de una ruta a partir de su clave.
 * Busca primero en SUGERENCIAS_RUTAS, luego en PAQUETES_POR_ESTADO, luego fallback.
 */
export const resolverInfoRuta = (clave: string): {
  titulo: string;
  estado: string;
  nivel: Nivel;
  hotel: string;
  precioHotel: string;
  restaurante: string;
  precioRestaurante: string;
  estilo: string;
  precioTotal: string;
  diasRecomendados: number;
  transporte: L;
  precioTransporte: string;
  actividades: LA;
} => {
  const { estado, nivel } = parsearClaveRuta(clave);

  // 1. Buscar en sugerencias por clave canónica o por estado+nivel
  const claveCanonica = generarClaveRuta(estado, nivel);
  const sugerencia = SUGERENCIAS_RUTAS.find(
    s => s.id === claveCanonica || s.id === clave || (s.estado === estado && s.nivel === nivel)
  );

  // 2. Buscar paquete detallado en PAQUETES_POR_ESTADO
  const paquetesEstado = PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO['default'];
  const paquete = paquetesEstado.find(p => p.nivel === nivel) ?? paquetesEstado[0];

  return {
    titulo: sugerencia?.titulo ?? estado,
    estado,
    nivel,
    hotel: sugerencia?.hotel ?? paquete?.hotel ?? '',
    precioHotel: sugerencia?.precioHotel ?? paquete?.precioHotel ?? '',
    restaurante: sugerencia?.restaurante ?? paquete?.restaurante ?? '',
    precioRestaurante: sugerencia?.precioRestaurante ?? paquete?.precioRestaurante ?? '',
    estilo: sugerencia?.estilo ?? '',
    precioTotal: paquete?.precioTotal ?? '',
    diasRecomendados: paquete?.diasRecomendados ?? 3,
    transporte: paquete?.transporte ?? { es: '', en: '' },
    precioTransporte: paquete?.precioTransporte ?? '',
    actividades: paquete?.actividades ?? { es: [], en: [] },
  };
};

/**
 * Obtiene una sugerencia por su ID
 */
export const obtenerSugerenciaPorId = (id: string): Sugerencia | undefined => {
  return SUGERENCIAS_RUTAS.find(s => s.id === id);
};

/**
 * Obtiene todas las sugerencias de un estado
 */
export const obtenerSugerenciasPorEstado = (estado: string): Sugerencia[] => {
  return SUGERENCIAS_RUTAS.filter(s => s.estado === estado);
};

/**
 * Obtiene todas las sugerencias de un nivel
 */
export const obtenerSugerenciasPorNivel = (nivel: Nivel): Sugerencia[] => {
  return SUGERENCIAS_RUTAS.filter(s => s.nivel === nivel);
};