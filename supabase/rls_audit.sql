-- ============================================================
--  RLS AUDIT — verifica que todas las tablas tienen RLS activo
--  Ejecutar en el SQL Editor de Supabase y revisar el resultado.
--  Filas con rls_enabled = false deben corregirse inmediatamente.
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── Verificar políticas existentes ───────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── Reaplica las políticas del schema principal si faltan ────
-- Ejecuta supabase/schema.sql completo en el SQL Editor para
-- restaurar todas las políticas RLS definidas en el proyecto.
