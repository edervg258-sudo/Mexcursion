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
export const TemaOscuro = {
  // Fondos
  fondo:            '#0F1117',
  superficie:       '#1C1F2A',
  superficieBlanca: '#252836',
  inputFondo:       '#1A1D28',

  // Acción primaria — usar en superficies PEQUEÑAS
  primario:         '#3AB7A5',
  primarioSuave:    '#1A3D3A',  // hover/pressed en oscuro
  primarioChip:     '#1E3D38',  // fondo chip activo en oscuro
  primarioOscuro:   '#2E9A8A',

  // Acento — solo CTA principal y estados críticos
  // En oscuro este rojo resulta agresivo: restringir a UN elemento por pantalla.
  acento:           '#DD331D',
  acentoOscuro:     '#B82A18',
  acentoMuted:      '#A82515',  // señales de peligro secundarias (badges, texto aviso)
  acentoSuave:      '#3D1A15',  // fondo chip/badge de error en oscuro

  // Texto — contraste suficiente sobre #252836 (aprox 10 % luminancia)
  texto:            '#F0F0F0',
  textoSecundario:  '#C4C4D0',  // era #B0B0B0 — +~40% de contraste en cards oscuras
  textoMuted:       '#8A8AA8',  // era #777788 — más legible en superficie oscura

  // Estructura
  // Mantener borde ≈ #2C2F3E: línea oscura sutil, sin brillos que choquen.
  // Separar visualmente con sombra, no con bordes más claros.
  borde:            '#2C2F3E',
  bordeInput:       '#2A4A47',  // foco sobre inputs (teal oscuro)
  separador:        '#21243A',  // divisor entre ítems — apenas más claro que fondo

  // Estado
  error:            '#FF5252',

  // Overlay de imagen de fondo del mapa
  mapaOverlay:      0.05,
} as const;


// ─── Sombras ─────────────────────────────────────────────────────────────────

/** Sombra de tarjeta — modo claro */
export const sombraTarjeta = {
  boxShadow: '0px 2px 10px rgba(26,61,56,0.12)',
  ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
};

/**
 * Sombra de tarjeta — modo oscuro.
 * Usa opacidad alta para que se perciba sobre fondos muy oscuros.
 * Incluye un borde interior sutilísimo (1 px semi-transparente blanco)
 * para dar profundidad sin línea de borde dura.
 */
export const sombraTarjetaOscura = {
  boxShadow: '0px 2px 12px rgba(0,0,0,0.45), 0px 0px 0px 1px rgba(255,255,255,0.04)',
  ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
};

/** Barra inferior — modo claro */
export const sombraBarraInferior = {
  boxShadow: '0px -2px 10px rgba(0,0,0,0.07)',
  ...(Platform.OS === 'android' ? { elevation: 12 } : {}),
};

/** Barra inferior — modo oscuro */
export const sombraBarraInferiorOscura = {
  boxShadow: '0px -1px 0px rgba(255,255,255,0.05), 0px -4px 16px rgba(0,0,0,0.50)',
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
