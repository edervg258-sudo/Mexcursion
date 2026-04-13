// ============================================================
//  lib/tipos/index.ts  —  Definiciones de tipos TypeScript
// ============================================================

// ===========================
//  TIPOS PRINCIPALES
// ===========================

export type CategoriaEstado = 'Aventura' | 'Playa' | 'Cultura' | 'Gastronomía' | 'Ciudad';
export type Nivel = 'economico' | 'medio' | 'premium';

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  economico: 'Económico',
  medio: 'Medio',
  premium: 'Premium'
};

export const CATEGORIAS: CategoriaEstado[] = [
  'Aventura',
  'Playa',
  'Cultura',
  'Gastronomía',
  'Ciudad'
];

export const COLORES_NIVEL: Record<Nivel, string> = {
  economico: '#3AB7A5',
  medio: '#e9c46a',
  premium: '#DD331D'
};

// ===========================
//  INTERFACES
// ===========================

export interface Sugerencia {
  id: string;
  titulo: string;
  estado: string;
  hotel: string;
  precioHotel: string;
  estilo: string;
  restaurante: string;
  precioRestaurante: string;
  nivel: Nivel;
  imagen: string;
  activo?: number;
}

export interface Estado {
  id: number;
  nombre: string;
  categoria: CategoriaEstado;
  descripcion: string;
  imagen: any;
  precio: number;
  latitude: number;
  longitude: number;
}

export interface Pestana {
  iconoGris: any;
  iconoRojo: any;
  etiqueta: string;
  ruta: string;
}

// ===========================
//  TIPOS AUXILIARES
// ===========================

// Tipo auxiliar para campos de contenido bilingüe
export type L = { es: string; en: string };
export type LA = { es: string[]; en: string[] };

export interface Paquete {
  nivel: Nivel;
  color: string;
  emoji: string;
  precioTotal: string;
  hotel: string;
  estrellas: number;
  precioHotel: string;
  descripcionHotel: L;
  incluye: LA;
  restaurante: string;
  tipoCocina: L;
  precioRestaurante: string;
  platillo: L;
  transporte: L;
  precioTransporte: string;
  actividades: LA;
  diasRecomendados: number;
  imagenesHotel: string[];
}