-- ============================================================
--  MEXCURSIÓN — RLS: guide role + user self-cancellation
--  Migration: 20260508_120000
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  FUNCIÓN AUXILIAR: detectar si el usuario actual es guía
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.es_guide()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND tipo = 'guide'
  );
$$;


-- ════════════════════════════════════════════════════════════
--  RESERVAS — política de auto-cancelación para usuarios
--
--  Los admins ya tienen admin_update_reservas (sin restricción).
--  Esta política permite que el PROPIETARIO de la reserva
--  la cambie a 'cancelada' sólo cuando está 'confirmada' o
--  'pendiente'. No puede cambiar a ningún otro estado.
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "reservas_cancel_own" ON public.reservas;

CREATE POLICY "reservas_cancel_own"
  ON public.reservas FOR UPDATE TO authenticated
  USING  (auth.uid() = usuario_id AND estado IN ('confirmada', 'pendiente'))
  WITH CHECK (estado = 'cancelada');


-- ════════════════════════════════════════════════════════════
--  RESERVAS — lectura para guías (vista operativa de tours)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "guide_select_reservas" ON public.reservas;

CREATE POLICY "guide_select_reservas"
  ON public.reservas FOR SELECT TO authenticated
  USING (es_guide());


-- ════════════════════════════════════════════════════════════
--  USUARIOS — lectura para guías (ver nombres de pasajeros)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "guide_select_usuarios" ON public.usuarios;

CREATE POLICY "guide_select_usuarios"
  ON public.usuarios FOR SELECT TO authenticated
  USING (es_guide());


-- ════════════════════════════════════════════════════════════
--  MIGRATION TRACKING
-- ════════════════════════════════════════════════════════════
INSERT INTO schema_migrations (version, description, type, success)
VALUES (
  '20260508_120000',
  'Add guide role RLS policies and user self-cancellation policy for reservas',
  'policy',
  true
)
ON CONFLICT (version) DO NOTHING;
