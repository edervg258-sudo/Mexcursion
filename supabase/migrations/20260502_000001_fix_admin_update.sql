-- ============================================================
--  Fix: política UPDATE del admin en reservas
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Asegurar que existe la función es_admin()
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

-- Recrear políticas de admin sobre reservas (con WITH CHECK explícito)
DROP POLICY IF EXISTS "admin_select_reservas" ON public.reservas;
DROP POLICY IF EXISTS "admin_update_reservas" ON public.reservas;
DROP POLICY IF EXISTS "admin_delete_reservas"  ON public.reservas;

CREATE POLICY "admin_select_reservas"
  ON public.reservas FOR SELECT TO authenticated
  USING (es_admin());

CREATE POLICY "admin_update_reservas"
  ON public.reservas FOR UPDATE TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

CREATE POLICY "admin_delete_reservas"
  ON public.reservas FOR DELETE TO authenticated
  USING (es_admin());

-- Asegurar que existen las políticas de usuario normal
DROP POLICY IF EXISTS "reservas_select_own" ON public.reservas;
DROP POLICY IF EXISTS "reservas_insert_own" ON public.reservas;
DROP POLICY IF EXISTS "reservas_update_own" ON public.reservas;

CREATE POLICY "reservas_select_own"
  ON public.reservas FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "reservas_insert_own"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "reservas_update_own"
  ON public.reservas FOR UPDATE TO authenticated
  USING  (auth.uid() = usuario_id AND estado = 'pendiente')
  WITH CHECK (auth.uid() = usuario_id AND estado = 'cancelada');
