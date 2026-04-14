import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
//  GUÍA DE USO DE COLORES
//
//  primario  (#3AB7A5) → superficies PEQUEÑAS: chips activos, switches,
//                         bordes de foco, indicadores de progreso.
//                         NO usar como fondo de tarjetas ni headers grandes.
//
//  acento    (#DD331D) → CTA principal (botón "Reservar") y estados críticos
//                         (errores, alertas destructivas).
//                         En oscuro es visualmente agresivo: reservarlo solo
//                         para un elemento por pantalla.
//
//  acentoMuted          → rojo atenuado para señales de peligro secundarias
//                         en modo oscuro (badges, textos de advertencia).
//                         NO usar para CTAs.
//
//  primarioChip         → fondo del chip/badge activo.  Siempre usar en
//                         conjunción con texto en `primario` o `primarioOscuro`.
//
//  separador            → línea divisoria sutil entre ítems de lista.
//                         Más ligero que `borde` para no saturar la vista.
// ─────────────────────────────────────────────────────────────────────────────

export const Tema = {
  // Fondos
  fondo:            '#FAF7F0',
  superficie:       '#FFFCF8',
  superficieBlanca: '#FFFFFF',
  inputFondo:       '#F5F3EF',

  // Acción primaria — usar en superficies PEQUEÑAS (chips, foco, switch)
  primario:         '#3AB7A5',
  primarioSuave:    '#E8F5F2',  // hover/pressed en luz
  primarioChip:     '#D6F0EC',  // fondo chip activo (más saturado que primarioSuave)
  primarioOscuro:   '#2E9A8A',  // pressed / texto sobre fondo claro primario

  // Acento — solo CTA principal y estados críticos
  acento:           '#DD331D',
  acentoOscuro:     '#B82A18',  // hover/pressed del botón CTA
  acentoSuave:      '#FDE8E5',  // fondo badge de error/warning en modo claro

  // Texto
  texto:            '#1C1C1C',
  textoSecundario:  '#5A5A5A',  // subtítulos, metadatos
  textoMuted:       '#8E8E8E',  // placeholders, timestamps, labels opcionales

  // Estructura
  borde:            '#E8E2D9',
  bordeInput:       '#B8DFD6',  // foco sobre inputs
  separador:        '#EEE9E0',  // línea divisoria entre ítems (más suave que borde)

  // Estado
  error:            '#C42D1A',

  // Overlay de imagen de fondo del mapa
  mapaOverlay:      0.11,
} as const;


// ─── Tema oscuro ─────────────────────────────────────────────────────────────
//
//  Concepto: noche sobre México. Fondos con matiz teal muy sutil (~5 %
//  saturación) para que el primario teal se sienta nativo al tema en vez
//  de flotar sobre un gris frío genérico. Contraste WCAG AA en texto principal.
//
export const TemaOscuro = {
  // Fondos — base oscura con matiz teal sutil
  fondo:            '#0D1412',  // casi negro, leve toque teal
  superficie:       '#152120',  // superficie principal — teal muy oscuro
  superficieBlanca: '#1E2E2C',  // superficie elevada (cards, modales)
  inputFondo:       '#121D1B',  // entre fondo y superficie

  // Acción primaria — mismo teal de marca
  primario:         '#3AB7A5',
  primarioSuave:    '#153330',  // hover/pressed en oscuro
  primarioChip:     '#1A3C38',  // fondo chip activo
  primarioOscuro:   '#2E9A8A',

  // Acento — rojo CTA, un punto más luminoso para leer bien sobre oscuro
  acento:           '#E8452E',
  acentoOscuro:     '#C43820',
  acentoMuted:      '#A82515',  // señales de peligro secundarias
  acentoSuave:      '#3D1A15',  // fondo chip/badge de error

  // Texto — con suavísimo matiz teal; evita el blanco frío puro
  texto:            '#EDF5F3',  // blanco cálido-teal, muy alta legibilidad
  textoSecundario:  '#A8C4C0',  // gris-teal para subtítulos y metadatos
  textoMuted:       '#6A908C',  // teal apagado para placeholders y timestamps

  // Estructura
  borde:            '#243835',  // borde sutil con matiz teal
  bordeInput:       '#2E5550',  // foco de input — teal medio
  separador:        '#1A2D2A',  // divisoria casi imperceptible

  // Estado
  error:            '#FF5C5C',  // rojo más brillante para visibilidad en oscuro

  // Overlay de imagen de fondo del mapa
  mapaOverlay:      0.04,
} as const;


// ─── Sombras ─────────────────────────────────────────────────────────────────

/** Sombra de tarjeta — modo claro */
export const sombraTarjeta = {
  boxShadow: '0px 2px 10px rgba(26,61,56,0.12)',
  ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
};

/**
 * Sombra de tarjeta — modo oscuro.
 * Sombra profunda + borde teal al 6 % de opacidad: da profundidad
 * y refuerza la identidad de marca sin resultar obvio.
 */
export const sombraTarjetaOscura = {
  boxShadow: '0px 2px 14px rgba(0,0,0,0.50), 0px 0px 0px 1px rgba(58,183,165,0.06)',
  ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
};

/** Barra inferior — modo claro */
export const sombraBarraInferior = {
  boxShadow: '0px -2px 10px rgba(0,0,0,0.07)',
  ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
};

/** Barra inferior — modo oscuro */
export const sombraBarraInferiorOscura = {
  boxShadow: '0px -1px 0px rgba(58,183,165,0.08), 0px -4px 20px rgba(0,0,0,0.55)',
  ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
};

/** Botón CTA primario (acento) */
export const sombraBotonPrimario = {
  boxShadow: '0px 4px 8px rgba(221,51,29,0.35)',
  ...(Platform.OS === 'android' ? { elevation: 5 } : {}),
};

/** Botón de acción teal */
export const sombraBotonTeal = {
  boxShadow: '0px 4px 8px rgba(46,154,138,0.30)',
  ...(Platform.OS === 'android' ? { elevation: 5 } : {}),
};


// ─── Textos de autenticación ──────────────────────────────────────────────────
export const tituloAuth = {
  fontSize: 26,
  fontWeight: '800' as const,
  color: Tema.texto,
  letterSpacing: -0.5,
};

export const subtituloAuth = {
  fontSize: 14,
  color: Tema.textoMuted,
  lineHeight: 20,
};
