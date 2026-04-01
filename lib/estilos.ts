// lib/estilos.ts
import { Platform } from 'react-native';

type SombraConfig = {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetY?: number;
  elevation?: number;
};

export function sombra({
  color = '#000',
  opacity = 0.1,
  radius = 8,
  offsetY = 4,
  elevation = 4,
}: SombraConfig = {}) {

  const sombraCSS = `0px ${offsetY}px ${radius}px rgba(0,0,0,${opacity})`;

  return {
    boxShadow: sombraCSS,
    ...(Platform.OS === 'android' ? { elevation } : {}),
  };
}

// Sombras reutilizables en toda la app
export const Sombras = {
  tarjeta: sombra({
    opacity: 0.08,
    radius: 12,
    offsetY: 4,
    elevation: 8,
  }),

  boton: sombra({
    opacity: 0.3,
    radius: 8,
    offsetY: 4,
    elevation: 5,
  }),

  suave: sombra({
    opacity: 0.1,
    radius: 6,
    offsetY: 2,
    elevation: 3,
  }),

  media: sombra({
    opacity: 0.15,
    radius: 10,
    offsetY: 4,
    elevation: 6,
  }),

  fuerte: sombra({
    opacity: 0.25,
    radius: 14,
    offsetY: 6,
    elevation: 10,
  }),
};