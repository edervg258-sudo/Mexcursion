-- ============================================================
--  FIX RLS POLICIES — Mexcursión
--  Ejecutar completo en el SQL Editor de Supabase.
--  Problemas corregidos:
--   1. Políticas con rol {public} permiten acceso anónimo
--   2. INSERT sin WITH CHECK permite suplantar usuario_id
--   3. Políticas admin de reservas no aplicadas en producción
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  HISTORIAL
--  Problema: policy "Los usuarios pueden crear historial"
--  tiene rol {public} y sin WITH CHECK → anónimos pueden insertar
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Los usuarios pueden crear historial"     ON public.historial;
DROP POLICY IF EXISTS "Los usuarios pueden ver su historial"   ON public.historial;

-- historial_all_own (authenticated, ALL, USING + WITH CHECK = auth.uid() = usuario_id)
-- ya cubre correctamente — se deja intacto.


-- ════════════════════════════════════════════════════════════
--  ITINERARIOS
--  Problema: dos INSERT con {public} y sin WITH CHECK
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Crear itinerarios"                      ON public.itinerarios;
DROP POLICY IF EXISTS "Los usuarios pueden crear itinerarios"  ON public.itinerarios;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus itinerarios" ON public.itinerarios;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus itinerarios" ON public.itinerarios;
DROP POLICY IF EXISTS "Ver itinerarios propios"                ON public.itinerarios;

-- itinerarios_all_own (authenticated) ya cubre todo — se deja intacto.


-- ════════════════════════════════════════════════════════════
--  ITINERARIO_ITEMS
--  Problema: cuatro políticas {public} sin WITH CHECK
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Los usuarios pueden ver items de sus itinerarios"    ON public.itinerario_items;
DROP POLICY IF EXISTS "Los usuarios pueden agregar items"                   ON public.itinerario_items;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar items"                ON public.itinerario_items;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar items"                  ON public.itinerario_items;

-- items_all_own (authenticated) ya cubre todo — se deja intacto.


-- ════════════════════════════════════════════════════════════
--  NOTIFICACIONES
--  Problema: SELECT/UPDATE con {public}
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Los usuarios pueden ver sus notificaciones"         ON public.notificaciones;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus notificaciones"  ON public.notificaciones;

-- notificaciones_all_own (authenticated) ya cubre todo — se deja intacto.


-- ════════════════════════════════════════════════════════════
--  RESEÑAS
--  Problema 1: INSERT con {public} → anónimos pueden escribir reseñas
--  Problema 2: resenas_insert_own no tiene WITH CHECK → suplantación
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Los usuarios pueden crear reseñas" ON public.resenas;
DROP POLICY IF EXISTS "resenas_insert_own"                ON public.resenas;
DROP POLICY IF EXISTS "Las reseñas son públicas"          ON public.resenas;

-- SELECT público (sin auth) para reseñas es aceptable, se mantiene:
-- resenas_select_public ya existe y es correcto.

CREATE POLICY "resenas_insert_own"
  ON public.resenas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  RESERVAS
--  Problema 1: INSERT con {public} sin WITH CHECK
--  Problema 2: SELECT con {public}
--  Problema 3: admin_select_reservas y admin_update_reservas no existen
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Los usuarios pueden crear reservas"   ON public.reservas;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus reservas" ON public.reservas;
DROP POLICY IF EXISTS "usuarios pueden crear sus reservas"   ON public.reservas;

-- Política de select propia
DROP POLICY IF EXISTS "reservas_select_own" ON public.reservas;
CREATE POLICY "reservas_select_own"
  ON public.reservas FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

-- INSERT con WITH CHECK para impedir suplantación de usuario_id
DROP POLICY IF EXISTS "reservas_insert_own" ON public.reservas;
CREATE POLICY "reservas_insert_own"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Admin puede ver y modificar todas las reservas
DROP POLICY IF EXISTS "admin_select_reservas" ON public.reservas;
CREATE POLICY "admin_select_reservas"
  ON public.reservas FOR SELECT TO authenticated
  USING (es_admin());

DROP POLICY IF EXISTS "admin_update_reservas" ON public.reservas;
CREATE POLICY "admin_update_reservas"
  ON public.reservas FOR UPDATE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
--  FAVORITOS
--  Problema: favoritos_insert sin WITH CHECK
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "favoritos_insert" ON public.favoritos;
CREATE POLICY "favoritos_insert"
  ON public.favoritos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  USUARIOS
--  Problema: usuarios_insert sin WITH CHECK
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "usuarios_insert"     ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own" ON public.usuarios;
CREATE POLICY "usuarios_insert_own"
  ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);


-- ════════════════════════════════════════════════════════════
--  RUTAS (tabla no vista en schema.sql — se asegura RLS)
-- ════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.rutas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus rutas"             ON public.rutas;
DROP POLICY IF EXISTS "Los usuarios pueden agregar a sus rutas"       ON public.rutas;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar de sus rutas"     ON public.rutas;

CREATE POLICY "rutas_select_own"
  ON public.rutas FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "rutas_insert_own"
  ON public.rutas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "rutas_delete_own"
  ON public.rutas FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  ANALYTICS_EVENTOS
--  Problema: INSERT con {public} puede ser abusado para flood
--  Se restringe a authenticated. Si necesitas anon, crea un
--  endpoint Edge Function con rate-limiting propio.
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Insert propio"          ON public.analytics_eventos;
DROP POLICY IF EXISTS "analytics_insert_auth"  ON public.analytics_eventos;
DROP POLICY IF EXISTS "analytics_insert_anon"  ON public.analytics_eventos;

CREATE POLICY "analytics_insert_auth"
  ON public.analytics_eventos FOR INSERT TO authenticated
  WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
--  VERIFICACIÓN FINAL
--  Ejecuta esto después para confirmar el resultado.
-- ════════════════════════════════════════════════════════════
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual      AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
