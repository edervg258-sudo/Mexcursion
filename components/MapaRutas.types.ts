import { Estado } from '../lib/tipos';

export interface Punto {
  lat: number;
  lon: number;
  nombre: string;
  categoria: string;
  precio: number;
  numero: number;
}

export interface MapaRutasProps {
  rutaColor: string;
  rutaNombre: string;
  estadosRuta: Estado[];
  polylineCoords: { latitude: number; longitude: number }[];
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  onToggleFav: (id: number) => void;
  onIrADetalle: (estado: Estado) => void;
}
