// ============================================================
//  lib/constantes/navegacion.ts  —  Configuración de navegación
// ============================================================

import type { Pestana } from '../tipos';

// ===========================
//  PESTAÑAS PRINCIPALES
// ===========================

export const PESTANAS: Pestana[] = [
  {
    iconoGris: require('../../assets/images/inicio_gris.png'),
    iconoRojo: require('../../assets/images/inicio_rojo.png'),
    etiqueta: 'Inicio',
    ruta: '/(tabs)/menu'
  },
  {
    iconoGris: require('../../assets/images/favoritos_gris.png'),
    iconoRojo: require('../../assets/images/favoritos_rojo.png'),
    etiqueta: 'Favoritos',
    ruta: '/(tabs)/favoritos'
  },
  {
    iconoGris: require('../../assets/images/rutas_gris.png'),
    iconoRojo: require('../../assets/images/rutas_rojo.png'),
    etiqueta: 'Rutas',
    ruta: '/(tabs)/rutas'
  },
  {
    iconoGris: require('../../assets/images/perfil_gris.png'),
    iconoRojo: require('../../assets/images/perfil_rojo.png'),
    etiqueta: 'Perfil',
    ruta: '/(tabs)/perfil'
  },
];

// ===========================
//  RUTAS DE LA APLICACIÓN
// ===========================

export const RUTAS_APP = {
  PERFIL: '/(tabs)/perfil',
  NOTIFICACIONES: '/(tabs)/notificaciones',
  MIS_RESERVAS: '/(tabs)/mis_reservas',
  HISTORIAL: '/(tabs)/historial',
  ADMIN: '/(tabs)/admin',
} as const;
