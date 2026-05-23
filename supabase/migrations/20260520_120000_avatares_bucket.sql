-- ============================================================
--  MEXCURSIÓN — Bucket "avatares" para fotos de perfil
--  Migration: 20260520_120000
--  Description: Crea el bucket público "avatares" y políticas RLS:
--    • Cualquiera puede leer (GET por URL pública)
--    • Cada usuario puede subir/actualizar/borrar SOLO en su carpeta
--      (avatares/<uid>/...)
-- ============================================================

-- Crear bucket público idempotente.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas previas si existen (idempotente).
DROP POLICY IF EXISTS "avatares_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatares_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatares_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatares_delete_own"    ON storage.objects;

-- Lectura pública: cualquiera puede ver avatares.
CREATE POLICY "avatares_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares');

-- Subida: solo el dueño puede escribir en su carpeta.
CREATE POLICY "avatares_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Actualización (upsert): solo el dueño.
CREATE POLICY "avatares_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Borrado: solo el dueño.
CREATE POLICY "avatares_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

