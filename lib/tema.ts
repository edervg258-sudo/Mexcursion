import { Platform } from 'react-native';

export const Tema = {
  fondo: '#FAF7F0',
  superficie: '#FFFCF8',
  superficieBlanca: '#FFFFFF',
  inputFondo: '#F5F3EF',

  primario: '#3AB7A5',
  primarioSuave: '#E8F5F2',
  primarioOscuro: '#2E9A8A',

  acento: '#DD331D',
  acentoOscuro: '#B82A18',

  texto: '#1C1C1C',
  textoSecundario: '#5A5A5A',
  textoMuted: '#8E8E8E',

  borde: '#E8E2D9',
  bordeInput: '#B8DFD6',

  error: '#C42D1A',
  mapaOverlay: 0.11,
} as const;


// Tarjetas
export const sombraTarjeta = {
  boxShadow: "0px 4px 12px rgba(26,61,56,0.10)",
  ...(Platform.OS === 'android' ? { elevation: 4 } : {})
};


// Barra inferior
export const sombraBarraInferior = {
  boxShadow: "0px -3px 10px rgba(0,0,0,0.07)",
  ...(Platform.OS === 'android' ? { elevation: 12 } : {})
};


// Botón primario
export const sombraBotonPrimario = {
  boxShadow: `0px 4px 8px rgba(46,154,138,0.30)`,
  ...(Platform.OS === 'android' ? { elevation: 5 } : {})
};


// Textos auth
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