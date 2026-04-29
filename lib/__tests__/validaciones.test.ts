import {
  sanitizarInput,
  validarContrasena,
  validarEmail,
  validarFechaFutura,
  validarFechaViaje,
  validarImagen,
  validarNombreCompleto,
  validarReserva,
  validarTarjeta,
  validarTelefono,
} from '../validaciones';

const mañana = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
})();

const ayer = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
})();

describe('validarEmail', () => {
  test.each([
    'user@example.com',
    'eder.vg+tag@dominio.com.mx',
    'a@b.co',
  ])('acepta email válido %s', (e) => expect(validarEmail(e)).toBe(true));

  test.each(['', 'sin-arroba', 'a@b', 'a @ b.com', '@dominio.com', 'user@', 'a@b.c@d.e'])(
    'rechaza email inválido %s',
    (e) => expect(validarEmail(e)).toBe(false)
  );
});

describe('validarTelefono', () => {
  test('acepta 10 dígitos exactos', () => {
    expect(validarTelefono('5512345678')).toBe(true);
    expect(validarTelefono('55 1234 5678')).toBe(true);
  });
  test('rechaza menos de 10 dígitos', () => {
    expect(validarTelefono('551234567')).toBe(false);
  });
  test('rechaza más de 10 dígitos', () => {
    expect(validarTelefono('55123456789')).toBe(false);
  });
  test('rechaza letras', () => {
    expect(validarTelefono('55ABCD5678')).toBe(false);
  });
});

describe('validarFechaFutura', () => {
  test('acepta fecha futura', () => {
    expect(validarFechaFutura(mañana)).toBe(true);
  });
  test('rechaza fecha pasada', () => {
    expect(validarFechaFutura(ayer)).toBe(false);
  });
  test('acepta hoy (mismo día)', () => {
    const d = new Date();
    const hoy = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    expect(validarFechaFutura(hoy)).toBe(true);
  });
});

describe('validarFechaViaje', () => {
  test('acepta dentro de 1 año', () => {
    expect(validarFechaViaje(mañana)).toBe(true);
  });
  test('rechaza más de 1 año adelante', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() + 5);
    const lejos = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    expect(validarFechaViaje(lejos)).toBe(false);
  });
});

describe('validarTarjeta (Luhn)', () => {
  test('acepta Visa de prueba', () => {
    expect(validarTarjeta('4111 1111 1111 1111')).toBe(true);
  });
  test('acepta tarjeta de prueba conocida', () => {
    expect(validarTarjeta('4242424242424242')).toBe(true);
  });
  test('rechaza checksum inválido', () => {
    expect(validarTarjeta('4242424242424243')).toBe(false);
  });
  test('rechaza longitud fuera de rango', () => {
    expect(validarTarjeta('411111')).toBe(false);
    expect(validarTarjeta('4'.repeat(20))).toBe(false);
  });
  test('rechaza con letras', () => {
    expect(validarTarjeta('4111ABCD11111111')).toBe(false);
  });
});

describe('validarNombreCompleto', () => {
  test('acepta nombre con apellido', () => {
    expect(validarNombreCompleto('Eder Vargas')).toBe(true);
  });
  test('rechaza una sola palabra', () => {
    expect(validarNombreCompleto('Eder')).toBe(false);
  });
  test('rechaza menos de 3 chars', () => {
    expect(validarNombreCompleto('Ed')).toBe(false);
  });
});

describe('validarContrasena', () => {
  test('acepta contraseña fuerte', () => {
    expect(validarContrasena('Segura123').valido).toBe(true);
  });
  test('rechaza menos de 8', () => {
    expect(validarContrasena('Ab1xy').valido).toBe(false);
  });
  test('rechaza sin mayúscula', () => {
    expect(validarContrasena('todominus1').valido).toBe(false);
  });
  test('rechaza sin minúscula', () => {
    expect(validarContrasena('TODOMAYUS1').valido).toBe(false);
  });
  test('rechaza sin número', () => {
    expect(validarContrasena('SinNumeros').valido).toBe(false);
  });
});

describe('validarReserva (flujo completo)', () => {
  const base = {
    nombre_viajero: 'Eder Vargas',
    email: 'eder@test.com',
    telefono: '5512345678',
    fecha: mañana,
    personas: 2,
  };

  test('reserva válida pasa sin errores', () => {
    const r = validarReserva(base);
    expect(r.valido).toBe(true);
    expect(r.errores).toEqual({});
  });

  test('reporta múltiples errores en bloque', () => {
    const r = validarReserva({
      nombre_viajero: 'X',
      email: 'malo',
      telefono: '123',
      fecha: ayer,
      personas: 0,
    });
    expect(r.valido).toBe(false);
    expect(r.errores.nombre).toBeDefined();
    expect(r.errores.email).toBeDefined();
    expect(r.errores.telefono).toBeDefined();
    expect(r.errores.fecha).toBeDefined();
    expect(r.errores.personas).toBeDefined();
  });

  test('rechaza personas > 10', () => {
    const r = validarReserva({ ...base, personas: 11 });
    expect(r.valido).toBe(false);
    expect(r.errores.personas).toBeDefined();
  });

  test('rechaza email inválido aunque el resto sea correcto', () => {
    const r = validarReserva({ ...base, email: 'sin-arroba.com' });
    expect(r.valido).toBe(false);
    expect(Object.keys(r.errores)).toEqual(['email']);
  });
});

describe('sanitizarInput', () => {
  test('quita < y >', () => {
    expect(sanitizarInput('hola <script>x</script>')).not.toMatch(/[<>]/);
  });
  test('hace trim', () => {
    expect(sanitizarInput('   texto   ')).toBe('texto');
  });
  test('limita a 500 chars', () => {
    expect(sanitizarInput('a'.repeat(800)).length).toBe(500);
  });
});

describe('validarImagen', () => {
  test('acepta jpg/png', () => {
    expect(validarImagen('foto.jpg')).toBe(true);
    expect(validarImagen('foto.PNG')).toBe(true);
  });
  test('rechaza extensiones inválidas', () => {
    expect(validarImagen('virus.exe')).toBe(false);
  });
  test('rechaza > 5MB', () => {
    expect(validarImagen('foto.jpg', 6 * 1024 * 1024)).toBe(false);
  });
});
