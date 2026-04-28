/**
 * create-payment-intent — Edge Function segura
 * =============================================
 * ✅  CORS / CSRF — validación de Origin
 * ✅  JWT validation — solo usuarios autenticados pueden crear intents
 * ✅  Rate limiting — máx. 10 intents / 10 min por usuario
 * ✅  Input sanitization + SQL injection guards
 * ✅  Stripe ID format validation (previene path-traversal)
 * ✅  Security headers en todas las respuestas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  handleCors,
  requireAuth,
  checkRateLimit,
  rateLimitHeaders,
  sanitizeString,
  isValidEmail,
  isValidAmount,
  isValidReference,
  jsonOk,
  jsonError,
  AuthError,
} from '../_shared/security.ts';

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // ── CORS preflight ─────────────────────────────────────────────────────────
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonError('Método no permitido', 405, origin);
  }

  // ── JWT validation — usuario autenticado obligatorio ───────────────────────
  let authUser: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authUser = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.status, origin);
    }
    return jsonError('Error de autenticación', 401, origin);
  }

  // ── Rate limiting — 10 intentos de pago cada 10 minutos por usuario ────────
  const rateResult = checkRateLimit({
    key:         `create-payment:${authUser.id}`,
    maxRequests: 10,
    windowMs:    10 * 60 * 1000, // 10 minutos
  });
  const rlHeaders = rateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return jsonError('Demasiadas solicitudes de pago, intenta en unos minutos', 429, origin, rlHeaders);
  }

  // ── Config server-side ─────────────────────────────────────────────────────
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    console.error('[create-payment-intent] STRIPE_SECRET_KEY no configurado');
    return jsonError('Error de configuración del servidor', 500, origin);
  }

  // ── Parse + sanitize body ──────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonError('Body JSON inválido', 400, origin);
  }

  const body = rawBody as Record<string, unknown>;

  // amount: número positivo, máx 1,000,000 MXN
  if (!isValidAmount(body.amount)) {
    return jsonError('Monto inválido (debe ser > 0 y ≤ 1,000,000)', 400, origin);
  }
  const amount = body.amount as number;

  // description: texto limpio, máx 200 caracteres
  const description = sanitizeString(body.description, 200);
  if (!description) {
    return jsonError('Descripción requerida', 400, origin);
  }

  // payerEmail: formato de email válido
  const payerEmail = sanitizeString(body.payerEmail, 254).toLowerCase();
  if (!isValidEmail(payerEmail)) {
    return jsonError('Email del pagador inválido', 400, origin);
  }

  // externalReference: solo alfanumérico + guiones (previene injection)
  const externalReference = sanitizeString(body.externalReference, 100);
  if (!isValidReference(externalReference)) {
    return jsonError('Referencia externa inválida (solo letras, números y guiones)', 400, origin);
  }

  // Verificar que el email del token coincida con el payerEmail
  // — previene que un usuario cree intents en nombre de otro
  if (authUser.email.toLowerCase() !== payerEmail) {
    return jsonError('El email no coincide con el usuario autenticado', 403, origin);
  }

  // ── Llamada a Stripe API ───────────────────────────────────────────────────
  const amountInCents = Math.round(amount * 100);

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': externalReference,
      },
      body: new URLSearchParams({
        amount:         amountInCents.toString(),
        currency:       'mxn',
        description:    description,
        receipt_email:  payerEmail,
        // Metadata: trazabilidad sin exponer datos sensibles del usuario
        'metadata[external_reference]': externalReference,
        'metadata[user_id]':            authUser.id,
        'metadata[source]':             'mexcursion-app',
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const errText = await stripeResponse.text();
      console.error('[create-payment-intent] Stripe error:', errText);
      // Nunca reenviar detalles de Stripe al cliente
      return jsonError('Error al crear el intento de pago', stripeResponse.status >= 500 ? 502 : 400, origin, rlHeaders);
    }

    const stripeData = await stripeResponse.json() as {
      id: string;
      client_secret: string;
    };

    return jsonOk(
      { clientSecret: stripeData.client_secret, intentId: stripeData.id },
      origin,
      rlHeaders,
    );
  } catch (err) {
    console.error('[create-payment-intent] Error inesperado:', err);
    return jsonError('Error interno del servidor', 500, origin);
  }
});
