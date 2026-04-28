-- ============================================================
--  MEXCURSIÓN — Observability Tables
--  Migration: 20260427_120000
--  Tablas: app_logs, app_metrics
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  1. LOGS ESTRUCTURADOS
--     Solo 'warning' y 'error' en producción.
--     Solo admins pueden SELECT; usuarios autenticados INSERT.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.app_logs (
  id           BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  level        TEXT         NOT NULL CHECK (level IN ('debug','info','warning','error')),
  message      TEXT         NOT NULL,
  feature      TEXT,
  action       TEXT,
  user_id      TEXT,
  metadata     JSONB,
  platform     TEXT,
  app_version  TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_logs_created   ON public.app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level     ON public.app_logs (level);
CREATE INDEX IF NOT EXISTS idx_app_logs_feature   ON public.app_logs (feature) WHERE feature IS NOT NULL;

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_log_authenticated"
  ON public.app_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_log_admin"
  ON public.app_logs FOR SELECT
  TO authenticated
  USING (public.es_admin());

-- Mantener solo los últimos 30 días (pg_cron, si está habilitado)
-- Crea un job en el dashboard de Supabase si usas pg_cron:
-- SELECT cron.schedule('purge-app-logs', '0 3 * * *',
--   $$DELETE FROM public.app_logs WHERE created_at < NOW() - INTERVAL '30 days'$$);

-- ════════════════════════════════════════════════════════════
--  2. MÉTRICAS DE RENDIMIENTO
--     Duración de reservas, conteos de error, etc.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.app_metrics (
  id         BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metric     TEXT         NOT NULL,   -- ej: 'booking.duration', 'booking.failed'
  value      NUMERIC      NOT NULL,
  tags       JSONB
);

CREATE INDEX IF NOT EXISTS idx_app_metrics_created ON public.app_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_metrics_metric  ON public.app_metrics (metric);

ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_metric_authenticated"
  ON public.app_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_metric_admin"
  ON public.app_metrics FOR SELECT
  TO authenticated
  USING (public.es_admin());

-- ════════════════════════════════════════════════════════════
--  3. VISTA RESUMEN DE SALUD (para el dashboard admin)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_sistema_salud AS
SELECT
  -- Errores en las últimas 1h y 24h
  COUNT(*) FILTER (
    WHERE level = 'error' AND created_at >= NOW() - INTERVAL '1 hour'
  )                                                    AS errores_1h,
  COUNT(*) FILTER (
    WHERE level = 'error' AND created_at >= NOW() - INTERVAL '24 hours'
  )                                                    AS errores_24h,
  COUNT(*) FILTER (
    WHERE level = 'warning' AND created_at >= NOW() - INTERVAL '24 hours'
  )                                                    AS advertencias_24h,
  -- Feature con más errores (24h)
  (
    SELECT feature FROM public.app_logs
    WHERE level = 'error'
      AND created_at >= NOW() - INTERVAL '24 hours'
      AND feature IS NOT NULL
    GROUP BY feature ORDER BY COUNT(*) DESC LIMIT 1
  )                                                    AS feature_mas_errores
FROM public.app_logs;

GRANT SELECT ON public.v_sistema_salud TO authenticated;

-- ════════════════════════════════════════════════════════════
--  4. VISTA MÉTRICAS DE RESERVAS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_metricas_reservas AS
SELECT
  ROUND(AVG(value))                                    AS duracion_media_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value)) AS duracion_p95_ms,
  MAX(value)                                           AS duracion_max_ms,
  COUNT(*)                                             AS total_mediciones,
  COUNT(*) FILTER (
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  )                                                    AS mediciones_24h
FROM public.app_metrics
WHERE metric = 'booking.duration';

GRANT SELECT ON public.v_metricas_reservas TO authenticated;

INSERT INTO public.schema_migrations (version, description, type)
VALUES ('20260427_120000', 'Observability: app_logs, app_metrics, health views', 'feature')
ON CONFLICT (version) DO NOTHING;
