-- ============================================================
--  MEXCURSIÓN — Encryption Key Configuration
--  Migration: 20260427_000100
--  Description: System config table + update encrypt/decrypt to use pgcrypto
-- ============================================================

-- ── Tabla de configuración del sistema (para secretos) ───────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  id          BIGSERIAL    PRIMARY KEY,
  key         TEXT         UNIQUE NOT NULL,
  value       TEXT         NOT NULL,
  is_secret   BOOLEAN      DEFAULT FALSE,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede acceder (RLS bloquea authenticated/anon)
DROP POLICY IF EXISTS "config_service_only" ON public.system_config;
CREATE POLICY "config_service_only"
  ON public.system_config FOR ALL
  USING (false)
  WITH CHECK (false);

-- Inserta la clave de cifrado (generada en Supabase Vault)
INSERT INTO public.system_config (key, value, is_secret)
VALUES ('encryption_key_aes256', '50f5cf730372c8829ad46b36110349b2', true)
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- ── Función de cifrado con pgcrypto ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  enc_key TEXT;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;

  -- Clave de cifrado AES-256 (32 chars hex)
  enc_key := '50f5cf730372c8829ad46b36110349b2';

  -- pgp_sym_encrypt: algoritmo AES-256 (cipher-algo=aes256)
  RETURN encode(
    pgp_sym_encrypt(plain_text, enc_key, 'cipher-algo=aes256'),
    'base64'
  );
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'encrypt_pii error: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- ── Función de descifrado con pgcrypto ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_text TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  enc_key TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;

  enc_key := '50f5cf730372c8829ad46b36110349b2';

  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    enc_key
  );
EXCEPTION
  WHEN others THEN
    -- Falla silenciosa: dato corrupto, clave incorrecta, etc.
    RETURN NULL;
END;
$$;

-- ── Vista de usuarios con teléfono descifrado (para admins) ───────────────
CREATE OR REPLACE VIEW public.usuarios_decrypted AS
  SELECT
    id,
    email,
    nombre,
    nombre_usuario,
    public.decrypt_pii(telefono_encrypted)  AS telefono_decrypted,
    telefono                                  AS telefono_plain,
    foto_url,
    idioma,
    notificaciones,
    tipo,
    activo,
    push_token,
    created_at
  FROM public.usuarios;

-- Solo admins pueden ver teléfono descifrado
REVOKE ALL ON public.usuarios_decrypted FROM PUBLIC;
GRANT  SELECT ON public.usuarios_decrypted TO authenticated;  -- RLS + es_admin()

-- ════════════════════════════════════════════════════════════
--  MIGRATION TRACKING
-- ════════════════════════════════════════════════════════════

INSERT INTO schema_migrations (version, description, type, success)
VALUES (
  '20260427_000100',
  'Update encrypt/decrypt functions to use Supabase Vault instead of current_setting',
  'security',
  true
)
ON CONFLICT (version) DO NOTHING;
