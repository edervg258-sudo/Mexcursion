// ============================================================
// lib/search-service.ts — Búsqueda y filtrado avanzado
// ============================================================

import { supabase } from './supabase';
import { searchRateLimiter } from './rate-limiting';
import { addBreadcrumb, captureApiError } from './sentry';
import { Estado, Sugerencia } from './tipos';

export interface SearchFilters {
  query?: string;
  categoria?: string;
  precioMin?: number;
  precioMax?: number;
  rating?: number;
  estado?: string;
  sortBy?: 'precio' | 'rating' | 'fecha' | 'nombre';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DateRangeFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export class SearchService {
  static async buscarDestinos(filters: SearchFilters): Promise<Estado[]> {
    try {
      // Rate limiting
      const userId = 'anonymous';
      if (!searchRateLimiter.isAllowed(userId)) {
        throw new Error('Demasiadas búsquedas. Intenta de nuevo en unos momentos.');
      }

      const { query, categoria, precioMin, precioMax, sortBy, sortOrder, limit = 20, offset = 0 } = filters;

      let q = supabase.from('estados').select('*');

      // Aplicar filtros
      if (query) {
        q = q.or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%`);
      }

      if (categoria) {
        q = q.eq('categoria', categoria);
      }

      if (precioMin !== undefined) {
        q = q.gte('precio', precioMin);
      }

      if (precioMax !== undefined) {
        q = q.lte('precio', precioMax);
      }

      // Sorting
      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      // Paginación
      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) {
        captureApiError({
          feature: 'search_service',
          action: 'buscar_destinos',
          error,
          metadata: { filters },
        });
        throw error;
      }

      addBreadcrumb({
        category: 'search',
        message: 'destinos_searched',
        data: { query, categoria, results: data?.length },
      });

      return (data as Estado[]) || [];
    } catch (error) {
      console.error('Error buscando destinos:', error);
      throw error;
    }
  }

  static async buscarResenas(destino: string, filters?: SearchFilters): Promise<any[]> {
    try {
      const { rating, sortBy, sortOrder, limit = 10, offset = 0 } = filters || {};

      let q = supabase
        .from('resenas')
        .select('*')
        .eq('destino', destino);

      if (rating) {
        q = q.gte('calificacion', rating);
      }

      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error buscando reseñas:', error);
      throw error;
    }
  }

  static async buscarReservasPorFecha(usuarioId: string, range: DateRangeFilter, filters?: SearchFilters): Promise<any[]> {
    try {
      const { startDate, endDate } = range;
      const { sortBy, sortOrder, limit = 20, offset = 0 } = filters || {};

      let q = supabase.from('reservas').select('*').eq('usuario_id', usuarioId);

      // Filtro por rango de fechas
      if (startDate) {
        q = q.gte('fecha_inicio', startDate);
      }

      if (endDate) {
        q = q.lte('fecha_fin', endDate);
      }

      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) throw error;

      addBreadcrumb({
        category: 'search',
        message: 'reservas_filtered_by_date',
        data: { usuarioId, startDate, endDate, results: data?.length },
      });

      return data || [];
    } catch (error) {
      console.error('Error buscando reservas por fecha:', error);
      throw error;
    }
  }

  static async filtrarPorEstado(estado: string, filters?: SearchFilters): Promise<Estado[]> {
    try {
      const { sortBy, sortOrder, limit = 20, offset = 0 } = filters || {};

      let q = supabase.from('estados').select('*').eq('id', estado);

      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) throw error;

      return data as Estado[] || [];
    } catch (error) {
      console.error('Error filtrando por estado:', error);
      throw error;
    }
  }

  static async filtrarPorCategoria(categoria: string, filters?: SearchFilters): Promise<Estado[]> {
    try {
      const { sortBy, sortOrder, limit = 20, offset = 0 } = filters || {};

      let q = supabase.from('estados').select('*').eq('categoria', categoria);

      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) throw error;

      return data as Estado[] || [];
    } catch (error) {
      console.error('Error filtrando por categoría:', error);
      throw error;
    }
  }

  static async filtrarPorRangoPrecio(min: number, max: number, filters?: SearchFilters): Promise<Estado[]> {
    try {
      const { sortBy, sortOrder, limit = 20, offset = 0 } = filters || {};

      let q = supabase
        .from('estados')
        .select('*')
        .gte('precio', min)
        .lte('precio', max);

      const sortField = this.mapSortField(sortBy);
      const sortDir = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      q = q.order(sortField, sortDir);

      const { data, error } = await q.range(offset, offset + limit - 1);

      if (error) throw error;

      return data as Estado[] || [];
    } catch (error) {
      console.error('Error filtrando por rango de precio:', error);
      throw error;
    }
  }

  static async buscarSugerencias(query: string): Promise<Sugerencia[]> {
    try {
      const { data, error } = await supabase
        .from('sugerencias')
        .select('*')
        .or(`titulo.ilike.%${query}%,descripcion.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      return data as Sugerencia[] || [];
    } catch (error) {
      console.error('Error buscando sugerencias:', error);
      throw error;
    }
  }

  // Helpers privados
  private static mapSortField(sortBy?: string): string {
    switch (sortBy) {
      case 'precio':
        return 'precio';
      case 'rating':
        return 'rating';
      case 'fecha':
        return 'created_at';
      case 'nombre':
        return 'nombre';
      default:
        return 'created_at';
    }
  }
}

// Funciones de utilidad para componentes
export async function buscarDestinos(query: string): Promise<Estado[]> {
  return SearchService.buscarDestinos({ query });
}

export async function filtrarPorPrecio(min: number, max: number): Promise<Estado[]> {
  return SearchService.filtrarPorRangoPrecio(min, max);
}

export async function filtrarPorCategoria(categoria: string): Promise<Estado[]> {
  return SearchService.filtrarPorCategoria(categoria);
}

export async function buscarReservasPorFecha(usuarioId: string, startDate?: string, endDate?: string): Promise<any[]> {
  return SearchService.buscarReservasPorFecha(usuarioId, { startDate, endDate });
}

export async function sortarDestinos(
  destinos: Estado[],
  sortBy: 'precio' | 'rating' | 'fecha' | 'nombre',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<Estado[]> {
  const sorted = [...destinos];

  sorted.sort((a, b) => {
    let aVal: any = a[sortBy as keyof Estado];
    let bVal: any = b[sortBy as keyof Estado];

    if (aVal === undefined || aVal === null) aVal = 0;
    if (bVal === undefined || bVal === null) bVal = 0;

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return sorted;
}
