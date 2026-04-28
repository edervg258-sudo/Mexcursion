-- ============================================================
--  MEXCURSIÓN — Add paquetes table
--  Migration: 20260427_100000
-- ============================================================

-- Paquetes turísticos por destino (estado)
CREATE TABLE IF NOT EXISTS public.paquetes (
  id          BIGINT        PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  estado_id   BIGINT        NOT NULL REFERENCES public.estados(id) ON DELETE CASCADE,
  nombre      TEXT          NOT NULL,
  descripcion TEXT          NOT NULL DEFAULT '',
  precio      NUMERIC(10,2) NOT NULL DEFAULT 0,
  disponible  BOOLEAN       NOT NULL DEFAULT true,
  orden       INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paquetes_estado ON public.paquetes(estado_id);

ALTER TABLE public.paquetes ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer paquetes
DROP POLICY IF EXISTS "paquetes_select_auth" ON public.paquetes;
CREATE POLICY "paquetes_select_auth"
  ON public.paquetes FOR SELECT TO authenticated
  USING (true);

-- Solo admin puede crear/editar/eliminar
DROP POLICY IF EXISTS "admin_insert_paquetes" ON public.paquetes;
CREATE POLICY "admin_insert_paquetes"
  ON public.paquetes FOR INSERT TO authenticated
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "admin_update_paquetes" ON public.paquetes;
CREATE POLICY "admin_update_paquetes"
  ON public.paquetes FOR UPDATE TO authenticated
  USING (es_admin());

DROP POLICY IF EXISTS "admin_delete_paquetes" ON public.paquetes;
CREATE POLICY "admin_delete_paquetes"
  ON public.paquetes FOR DELETE TO authenticated
  USING (es_admin());
