// ============================================================
// lib/rate-limiting.ts — Protección contra spam
// ============================================================

import { captureApiError } from './sentry';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static store = new Map<string, RateLimitStore>();
  private static config: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    keyPrefix: 'ratelimit_',
  };

  static configure(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  static isAllowed(identifier: string): boolean {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();

    const record = this.store.get(key);

    if (!record) {
      this.store.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return true;
    }

    if (now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return true;
    }

    if (record.count >= this.config.maxRequests) {
      captureApiError({
        feature: 'rate_limiting',
        action: 'rate_limit_exceeded',
        error: new Error(`Rate limit exceeded for ${identifier}`),
        metadata: { identifier, count: record.count, limit: this.config.maxRequests },
      });
      return false;
    }

    record.count++;
    return true;
  }

  static getRemainingRequests(identifier: string): number {
    const key = `${this.config.keyPrefix}${identifier}`;
    const record = this.store.get(key);

    if (!record || Date.now() > record.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - record.count);
  }

  static getResetTime(identifier: string): number {
    const key = `${this.config.keyPrefix}${identifier}`;
    const record = this.store.get(key);

    if (!record || Date.now() > record.resetTime) {
      return Date.now();
    }

    return record.resetTime;
  }

  static reset(identifier: string): void {
    const key = `${this.config.keyPrefix}${identifier}`;
    this.store.delete(key);
  }

  static clearAll(): void {
    this.store.clear();
  }

  static getStats(identifier: string): { count: number; resetTime: number; timeRemaining: number } | null {
    const key = `${this.config.keyPrefix}${identifier}`;
    const record = this.store.get(key);

    if (!record) return null;

    return {
      count: record.count,
      resetTime: record.resetTime,
      timeRemaining: Math.max(0, record.resetTime - Date.now()),
    };
  }
}

// Rate limiters específicos para diferentes operaciones
export const apiRateLimiter = new RateLimiter();
apiRateLimiter.configure({
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests por minuto
  keyPrefix: 'api_',
});

export const searchRateLimiter = new RateLimiter();
searchRateLimiter.configure({
  maxRequests: 20,
  windowMs: 10 * 1000, // 20 búsquedas por 10 segundos
  keyPrefix: 'search_',
});

export const uploadRateLimiter = new RateLimiter();
uploadRateLimiter.configure({
  maxRequests: 5,
  windowMs: 60 * 1000, // 5 uploads por minuto
  keyPrefix: 'upload_',
});

export const authRateLimiter = new RateLimiter();
authRateLimiter.configure({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 5 intentos por 15 minutos
  keyPrefix: 'auth_',
});

// Funciones de utilidad
export function checkRateLimit(limiter: RateLimiter, identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const allowed = limiter.isAllowed(identifier);
  const remaining = limiter.getRemainingRequests(identifier);
  const resetTime = limiter.getResetTime(identifier);

  return { allowed, remaining, resetTime };
}

export function throwIfRateLimited(limiter: RateLimiter, identifier: string): void {
  if (!limiter.isAllowed(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${waitSeconds} seconds.`);
  }
}
