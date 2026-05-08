-- ============================================================
--  ROW LEVEL SECURITY — MiPrimerApp
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
--  Idempotente: borra y recrea cada política para evitar el
--  error "already exists" si ya corriste el script antes.
-- ============================================================

-- ── PASO 1: Habilitar RLS en todas las tablas ────────────────

ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerario_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugerencias_rutas  ENABLE ROW LEVEL SECURITY;


-- ── PASO 2: Tabla `usuarios` ─────────────────────────────────

DROP POLICY IF EXISTS "usuarios_select_own"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own"  ON usuarios;

CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "usuarios_insert_own" ON usuarios
  FOR INSERT WITH CHECK (id = auth.uid());


-- ── PASO 3: Tabla `favoritos` ────────────────────────────────

DROP POLICY IF EXISTS "favoritos_select_own" ON favoritos;
DROP POLICY IF EXISTS "favoritos_insert_own" ON favoritos;
DROP POLICY IF EXISTS "favoritos_delete_own" ON favoritos;

CREATE POLICY "favoritos_select_own" ON favoritos
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "favoritos_insert_own" ON favoritos
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "favoritos_delete_own" ON favoritos
  FOR DELETE USING (usuario_id = auth.uid());


-- ── PASO 4: Tabla `reservas` ─────────────────────────────────

DROP POLICY IF EXISTS "reservas_select_own" ON reservas;
DROP POLICY IF EXISTS "reservas_insert_own" ON reservas;

CREATE POLICY "reservas_select_own" ON reservas
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "reservas_insert_own" ON reservas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());


-- ── PASO 5: Tabla `resenas` ──────────────────────────────────

DROP POLICY IF EXISTS "resenas_select_public" ON resenas;
DROP POLICY IF EXISTS "resenas_insert_own"    ON resenas;
DROP POLICY IF EXISTS "resenas_delete_own"    ON resenas;

CREATE POLICY "resenas_select_public" ON resenas
  FOR SELECT USING (true);

CREATE POLICY "resenas_insert_own" ON resenas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "resenas_delete_own" ON resenas
  FOR DELETE USING (usuario_id = auth.uid());


-- ── PASO 6: Tabla `historial` ────────────────────────────────

DROP POLICY IF EXISTS "historial_select_own" ON historial;
DROP POLICY IF EXISTS "historial_insert_own" ON historial;

CREATE POLICY "historial_select_own" ON historial
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "historial_insert_own" ON historial
  FOR INSERT WITH CHECK (usuario_id = auth.uid());


-- ── PASO 7: Tabla `notificaciones` ───────────────────────────

DROP POLICY IF EXISTS "notificaciones_select_own" ON notificaciones;
DROP POLICY IF EXISTS "notificaciones_update_own" ON notificaciones;

CREATE POLICY "notificaciones_select_own" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "notificaciones_update_own" ON notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());


-- ── PASO 8: Tabla `itinerarios` ──────────────────────────────

DROP POLICY IF EXISTS "itinerarios_select_own" ON itinerarios;
DROP POLICY IF EXISTS "itinerarios_insert_own" ON itinerarios;
DROP POLICY IF EXISTS "itinerarios_update_own" ON itinerarios;
DROP POLICY IF EXISTS "itinerarios_delete_own" ON itinerarios;

CREATE POLICY "itinerarios_select_own" ON itinerarios
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "itinerarios_insert_own" ON itinerarios
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "itinerarios_update_own" ON itinerarios
  FOR UPDATE USING (usuario_id = auth.uid());

CREATE POLICY "itinerarios_delete_own" ON itinerarios
  FOR DELETE USING (usuario_id = auth.uid());


-- ── PASO 9: Tabla `itinerario_items` ────────────────────────

DROP POLICY IF EXISTS "itinerario_items_select_own" ON itinerario_items;
DROP POLICY IF EXISTS "itinerario_items_insert_own" ON itinerario_items;
DROP POLICY IF EXISTS "itinerario_items_update_own" ON itinerario_items;
DROP POLICY IF EXISTS "itinerario_items_delete_own" ON itinerario_items;

CREATE POLICY "itinerario_items_select_own" ON itinerario_items
  FOR SELECT USING (
    itinerario_id IN (
      SELECT id FROM itinerarios WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "itinerario_items_insert_own" ON itinerario_items
  FOR INSERT WITH CHECK (
    itinerario_id IN (
      SELECT id FROM itinerarios WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "itinerario_items_update_own" ON itinerario_items
  FOR UPDATE USING (
    itinerario_id IN (
      SELECT id FROM itinerarios WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "itinerario_items_delete_own" ON itinerario_items
  FOR DELETE USING (
    itinerario_id IN (
      SELECT id FROM itinerarios WHERE usuario_id = auth.uid()
    )
  );


-- ── PASO 10: Tabla `estados` (destinos) ──────────────────────

DROP POLICY IF EXISTS "estados_select_public" ON estados;

CREATE POLICY "estados_select_public" ON estados
  FOR SELECT USING (true);


-- ── PASO 11: Tabla `sugerencias_rutas` ───────────────────────

DROP POLICY IF EXISTS "sugerencias_rutas_select_public" ON sugerencias_rutas;

CREATE POLICY "sugerencias_rutas_select_public" ON sugerencias_rutas
  FOR SELECT USING (activo = 1);


-- ============================================================
--  NOTA SOBRE EL PANEL DE ADMIN
--  Las funciones admin (cargarTodosLosUsuarios, cargarTodasLasReservas,
--  actualizarEstadoReserva, etc.) necesitan la SERVICE_ROLE key,
--  NO la anon key. Esa key nunca debe ir en el bundle de la app.
-- ============================================================
