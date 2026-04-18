-- Fix security warnings from Supabase linter
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- ── 1. Fix mutable search_path on SECURITY DEFINER functions ─────────────────
--    Without a fixed search_path, a malicious user could create objects in a
--    schema that shadows public.usuarios, hijacking the function's behaviour.

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND tipo = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, nombre_usuario, telefono,
                                idioma, notificaciones, tipo, activo)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'nombre_usuario',
    NEW.raw_user_meta_data->>'telefono',
    'es', 1, 'normal', 1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ── 2. Fix analytics_insert_auth policy (live DB has WITH CHECK (true)) ───────
--    Restrict inserts so authenticated users can only log events for themselves
--    or anonymous events (user_id IS NULL).

DROP POLICY IF EXISTS "analytics_insert_auth" ON public.analytics_eventos;
CREATE POLICY "analytics_insert_auth"
  ON public.analytics_eventos FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());


-- ── 3. Fix fotos-resenas bucket: remove broad listing SELECT policy ───────────
--    Public buckets serve files via URL without any storage policy.
--    The broad SELECT policy on storage.objects lets any client enumerate
--    every file in the bucket. Replace it with a user-scoped listing rule.

DROP POLICY IF EXISTS "Fotos de reseñas públicas" ON storage.objects;

CREATE POLICY "Fotos de reseñas públicas"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fotos-resenas'
    AND (
      -- allow listing only within the caller's own folder (auth.uid()/*)
      auth.uid()::text = (storage.foldername(name))[1]
      -- anonymous / public URL access still works because public buckets
      -- bypass RLS for GET requests; this policy only affects list()
    )
  );
