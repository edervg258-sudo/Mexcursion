-- ============================================================
--  MEXCURSIÓN — Schema completo para Supabase
--  Pega todo esto en el SQL Editor de Supabase y ejecuta.
--  Es seguro correrlo varias veces (DROP IF EXISTS + CREATE).
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  FUNCIÓN AUXILIAR: detectar si el usuario actual es admin
--  SECURITY DEFINER evita recursividad en las políticas RLS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND tipo = 'admin'
  );
$$;


-- ════════════════════════════════════════════════════════════
--  1. USUARIOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.usuarios (
  id              UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT    NOT NULL,
  nombre          TEXT,
  nombre_usuario  TEXT,
  telefono        TEXT,
  foto_url        TEXT,
  idioma          TEXT    NOT NULL DEFAULT 'es',
  notificaciones  INT     NOT NULL DEFAULT 1,
  tipo            TEXT    NOT NULL DEFAULT 'normal',
  activo          INT     NOT NULL DEFAULT 1,
  push_token      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas extra por si la tabla ya existía sin ellas
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nombre_usuario  TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS telefono        TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS foto_url        TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS idioma          TEXT NOT NULL DEFAULT 'es';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS notificaciones  INT  NOT NULL DEFAULT 1;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS tipo            TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS activo          INT  NOT NULL DEFAULT 1;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS push_token      TEXT;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select_own"      ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own"      ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own"      ON public.usuarios;
DROP POLICY IF EXISTS "admin_select_usuarios"    ON public.usuarios;
DROP POLICY IF EXISTS "admin_update_usuarios"    ON public.usuarios;

CREATE POLICY "usuarios_select_own"
  ON public.usuarios FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "usuarios_insert_own"
  ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "admin_select_usuarios"
  ON public.usuarios FOR SELECT TO authenticated
  USING (es_admin());

CREATE POLICY "admin_update_usuarios"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
--  TRIGGER: crear perfil automáticamente al confirmar email
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, nombre_usuario, telefono,
                                idioma, notificaciones, tipo, activo)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'nombre_usuario',
    NEW.raw_user_meta_data->>'telefono',
    'es', 1, 'normal', 1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();


-- ════════════════════════════════════════════════════════════
--  2. ESTADOS  (destinos turísticos)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estados (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT      NOT NULL,
  categoria   TEXT,
  descripcion TEXT,
  precio      NUMERIC   DEFAULT 0,
  activo      INT       NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS activo     INT  NOT NULL DEFAULT 1;
ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS categoria  TEXT;
ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS precio     NUMERIC DEFAULT 0;

ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estados_select_public"  ON public.estados;
DROP POLICY IF EXISTS "admin_insert_estados"   ON public.estados;
DROP POLICY IF EXISTS "admin_update_estados"   ON public.estados;
DROP POLICY IF EXISTS "admin_delete_estados"   ON public.estados;

CREATE POLICY "estados_select_public"
  ON public.estados FOR SELECT
  USING (true);

CREATE POLICY "admin_insert_estados"
  ON public.estados FOR INSERT TO authenticated
  WITH CHECK (es_admin());

CREATE POLICY "admin_update_estados"
  ON public.estados FOR UPDATE TO authenticated
  USING (es_admin());

CREATE POLICY "admin_delete_estados"
  ON public.estados FOR DELETE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
--  3. FAVORITOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.favoritos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estado_id   BIGINT    NOT NULL REFERENCES public.estados(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, estado_id)
);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favoritos_all_own" ON public.favoritos;

CREATE POLICY "favoritos_all_own"
  ON public.favoritos FOR ALL TO authenticated
  USING  (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  4. SUGERENCIAS_RUTAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sugerencias_rutas (
  id         BIGSERIAL PRIMARY KEY,
  titulo     TEXT      NOT NULL,
  estado     TEXT      NOT NULL,
  nivel      TEXT      NOT NULL,
  activo     INT       NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sugerencias_rutas ADD COLUMN IF NOT EXISTS activo INT NOT NULL DEFAULT 1;

ALTER TABLE public.sugerencias_rutas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sugerencias_select_public"  ON public.sugerencias_rutas;
DROP POLICY IF EXISTS "admin_insert_sugerencias"   ON public.sugerencias_rutas;
DROP POLICY IF EXISTS "admin_update_sugerencias"   ON public.sugerencias_rutas;
DROP POLICY IF EXISTS "admin_delete_sugerencias"   ON public.sugerencias_rutas;

CREATE POLICY "sugerencias_select_public"
  ON public.sugerencias_rutas FOR SELECT
  USING (true);

CREATE POLICY "admin_insert_sugerencias"
  ON public.sugerencias_rutas FOR INSERT TO authenticated
  WITH CHECK (es_admin());

CREATE POLICY "admin_update_sugerencias"
  ON public.sugerencias_rutas FOR UPDATE TO authenticated
  USING (es_admin());

CREATE POLICY "admin_delete_sugerencias"
  ON public.sugerencias_rutas FOR DELETE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
--  5. RESERVAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reservas (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  folio       TEXT,
  destino     TEXT,
  paquete     TEXT,
  fecha       TEXT,
  personas    INT,
  total       NUMERIC   DEFAULT 0,
  metodo      TEXT,
  estado      TEXT      NOT NULL DEFAULT 'confirmada',
  notas       TEXT,
  creado_en   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS folio     TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS destino   TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS paquete   TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS fecha     TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS personas  INT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS total     NUMERIC DEFAULT 0;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS metodo    TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS estado    TEXT NOT NULL DEFAULT 'confirmada';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS notas     TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS creado_en TEXT;

-- Idempotencia de pago por folio
CREATE UNIQUE INDEX IF NOT EXISTS reservas_folio_unique_idx ON public.reservas (folio) WHERE folio IS NOT NULL;

-- Validación de payload en servidor para evitar reservas inválidas
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

DROP TRIGGER IF EXISTS reservas_validacion_trigger ON public.reservas;
CREATE TRIGGER reservas_validacion_trigger
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_reserva();

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservas_select_own"    ON public.reservas;
DROP POLICY IF EXISTS "reservas_insert_own"    ON public.reservas;
DROP POLICY IF EXISTS "admin_select_reservas"  ON public.reservas;
DROP POLICY IF EXISTS "admin_update_reservas"  ON public.reservas;

CREATE POLICY "reservas_select_own"
  ON public.reservas FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "reservas_insert_own"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "admin_select_reservas"
  ON public.reservas FOR SELECT TO authenticated
  USING (es_admin());

CREATE POLICY "admin_update_reservas"
  ON public.reservas FOR UPDATE TO authenticated
  USING (es_admin());


-- ════════════════════════════════════════════════════════════
--  6. NOTIFICACIONES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo        TEXT      NOT NULL,
  titulo      TEXT      NOT NULL,
  mensaje     TEXT,
  leida       BOOLEAN   NOT NULL DEFAULT FALSE,
  creado_en   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Eliminar constraint de tipo si existía de la versión anterior
ALTER TABLE public.notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS creado_en  TEXT;
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_all_own" ON public.notificaciones;

CREATE POLICY "notificaciones_all_own"
  ON public.notificaciones FOR ALL TO authenticated
  USING  (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  7. ITINERARIOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.itinerarios (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre      TEXT      NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itinerarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itinerarios_all_own" ON public.itinerarios;

CREATE POLICY "itinerarios_all_own"
  ON public.itinerarios FOR ALL TO authenticated
  USING  (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  8. ITINERARIO_ITEMS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.itinerario_items (
  id              BIGSERIAL PRIMARY KEY,
  itinerario_id   BIGINT    NOT NULL REFERENCES public.itinerarios(id) ON DELETE CASCADE,
  clave_paquete   TEXT      NOT NULL,
  orden_visita    INT       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itinerario_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_all_own" ON public.itinerario_items;

CREATE POLICY "items_all_own"
  ON public.itinerario_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerarios i
      WHERE i.id = itinerario_items.itinerario_id
        AND i.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itinerarios i
      WHERE i.id = itinerario_items.itinerario_id
        AND i.usuario_id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════
--  9. RESEÑAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resenas (
  id            BIGSERIAL PRIMARY KEY,
  usuario_id    UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destino       TEXT      NOT NULL,
  calificacion  INT       NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resenas_select_public" ON public.resenas;
DROP POLICY IF EXISTS "resenas_insert_own"    ON public.resenas;

CREATE POLICY "resenas_select_public"
  ON public.resenas FOR SELECT
  USING (true);

CREATE POLICY "resenas_insert_own"
  ON public.resenas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  10. HISTORIAL
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.historial (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID      NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo        TEXT      NOT NULL,
  titulo      TEXT      NOT NULL,
  detalle     TEXT,
  creado_en   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_all_own" ON public.historial;

CREATE POLICY "historial_all_own"
  ON public.historial FOR ALL TO authenticated
  USING  (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);


-- ════════════════════════════════════════════════════════════
--  11. ANALYTICS_EVENTOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.analytics_eventos (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  event_name   TEXT NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform     TEXT NOT NULL DEFAULT 'unknown',
  app_version  TEXT NOT NULL DEFAULT '1.0.0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analytics_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_insert_auth" ON public.analytics_eventos;
DROP POLICY IF EXISTS "analytics_insert_anon" ON public.analytics_eventos;
DROP POLICY IF EXISTS "analytics_select_own" ON public.analytics_eventos;
DROP POLICY IF EXISTS "analytics_select_admin" ON public.analytics_eventos;

CREATE POLICY "analytics_insert_auth"
  ON public.analytics_eventos FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "analytics_insert_anon"
  ON public.analytics_eventos FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "analytics_select_own"
  ON public.analytics_eventos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "analytics_select_admin"
  ON public.analytics_eventos FOR SELECT TO authenticated
  USING (es_admin());
