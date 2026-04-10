// ============================================================
//  lib/utilidades/ayudantes.test.ts  —  Pruebas unitarias
// ============================================================

import {
  obtenerEstadosPorCategoria,
  buscarEstados,
  obtenerEstadoPorId,
  filtrarPorPrecio,
  ordenarPorPrecio,
  parsearClaveRuta,
  generarClaveRuta,
  resolverInfoRuta,
  obtenerSugerenciaPorId,
  obtenerSugerenciasPorEstado,
  obtenerSugerenciasPorNivel,
} from './ayudantes';

describe('obtenerEstadosPorCategoria', () => {
  it('debe retornar estados de una categoría específica', () => {
    const playa = obtenerEstadosPorCategoria('Playa');
    expect(playa.length).toBeGreaterThan(0);
    expect(playa.every(e => e.categoria === 'Playa')).toBe(true);
  });

  it('debe retornar array vacío para categoría inexistente', () => {
    const inexistente = obtenerEstadosPorCategoria('Inexistente' as any);
    expect(inexistente).toEqual([]);
  });
});

describe('buscarEstados', () => {
  it('debe encontrar estados por nombre', () => {
    const resultados = buscarEstados('México');
    expect(resultados.some(e => e.nombre.includes('México'))).toBe(true);
  });

  it('debe ser insensible a mayúsculas', () => {
    const mayus = buscarEstados('MÉXICO');
    const minus = buscarEstados('méxico');
    expect(mayus).toEqual(minus);
  });

  it('debe retornar array vacío si no hay coincidencias', () => {
    const vacio = buscarEstados('xyz123noexiste');
    expect(vacio).toEqual([]);
  });
});

describe('obtenerEstadoPorId', () => {
  it('debe retornar el estado correcto por ID', () => {
    const estado = obtenerEstadoPorId(1);
    expect(estado?.id).toBe(1);
  });

  it('debe retornar undefined para ID inexistente', () => {
    const inexistente = obtenerEstadoPorId(99999);
    expect(inexistente).toBeUndefined();
  });
});

describe('filtrarPorPrecio', () => {
  it('debe filtrar estados dentro del rango de precio', () => {
    const filtrados = filtrarPorPrecio(1500, 2000);
    expect(filtrados.every(e => e.precio >= 1500 && e.precio <= 2000)).toBe(true);
  });

  it('debe incluir límites', () => {
    const estadoMin = filtrarPorPrecio(1800, 1800);
    expect(estadoMin.some(e => e.precio === 1800)).toBe(true);
  });
});

describe('ordenarPorPrecio', () => {
  it('debe ordenar ascendentemente por defecto', () => {
    const ordenados = ordenarPorPrecio();
    for (let i = 1; i < ordenados.length; i++) {
      expect(ordenados[i - 1].precio).toBeLessThanOrEqual(ordenados[i].precio);
    }
  });

  it('debe ordenar descendentemente cuando ascendente=false', () => {
    const ordenados = ordenarPorPrecio(false);
    for (let i = 1; i < ordenados.length; i++) {
      expect(ordenados[i - 1].precio).toBeGreaterThanOrEqual(ordenados[i].precio);
    }
  });
});

describe('parsearClaveRuta', () => {
  it('debe parsear clave con separador canónico |', () => {
    const resultado = parsearClaveRuta('México|premium');
    expect(resultado).toEqual({ estado: 'México', nivel: 'premium' });
  });

  it('debe parsear clave legacy con -', () => {
    const resultado = parsearClaveRuta('México-premium');
    expect(resultado).toEqual({ estado: 'México', nivel: 'premium' });
  });

  it('debe asumir nivel medio si no se especifica', () => {
    const resultado = parsearClaveRuta('México');
    expect(resultado.nivel).toBe('medio');
  });
});

describe('generarClaveRuta', () => {
  it('debe generar clave con formato canónico', () => {
    const clave = generarClaveRuta('México', 'economico');
    expect(clave).toBe('México|economico');
  });
});

describe('resolverInfoRuta', () => {
  it('debe resolver información completa de una ruta', () => {
    const info = resolverInfoRuta('México|medio');
    expect(info.estado).toBe('México');
    expect(info.nivel).toBe('medio');
    expect(typeof info.titulo).toBe('string');
    expect(typeof info.hotel).toBe('string');
  });

  it('debe manejar claves legacy', () => {
    const info = resolverInfoRuta('México-medio');
    expect(info.estado).toBe('México');
    expect(info.nivel).toBe('medio');
  });
});

describe('obtenerSugerenciaPorId', () => {
  it('debe retornar sugerencia por ID', () => {
    const sugerencia = obtenerSugerenciaPorId('Quintana Roo|medio');
    expect(sugerencia?.id).toBe('Quintana Roo|medio');
  });

  it('debe retornar undefined para ID inexistente', () => {
    const inexistente = obtenerSugerenciaPorId('inexistente');
    expect(inexistente).toBeUndefined();
  });
});

describe('obtenerSugerenciasPorEstado', () => {
  it('debe retornar sugerencias de un estado', () => {
    const sugerencias = obtenerSugerenciasPorEstado('México');
    expect(sugerencias.every(s => s.estado === 'México')).toBe(true);
  });
});

describe('obtenerSugerenciasPorNivel', () => {
  it('debe retornar sugerencias de un nivel', () => {
    const sugerencias = obtenerSugerenciasPorNivel('medio');
    expect(sugerencias.every(s => s.nivel === 'medio')).toBe(true);
  });
});