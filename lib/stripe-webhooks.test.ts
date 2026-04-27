// ============================================================
//  lib/notificaciones-pago.test.ts  (anteriormente stripe-webhooks.test.ts)
//  Tests para el sistema de notificaciones post-pago y auditoría.
// ============================================================

import { crearNotificacion, cargarNotificaciones, agregarHistorial } from './supabase-db';
import { estadoReservaPorMetodo, type MetodoPago } from './utilidades/pago';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── Notificaciones post-pago ──────────────────────────────────────────────────

describe('Notificaciones post-pago', () => {
  describe('crearNotificacion — tipos de pago', () => {
    const METODOS: MetodoPago[] = ['tarjeta', 'spei', 'oxxo'];

    METODOS.forEach(metodo => {
      it(`crea notificación "pago_exitoso" para ${metodo}`, async () => {
        const insertMock = jest.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: insertMock });

        await crearNotificacion(
          'user-1',
          'pago_exitoso',
          `Pago confirmado - Folio: FOLIO-${metodo.toUpperCase()}`,
          JSON.stringify({ folio: `FOLIO-${metodo}`, metodo })
        );

        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            usuario_id: 'user-1',
            tipo: 'pago_exitoso',
          })
        );
      });
    });

    it('el mensaje incluye el folio de reserva', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await crearNotificacion('uid', 'pago_exitoso', 'Pago confirmado - Folio: MX-9999', '{}');

      const payload = insertMock.mock.calls[0][0];
      expect(payload.titulo).toContain('MX-9999');
    });

    it('el metadata incluye el método de pago', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });
      const meta = JSON.stringify({ folio: 'MX-001', metodo: 'oxxo' });

      await crearNotificacion('uid', 'pago_exitoso', 'Pago', meta);

      const payload = insertMock.mock.calls[0][0];
      const parsed = JSON.parse(payload.mensaje);
      expect(parsed.metodo).toBe('oxxo');
    });

    it('se crea la notificación en la tabla correcta', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await crearNotificacion('uid', 'tipo', 'titulo', 'mensaje');

      expect(mockFrom).toHaveBeenCalledWith('notificaciones');
    });

    it('no propaga errores si la inserción falla (fire-and-forget)', async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Timeout' } }),
      });

      await expect(
        crearNotificacion('uid', 'pago_exitoso', 'titulo', 'msg')
      ).resolves.toBeUndefined();
    });
  });

  describe('cargarNotificaciones', () => {
    function makeNotifChain(resolvedValue: unknown) {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue(resolvedValue),
      };
    }

    it('retorna notificaciones del usuario ordenadas por fecha', async () => {
      const mockNotifs = [
        { id: 2, tipo: 'pago_exitoso', titulo: 'Pago confirmado', leida: false },
        { id: 1, tipo: 'pago_exitoso', titulo: 'Pago anterior', leida: true },
      ];
      mockFrom.mockReturnValue(makeNotifChain({ data: mockNotifs, error: null }));

      const result = await cargarNotificaciones('user-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
    });

    it('retorna array vacío si no hay notificaciones', async () => {
      mockFrom.mockReturnValue(makeNotifChain({ data: [], error: null }));

      const result = await cargarNotificaciones('user-sin-notifs');
      expect(result).toEqual([]);
    });

    it('retorna array vacío si Supabase devuelve error', async () => {
      mockFrom.mockReturnValue(makeNotifChain({ data: null, error: { message: 'DB error' } }));

      const result = await cargarNotificaciones('uid');
      expect(result).toEqual([]);
    });

    it('mapea leida boolean a entero (1/0) para compatibilidad', async () => {
      mockFrom.mockReturnValue(makeNotifChain({
        data: [{ id: 1, leida: true }, { id: 2, leida: false }],
        error: null,
      }));

      const result = await cargarNotificaciones('uid');
      expect(result[0].leida).toBe(1);
      expect(result[1].leida).toBe(0);
    });
  });
});

// ─── Historial de auditoría de pagos ──────────────────────────────────────────

describe('Historial de auditoría de pagos', () => {
  it('registra entrada de historial para cada método de pago', async () => {
    const METODOS: MetodoPago[] = ['tarjeta', 'spei', 'oxxo'];

    for (const metodo of METODOS) {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await agregarHistorial(
        'uid',
        'pago',
        `Pago realizado con ${metodo} - Folio: FOLIO`,
        JSON.stringify({ folio: 'FOLIO', metodo, monto: 5000 })
      );

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'pago', usuario_id: 'uid' })
      );
    }
  });

  it('el detalle JSON contiene folio, método y monto', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });
    const detalle = JSON.stringify({ folio: 'MX-123', metodo: 'spei', monto: 7500 });

    await agregarHistorial('uid', 'pago', 'Pago spei', detalle);

    const payload = insertMock.mock.calls[0][0];
    const parsed = JSON.parse(payload.detalle);
    expect(parsed).toMatchObject({ folio: 'MX-123', metodo: 'spei', monto: 7500 });
  });

  it('inserta con fecha de creación actual', async () => {
    const before = Date.now();
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await agregarHistorial('uid', 'pago', 'titulo', '{}');

    const after = Date.now();
    const payload = insertMock.mock.calls[0][0];
    const ts = new Date(payload.creado_en).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── Transiciones de estado de reserva ───────────────────────────────────────

describe('Transiciones de estado de reserva por método de pago', () => {
  it('tarjeta → confirmada (pago inmediato)', () => {
    expect(estadoReservaPorMetodo('tarjeta')).toBe('confirmada');
  });

  it('spei → pendiente (espera confirmación bancaria)', () => {
    expect(estadoReservaPorMetodo('spei')).toBe('pendiente');
  });

  it('oxxo → pendiente (espera pago en tienda)', () => {
    expect(estadoReservaPorMetodo('oxxo')).toBe('pendiente');
  });

  it('solo tarjeta queda confirmada directamente', () => {
    const metodos: MetodoPago[] = ['tarjeta', 'spei', 'oxxo'];
    const confirmados = metodos.filter(m => estadoReservaPorMetodo(m) === 'confirmada');
    expect(confirmados).toEqual(['tarjeta']);
  });

  it('SPEI y OXXO siempre quedan en estado pendiente', () => {
    expect(estadoReservaPorMetodo('spei')).toBe('pendiente');
    expect(estadoReservaPorMetodo('oxxo')).toBe('pendiente');
  });
});

// ─── Idempotencia de notificaciones ───────────────────────────────────────────

describe('Idempotencia — misma reserva procesada dos veces', () => {
  it('crearNotificacion con el mismo folio puede llamarse múltiples veces sin error', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const folio = 'MX-IDEM-001';
    await crearNotificacion('uid', 'pago_exitoso', `Pago - Folio: ${folio}`, '{}');
    await crearNotificacion('uid', 'pago_exitoso', `Pago - Folio: ${folio}`, '{}');

    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('agregarHistorial con el mismo folio puede llamarse múltiples veces', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const folio = 'MX-IDEM-002';
    await agregarHistorial('uid', 'pago', `Pago - Folio: ${folio}`, '{}');
    await agregarHistorial('uid', 'pago', `Pago - Folio: ${folio}`, '{}');

    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
