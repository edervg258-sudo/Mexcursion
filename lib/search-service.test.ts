// ============================================================
// lib/search-service.test.ts
// Tests for search service and filtering
// ============================================================

import { SearchService, buscarDestinos, filtrarPorPrecio, buscarReservasPorFecha, sortarDestinos } from './search-service';
import * as supabaseModule from './supabase';
import * as rateLimitModule from './rate-limiting';
import * as sentryModule from './sentry';

jest.mock('./supabase');
jest.mock('./sentry');
jest.mock('./rate-limiting');

const mockSupabase = supabaseModule.supabase as jest.Mocked<typeof supabaseModule.supabase>;
const mockSearchRateLimiter = rateLimitModule.searchRateLimiter as jest.Mocked<any>;

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchRateLimiter.isAllowed.mockReturnValue(true);
  });

  describe('buscarDestinos', () => {
    it('debería buscar destinos por query', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', categoria: 'playas', precio: 5000 },
        { id: 2, nombre: 'Playa del Carmen', categoria: 'playas', precio: 4500 },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.buscarDestinos({ query: 'Cancún' });

      expect(result).toEqual(mockDestinos);
    });

    it('debería filtrar por categoría', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', categoria: 'playas', precio: 5000 },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.buscarDestinos({ categoria: 'playas' });

      expect(result).toEqual(mockDestinos);
    });

    it('debería filtrar por rango de precio', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', categoria: 'playas', precio: 5000 },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.buscarDestinos({ precioMin: 4000, precioMax: 6000 });

      expect(result).toEqual(mockDestinos);
    });

    it('debería manejar error de búsqueda', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: null, error: new Error('Query error') }),
            }),
          }),
        }),
      } as any);

      await expect(SearchService.buscarDestinos({ query: 'test' })).rejects.toThrow();
      expect(sentryModule.captureApiError).toHaveBeenCalled();
    });

    it('debería respetar rate limiting', async () => {
      mockSearchRateLimiter.isAllowed.mockReturnValue(false);

      await expect(SearchService.buscarDestinos({ query: 'test' })).rejects.toThrow('Demasiadas búsquedas');
    });
  });

  describe('buscarResenas', () => {
    it('debería buscar reseñas con filtros', async () => {
      const mockResenas = [
        { id: 1, destino: 'Cancún', calificacion: 5, comentario: 'Excelente' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({ data: mockResenas, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.buscarResenas('Cancún', { rating: 4 });

      expect(result).toEqual(mockResenas);
    });
  });

  describe('buscarReservasPorFecha', () => {
    it('debería buscar reservas en rango de fechas', async () => {
      const mockReservas = [
        { id: 1, usuario_id: 'user-1', fecha_inicio: '2026-05-01', fecha_fin: '2026-05-07' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({ data: mockReservas, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.buscarReservasPorFecha('user-1', {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });

      expect(result).toEqual(mockReservas);
    });
  });

  describe('filtrarPorEstado', () => {
    it('debería filtrar destinos por estado', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', estado: 'Quintana Roo' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.filtrarPorEstado('Quintana Roo');

      expect(result).toEqual(mockDestinos);
    });
  });

  describe('filtrarPorCategoria', () => {
    it('debería filtrar destinos por categoría', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', categoria: 'playas' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.filtrarPorCategoria('playas');

      expect(result).toEqual(mockDestinos);
    });
  });

  describe('filtrarPorRangoPrecio', () => {
    it('debería filtrar destinos por rango de precio', async () => {
      const mockDestinos = [
        { id: 1, nombre: 'Cancún', precio: 5000 },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({ data: mockDestinos, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await SearchService.filtrarPorRangoPrecio(4000, 6000);

      expect(result).toEqual(mockDestinos);
    });
  });
});

describe('Funciones de utilidad de búsqueda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sortarDestinos', () => {
    const destinos = [
      { id: 1, nombre: 'Cancún', precio: 5000, rating: 4.5, fecha: '2026-01-01' } as any,
      { id: 2, nombre: 'Playa del Carmen', precio: 4000, rating: 4.8, fecha: '2026-02-01' } as any,
      { id: 3, nombre: 'Tulum', precio: 3500, rating: 4.2, fecha: '2026-03-01' } as any,
    ];

    it('debería ordenar por precio ascendente', async () => {
      const result = await sortarDestinos(destinos, 'precio', 'asc');

      expect(result[0].precio).toBe(3500);
      expect(result[1].precio).toBe(4000);
      expect(result[2].precio).toBe(5000);
    });

    it('debería ordenar por precio descendente', async () => {
      const result = await sortarDestinos(destinos, 'precio', 'desc');

      expect(result[0].precio).toBe(5000);
      expect(result[1].precio).toBe(4000);
      expect(result[2].precio).toBe(3500);
    });

    it('debería ordenar por rating', async () => {
      const result = await sortarDestinos(destinos, 'rating', 'desc');

      expect(result[0].rating).toBe(4.8);
      expect(result[1].rating).toBe(4.5);
      expect(result[2].rating).toBe(4.2);
    });

    it('debería ordenar por nombre', async () => {
      const result = await sortarDestinos(destinos, 'nombre', 'asc');

      expect(result[0].nombre).toBe('Cancún');
      expect(result[1].nombre).toBe('Playa del Carmen');
      expect(result[2].nombre).toBe('Tulum');
    });

    it('debería manejar valores undefined', async () => {
      const destinosConUndefined = [
        { id: 1, nombre: 'Cancún', precio: 5000 } as any,
        { id: 2, nombre: 'Playa', precio: undefined } as any,
      ];

      const result = await sortarDestinos(destinosConUndefined, 'precio', 'asc');
      expect(result).toHaveLength(2);
    });
  });
});
