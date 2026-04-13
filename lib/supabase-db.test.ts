// ============================================================
//  lib/supabase-db.test.ts  —  Pruebas unitarias para Supabase DB
// ============================================================

import { supabase } from './supabase';
import {
  obtenerTodosLosDestinos,
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActivo,
  invalidarSesionCache,
  cargarFavoritos,
  alternarFavorito,
  obtenerItinerarios,
  crearItinerario,
  obtenerRutasSugeridas,
  guardarReserva,
  cargarReservas,
  cargarResenas,
  guardarResena,
  cargarNotificaciones,
  crearNotificacion,
} from './supabase-db';

beforeEach(() => {
  invalidarSesionCache();
  jest.clearAllMocks();
});

// Mock Supabase
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('obtenerTodosLosDestinos', () => {
  it('debe retornar destinos cuando la query es exitosa', async () => {
    const mockData = [{ id: 1, nombre: 'México' }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const result = await obtenerTodosLosDestinos();
    expect(result).toEqual(mockData);
  });

  it('debe retornar array vacío en caso de error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      }),
    });

    const result = await obtenerTodosLosDestinos();
    expect(result).toEqual([]);
  });
});

describe('registrarUsuario', () => {
  it('debe registrar usuario exitosamente', async () => {
    const mockUser = { id: '123' };
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await registrarUsuario('nombre', 'usuario', 'email@test.com', 'pass', '123');
    expect(result.exito).toBe(true);
  });

  it('debe manejar error de email ya registrado', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'already' },
    });

    const result = await registrarUsuario('nombre', 'usuario', 'email@test.com', 'pass', '123');
    expect(result.exito).toBe(false);
    expect(result.error).toBe('Ya existe una cuenta con ese correo.');
  });
});

describe('iniciarSesion', () => {
  it('debe iniciar sesión exitosamente', async () => {
    const mockUser = { id: '123', email: 'email@test.com' };
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const result = await iniciarSesion('email@test.com', 'pass');
    expect(result.exito).toBe(true);
    expect(result.usuario).toBeUndefined(); // since no data in usuarios table
  });

  it('debe manejar contraseña incorrecta', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const result = await iniciarSesion('email@test.com', 'wrongpass');
    expect(result.exito).toBe(false);
    expect(result.error).toBe('Correo o contraseña incorrectos.');
  });
});

describe('obtenerUsuarioActivo', () => {
  it('debe retornar usuario desde sesión', async () => {
    const mockUser = { id: '123', email: 'email@test.com' };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: { id: '123', email: 'email@test.com', nombre: 'Test' }, error: null }),
      }),
    });

    const result = await obtenerUsuarioActivo();
    expect(result?.id).toBe('123');
    expect(result?.correo).toBe('email@test.com');
  });

  it('debe retornar null si no hay sesión', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await obtenerUsuarioActivo();
    expect(result).toBeNull();
  });
});

describe('cargarFavoritos', () => {
  it('debe cargar favoritos del usuario', async () => {
    const mockData = [{ estado_id: 1 }, { estado_id: 2 }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const result = await cargarFavoritos('user123');
    expect(result).toEqual([1, 2]);
  });
});

describe('alternarFavorito', () => {
  it('debe alternar favorito correctamente', async () => {
    (supabase.from as jest.Mock)
      // Llamada 1: select + maybeSingle para verificar si existe
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
            }),
          }),
        }),
      })
      // Llamada 2: delete del favorito existente
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })
      // Llamada 3: cargarFavoritos para retornar lista actualizada
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ estado_id: 2 }], error: null }),
        }),
      });

    const result = await alternarFavorito('user123', 1);
    expect(result).toEqual([2]);
  });
});

describe('obtenerItinerarios', () => {
  it('debe obtener itinerarios del usuario', async () => {
    const mockData = [{ id: 1, nombre: 'Viaje 1', itinerario_items: [] }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const result = await obtenerItinerarios('user123');
    expect(result.length).toBe(1);
    expect(result[0].nombre).toBe('Viaje 1');
  });
});

describe('crearItinerario', () => {
  it('debe crear itinerario y retornar lista actualizada', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [{ id: 1, nombre: 'Nuevo' }], error: null }),
        }),
      }),
    });

    const result = await crearItinerario('user123', 'Nuevo');
    expect(result.length).toBe(1);
    expect(result[0].nombre).toBe('Nuevo');
  });
});

describe('obtenerRutasSugeridas', () => {
  it('debe obtener rutas sugeridas', async () => {
    const mockData = [{ id: '1', titulo: 'Ruta 1' }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const result = await obtenerRutasSugeridas();
    expect(result).toEqual(mockData);
  });
});

describe('guardarReserva', () => {
  it('debe guardar reserva exitosamente', async () => {
    (supabase.from as jest.Mock)
      // llamada 1: búsqueda por folio para idempotencia
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      })
      // llamada 2: insert real
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

    const result = await guardarReserva('user123', 'FOLIO', 'Destino', 'Paquete', '2024-01-01', 2, 1000, 'tarjeta');
    expect(result).toBe(true);
  });
});

describe('cargarReservas', () => {
  it('debe cargar reservas del usuario', async () => {
    const mockData = [{ id: 1, destino: 'México' }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      }),
    });

    const result = await cargarReservas('user123');
    expect(result).toEqual(mockData);
  });
});

describe('cargarResenas', () => {
  it('debe cargar reseñas de un destino', async () => {
    // La función hace join con usuarios y mapea r.usuarios?.nombre
    const mockData = [{ calificacion: 5, comentario: 'Excelente', usuarios: { nombre: 'Ana' } }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const result = await cargarResenas('México');
    expect(result[0].calificacion).toBe(5);
    expect(result[0].nombre).toBe('Ana');
  });
});

describe('guardarResena', () => {
  it('debe guardar reseña exitosamente', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await guardarResena('user123', 'México', 5, 'Buen lugar');
    expect(result.exito).toBe(true);
  });
});

describe('cargarNotificaciones', () => {
  it('debe cargar notificaciones del usuario', async () => {
    // La función mapea leida boolean → 0/1
    const mockData = [{ id: 1, titulo: 'Notif', leida: false }];
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      }),
    });

    const result = await cargarNotificaciones('user123');
    expect(result[0].id).toBe(1);
    expect(result[0].leida).toBe(0); // boolean false → 0
  });
});

describe('crearNotificacion', () => {
  it('debe crear notificación', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    await expect(crearNotificacion('user123', 'tipo', 'titulo', 'mensaje')).resolves.toBeUndefined();
  });
});
