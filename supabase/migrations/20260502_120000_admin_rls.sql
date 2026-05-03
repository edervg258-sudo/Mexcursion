-- ============================================================
--  Admin RLS — Políticas de seguridad a nivel de fila
--  Objetivo: que las operaciones admin se validen en la BD,
--  no sólo en el cliente.
-- ============================================================

-- ── Función auxiliar: devuelve true si el usuario activo es admin ──
CREATE OR REPLACE FUNCTION es_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND tipo = 'admin'
      AND activo = 1
  );
$$;

-- ── TABLA: usuarios ───────────────────────────────────────────

-- Cualquier usuario autenticado puede leer su propio registro
DROP POLICY IF EXISTS "usuarios_select_own"    ON usuarios;
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (auth.uid() = id);

-- Admin puede leer todos los usuarios
DROP POLICY IF EXISTS "usuarios_select_admin"  ON usuarios;
CREATE POLICY "usuarios_select_admin" ON usuarios
  FOR SELECT USING (es_admin());

-- Sólo el propio usuario puede actualizar su perfil
DROP POLICY IF EXISTS "usuarios_update_own"    ON usuarios;
CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    -- Impedir que el propio usuario cambie su campo 'tipo' o 'activo'
    tipo = (SELECT tipo FROM usuarios WHERE id = auth.uid())
    AND activo = (SELECT activo FROM usuarios WHERE id = auth.uid())
  );

-- Admin puede actualizar cualquier usuario (incluyendo tipo/activo)
DROP POLICY IF EXISTS "usuarios_update_admin"  ON usuarios;
CREATE POLICY "usuarios_update_admin" ON usuarios
  FOR UPDATE USING (es_admin());

-- ── TABLA: destinos (si existe) ───────────────────────────────
-- Cualquiera puede leer; sólo admin puede insertar/actualizar/borrar

DROP POLICY IF EXISTS "destinos_select_all"    ON destinos;
CREATE POLICY "destinos_select_all" ON destinos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "destinos_write_admin"   ON destinos;
CREATE POLICY "destinos_write_admin" ON destinos
  FOR ALL USING (es_admin());

-- ── TABLA: reservas ───────────────────────────────────────────

-- Usuario puede leer sus propias reservas
DROP POLICY IF EXISTS "reservas_select_own"    ON reservas;
CREATE POLICY "reservas_select_own" ON reservas
  FOR SELECT USING (auth.uid() = usuario_id);

-- Admin puede leer todas las reservas
DROP POLICY IF EXISTS "reservas_select_admin"  ON reservas;
CREATE POLICY "reservas_select_admin" ON reservas
  FOR SELECT USING (es_admin());

-- Usuario puede insertar sólo reservas propias
DROP POLICY IF EXISTS "reservas_insert_own"    ON reservas;
CREATE POLICY "reservas_insert_own" ON reservas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Usuario puede actualizar estado de sus propias reservas
-- (solo 'cancelada' está permitido desde el cliente)
DROP POLICY IF EXISTS "reservas_update_own"    ON reservas;
CREATE POLICY "reservas_update_own" ON reservas
  FOR UPDATE USING (auth.uid() = usuario_id)
  WITH CHECK (estado = 'cancelada');

-- Admin puede actualizar cualquier reserva a cualquier estado
DROP POLICY IF EXISTS "reservas_update_admin"  ON reservas;
CREATE POLICY "reservas_update_admin" ON reservas
  FOR UPDATE USING (es_admin());

-- ── TABLA: resenas ────────────────────────────────────────────

-- Todos pueden leer reseñas (incluso anónimos)
DROP POLICY IF EXISTS "resenas_select_all"     ON resenas;
CREATE POLICY "resenas_select_all" ON resenas
  FOR SELECT USING (true);

-- Usuario autenticado puede insertar UNA sola reseña por destino
DROP POLICY IF EXISTS "resenas_insert_own"     ON resenas;
CREATE POLICY "resenas_insert_own" ON resenas
  FOR INSERT WITH CHECK (
    auth.uid() = usuario_id
    AND NOT EXISTS (
      SELECT 1 FROM resenas r
      WHERE r.usuario_id = auth.uid()
        AND r.destino = resenas.destino
    )
  );

-- Admin puede borrar reseñas inapropiadas
DROP POLICY IF EXISTS "resenas_delete_admin"   ON resenas;
CREATE POLICY "resenas_delete_admin" ON resenas
  FOR DELETE USING (es_admin());

-- ── TABLA: favoritos ─────────────────────────────────────────

DROP POLICY IF EXISTS "favoritos_own"          ON favoritos;
CREATE POLICY "favoritos_own" ON favoritos
  FOR ALL USING (auth.uid() = usuario_id);

-- ── TABLA: notificaciones ────────────────────────────────────

DROP POLICY IF EXISTS "notificaciones_own"     ON notificaciones;
CREATE POLICY "notificaciones_own" ON notificaciones
  FOR ALL USING (auth.uid() = usuario_id);

-- Admin puede crear notificaciones para cualquier usuario
DROP POLICY IF EXISTS "notificaciones_admin"   ON notificaciones;
CREATE POLICY "notificaciones_admin" ON notificaciones
  FOR INSERT WITH CHECK (es_admin());

-- ── TABLA: historial ─────────────────────────────────────────

DROP POLICY IF EXISTS "historial_own"          ON historial;
CREATE POLICY "historial_own" ON historial
  FOR ALL USING (auth.uid() = usuario_id);

-- ── TABLA: itinerarios ───────────────────────────────────────

DROP POLICY IF EXISTS "itinerarios_own"        ON itinerarios;
CREATE POLICY "itinerarios_own" ON itinerarios
  FOR ALL USING (auth.uid() = usuario_id);

-- ── Activar RLS en todas las tablas (idempotente) ────────────
ALTER TABLE usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial      ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerarios    ENABLE ROW LEVEL SECURITY;
