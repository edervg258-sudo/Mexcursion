// ============================================================
// lib/rate-limiting.test.ts
// Tests for rate limiting functionality
// ============================================================

import { RateLimiter, apiRateLimiter, searchRateLimiter, checkRateLimit, throwIfRateLimited } from './rate-limiting';
import * as sentryModule from './sentry';

jest.mock('./sentry');

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('configure', () => {
    it('debería actualizar configuración', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 5, windowMs: 1000 });

      // Realizar 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed('test')).toBe(true);
      }

      // El 6to debería ser rechazado
      expect(limiter.isAllowed('test')).toBe(false);
    });
  });

  describe('isAllowed', () => {
    it('debería permitir requests dentro del límite', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 3, windowMs: 60000 });

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(true);
    });

    it('debería rechazar requests que excedan el límite', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 2, windowMs: 60000 });

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(false);
    });

    it('debería resetear contador después de que expire la ventana', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 2, windowMs: 60000 });

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(false);

      // Avanzar tiempo más allá de la ventana
      jest.advanceTimersByTime(61000);

      // Debería permitir de nuevo
      expect(limiter.isAllowed('user-1')).toBe(true);
    });

    it('debería aislar límites por identificador', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 1, windowMs: 60000 });

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-1')).toBe(false);

      expect(limiter.isAllowed('user-2')).toBe(true);
      expect(limiter.isAllowed('user-2')).toBe(false);
    });

    it('debería capturar error en Sentry cuando se excede límite', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 1, windowMs: 60000 });

      limiter.isAllowed('user-1');
      limiter.isAllowed('user-1'); // Debería exceder

      expect(sentryModule.captureApiError).toHaveBeenCalled();
    });
  });

  describe('getRemainingRequests', () => {
    it('debería retornar cantidad de requests restantes', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 5, windowMs: 60000 });

      expect(limiter.getRemainingRequests('user-1')).toBe(5);
      limiter.isAllowed('user-1');
      expect(limiter.getRemainingRequests('user-1')).toBe(4);
      limiter.isAllowed('user-1');
      expect(limiter.getRemainingRequests('user-1')).toBe(3);
    });

    it('debería retornar máximo cuando ventana expiró', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 3, windowMs: 60000 });

      limiter.isAllowed('user-1');
      limiter.isAllowed('user-1');

      jest.advanceTimersByTime(61000);

      expect(limiter.getRemainingRequests('user-1')).toBe(3);
    });
  });

  describe('getResetTime', () => {
    it('debería retornar tiempo de reset', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 1, windowMs: 60000 });

      const before = Date.now();
      limiter.isAllowed('user-1');
      const resetTime = limiter.getResetTime('user-1');

      expect(resetTime).toBeGreaterThanOrEqual(before + 60000);
    });
  });

  describe('reset', () => {
    it('debería limpiar record de usuario', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 1, windowMs: 60000 });

      limiter.isAllowed('user-1');
      expect(limiter.isAllowed('user-1')).toBe(false);

      limiter.reset('user-1');

      expect(limiter.isAllowed('user-1')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('debería limpiar todos los records', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 1, windowMs: 60000 });

      limiter.isAllowed('user-1');
      limiter.isAllowed('user-2');

      limiter.clearAll();

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-2')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('debería retornar estadísticas de límite', () => {
      const limiter = new RateLimiter();
      limiter.configure({ maxRequests: 5, windowMs: 60000 });

      limiter.isAllowed('user-1');
      limiter.isAllowed('user-1');

      const stats = limiter.getStats('user-1');

      expect(stats).toBeDefined();
      expect(stats?.count).toBe(2);
      expect(stats?.resetTime).toBeGreaterThan(Date.now());
      expect(stats?.timeRemaining).toBeGreaterThan(0);
    });

    it('debería retornar null si usuario no existe', () => {
      const limiter = new RateLimiter();
      const stats = limiter.getStats('unknown-user');
      expect(stats).toBeNull();
    });
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería retornar información completa de límite', () => {
    const limiter = new RateLimiter();
    limiter.configure({ maxRequests: 3, windowMs: 60000 });

    const result = checkRateLimit(limiter, 'user-1');

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('resetTime');
    expect(result.allowed).toBe(true);
  });
});

describe('throwIfRateLimited', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('no debería lanzar error si permitido', () => {
    const limiter = new RateLimiter();
    limiter.configure({ maxRequests: 2, windowMs: 60000 });

    expect(() => throwIfRateLimited(limiter, 'user-1')).not.toThrow();
    expect(() => throwIfRateLimited(limiter, 'user-1')).not.toThrow();
  });

  it('debería lanzar error si excedido', () => {
    const limiter = new RateLimiter();
    limiter.configure({ maxRequests: 1, windowMs: 60000 });

    throwIfRateLimited(limiter, 'user-1');

    expect(() => throwIfRateLimited(limiter, 'user-1')).toThrow('Rate limit exceeded');
  });
});

describe('API-specific limiters', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('apiRateLimiter debería permitir 100 requests por minuto', () => {
    for (let i = 0; i < 100; i++) {
      expect(apiRateLimiter.isAllowed('test')).toBe(true);
    }
    expect(apiRateLimiter.isAllowed('test')).toBe(false);
  });

  it('searchRateLimiter debería permitir 20 búsquedas por 10 segundos', () => {
    for (let i = 0; i < 20; i++) {
      expect(searchRateLimiter.isAllowed('test')).toBe(true);
    }
    expect(searchRateLimiter.isAllowed('test')).toBe(false);
  });
});
