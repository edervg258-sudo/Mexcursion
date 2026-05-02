-- ============================================================
--  MEXCURSIÓN — RLS Security Fixes
--  Migration: 20260502_000000
--  Description: Fix three RLS gaps found in security audit
--
--  Gaps fixed:
--    1. resenas_insert_own — cualquier usuario autenticado podía
--       escribir reseñas sin haber tenido una reserva confirmada.
--    2. reservas — los usuarios no tenían política UPDATE propia,
--       imposibilitando cancelar sus propias reservas desde el cliente.
--    3. reservas — el admin carecía de política DELETE.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  FIX 1: Reseñas — exigir reserva confirmada para el destino
-- ════════════════════════════════════════════════════════════
-- Antes: cualquier usuario autenticado podía insertar reseñas en
-- cualquier destino sin haberlo visitado (solo validaba usuario_id).
-- Ahora: debe existir al menos una reserva con estado = 'confirmada'
-- para ese destino antes de poder dejar una reseña.

DROP POLICY IF EXISTS "resenas_insert_own" ON public.resenas;

CREATE POLICY "resenas_insert_own"
  ON public.resenas FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.usuario_id = auth.uid()
        AND r.destino    = resenas.destino
        AND r.estado     = 'confirmada'
    )
  );


-- ════════════════════════════════════════════════════════════
--  FIX 2: Reservas — permitir que el usuario cancele las suyas
-- ════════════════════════════════════════════════════════════
-- Antes: no existía política UPDATE para usuarios normales.
-- Ahora: el usuario solo puede cambiar 'estado' a 'cancelada'
-- en sus propias reservas que estén en estado 'pendiente'.
-- (Las confirmadas no se pueden cancelar desde el cliente.)

DROP POLICY IF EXISTS "reservas_update_own" ON public.reservas;

CREATE POLICY "reservas_update_own"
  ON public.reservas FOR UPDATE TO authenticated
  USING  (auth.uid() = usuario_id AND estado = 'pendiente')
  WITH CHECK (auth.uid() = usuario_id AND estado = 'cancelada');


-- ════════════════════════════════════════════════════════════
--  FIX 3: Reservas — admin puede eliminar reservas
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_delete_reservas" ON public.reservas;

CREATE POLICY "admin_delete_reservas"
  ON public.reservas FOR DELETE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
-- MIGRATION TRACKING
-- ════════════════════════════════════════════════════════════
INSERT INTO schema_migrations (version, description, type, success)
VALUES ('20260502_000000', 'Fix RLS gaps: resenas require confirmed reservation, user can cancel own pending reservas, admin can delete reservas', 'security', true)
ON CONFLICT (version) DO NOTHING;
