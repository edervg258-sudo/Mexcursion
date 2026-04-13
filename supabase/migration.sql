-- ============================================================
-- MIGRACIÓN — columnas y tablas requeridas por la app
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USUARIOS — columnas extra que la app necesita
-- ────────────────────────────────────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_usuario  TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS idioma          TEXT    DEFAULT 'es';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notificaciones  INT     DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo            TEXT    DEFAULT 'normal';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo          INT     DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS push_token      TEXT;

-- Política INSERT que faltaba (para el registro)
CREATE POLICY IF NOT EXISTS "Los usuarios pueden insertar su propio perfil"
  ON usuarios FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. ESTADOS — columna activo
-- ────────────────────────────────────────────────────────────
ALTER TABLE estados ADD COLUMN IF NOT EXISTS activo INT DEFAULT 1;

-- Políticas de escritura para el admin
CREATE POLICY IF NOT EXISTS "Admin puede insertar estados"
  ON estados FOR INSERT TO authenticated
  WITH CHECK (es_admin());

CREATE POLICY IF NOT EXISTS "Admin puede actualizar estados"
  ON estados FOR UPDATE TO authenticated
  USING (es_admin());

CREATE POLICY IF NOT EXISTS "Admin puede eliminar estados"
  ON estados FOR DELETE TO authenticated
  USING (es_admin());

-- ────────────────────────────────────────────────────────────
-- 3. SUGERENCIAS_RUTAS — columna activo
-- ────────────────────────────────────────────────────────────
ALTER TABLE sugerencias_rutas ADD COLUMN IF NOT EXISTS activo INT DEFAULT 1;

-- Políticas de escritura para el admin
CREATE POLICY IF NOT EXISTS "Admin puede insertar sugerencias"
  ON sugerencias_rutas FOR INSERT TO authenticated
  WITH CHECK (es_admin());

CREATE POLICY IF NOT EXISTS "Admin puede actualizar sugerencias"
  ON sugerencias_rutas FOR UPDATE TO authenticated
  USING (es_admin());

CREATE POLICY IF NOT EXISTS "Admin puede eliminar sugerencias"
  ON sugerencias_rutas FOR DELETE TO authenticated
  USING (es_admin());

-- ────────────────────────────────────────────────────────────
-- 4. RESERVAS — columnas extra que la app usa
-- ────────────────────────────────────────────────────────────
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS folio    TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS destino  TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS paquete  TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS fecha    TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS personas INT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS metodo   TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS estado   TEXT DEFAULT 'confirmada';
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS notas    TEXT;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS creado_en TEXT;

-- Idempotencia por folio (evita duplicados por reintentos)
CREATE UNIQUE INDEX IF NOT EXISTS reservas_folio_unique_idx ON reservas (folio) WHERE folio IS NOT NULL;

-- Validaciones de servidor para reservas
CREATE OR REPLACE FUNCTION public.validar_reserva()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.folio IS NULL OR length(trim(NEW.folio)) < 4 THEN
    RAISE EXCEPTION 'Folio inválido';
  END IF;

  IF NEW.personas IS NULL OR NEW.personas < 1 OR NEW.personas > 20 THEN
    RAISE EXCEPTION 'Número de personas inválido';
  END IF;

  IF NEW.total IS NULL OR NEW.total < 0 THEN
    RAISE EXCEPTION 'Total inválido';
  END IF;

  IF NEW.metodo IS NULL OR NEW.metodo NOT IN ('mercadopago', 'tarjeta', 'spei', 'oxxo') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;

  IF NEW.estado IS NULL OR NEW.estado NOT IN ('confirmada', 'pendiente', 'cancelada') THEN
    RAISE EXCEPTION 'Estado de reserva inválido';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservas_validacion_trigger ON reservas;
CREATE TRIGGER reservas_validacion_trigger
  BEFORE INSERT OR UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_reserva();

-- Política para que el admin vea todas las reservas
CREATE POLICY IF NOT EXISTS "Admin puede ver todas las reservas"
  ON reservas FOR SELECT TO authenticated
  USING (es_admin());

CREATE POLICY IF NOT EXISTS "Admin puede actualizar cualquier reserva"
  ON reservas FOR UPDATE TO authenticated
  USING (es_admin());

-- ────────────────────────────────────────────────────────────
-- 5. NOTIFICACIONES — relajar constraint de tipo
-- ────────────────────────────────────────────────────────────
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS creado_en TEXT;

-- Política INSERT para notificaciones (la app las crea desde el servidor)
CREATE POLICY IF NOT EXISTS "Insertar notificaciones propias"
  ON notificaciones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- ────────────────────────────────────────────────────────────
-- 6. TABLA: itinerarios
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerarios (
  id         BIGSERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE itinerarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Usuarios gestionan sus itinerarios"
  ON itinerarios FOR ALL
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- ────────────────────────────────────────────────────────────
-- 7. TABLA: itinerario_items
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerario_items (
  id            BIGSERIAL PRIMARY KEY,
  itinerario_id BIGINT REFERENCES itinerarios(id) ON DELETE CASCADE,
  clave_paquete TEXT NOT NULL,
  orden_visita  INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE itinerario_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Usuarios gestionan sus items"
  ON itinerario_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itinerarios i
      WHERE i.id = itinerario_items.itinerario_id
        AND i.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerarios i
      WHERE i.id = itinerario_items.itinerario_id
        AND i.usuario_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. TABLA: resenas
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resenas (
  id           BIGSERIAL PRIMARY KEY,
  usuario_id   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  destino      TEXT NOT NULL,
  calificacion INT  NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario   TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Reseñas públicas para leer"
  ON resenas FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Usuarios crean sus reseñas"
  ON resenas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- ────────────────────────────────────────────────────────────
-- 9. TABLA: historial
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial (
  id         BIGSERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  detalle    TEXT,
  creado_en  TEXT
);

ALTER TABLE historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Usuarios ven su historial"
  ON historial FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios insertan en historial"
  ON historial FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- ────────────────────────────────────────────────────────────
-- 10. ANALYTICS_EVENTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_eventos (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  event_name   TEXT NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform     TEXT NOT NULL DEFAULT 'unknown',
  app_version  TEXT NOT NULL DEFAULT '1.0.0',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE analytics_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Analytics insert auth"
  ON analytics_eventos FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Analytics insert anon"
  ON analytics_eventos FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Analytics select own"
  ON analytics_eventos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Analytics select admin"
  ON analytics_eventos FOR SELECT TO authenticated
  USING (es_admin());
