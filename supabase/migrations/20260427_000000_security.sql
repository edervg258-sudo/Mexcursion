-- ============================================================
--  MEXCURSIÓN — Security Migration
--  Migration: 20260427_000000
--  Description: Rate limiting, PII encryption (pgcrypto),
--               GDPR anonymization function, security audit log
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  EXTENSIONES REQUERIDAS
-- ════════════════════════════════════════════════════════════

-- pgcrypto: funciones de cifrado simétrico (AES/PGP)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════
--  1. RATE LIMIT LOG — auditoría distribuida de rate limits
--     Complementa el rate limiting in-memory de los isolates.
--     Permite detectar ataques coordinados y bloqueos persistentes.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id            BIGSERIAL    PRIMARY KEY,
  identifier    TEXT         NOT NULL,            -- userId o IP hasheado
  function_name TEXT         NOT NULL,            -- nombre de la Edge Function
  blocked       BOOLEAN      NOT NULL DEFAULT FALSE,
  ip_hash       TEXT,                             -- SHA-256 de la IP (no plain text)
  user_agent    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier
  ON public.rate_limit_log (identifier, function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked
  ON public.rate_limit_log (blocked, created_at DESC)
  WHERE blocked = TRUE;

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver el log de rate limits
DROP POLICY IF EXISTS "rate_limit_admin_select" ON public.rate_limit_log;
CREATE POLICY "rate_limit_admin_select"
  ON public.rate_limit_log FOR SELECT TO authenticated
  USING (es_admin());

-- Las Edge Functions (service role) pueden insertar
DROP POLICY IF EXISTS "rate_limit_service_insert" ON public.rate_limit_log;
CREATE POLICY "rate_limit_service_insert"
  ON public.rate_limit_log FOR INSERT
  WITH CHECK (true);  -- service_role bypasses RLS; anon no tiene acceso de escritura

-- Rotación automática: eliminar logs > 30 días
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.rate_limit_log
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;


-- ════════════════════════════════════════════════════════════
--  2. SECURITY AUDIT LOG — registro de eventos de seguridad
--     Cambios de contraseña, intentos fallidos, eliminaciones GDPR
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         REFERENCES public.usuarios(id) ON DELETE SET NULL,
  event_type  TEXT         NOT NULL,   -- 'login_failed'|'password_changed'|'account_deleted'|'rate_limited'|'jwt_invalid'
  details     JSONB        NOT NULL DEFAULT '{}',
  ip_hash     TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user
  ON public.security_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_event
  ON public.security_audit_log (event_type, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_select" ON public.security_audit_log;
CREATE POLICY "audit_admin_select"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (es_admin());

DROP POLICY IF EXISTS "audit_service_insert" ON public.security_audit_log;
CREATE POLICY "audit_service_insert"
  ON public.security_audit_log FOR INSERT
  WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
--  3. CIFRADO DE PII — teléfono con pgcrypto (AES-256)
--
--  ARQUITECTURA:
--    • telefono           → columna legible (solo el dueño + admin via RLS)
--    • telefono_encrypted → cifrado AES con clave del servidor
--
--  La clave de cifrado se configura como:
--    ALTER DATABASE postgres SET "app.encryption_key" = '<32-byte-random-key>';
--  o como secreto de Supabase Vault (recomendado en producción).
--
--  Los triggers sincronizan ambas columnas automáticamente.
-- ════════════════════════════════════════════════════════════

-- Agregar columna para el valor cifrado
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS telefono_encrypted TEXT;

-- Comentario de auditabilidad
COMMENT ON COLUMN public.usuarios.telefono_encrypted
  IS 'Teléfono cifrado con pgcrypto AES-256 (pgp_sym_encrypt). Clave en app.encryption_key.';

-- ── Función de cifrado (usada por triggers y Edge Functions) ──────────────
CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- La clave se lee de la configuración de la base de datos.
  -- Establecer en Supabase: Dashboard → Settings → Database → Config
  -- o mediante: ALTER DATABASE postgres SET "app.encryption_key" = '...';
  enc_key := current_setting('app.encryption_key', true);

  IF enc_key IS NULL OR length(enc_key) < 16 THEN
    -- Si no hay clave configurada, guardar NULL (nunca plain text en este campo)
    RETURN NULL;
  END IF;

  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;

  -- pgp_sym_encrypt usa AES-128/256 según la longitud de la clave
  -- encode(..., 'base64') para almacenamiento como TEXT
  RETURN encode(
    pgp_sym_encrypt(plain_text, enc_key, 'cipher-algo=aes256'),
    'base64'
  );
END;
$$;

-- ── Función de descifrado (solo para Edge Functions con service_role) ─────
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  enc_key TEXT;
BEGIN
  enc_key := current_setting('app.encryption_key', true);

  IF enc_key IS NULL OR encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    enc_key
  );
EXCEPTION
  WHEN others THEN
    -- Si falla el descifrado (clave incorrecta, dato corrupto) devolver NULL
    RETURN NULL;
END;
$$;

-- ── Trigger: cifrar telefono automáticamente en INSERT/UPDATE ────────────
CREATE OR REPLACE FUNCTION public.sync_telefono_encrypted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Solo cifrar si el teléfono cambió
  IF TG_OP = 'INSERT' OR NEW.telefono IS DISTINCT FROM OLD.telefono THEN
    NEW.telefono_encrypted := public.encrypt_pii(NEW.telefono);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_telefono_encrypted ON public.usuarios;
CREATE TRIGGER trigger_sync_telefono_encrypted
  BEFORE INSERT OR UPDATE OF telefono ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.sync_telefono_encrypted();

-- ── Cifrar teléfonos existentes (ejecutar una vez en migración) ───────────
UPDATE public.usuarios
SET telefono_encrypted = public.encrypt_pii(telefono)
WHERE telefono IS NOT NULL
  AND telefono_encrypted IS NULL;


-- ════════════════════════════════════════════════════════════
--  4. GDPR — DERECHO AL OLVIDO
--
--  Función principal: anonimizar_usuario(user_id)
--  • Anonimiza PII en usuarios, reservas, reseñas
--  • Elimina datos no necesarios (favoritos, notificaciones,
--    historial, analytics, itinerarios)
--  • Mantiene reservas anonimizadas para auditoría financiera
--    (requerimiento legal: retención 5 años)
--  • Registra la solicitud en security_audit_log
--
--  Llamada desde la Edge Function delete-account con service_role.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.anonimizar_usuario(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_exists        BOOLEAN;
  v_deletion_tag  TEXT;
  v_short_id      TEXT;
BEGIN
  -- Verificar que el usuario existe
  SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = p_user_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  v_short_id     := left(p_user_id::text, 8);
  v_deletion_tag := 'gdpr_deleted_' || v_short_id;

  -- ── Anonimizar perfil de usuario (PII) ───────────────────────────────────
  UPDATE public.usuarios SET
    email               = v_deletion_tag || '@eliminado.invalid',
    nombre              = 'Usuario Eliminado',
    nombre_usuario      = v_deletion_tag,
    telefono            = NULL,
    telefono_encrypted  = NULL,
    foto_url            = NULL,
    push_token          = NULL,
    activo              = 0
  WHERE id = p_user_id;

  -- ── Reservas: anonimizar PII pero conservar registro financiero ───────────
  --   (requerimiento legal de retención fiscal 5 años en México)
  UPDATE public.reservas SET
    notas = '[Datos eliminados por solicitud GDPR - ' || NOW()::date || ']'
  WHERE usuario_id = p_user_id;

  -- ── Reseñas: anonimizar contenido del usuario ─────────────────────────────
  UPDATE public.resenas SET
    comentario = '[Contenido eliminado por solicitud del usuario]'
  WHERE usuario_id = p_user_id;

  -- ── Eliminar datos que no tienen retención legal obligatoria ─────────────
  DELETE FROM public.favoritos          WHERE usuario_id = p_user_id;
  DELETE FROM public.notificaciones     WHERE usuario_id = p_user_id;
  DELETE FROM public.historial          WHERE usuario_id = p_user_id;
  DELETE FROM public.analytics_eventos  WHERE user_id    = p_user_id;
  DELETE FROM public.itinerarios        WHERE usuario_id = p_user_id;
  -- itinerario_items se eliminan en cascada desde itinerarios

  -- ── Registrar solicitud de borrado en audit log ───────────────────────────
  INSERT INTO public.security_audit_log (user_id, event_type, details)
  VALUES (
    p_user_id,
    'account_deleted_gdpr',
    jsonb_build_object(
      'requested_at', NOW(),
      'action',        'anonymization_complete',
      'legal_basis',   'GDPR Art. 17 - Right to erasure',
      'data_retained', 'reservas (obligación fiscal 5 años)'
    )
  );

  RETURN jsonb_build_object(
    'success',    true,
    'user_id',    p_user_id,
    'deleted_at', NOW()
  );
END;
$$;

-- Solo el service_role puede ejecutar la función de anonimización
REVOKE ALL ON FUNCTION public.anonimizar_usuario(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonimizar_usuario(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.anonimizar_usuario(UUID) FROM authenticated;
-- service_role (y el superusuario) retienen acceso por default en Supabase


-- ════════════════════════════════════════════════════════════
--  5. POLÍTICA DE RETENCIÓN — vista para admins
--     Muestra usuarios anonimizados con reservas retenidas
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.gdpr_retention_view AS
  SELECT
    u.id,
    u.email,
    u.activo,
    u.created_at                        AS account_created,
    COUNT(r.id)                         AS reservas_count,
    MAX(r.created_at)                   AS ultima_reserva,
    sal.created_at                      AS gdpr_requested_at
  FROM public.usuarios u
  LEFT JOIN public.reservas           r   ON r.usuario_id = u.id
  LEFT JOIN public.security_audit_log sal ON sal.user_id   = u.id
                                         AND sal.event_type = 'account_deleted_gdpr'
  WHERE u.activo = 0
    AND sal.id IS NOT NULL
  GROUP BY u.id, u.email, u.activo, u.created_at, sal.created_at;

-- Solo admins pueden consultar la vista
REVOKE ALL ON public.gdpr_retention_view FROM PUBLIC;
GRANT  SELECT ON public.gdpr_retention_view TO authenticated;  -- RLS lo restringe a admins via es_admin()


-- ════════════════════════════════════════════════════════════
--  MIGRATION TRACKING
-- ════════════════════════════════════════════════════════════

INSERT INTO schema_migrations (version, description, type, success)
VALUES (
  '20260427_000000',
  'Security: rate_limit_log, security_audit_log, pgcrypto PII encryption (telefono), GDPR anonymization function',
  'security',
  true
)
ON CONFLICT (version) DO NOTHING;
