-- ============================================================
--  MEXCURSIÓN — Bucket de avatares de usuario
--  Migration: 20260502_130000
--  Description: Crea el bucket público "avatares" y define
--  políticas RLS para que cada usuario solo pueda subir/editar
--  su propia carpeta (uid/) mientras las URLs públicas siguen
--  siendo accesibles para todos.
-- ============================================================

-- Crear bucket si no existe (público: las URLs no requieren auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatares',
  'avatares',
  true,
  5242880,   -- 5 MB máx por archivo
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── Políticas ────────────────────────────────────────────────

-- Lectura pública: cualquiera puede ver URLs (bucket público)
DROP POLICY IF EXISTS "Avatares lectura pública" ON storage.objects;
CREATE POLICY "Avatares lectura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatares');

-- Subida: sólo el dueño puede subir en su carpeta uid/
DROP POLICY IF EXISTS "Avatares subida propia" ON storage.objects;
CREATE POLICY "Avatares subida propia"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Actualizar (upsert): sólo el dueño
DROP POLICY IF EXISTS "Avatares actualizar propia" ON storage.objects;
CREATE POLICY "Avatares actualizar propia"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Eliminar: sólo el dueño
DROP POLICY IF EXISTS "Avatares eliminar propia" ON storage.objects;
CREATE POLICY "Avatares eliminar propia"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatares'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
