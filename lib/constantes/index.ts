// ============================================================
//  lib/constantes/index.ts  —  Re-exports centralizados
// ============================================================

// Re-exportar tipos
export type {
  CategoriaEstado,
  Nivel,
  Sugerencia,
  Estado,
  Pestana,
  Paquete,
  L,
  LA
} from '../tipos';

export {
  ETIQUETA_NIVEL,
  CATEGORIAS,
  COLORES_NIVEL
} from '../tipos';

// Re-exportar navegación
export { PESTANAS, RUTAS_APP } from './navegacion';

// Re-exportar datos
export { TODOS_LOS_ESTADOS } from '../datos/estados';
export { SUGERENCIAS_RUTAS, PAQUETES_POR_ESTADO } from '../datos/sugerencias';

// Re-exportar utilidades
export {
  obtenerEstadosPorCategoria,
  buscarEstados,
  obtenerEstadoPorId,
  filtrarPorPrecio,
  ordenarPorPrecio,
  parsearClaveRuta,
  generarClaveRuta,
  resolverInfoRuta,
  obtenerSugerenciaPorId,
  obtenerSugerenciasPorEstado,
  obtenerSugerenciasPorNivel
} from '../utilidades/ayudantes';