// ============================================================
//  lib/datos/rutas-tematicas.ts — 5 rutas curadas de México
// ============================================================

export interface RutaTematica {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  color: string;
  colorOscuro: string;
  estadoIds: number[];
  diasPorEstado: number;
  highlights: string[];      // experiencias clave de la ruta
  mejorEpoca: string;        // temporada recomendada
  transporte: string;        // cómo moverse
  presupuestoDiario: string; // rango de gasto por día
  tags: string[];            // etiquetas rápidas
  dificultad: 'Fácil' | 'Moderada' | 'Exigente';
}

export const RUTAS_TEMATICAS: RutaTematica[] = [
  {
    id: 'colonial',
    nombre: 'Ruta Colonial',
    emoji: '🏛️',
    descripcion: 'El corazón histórico de México. Ciudades declaradas Patrimonio de la Humanidad, callejones empedrados, haciendas centenarias y mercados de arte que te transportan siglos atrás.',
    color: '#e9c46a',
    colorOscuro: '#B8943A',
    estadoIds: [22, 12, 24, 32, 1],
    diasPorEstado: 3,
    highlights: ['Peña de Bernal (Querétaro)', 'Callejón del Beso (Guanajuato)', 'Real de Catorce (SLP)', 'Cerro de la Bufa (Zacatecas)', 'Feria de San Marcos (Ags)'],
    mejorEpoca: 'Oct – Abr',
    transporte: 'Autobús ADO · auto rentado',
    presupuestoDiario: '$800 – $1,500 MXN',
    tags: ['Patrimonio UNESCO', 'Historia', 'Arquitectura', 'Arte'],
    dificultad: 'Fácil',
  },
  {
    id: 'maya',
    nombre: 'Ruta Maya',
    emoji: '🌿',
    descripcion: 'Civilización milenaria en estado puro. Selva de Chiapas, zonas arqueológicas de Palenque y Chichén Itzá, cenotes sagrados y las aguas turquesas del Caribe mexicano.',
    color: '#3AB7A5',
    colorOscuro: '#2E9A8A',
    estadoIds: [27, 5, 4, 31, 23],
    diasPorEstado: 4,
    highlights: ['Palenque (Chiapas)', 'Cascadas de Agua Azul', 'Ciudad amurallada de Campeche', 'Chichén Itzá (Yucatán)', 'Cenotes de Tulum'],
    mejorEpoca: 'Nov – Mar',
    transporte: 'Autobús + colectivo',
    presupuestoDiario: '$900 – $1,800 MXN',
    tags: ['Arqueología', 'Naturaleza', 'Playas', 'UNESCO'],
    dificultad: 'Moderada',
  },
  {
    id: 'pacifico',
    nombre: 'Ruta del Pacífico',
    emoji: '🏖️',
    descripcion: 'La costa más espectacular del país de norte a sur. Avistamiento de ballenas en Sonora, Mazatlán histórico, surf en Sayulita, Puerto Vallarta y la bahía de Huatulco.',
    color: '#4B7BEC',
    colorOscuro: '#3461C8',
    estadoIds: [26, 25, 18, 15, 9, 13, 20],
    diasPorEstado: 3,
    highlights: ['Bahía de Kino (Sonora)', 'Mazatlán Pueblo Mágico', 'Sayulita y Punta Mita', 'Puerto Vallarta', 'Huatulco y Puerto Escondido'],
    mejorEpoca: 'Nov – May',
    transporte: 'Vuelos internos · auto rentado',
    presupuestoDiario: '$1,000 – $2,200 MXN',
    tags: ['Playas', 'Surf', 'Pueblos Mágicos', 'Vida marina'],
    dificultad: 'Moderada',
  },
  {
    id: 'sabor',
    nombre: 'Ruta del Sabor',
    emoji: '🍽️',
    descripcion: 'Un viaje gastronómico por las cocinas más reconocidas del mundo. Tequila artesanal, mole negro en Oaxaca, chiles en nogada en Puebla y el café de Veracruz recién tostado.',
    color: '#DD331D',
    colorOscuro: '#B82A18',
    estadoIds: [15, 16, 21, 20, 30],
    diasPorEstado: 3,
    highlights: ['Destilerías de tequila (Jalisco)', 'Pátzcuaro y la Nochebuena (Mich)', 'Chiles en nogada (Puebla)', 'Mercado 20 de Noviembre (Oax)', 'Café de altura en Coatepec (Ver)'],
    mejorEpoca: 'Sep – Nov',
    transporte: 'Autobús ETN / auto rentado',
    presupuestoDiario: '$900 – $1,600 MXN',
    tags: ['Gastronomía', 'Cultura', 'Mezcal', 'Mercados'],
    dificultad: 'Fácil',
  },
  {
    id: 'aventura',
    nombre: 'Ruta de la Aventura',
    emoji: '🏔️',
    descripcion: 'Para los que buscan adrenalina en el norte de México. Las Barrancas del Cobre en tren, el desierto de Sonora, los cañones de Coahuila y la imponente Sierra Madre.',
    color: '#8A2BE2',
    colorOscuro: '#6A1DB5',
    estadoIds: [8, 26, 6, 10, 19],
    diasPorEstado: 3,
    highlights: ['Tren Chepe (Barrancas del Cobre)', 'Cañón del Sumidero', 'Cuatro Ciénegas (Coahuila)', 'Desierto de los Leones (Dur)', 'Grutas de García (NL)'],
    mejorEpoca: 'Mar – Jun · Sep – Nov',
    transporte: 'Auto 4x4 rentado · tren Chepe',
    presupuestoDiario: '$1,100 – $2,000 MXN',
    tags: ['Aventura', 'Senderismo', 'Desierto', 'Naturaleza'],
    dificultad: 'Exigente',
  },
];
