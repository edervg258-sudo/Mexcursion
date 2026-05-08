-- Bucket público para fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatares',
  'avatares',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Cualquier usuario autenticado puede subir/actualizar su propia foto
DROP POLICY IF EXISTS "avatares_upload_own" ON storage.objects;
CREATE POLICY "avatares_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.filename(name)) = auth.uid()::text || '.' || split_part(storage.filename(name), '.', 2));

DROP POLICY IF EXISTS "avatares_update_own" ON storage.objects;
CREATE POLICY "avatares_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatares' AND owner = auth.uid());

-- Lectura pública (el bucket ya es público, pero por claridad)
DROP POLICY IF EXISTS "avatares_read_public" ON storage.objects;
CREATE POLICY "avatares_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatares');
