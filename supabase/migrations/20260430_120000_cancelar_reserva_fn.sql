-- ============================================================
--  Función server-side: validar cancelación de reserva
--  Calcula el costo de cancelación igual que politicas-negocio.ts
--  pero ejecutado en la BD para garantizar integridad.
-- ============================================================

CREATE OR REPLACE FUNCTION cancelar_reserva_segura(
  p_reserva_id   INTEGER,
  p_usuario_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva      reservas%ROWTYPE;
  v_dias_antes   INTEGER;
  v_costo        NUMERIC;
  v_reembolsable NUMERIC;
  v_mensaje      TEXT;
BEGIN
  -- 1. Obtener reserva validando que pertenece al usuario
  SELECT * INTO v_reserva
  FROM reservas
  WHERE id = p_reserva_id AND usuario_id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('exito', false, 'error', 'Reserva no encontrada.');
  END IF;

  IF v_reserva.estado = 'cancelada' THEN
    RETURN json_build_object('exito', false, 'error', 'La reserva ya está cancelada.');
  END IF;

  IF v_reserva.estado = 'completada' THEN
    RETURN json_build_object('exito', false, 'error', 'No se puede cancelar una reserva completada.');
  END IF;

  -- 2. Calcular días entre hoy y la fecha del viaje
  v_dias_antes := (v_reserva.fecha::DATE - CURRENT_DATE);

  -- 3. Política MODERADA (por defecto): refleja politicas-negocio.ts
  IF v_dias_antes >= 7 THEN
    v_costo := 0;
    v_mensaje := 'Cancelación gratuita';
  ELSIF v_dias_antes >= 3 THEN
    v_costo := v_reserva.total * 0.05;
    v_mensaje := 'Cargo del 5% por cancelación tardía';
  ELSIF v_dias_antes >= 0 THEN
    v_costo := v_reserva.total * 0.15;
    v_mensaje := 'Cargo del 15% por cancelación de último momento';
  ELSE
    -- Viaje ya pasó — sin reembolso
    v_costo := v_reserva.total;
    v_mensaje := 'Viaje ya transcurrido — sin reembolso';
  END IF;

  v_reembolsable := v_reserva.total - v_costo;

  -- 4. Ejecutar la cancelación
  UPDATE reservas SET estado = 'cancelada' WHERE id = p_reserva_id;

  -- 5. Registrar notificación
  INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, creado_en)
  VALUES (
    p_usuario_id,
    'cancelacion',
    'Reserva cancelada',
    'Tu reserva (folio ' || v_reserva.folio || ') ha sido cancelada. ' || v_mensaje,
    false,
    NOW()
  );

  RETURN json_build_object(
    'exito',        true,
    'costo',        v_costo,
    'reembolsable', v_reembolsable,
    'mensaje',      v_mensaje
  );
END;
$$;

-- Solo el usuario dueño o un admin pueden llamar esta función
REVOKE ALL ON FUNCTION cancelar_reserva_segura(INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancelar_reserva_segura(INTEGER, UUID) TO authenticated;
