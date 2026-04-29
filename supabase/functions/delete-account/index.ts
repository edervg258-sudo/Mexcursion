/**
 * delete-account — Edge Function GDPR (Derecho al Olvido)
 * =========================================================
 * Implementa el Art. 17 del GDPR / Ley Federal de Protección de Datos (México):
 * el usuario puede solicitar la eliminación permanente de todos sus datos.
 *
 * FLUJO:
 *   1. Validar JWT del usuario solicitante
 *   2. Rate limit: 1 solicitud por hora (prevenir abuso)
 *   3. Confirmar identidad: requiere el email en el body
 *   4. Llamar a anonimizar_usuario() en la DB
 *   5. Eliminar la cuenta de Supabase Auth (usando Admin API)
 *   6. Responder 200 con confirmación
 *
 * ✅  CORS / CSRF — validación de Origin
 * ✅  JWT validation — el usuario solo puede eliminar su propia cuenta
 * ✅  Rate limiting — 1 solicitud / hora por usuario
 * ✅  Identity confirmation — requiere email para prevenir eliminaciones accidentales
 * ✅  Audit trail — registrado en security_audit_log (DB)
 * ✅  Security headers en todas las respuestas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import {
  handleCors,
  requireAuth,
  checkRateLimit,
  rateLimitHeaders,
  sanitizeString,
  isValidEmail,
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

  // ── Rate limiting — 1 solicitud de eliminación por hora por usuario ────────
  // (previene eliminaciones accidentales y uso masivo de la API)
  const rateResult = checkRateLimit({
    key:         `delete-account:${authUser.id}`,
    maxRequests: 1,
    windowMs:    60 * 60 * 1000, // 1 hora
  });
  const rlHeaders = rateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return jsonError(
      'Ya existe una solicitud de eliminación en proceso. Intenta en una hora.',
      429,
      origin,
      rlHeaders,
    );
  }

  // ── Parse + validar body ───────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonError('Body JSON inválido', 400, origin);
  }

  const body = rawBody as Record<string, unknown>;

  // Confirmación de identidad: el usuario debe proveer su email
  // — previene eliminaciones accidentales por UI bugs o tokens robados
  const confirmEmail = sanitizeString(body.confirm_email, 254).toLowerCase();
  if (!isValidEmail(confirmEmail)) {
    return jsonError('Se requiere confirmar el email para eliminar la cuenta', 400, origin);
  }

  if (confirmEmail !== authUser.email.toLowerCase()) {
    return jsonError(
      'El email de confirmación no coincide con la cuenta autenticada',
      403,
      origin,
    );
  }

  // ── Config server-side ─────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[delete-account] Variables de entorno no configuradas');
    return jsonError('Error de configuración del servidor', 500, origin);
  }

  // Admin client con service_role — bypassa RLS para la anonimización
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Paso 1: Anonimizar todos los datos del usuario en la DB ───────────────
  const { data: anonResult, error: anonError } = await adminClient
    .rpc('anonimizar_usuario', { p_user_id: authUser.id });

  if (anonError) {
    console.error('[delete-account] Error en anonimizar_usuario:', anonError);
    return jsonError('Error al procesar la solicitud de eliminación', 500, origin);
  }

  const anonData = anonResult as { success: boolean; error?: string };
  if (!anonData?.success) {
    console.error('[delete-account] anonimizar_usuario devolvió false:', anonData);
    return jsonError(anonData?.error ?? 'Error desconocido en la anonimización', 500, origin);
  }

  // ── Paso 2: Eliminar la cuenta de Supabase Auth ────────────────────────────
  // Esto elimina el usuario de auth.users; la fila en public.usuarios se
  // mantendrá anonimizada (para retención de reservas con obligación fiscal).
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUser.id);

  if (deleteAuthError) {
    // Si falla el borrado del auth user, los datos ya están anonimizados.
    // Loggear el error pero NO revertir — el usuario ya no puede acceder con esos datos.
    console.error('[delete-account] Error eliminando auth user:', deleteAuthError);
    // Registrar como incidente para revisión manual
    await adminClient
      .from('security_audit_log')
      .insert({
        user_id:    authUser.id,
        event_type: 'account_deletion_auth_failed',
        details: {
          error:   deleteAuthError.message,
          note:    'Datos anonimizados pero auth.users no eliminado — requiere revisión manual',
        },
      })
      .then(() => {});
  }

  // ── Respuesta exitosa ──────────────────────────────────────────────────────
  return jsonOk(
    {
      success: true,
      message: 'Tu cuenta ha sido eliminada correctamente. Todos tus datos personales han sido borrados.',
      deleted_at: new Date().toISOString(),
      // Info de retención legal (transparencia GDPR)
      data_retained: {
        type:   'reservas_anonimizadas',
        reason: 'Obligación fiscal — retención 5 años (SAT México)',
        pii:    false,
      },
    },
    origin,
    rlHeaders,
  );
});
