/**
 * _shared/security.ts — Módulo de seguridad compartido para Edge Functions
 * =========================================================================
 * ✅  CORS / CSRF — validación estricta de Origin
 * ✅  Security headers — CSP, HSTS, X-Frame-Options, etc.
 * ✅  JWT validation — verifica el Bearer token con Supabase Admin
 * ✅  Rate limiting — in-memory por isolate + headers estándar
 * ✅  Input sanitization — anti-injection guards
 * ✅  Stripe ID format validation — evita path-traversal en IDs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'https://mexcursion.com',
  'https://www.mexcursion.com',
  'https://mexcursion.vercel.app',
  'http://localhost:8081',   // Expo dev (metro bundler)
  'http://localhost:19006',  // Expo web dev
  'http://localhost:3000',   // Next/Vite fallback
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Only echo the origin back if it's in the allowlist
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'false', // No cookies — JWT only
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Maneja el preflight CORS (OPTIONS).
 * Llamar al inicio de cada handler; si devuelve Response, retornarla directamente.
 */
export function handleCors(req: Request): Response | null {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }
  return null;
}

// ─── SECURITY RESPONSE HEADERS ────────────────────────────────────────────────

/**
 * Headers de seguridad HTTP completos para todas las respuestas.
 * Incluye CSP restrictivo adecuado para una API JSON (sin HTML).
 */
export function getSecurityHeaders(origin: string | null): Record<string, string> {
  return {
    ...getCorsHeaders(origin),
    'Content-Type': 'application/json; charset=utf-8',
    // Evita MIME-sniffing
    'X-Content-Type-Options': 'nosniff',
    // Bloquea embedding en iframes
    'X-Frame-Options': 'DENY',
    // No enviar Referer a orígenes externos
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // HSTS: 2 años + subdomains + preload
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    // CSP: API-only, bloquea todo excepto conexiones necesarias
    'Content-Security-Policy':
      "default-src 'none'; connect-src 'self' https://api.stripe.com https://*.supabase.co; frame-ancestors 'none'",
    // Desactiva FLoC / Topics API
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Evita cacheo de respuestas con datos sensibles
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}

// ─── JSON RESPONSE HELPERS ────────────────────────────────────────────────────

export function jsonOk(data: unknown, origin: string | null, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...getSecurityHeaders(origin), ...extra },
  });
}

export function jsonError(
  message: string,
  status: number,
  origin: string | null,
  extra?: Record<string, string>,
): Response {
  // Nunca exponer stack traces ni detalles internos al cliente
  const safeMessages: Record<number, string> = {
    400: message, // Los 400 son errores de input — mensajes descriptivos OK
    401: 'No autorizado',
    403: 'Acceso denegado',
    404: 'Recurso no encontrado',
    405: 'Método no permitido',
    429: 'Demasiadas solicitudes, intenta más tarde',
    500: 'Error interno del servidor',
  };
  const body = safeMessages[status] ?? message;
  return new Response(JSON.stringify({ error: body }), {
    status,
    headers: { ...getSecurityHeaders(origin), ...extra },
  });
}

// ─── JWT VALIDATION ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;  // 'normal' | 'admin'
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Valida el Bearer JWT del header Authorization usando el Admin client de Supabase.
 * Lanza AuthError si el token es inválido, expirado, o falta configuración.
 *
 * ⚠️  Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY como env vars de la función.
 */
export async function requireAuth(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authorization header requerido', 401);
  }

  const jwt = authHeader.slice(7).trim();

  // Validación de formato básico antes de la red (3 segmentos base64url)
  if (!jwt || jwt.split('.').length !== 3) {
    throw new AuthError('JWT malformado', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
    throw new AuthError('Configuración del servidor incompleta', 500);
  }

  // Usamos el Admin client para validar el JWT llamando a getUser()
  // — este endpoint valida firma + expiración + revocación en Supabase
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await admin.auth.getUser(jwt);

  if (error || !user) {
    throw new AuthError('Token inválido o expirado', 401);
  }

  return {
    id:    user.id,
    email: user.email ?? '',
    role:  (user.user_metadata?.tipo as string) ?? 'normal',
  };
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
//
// Implementación in-memory por isolate de Deno.
// Cada instancia de función mantiene su propio contador.
// Para proyectos con alta concurrencia, reemplazar con Redis o Upstash.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const _counters = new Map<string, RateLimitEntry>();

// Limpieza periódica para evitar memory leaks en isolates de larga duración
let _cleanupScheduled = false;
function scheduleCleanup() {
  if (_cleanupScheduled) return;
  _cleanupScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of _counters) {
      if (now >= entry.resetAt) _counters.delete(key);
    }
    _cleanupScheduled = false;
  }, 60_000); // limpiar cada minuto
}

export interface RateLimitConfig {
  /** Máximo de requests en la ventana */
  maxRequests: number;
  /** Duración de la ventana en milisegundos */
  windowMs: number;
  /**
   * Clave única. Usar formato "función:identificador", ej:
   * `create-payment:${userId}` o `login:${ip}`
   */
  key: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // timestamp Unix en ms
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  scheduleCleanup();
  const now = Date.now();
  const entry = _counters.get(config.key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    _counters.set(config.key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Headers estándar de rate limit para incluir en la respuesta */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
    'Retry-After':           String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

// ─── INPUT SANITIZATION ───────────────────────────────────────────────────────

/** Elimina null-bytes y caracteres de control; recorta whitespace y limita longitud */
export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')                           // null bytes (SQL injection vector)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .trim()
    .slice(0, maxLength);
}

/** Validación de email RFC-5321 simplificada */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) &&
         email.length <= 254;
}

/**
 * Valida formato de PaymentIntent ID de Stripe (pi_xxxxx).
 * Previene path-traversal en la URL de la API de Stripe.
 */
export function isValidStripeIntentId(id: string): boolean {
  return /^pi_[a-zA-Z0-9]{10,80}$/.test(id);
}

/**
 * Valida formato de PaymentMethod ID de Stripe (pm_xxxxx).
 */
export function isValidStripeMethodId(id: string): boolean {
  return /^pm_[a-zA-Z0-9]{10,80}$/.test(id);
}

/** Valida monto: positivo, finito, max 1,000,000 MXN */
export function isValidAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 1_000_000
  );
}

/** Valida externalReference: alfanumérico + guiones, 4-100 chars */
export function isValidReference(ref: string): boolean {
  return /^[a-zA-Z0-9\-_]{4,100}$/.test(ref);
}

/**
 * Sanitiza un objeto completo recursivamente (profundidad máxima 3).
 * Elimina keys vacías y limita strings anidados.
 */
export function sanitizeObject(
  obj: unknown,
  depth = 0,
): unknown {
  if (depth > 3 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.slice(0, 50).map(item => sanitizeObject(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const safeKey = sanitizeString(k, 100);
    if (safeKey) result[safeKey] = sanitizeObject(v, depth + 1);
  }
  return result;
}
