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
  // Tabs principales
  MENU: '/(tabs)/menu',
  FAVORITOS: '/(tabs)/favoritos',
  RUTAS: '/(tabs)/rutas',
  PERFIL: '/(tabs)/perfil',

  // Detalles y búsqueda
  DETALLE_ESTADO: '/detalle-estado',
  BUSQUEDA: '/busqueda',
  RESULTADOS: '/resultados',
  FILTROS: '/filtros',
  MAPA: '/mapa',

  // Reservas (flujo completo)
  RESERVA_PASO_1: '/reserva/paso1',
  RESERVA_PASO_2: '/reserva/paso2',
  RESERVA_PASO_3: '/reserva/paso3',
  RESERVA_PASO_4: '/reserva/paso4',
  RESERVA_CONFIRMACION: '/reserva/confirmacion',

  // Perfil y gestión de usuario
  EDITAR_PERFIL: '/perfil/editar',
  HISTORIAL_RESERVAS: '/perfil/historial',
  DETALLE_RESERVA: '/perfil/reserva',
  METODOS_PAGO: '/perfil/pagos',
  AGREGAR_TARJETA: '/perfil/agregar-tarjeta',
  NOTIFICACIONES: '/perfil/notificaciones',
  CONFIGURACION: '/perfil/configuracion',
  AYUDA: '/perfil/ayuda',
  TERMINOS: '/perfil/terminos',
  PRIVACIDAD: '/perfil/privacidad',

  // Autenticación
  LOGIN: '/auth/login',
  REGISTRO: '/auth/registro',
  RECUPERAR_PASSWORD: '/auth/recuperar',
  VERIFICAR_CODIGO: '/auth/verificar',
  CAMBIAR_PASSWORD: '/auth/cambiar-password',

  // Admin
  ADMIN_PANEL: '/admin/panel',
  ADMIN_ESTADOS: '/admin/estados',
  ADMIN_RESERVAS: '/admin/reservas',
  ADMIN_USUARIOS: '/admin/usuarios',
  ADMIN_ESTADISTICAS: '/admin/estadisticas',
  ADMIN_CONFIGURACION: '/admin/configuracion',
} as const;