// ============================================================
//  lib/pago-flujo.test.ts  (anteriormente stripe.test.ts)
//  Tests del flujo de guardado de reserva para cada método de pago.
//  No depende de ningún SDK de pago externo.
// ============================================================

import {
  guardarReserva,
  crearNotificacion,
  agregarHistorial,
  obtenerUsuarioActivo,
  invalidarSesionCache,
  cargarNotificaciones,
} from './supabase-db';
import { estadoReservaPorMetodo, generarReferenciaOxxo } from './utilidades/pago';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('./sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureApiError: jest.fn(),
}));

const mockFrom = supabase.from as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

// Helper: mock para el SELECT de idempotencia (no existe registro) + INSERT exitoso
function mockGuardarChain(insertPayload: Record<string, unknown> = {}) {
  const insertMock = jest.fn().mockResolvedValue({ error: null, ...insertPayload });
  const selectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  mockFrom
    .mockReturnValueOnce(selectChain)      // SELECT idempotencia
    .mockReturnValueOnce({ insert: insertMock }); // INSERT
  return { insertMock, selectChain };
}

beforeEach(() => {
  invalidarSesionCache();
  jest.clearAllMocks();
});

// ─── guardarReserva ────────────────────────────────────────────────────────────

describe('guardarReserva — métodos de pago', () => {
  it('guarda reserva OXXO con estado pendiente', async () => {
    const { insertMock } = mockGuardarChain();
    const estado = estadoReservaPorMetodo('oxxo');

    const result = await guardarReserva(
      'user-1', 'FOLIO-OXXO', 'Cancún', 'economico',
      '15/07/2026', 2, 3000, 'oxxo', estado
    );

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ metodo: 'oxxo', estado: 'pendiente' })
    );
  });

  it('guarda reserva SPEI con estado pendiente', async () => {
    const { insertMock } = mockGuardarChain();
    const estado = estadoReservaPorMetodo('spei');

    const result = await guardarReserva(
      'user-2', 'FOLIO-SPEI', 'Oaxaca', 'medio',
      '01/09/2026', 1, 5000, 'spei', estado, 'Sin gluten'
    );

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ metodo: 'spei', estado: 'pendiente', notas: 'Sin gluten' })
    );
  });

  it('guarda reserva tarjeta con estado confirmada', async () => {
    const { insertMock } = mockGuardarChain();
    const estado = estadoReservaPorMetodo('tarjeta');

    const result = await guardarReserva(
      'user-3', 'FOLIO-CARD', 'CDMX', 'premium',
      '20/12/2026', 4, 12000, 'tarjeta', estado
    );

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ metodo: 'tarjeta', estado: 'confirmada' })
    );
  });

  it('convierte la fecha DD/MM/YYYY a formato ISO en el payload', async () => {
    const { insertMock } = mockGuardarChain();

    await guardarReserva('uid', 'FOL001', 'Mérida', 'economico', '05/11/2026', 3, 6000, 'spei', 'pendiente');

    const payload = insertMock.mock.calls[0][0];
    expect(payload.fecha).toBe('2026-11-05');
  });

  it('el payload contiene todos los campos requeridos', async () => {
    const { insertMock } = mockGuardarChain();

    await guardarReserva('uid', 'FOL-TEST', 'Mérida', 'economico', '05/11/2026', 3, 6000, 'spei', 'pendiente', 'Nota test');

    const payload = insertMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      usuario_id: 'uid',
      folio: 'FOL-TEST',
      destino: 'Mérida',
      paquete: 'economico',
      personas: 3,
      total: 6000,
      metodo: 'spei',
      estado: 'pendiente',
      notas: 'Nota test',
    });
  });

  it('retorna false cuando Supabase devuelve error en INSERT', async () => {
    const selectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce({ insert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }) });

    const result = await guardarReserva(
      'user-4', 'FOLIO-ERR', 'Guadalajara', 'medio', '10/08/2026', 2, 4000, 'oxxo', 'pendiente'
    );

    expect(result).toBe(false);
  });

  it('retorna false si el folio tiene menos de 4 caracteres', async () => {
    const result = await guardarReserva('uid', 'FO', 'Cancún', 'medio', '01/01/2026', 1, 1000, 'spei', 'pendiente');
    expect(result).toBe(false);
  });

  it('retorna false si el número de personas es 0', async () => {
    const result = await guardarReserva('uid', 'FOLIO-VALID', 'Cancún', 'medio', '01/01/2026', 0, 1000, 'spei', 'pendiente');
    expect(result).toBe(false);
  });

  it('retorna true (idempotente) si el folio ya existe para ese usuario', async () => {
    const selectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 42 }, error: null }),
    };
    mockFrom.mockReturnValue(selectChain);

    const result = await guardarReserva(
      'uid', 'FOLIO-DUP', 'Cancún', 'premium', '15/07/2026', 2, 5000, 'oxxo', 'pendiente'
    );

    expect(result).toBe(true);
  });
});

// ─── crearNotificacion ─────────────────────────────────────────────────────────

describe('crearNotificacion — post-pago', () => {
  it('inserta en la tabla notificaciones', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await crearNotificacion('user-1', 'pago_exitoso', 'Pago confirmado - Folio: MX123', JSON.stringify({ folio: 'MX123', metodo: 'oxxo' }));

    expect(mockFrom).toHaveBeenCalledWith('notificaciones');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'user-1',
        tipo: 'pago_exitoso',
        titulo: 'Pago confirmado - Folio: MX123',
      })
    );
  });

  it('el mensaje contiene el JSON serializado del metadata', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });
    const meta = JSON.stringify({ folio: 'MX123', metodo: 'spei' });

    await crearNotificacion('uid', 'pago_exitoso', 'Pago', meta);

    const payload = insertMock.mock.calls[0][0];
    expect(JSON.parse(payload.mensaje)).toMatchObject({ folio: 'MX123', metodo: 'spei' });
  });

  it('no propaga errores si Supabase falla (fire-and-forget)', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: 'Timeout' } }),
    });

    await expect(
      crearNotificacion('uid', 'pago_exitoso', 'titulo', '{}')
    ).resolves.toBeUndefined();
  });

  it('crea notificación para cada método de pago sin error', async () => {
    for (const metodo of ['tarjeta', 'spei', 'oxxo'] as const) {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await expect(
        crearNotificacion('uid', 'pago_exitoso', `Folio-${metodo}`, JSON.stringify({ metodo }))
      ).resolves.toBeUndefined();

      expect(insertMock).toHaveBeenCalled();
    }
  });
});

// ─── agregarHistorial ──────────────────────────────────────────────────────────

describe('agregarHistorial — registro de auditoría', () => {
  it('inserta en la tabla historial', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await agregarHistorial('user-1', 'pago', 'Pago con oxxo - Folio: MX123', JSON.stringify({ folio: 'MX123', metodo: 'oxxo', monto: 3000 }));

    expect(mockFrom).toHaveBeenCalledWith('historial');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'user-1',
        tipo: 'pago',
        titulo: 'Pago con oxxo - Folio: MX123',
      })
    );
  });

  it('el detalle JSON contiene folio, método y monto', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });
    const detalle = JSON.stringify({ folio: 'MX-123', metodo: 'spei', monto: 7500 });

    await agregarHistorial('uid', 'pago', 'Pago spei', detalle);

    const payload = insertMock.mock.calls[0][0];
    expect(JSON.parse(payload.detalle)).toMatchObject({ folio: 'MX-123', metodo: 'spei', monto: 7500 });
  });

  it('incluye timestamp de creación', async () => {
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

  it('no lanza error si la inserción falla', async () => {
    mockFrom.mockImplementation(() => { throw new Error('DB down'); });

    await expect(
      agregarHistorial('user-x', 'pago', 'titulo', 'detalle')
    ).resolves.toBeUndefined();
  });
});

// ─── obtenerUsuarioActivo ──────────────────────────────────────────────────────

describe('obtenerUsuarioActivo — precondición del flujo de pago', () => {
  it('retorna null cuando no hay sesión activa', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const user = await obtenerUsuarioActivo();
    expect(user).toBeNull();
  });

  it('retorna el usuario cuando la sesión es válida', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });
    // Mock de la query a tabla usuarios
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'user-123', tipo: 'usuario', activo: true },
        error: null,
      }),
    });

    const user = await obtenerUsuarioActivo();
    expect(user).toBeTruthy();
    expect(user?.id).toBe('user-123');
  });

  it('retorna null si Supabase devuelve error de sesión', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired' },
    });

    const user = await obtenerUsuarioActivo();
    expect(user).toBeNull();
  });
});

// ─── Referencia OXXO ──────────────────────────────────────────────────────────

describe('Referencia OXXO — coherencia entre pantalla y guardado', () => {
  it('la referencia generada es estable para los mismos datos de reserva', () => {
    const seed = 'Cancún|premium|15/07/2026|2';
    expect(generarReferenciaOxxo(seed)).toBe(generarReferenciaOxxo(seed));
  });

  it('tiene exactamente 16 dígitos en distintos destinos', () => {
    ['Mérida|economico|01/01/2027|1', 'Chiapas|medio|31/12/2026|5', 'Guanajuato|premium|15/08/2026|3']
      .forEach(seed => expect(generarReferenciaOxxo(seed)).toMatch(/^\d{16}$/));
  });

  it('distintos destinos producen referencias distintas', () => {
    const refs = ['Cancún', 'Oaxaca', 'Mérida', 'CDMX']
      .map(d => generarReferenciaOxxo(`${d}|medio|15/07/2026|2`));
    expect(new Set(refs).size).toBe(4);
  });
});
