-- ============================================================
--  Database Indexes Migration (revised)
--  Migration: 20260425_120000
--  Description: Add performance indexes for common queries
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  RESERVAS: Indexes for common queries
-- ════════════════════════════════════════════════════════════

-- User reservations by user (always exists)
CREATE INDEX IF NOT EXISTS idx_reservas_usuario
ON public.reservas(usuario_id);

-- Reservations by status (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_reservas_estado
ON public.reservas(estado);

-- ════════════════════════════════════════════════════════════
--  ANALYTICS_EVENTOS: Indexes for reporting
-- ════════════════════════════════════════════════════════════

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_analytics_eventos_event_type
ON public.analytics_eventos(event_name);

-- ════════════════════════════════════════════════════════════
--  FAVORITOS: Index by user
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_favoritos_usuario
ON public.favoritos(usuario_id);

-- ════════════════════════════════════════════════════════════
--  RESEÑAS: Index for destination reviews
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_resenas_destino
ON public.resenas(destino);

-- ════════════════════════════════════════════════════════════
--  ITINERARIOS: Index by user
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_itinerarios_usuario
ON public.itinerarios(usuario_id);

-- ════════════════════════════════════════════════════════════
--  NOTIFICACIONES: Index by user and read status
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
ON public.notificaciones(usuario_id);

-- ════════════════════════════════════════════════════════════
--  MIGRATION TRACKING (comentado - la tabla no existe aún)
-- ════════════════════════════════════════════════════════════

-- La tabla schema_migrations se crea en la migración inicial
-- Descomenta si ya la has ejecutado:
-- INSERT INTO schema_migrations (version, description, type, success)
-- VALUES ('20260425_120000', 'Add performance indexes for common queries', 'indexes', true)
-- ON CONFLICT (version) DO NOTHING;