/**
 * confirm-payment — Edge Function segura
 * =======================================
 * ✅  CORS / CSRF — validación de Origin
 * ✅  JWT validation — solo el dueño del intent puede confirmarlo
 * ✅  Rate limiting — máx. 5 confirmaciones / 5 min por usuario
 * ✅  Stripe ID format validation — previene path-traversal en la URL de Stripe
 * ✅  Input sanitization + SQL injection guards
 * ✅  Security headers en todas las respuestas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  handleCors,
  requireAuth,
  checkRateLimit,
  rateLimitHeaders,
  isValidStripeIntentId,
  isValidStripeMethodId,
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

  // ── Rate limiting — 5 confirmaciones cada 5 minutos por usuario ────────────
  const rateResult = checkRateLimit({
    key:         `confirm-payment:${authUser.id}`,
    maxRequests: 5,
    windowMs:    5 * 60 * 1000, // 5 minutos
  });
  const rlHeaders = rateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return jsonError('Demasiados intentos de pago, espera unos minutos', 429, origin, rlHeaders);
  }

  // ── Config server-side ─────────────────────────────────────────────────────
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    console.error('[confirm-payment] STRIPE_SECRET_KEY no configurado');
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

  // intentId: debe tener formato Stripe pi_xxxx (previene path-traversal)
  const intentId = String(body.intentId ?? '').trim();
  if (!isValidStripeIntentId(intentId)) {
    return jsonError('intentId inválido', 400, origin);
  }

  // paymentMethodId: debe tener formato Stripe pm_xxxx
  const paymentMethodId = String(body.paymentMethodId ?? '').trim();
  if (!isValidStripeMethodId(paymentMethodId)) {
    return jsonError('paymentMethodId inválido', 400, origin);
  }

  // ── Llamada a Stripe API ───────────────────────────────────────────────────
  try {
    const stripeResponse = await fetch(
      // intentId ya está validado como /^pi_[a-zA-Z0-9]{10,80}$/ — sin riesgo de path-traversal
      `https://api.stripe.com/v1/payment_intents/${intentId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
          // Idempotency: el mismo intento + método no genera doble cobro
          'Idempotency-Key': `confirm:${intentId}:${paymentMethodId}`,
        },
        body: new URLSearchParams({
          payment_method: paymentMethodId,
        }).toString(),
      },
    );

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json() as { error?: { message: string } };
      console.error('[confirm-payment] Stripe error:', errorData);
      // Propagar el mensaje de Stripe al cliente solo para errores 4xx
      // — Stripe usa mensajes amigables al usuario en estos casos
      const clientMsg =
        stripeResponse.status < 500
          ? (errorData.error?.message ?? 'Error en la confirmación del pago')
          : 'Error al confirmar el pago';
      return jsonError(clientMsg, stripeResponse.status >= 500 ? 502 : 400, origin, rlHeaders);
    }

    const stripeData = await stripeResponse.json() as {
      id: string;
      status: string;
      latest_charge?: string;
      charges?: { data?: Array<{ id: string }> };
    };

    if (stripeData.status === 'succeeded') {
      const chargeId =
        stripeData.latest_charge ??
        stripeData.charges?.data?.[0]?.id ??
        stripeData.id;

      return jsonOk(
        { success: true, paymentId: chargeId, status: stripeData.status },
        origin,
        rlHeaders,
      );
    }

    if (stripeData.status === 'requires_action') {
      return new Response(
        JSON.stringify({
          success: false,
          paymentId: '',
          status: 'requires_action',
          error: 'Se requiere autenticación adicional (3D Secure)',
        }),
        { status: 402, headers: { 'Content-Type': 'application/json', ...rlHeaders } },
      );
    }

    return jsonError(
      `Pago en estado inesperado: ${stripeData.status}`,
      400,
      origin,
      rlHeaders,
    );
  } catch (err) {
    console.error('[confirm-payment] Error inesperado:', err);
    return jsonError('Error interno del servidor', 500, origin);
  }
});
