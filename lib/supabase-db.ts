// Facade — re-exports all public API so existing imports keep working.
// Migrate callers to lib/data/* gradually, then remove this file.

export type { Usuario, Itinerario, GuardarReservaResultado } from './data/shared';

export {
  invalidarSesionCache,
  obtenerUsuarioActivo,
  buscarUsuarioPorCorreo,
  registrarUsuario,
  iniciarSesion,
  cerrarSesion,
  haySesionActiva,
  solicitarRecuperacionContrasena,
  resetContrasena,
  actualizarPerfil,
  actualizarPreferencias,
  cambiarContrasena,
} from './data/auth';

export {
  cargarFavoritos,
  alternarFavorito,
} from './data/favoritos';

export {
  obtenerItinerarios,
  crearItinerario,
  renombrarItinerario,
  eliminarItinerario,
  alternarDestinoItinerario,
  reordenarItinerarioItems,
  duplicarItinerario,
} from './data/itinerarios';

export {
  guardarReserva,
  cargarReservas,
  cargarTodasLasReservas,
  actualizarEstadoReserva,
} from './data/reservas';

export {
  cargarResenas,
  cargarResenasPaginadas,
  cargarResumenResenas,
  guardarResena,
} from './data/resenas';

export {
  obtenerTodosLosDestinos,
  crearDestino,
  actualizarDestino,
  toggleActivoDestinoAdmin,
  eliminarDestino,
  obtenerRutasSugeridas,
  crearRutaSugerida,
  actualizarRutaSugerida,
  eliminarRutaSugerida,
  toggleActivoRutaSugerida,
  cargarTodosLosUsuarios,
  cambiarTipoUsuario,
  toggleActivoUsuarioAdmin,
} from './data/admin';

export {
  crearNotificacion,
  cargarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from './data/notificaciones';

export {
  agregarHistorial,
  cargarHistorial,
} from './data/historial';
