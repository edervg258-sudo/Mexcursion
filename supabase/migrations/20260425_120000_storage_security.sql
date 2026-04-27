-- ============================================================
--  MEXCURSIÓN — Storage security hardening
--  Migration: 20260425_120000
--  Description: Restrict listing of fotos-resenas bucket to the
--  caller's own folder. Public buckets bypass RLS for GET-by-URL,
--  so anonymous viewing of known URLs keeps working — this only
--  prevents enumeration via storage.objects SELECT (list()).
-- ============================================================

DROP POLICY IF EXISTS "Fotos de reseñas públicas" ON storage.objects;

CREATE POLICY "Fotos de reseñas públicas"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fotos-resenas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
