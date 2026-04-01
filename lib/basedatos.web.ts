// ============================================================
//  basedatos.web.ts — Implementación web con IndexedDB
// ============================================================
import { TODOS_LOS_ESTADOS } from './constantes';

const DB_NOMBRE = 'mexcursion';
// Versiones:
//   1 — usuarios, sesiones_activas, favoritos, rutas, destinos_ruta
//   2 — reservas
//   3 — resenas, notificaciones
//   4 — historial
//   5 — destinos
//   6 — itinerarios, itinerario_items, rutas_sugeridas
const DB_VERSION = 6;

let _idb: IDBDatabase | null = null;

// ─────────────────────────────────────────────
// Tipos básicos
// ─────────────────────────────────────────────
export interface Usuario {
  id: number;
  nombre: string;
  nombre_usuario: string;
  correo: string;
  contrasena: string; // hash SHA-256 hex
  telefono: string;
  idioma: string;
  notificaciones: number;
  tipo?: string;
  activo?: number;
  creado_en: string;
}

export interface Sesion {
  id: number;
  usuario_id: number;
  clave_sesion: string;
  creado_en: string;
}

// ─────────────────────────────────────────────
// Utilidad: hash SHA-256 (Web Crypto API)
// FIX: Las contraseñas ya no se guardan en texto plano
// ─────────────────────────────────────────────
async function hashContrasena(contrasena: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(contrasena)
  );
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// FIX: Generar token de sesión con Web Crypto (no Math.random)
function generarClaveSesion(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// Abrir base de datos
// ─────────────────────────────────────────────
function obtenerIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (_idb) return resolve(_idb);

    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('usuarios')) {
        const s = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
        s.createIndex('correo', 'correo', { unique: true });
        s.createIndex('nombre_usuario', 'nombre_usuario', { unique: true });
      }

      if (!db.objectStoreNames.contains('sesiones_activas')) {
        const s = db.createObjectStore('sesiones_activas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('favoritos')) {
        const s = db.createObjectStore('favoritos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('rutas')) {
        const s = db.createObjectStore('rutas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('destinos_ruta')) {
        const s = db.createObjectStore('destinos_ruta', { keyPath: 'id', autoIncrement: true });
        s.createIndex('ruta_id', 'ruta_id');
      }

      if (!db.objectStoreNames.contains('itinerarios')) {
        const s = db.createObjectStore('itinerarios', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('itinerario_items')) {
        const s = db.createObjectStore('itinerario_items', { keyPath: 'id', autoIncrement: true });
        s.createIndex('itinerario_id', 'itinerario_id');
      }

      if (!db.objectStoreNames.contains('rutas_sugeridas')) {
        db.createObjectStore('rutas_sugeridas', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('reservas')) {
        const s = db.createObjectStore('reservas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
        s.createIndex('folio', 'folio', { unique: true });
      }

      if (!db.objectStoreNames.contains('resenas')) {
        const s = db.createObjectStore('resenas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
        s.createIndex('destino', 'destino');
      }

      if (!db.objectStoreNames.contains('notificaciones')) {
        const s = db.createObjectStore('notificaciones', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('historial')) {
        const s = db.createObjectStore('historial', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario_id', 'usuario_id');
      }

      if (!db.objectStoreNames.contains('destinos')) {
        db.createObjectStore('destinos', { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => {
      _idb = (e.target as IDBOpenDBRequest).result;
      
      const tx = _idb.transaction('destinos', 'readwrite');
      const store = tx.objectStore('destinos');
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          for (const estado of TODOS_LOS_ESTADOS) {
            store.add({
              id: estado.id,
              nombre: estado.nombre,
              categoria: estado.categoria,
              descripcion: estado.descripcion,
              precio: estado.precio,
              activo: 1,
              creado_en: new Date().toISOString()
            });
          }
        }
      };

      if (_idb.objectStoreNames.contains('rutas_sugeridas')) {
        import('./constantes').then(({ SUGERENCIAS_RUTAS }) => {
          // Seed incremental: solo inserta titulos que no existan
          const txR = _idb!.transaction('rutas_sugeridas', 'readwrite');
          const str = txR.objectStore('rutas_sugeridas');
          // Primero obtenemos todos los titulos existentes
          const existingReq = str.getAll();
          existingReq.onsuccess = () => {
            const existing = new Set((existingReq.result as any[]).map((r: any) => r.titulo));
            for (const s of SUGERENCIAS_RUTAS) {
              if (!existing.has(s.titulo)) {
                str.add({
                  titulo: s.titulo,
                  estado: s.estado,
                  nivel: s.nivel,
                  activo: 1,
                  creado_en: new Date().toISOString()
                });
              }
            }
          };
        });
      }

      resolve(_idb);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function prom<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string | string[],
  modo: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, modo);
    t.onerror = () => reject(t.error);
    fn(t).then(resolve).catch(reject);
  });
}

function todos<T>(store: IDBObjectStore): Promise<T[]> {
  return prom(store.getAll());
}

function porIndice<T>(store: IDBObjectStore, indice: string, clave: IDBValidKey): Promise<T[]> {
  return prom(store.index(indice).getAll(clave));
}

function primero<T>(store: IDBObjectStore, indice: string, clave: IDBValidKey): Promise<T | undefined> {
  return prom(store.index(indice).get(clave));
}

// ============================================================
// USUARIOS
// ============================================================

export async function registrarUsuario(
  nombre: string,
  nombre_usuario: string,
  correo: string,
  contrasena: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const db   = await obtenerIDB();
    // FIX: guardar hash en lugar de texto plano
    const hash = await hashContrasena(contrasena);

    return await tx(db, ['usuarios', 'notificaciones'], 'readwrite', async (t) => {
      const store = t.objectStore('usuarios');

      if (await primero(store, 'correo', correo))
        return { exito: false, error: 'Ya existe una cuenta con ese correo.' };

      if (await primero(store, 'nombre_usuario', nombre_usuario))
        return { exito: false, error: 'Ese nombre de usuario ya está en uso.' };

      const userId = await prom(store.add({
        nombre,
        nombre_usuario,
        correo,
        contrasena: hash,
        telefono: '',
        idioma: 'es',
        notificaciones: 1,
        tipo: 'normal',
        activo: 1,
        creado_en: new Date().toISOString(),
      }));

      await prom(t.objectStore('notificaciones').add({
        usuario_id: userId,
        tipo: 'sistema',
        titulo: 'Bienvenido a Mexcursión',
        mensaje: 'Descubre los mejores destinos de México. ¡Empieza a explorar!',
        leida: 0,
        creado_en: new Date().toISOString(),
      }));

      return { exito: true };
    });
  } catch (e) {
    console.error('[basedatos] registrarUsuario:', e);
    return { exito: false, error: 'Error al registrar' };
  }
}

// ─────────────────────────────────────────────
// BUSCAR USUARIO POR CORREO
// ─────────────────────────────────────────────
export async function buscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
  try {
    const db = await obtenerIDB();
    const usuario = await tx(db, 'usuarios', 'readonly', async (t) =>
      primero<Usuario>(t.objectStore('usuarios'), 'correo', correo)
    );
    return usuario ?? null;
  } catch (e) {
    console.error('[basedatos] buscarUsuarioPorCorreo:', e);
    return null;
  }
}

// ─────────────────────────────────────────────
// INICIAR SESIÓN
// ─────────────────────────────────────────────
export async function iniciarSesion(
  correo: string,
  contrasena: string
): Promise<{ exito: boolean; usuario?: Usuario; error?: string }> {
  try {
    const db   = await obtenerIDB();
    // FIX: comparar con hash, no texto plano
    const hash = await hashContrasena(contrasena);

    const usuario = await tx(db, 'usuarios', 'readonly', async (t) =>
      primero<Usuario>(t.objectStore('usuarios'), 'correo', correo)
    );

    if (!usuario || usuario.contrasena !== hash)
      return { exito: false, error: 'Correo o contraseña incorrectos.' };

    await tx(db, 'sesiones_activas', 'readwrite', async (t) => {
      const store  = t.objectStore('sesiones_activas');
      const previas: Sesion[] = await porIndice(store, 'usuario_id', usuario.id);
      for (const s of previas) await prom(store.delete(s.id));

      await prom(store.add({
        usuario_id:   usuario.id,
        // FIX: token generado con Web Crypto, no Math.random
        clave_sesion: generarClaveSesion(),
        creado_en:    new Date().toISOString(),
      }));
    });

    return { exito: true, usuario };
  } catch (e) {
    console.error('[basedatos] iniciarSesion:', e);
    return { exito: false, error: 'Error al iniciar sesión.' };
  }
}

// ─────────────────────────────────────────────
// CERRAR SESIÓN
// ─────────────────────────────────────────────
export async function cerrarSesion(usuario_id?: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'sesiones_activas', 'readwrite', async (t) => {
      const store = t.objectStore('sesiones_activas');
      if (usuario_id) {
        const sesionesUsuario: Sesion[] = await porIndice(store, 'usuario_id', usuario_id);
        for (const s of sesionesUsuario) await prom(store.delete(s.id));
      } else {
        const todas: Sesion[] = await todos(store);
        for (const s of todas) await prom(store.delete(s.id));
      }
    });
  } catch (e) {
    console.error('[basedatos] cerrarSesion:', e);
  }
}

// ─────────────────────────────────────────────
// OBTENER USUARIO ACTIVO
// ─────────────────────────────────────────────
export async function obtenerUsuarioActivo(): Promise<Usuario | null> {
  try {
    const db      = await obtenerIDB();
    const sesiones: Sesion[] = await tx(db, 'sesiones_activas', 'readonly', async (t) =>
      todos(t.objectStore('sesiones_activas'))
    );

    if (!sesiones.length) return null;

    // FIX: usar la sesión más reciente en lugar de sesiones[0] arbitrario
    const ultima = sesiones.sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];

    return await tx(db, 'usuarios', 'readonly', async (t) =>
      prom(t.objectStore('usuarios').get(ultima.usuario_id))
    ) ?? null;
  } catch (e) {
    console.error('[basedatos] obtenerUsuarioActivo:', e);
    return null;
  }
}

// ─────────────────────────────────────────────
// CAMBIAR CONTRASEÑA (con verificación de la actual)
// ─────────────────────────────────────────────
export async function cambiarContrasena(
  usuario_id: number,
  contrasena_actual: string,
  contrasena_nueva: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const db          = await obtenerIDB();
    const hashActual  = await hashContrasena(contrasena_actual);
    const hashNueva   = await hashContrasena(contrasena_nueva);

    return await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await prom<Usuario>(store.get(usuario_id));

      if (!usuario || usuario.contrasena !== hashActual)
        return { exito: false, error: 'La contraseña actual es incorrecta.' };

      await prom(store.put({ ...usuario, contrasena: hashNueva }));
      return { exito: true };
    });
  } catch (e) {
    console.error('[basedatos] cambiarContrasena:', e);
    return { exito: false, error: 'Error al cambiar contraseña.' };
  }
}

// ─────────────────────────────────────────────
// RESET CONTRASEÑA (flujo "olvidé mi contraseña")
// NOTA: Esta función debe ser llamada únicamente tras
// verificar la identidad del usuario por otro medio
// (ej. código enviado al correo, OTP, etc.)
// ─────────────────────────────────────────────
export async function resetContrasena(
  correo: string,
  nueva_contrasena: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const db   = await obtenerIDB();
    const hash = await hashContrasena(nueva_contrasena);

    return await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await primero<Usuario>(store, 'correo', correo);
      if (!usuario) return { exito: false, error: 'No se encontró la cuenta.' };
      await prom(store.put({ ...usuario, contrasena: hash }));
      return { exito: true };
    });
  } catch (e) {
    console.error('[basedatos] resetContrasena:', e);
    return { exito: false, error: 'Error al restablecer contraseña.' };
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR PERFIL
// ─────────────────────────────────────────────
export async function actualizarPerfil(
  usuario_id: number,
  campos: { nombre?: string; nombre_usuario?: string; telefono?: string }
): Promise<{ exito: boolean; error?: string }> {
  try {
    const db = await obtenerIDB();
    return await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await prom<Usuario>(store.get(usuario_id));
      if (!usuario) return { exito: false, error: 'Usuario no encontrado' };
      await prom(store.put({ ...usuario, ...campos }));
      return { exito: true };
    });
  } catch (e) {
    console.error('[basedatos] actualizarPerfil:', e);
    return { exito: false, error: 'Error al actualizar perfil' };
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR PREFERENCIAS
// ─────────────────────────────────────────────
export async function actualizarPreferencias(
  usuario_id: number,
  campos: { idioma?: string; notificaciones?: number }
): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await prom<Usuario>(store.get(usuario_id));
      if (!usuario) return;
      await prom(store.put({ ...usuario, ...campos }));
    });
  } catch (e) {
    console.error('[basedatos] actualizarPreferencias:', e);
  }
}

// ============================================================
// FAVORITOS
// ============================================================

export async function cargarFavoritos(usuario_id: number): Promise<number[]> {
  try {
    const db    = await obtenerIDB();
    const filas: any[] = await tx(db, 'favoritos', 'readonly', async (t) =>
      porIndice(t.objectStore('favoritos'), 'usuario_id', usuario_id)
    );
    return filas.map(f => f.estado_id);
  } catch (e) {
    console.error('[basedatos] cargarFavoritos:', e);
    return [];
  }
}

export async function alternarFavorito(usuario_id: number, estado_id: number): Promise<number[]> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'favoritos', 'readwrite', async (t) => {
      const store   = t.objectStore('favoritos');
      const filas: any[] = await porIndice(store, 'usuario_id', usuario_id);
      const existente = filas.find(f => f.estado_id === estado_id);
      if (existente) {
        await prom(store.delete(existente.id));
      } else {
        await prom(store.add({ usuario_id, estado_id, creado_en: new Date().toISOString() }));
      }
    });
    return await cargarFavoritos(usuario_id);
  } catch (e) {
    console.error('[basedatos] alternarFavorito:', e);
    return [];
  }
}

// ============================================================
// ITINERARIOS (Multi-rutas)
// ============================================================

export type Itinerario = {
  id: number;
  usuario_id: number;
  nombre: string;
  items?: string[];
};

export async function obtenerItinerarios(usuario_id: number): Promise<Itinerario[]> {
  try {
    const db = await obtenerIDB();
    const itinerarios: Itinerario[] = await tx(db, 'itinerarios', 'readonly', async (t) =>
      porIndice(t.objectStore('itinerarios'), 'usuario_id', usuario_id)
    );
    // Fetch items for each
    await tx(db, 'itinerario_items', 'readonly', async (t) => {
      const store = t.objectStore('itinerario_items');
      for (const iti of itinerarios) {
        const items: any[] = await porIndice(store, 'itinerario_id', iti.id);
        iti.items = items.sort((a,b) => a.orden_visita - b.orden_visita).map(i => i.clave_paquete);
      }
    });
    return itinerarios.sort((a, b) => b.id - a.id);
  } catch (e) {
    console.error('[basedatos] obtenerItinerarios:', e);
    return [];
  }
}

export async function crearItinerario(usuario_id: number, nombre: string): Promise<Itinerario[]> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'itinerarios', 'readwrite', async (t) => {
      await prom(t.objectStore('itinerarios').add({
        usuario_id,
        nombre,
        creado_en: new Date().toISOString()
      }));
    });
    return await obtenerItinerarios(usuario_id);
  } catch (e) {
    console.error('[basedatos] crearItinerario:', e);
    return [];
  }
}

export async function eliminarItinerario(usuario_id: number, itinerario_id: number): Promise<Itinerario[]> {
  try {
    const db = await obtenerIDB();
    await tx(db, ['itinerario_items', 'itinerarios'], 'readwrite', async (t) => {
      const storeItems = t.objectStore('itinerario_items');
      const items: any[] = await porIndice(storeItems, 'itinerario_id', itinerario_id);
      for (const i of items) await prom(storeItems.delete(i.id));
      await prom(t.objectStore('itinerarios').delete(itinerario_id));
    });
    return await obtenerItinerarios(usuario_id);
  } catch (e) {
    console.error('[basedatos] eliminarItinerario:', e);
    return [];
  }
}

export async function alternarDestinoItinerario(usuario_id: number, itinerario_id: number, clave_paquete: string): Promise<Itinerario[]> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'itinerario_items', 'readwrite', async (t) => {
      const store = t.objectStore('itinerario_items');
      const items: any[] = await porIndice(store, 'itinerario_id', itinerario_id);
      const existente = items.find(i => i.clave_paquete === clave_paquete);
      if (existente) {
        await prom(store.delete(existente.id));
      } else {
        const orden = items.reduce((m, d) => Math.max(m, d.orden_visita ?? 0), 0);
        await prom(store.add({
          itinerario_id,
          clave_paquete,
          orden_visita: orden + 1,
          creado_en: new Date().toISOString()
        }));
      }
    });
    return await obtenerItinerarios(usuario_id);
  } catch (e) {
    console.error('[basedatos] alternarDestinoItinerario:', e);
    return [];
  }
}

export async function reordenarItinerarioItems(usuario_id: number, itinerario_id: number, claves_ordenadas: string[]): Promise<Itinerario[]> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'itinerario_items', 'readwrite', async (t) => {
      const store = t.objectStore('itinerario_items');
      const items: any[] = await porIndice(store, 'itinerario_id', itinerario_id);
      for (let i = 0; i < claves_ordenadas.length; i++) {
        const item = items.find(it => it.clave_paquete === claves_ordenadas[i]);
        if (item) {
          item.orden_visita = i + 1;
          await prom(store.put(item));
        }
      }
    });
    return await obtenerItinerarios(usuario_id);
  } catch (e) {
    console.error('[basedatos] reordenarItinerarioItems:', e);
    return [];
  }
}

// ============================================================
// RUTAS SUGERIDAS (Admin)
// ============================================================

export async function obtenerRutasSugeridas(): Promise<any[]> {
  try {
    const db = await obtenerIDB();
    return await tx(db, 'rutas_sugeridas', 'readonly', async (t) => {
      return todos(t.objectStore('rutas_sugeridas'));
    });
  } catch (e) {
    console.error('[basedatos] obtenerRutasSugeridas:', e);
    return [];
  }
}

export async function crearRutaSugerida(ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'rutas_sugeridas', 'readwrite', async (t) => {
      await prom(t.objectStore('rutas_sugeridas').add({
        ...ruta,
        activo: 1,
        creado_en: new Date().toISOString()
      }));
    });
  } catch (e) {
    console.error('[basedatos] crearRutaSugerida:', e);
  }
}

export async function actualizarRutaSugerida(id: number, ruta: { titulo: string; estado: string; nivel: string }): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'rutas_sugeridas', 'readwrite', async (t) => {
      const store = t.objectStore('rutas_sugeridas');
      const existente = await prom(store.get(id)) as any;
      if (existente) {
        existente.titulo = ruta.titulo;
        existente.estado = ruta.estado;
        existente.nivel = ruta.nivel;
        await prom(store.put(existente));
      }
    });
  } catch (e) {
    console.error('[basedatos] actualizarRutaSugerida:', e);
  }
}

export async function eliminarRutaSugerida(id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'rutas_sugeridas', 'readwrite', async (t) => {
      await prom(t.objectStore('rutas_sugeridas').delete(id));
    });
  } catch (e) {
    console.error('[basedatos] eliminarRutaSugerida:', e);
  }
}

export async function toggleActivoRutaSugerida(id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'rutas_sugeridas', 'readwrite', async (t) => {
      const store = t.objectStore('rutas_sugeridas');
      const existente = await prom(store.get(id)) as any;
      if (existente) {
        existente.activo = existente.activo === 1 ? 0 : 1;
        await prom(store.put(existente));
      }
    });
  } catch (e) {
    console.error('[basedatos] toggleActivoRutaSugerida:', e);
  }
}

// ============================================================
// RESERVAS
// ============================================================

export async function guardarReserva(
  usuario_id: number,
  folio: string,
  destino: string,
  paquete: string,
  fecha: string,
  personas: number,
  total: number,
  metodo: string,
  estado: string = 'confirmada'
): Promise<boolean> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'reservas', 'readwrite', async (t) => {
      await prom(t.objectStore('reservas').add({
        usuario_id, folio, destino, paquete, fecha,
        personas, total, metodo, estado,
        creado_en: new Date().toISOString(),
      }));
    });
    return true;
  } catch (e) {
    console.error('[basedatos] guardarReserva:', e);
    return false;
  }
}

export async function cargarReservas(usuario_id: number): Promise<any[]> {
  try {
    const db      = await obtenerIDB();
    const reservas: any[] = await tx(db, 'reservas', 'readonly', async (t) =>
      porIndice(t.objectStore('reservas'), 'usuario_id', usuario_id)
    );
    return reservas.sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? '') ?? 0);
  } catch (e) {
    console.error('[basedatos] cargarReservas:', e);
    return [];
  }
}

// ============================================================
// RESEÑAS
// ============================================================

export async function cargarResenas(destino: string): Promise<any[]> {
  try {
    const db      = await obtenerIDB();
    const resenas: any[] = await tx(db, 'resenas', 'readonly', async (t) =>
      porIndice(t.objectStore('resenas'), 'destino', destino)
    );

    // FIX: solo cargar los usuarios que aparecen en las reseñas, no todos
    const idsUnicos = [...new Set(resenas.map(r => r.usuario_id))] as number[];
    const usuariosEnResenas: Usuario[] = await tx(db, 'usuarios', 'readonly', async (t) => {
      const store = t.objectStore('usuarios');
      return Promise.all(idsUnicos.map(id => prom<Usuario>(store.get(id))));
    });

    return resenas
      .map(r => ({
        ...r,
        nombre: usuariosEnResenas.find(u => u?.id === r.usuario_id)?.nombre ?? 'Viajero',
      }))
      .sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? '') ?? 0);
  } catch (e) {
    console.error('[basedatos] cargarResenas:', e);
    return [];
  }
}

export async function guardarResena(
  usuario_id: number,
  destino: string,
  calificacion: number,
  comentario: string
): Promise<{ exito: boolean; error?: string }> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'resenas', 'readwrite', async (t) => {
      await prom(t.objectStore('resenas').add({
        usuario_id, destino, calificacion, comentario,
        creado_en: new Date().toISOString(),
      }));
    });
    await crearNotificacion(
      usuario_id,
      'resena',
      'Gracias por tu reseña',
      `Tu reseña de ${destino} ayuda a otros viajeros a decidir.`
    );
    return { exito: true };
  } catch (e) {
    console.error('[basedatos] guardarResena:', e);
    return { exito: false, error: 'Error al guardar reseña.' };
  }
}

// ============================================================
// NOTIFICACIONES
// ============================================================

export async function crearNotificacion(
  usuario_id: number,
  tipo: string,
  titulo: string,
  mensaje: string
): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'notificaciones', 'readwrite', async (t) => {
      await prom(t.objectStore('notificaciones').add({
        usuario_id, tipo, titulo, mensaje, leida: 0,
        creado_en: new Date().toISOString(),
      }));
    });
  } catch (e) {
    console.error('[basedatos] crearNotificacion:', e);
  }
}

export async function cargarNotificaciones(usuario_id: number): Promise<any[]> {
  try {
    const db     = await obtenerIDB();
    const notifs: any[] = await tx(db, 'notificaciones', 'readonly', async (t) =>
      porIndice(t.objectStore('notificaciones'), 'usuario_id', usuario_id)
    );
    return notifs.sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? '') ?? 0);
  } catch (e) {
    console.error('[basedatos] cargarNotificaciones:', e);
    return [];
  }
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'notificaciones', 'readwrite', async (t) => {
      const store = t.objectStore('notificaciones');
      const notif: any = await prom(store.get(id));
      if (notif) await prom(store.put({ ...notif, leida: 1 }));
    });
  } catch (e) {
    console.error('[basedatos] marcarNotificacionLeida:', e);
  }
}

export async function marcarTodasLeidas(usuario_id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'notificaciones', 'readwrite', async (t) => {
      const store  = t.objectStore('notificaciones');
      const notifs: any[] = await porIndice(store, 'usuario_id', usuario_id);
      for (const n of notifs) {
        if (!n.leida) await prom(store.put({ ...n, leida: 1 }));
      }
    });
  } catch (e) {
    console.error('[basedatos] marcarTodasLeidas:', e);
  }
}

// ============================================================
// HISTORIAL
// ============================================================

export async function agregarHistorial(
  usuario_id: number,
  tipo: string,
  titulo: string,
  detalle: string
): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'historial', 'readwrite', async (t) => {
      await prom(t.objectStore('historial').add({
        usuario_id, tipo, titulo, detalle,
        creado_en: new Date().toISOString(),
      }));
    });
  } catch (e) {
    console.error('[basedatos] agregarHistorial:', e);
  }
}

export async function cargarHistorial(usuario_id: number): Promise<any[]> {
  try {
    const db    = await obtenerIDB();
    const filas: any[] = await tx(db, 'historial', 'readonly', async (t) =>
      porIndice(t.objectStore('historial'), 'usuario_id', usuario_id)
    );
    return filas
      .sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? '') ?? 0)
      .slice(0, 50);
  } catch (e) {
    console.error('[basedatos] cargarHistorial:', e);
    return [];
  }
}

export async function obtenerUsuarioPorId(usuario_id: number): Promise<Usuario | null> {
  try {
    const db = await obtenerIDB();
    return await tx(db, 'usuarios', 'readonly', async (t) =>
      prom(t.objectStore('usuarios').get(usuario_id))
    ) ?? null;
  } catch (e) {
    console.error('[basedatos] obtenerUsuarioPorId:', e);
    return null;
  }
}

// ============================================================
// ADMIN
// ============================================================

export async function cargarTodosLosUsuarios(): Promise<any[]> {
  try {
    const db       = await obtenerIDB();
    const usuarios: any[] = await tx(db, 'usuarios', 'readonly', async (t) =>
      todos(t.objectStore('usuarios'))
    );
    const reservas: any[] = await tx(db, 'reservas', 'readonly', async (t) =>
      todos(t.objectStore('reservas'))
    );
    return usuarios
      .map(u => ({
        ...u,
        tipo:           u.tipo   ?? 'normal',
        activo:         u.activo ?? 1,
        reservas_count: reservas.filter((r: any) => r.usuario_id === u.id).length,
      }))
      .sort((a, b) => a.nombre?.localeCompare(b.nombre ?? '') ?? 0);
  } catch (e) {
    console.error('[basedatos] cargarTodosLosUsuarios:', e);
    return [];
  }
}

export async function cargarTodasLasReservas(): Promise<any[]> {
  try {
    const db       = await obtenerIDB();
    const reservas: any[] = await tx(db, 'reservas', 'readonly', async (t) =>
      todos(t.objectStore('reservas'))
    );
    const usuarios: any[] = await tx(db, 'usuarios', 'readonly', async (t) =>
      todos(t.objectStore('usuarios'))
    );
    return reservas
      .map(r => ({
        ...r,
        nombre_usuario: usuarios.find((u: any) => u.id === r.usuario_id)?.nombre ?? 'Desconocido',
      }))
      .sort((a, b) => b.creado_en?.localeCompare(a.creado_en ?? '') ?? 0);
  } catch (e) {
    console.error('[basedatos] cargarTodasLasReservas:', e);
    return [];
  }
}

export async function cambiarTipoUsuario(usuario_id: number, tipo: string): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await prom<Usuario>(store.get(usuario_id));
      if (usuario) await prom(store.put({ ...usuario, tipo }));
    });
  } catch (e) {
    console.error('[basedatos] cambiarTipoUsuario:', e);
  }
}

export async function toggleActivoUsuarioAdmin(usuario_id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'usuarios', 'readwrite', async (t) => {
      const store   = t.objectStore('usuarios');
      const usuario = await prom<Usuario>(store.get(usuario_id));
      if (usuario) await prom(store.put({ ...usuario, activo: usuario.activo ? 0 : 1 }));
    });
  } catch (e) {
    console.error('[basedatos] toggleActivoUsuarioAdmin:', e);
  }
}

export async function actualizarEstadoReserva(
  reserva_id: number,
  nuevo_estado: string
): Promise<void> {
  try {
    const db = await obtenerIDB();
    const reserva: any = await tx(db, 'reservas', 'readonly', async (t) =>
      prom(t.objectStore('reservas').get(reserva_id))
    );
    if (!reserva) return;
    await tx(db, 'reservas', 'readwrite', async (t) =>
      prom(t.objectStore('reservas').put({ ...reserva, estado: nuevo_estado }))
    );
    await agregarHistorial(
      reserva.usuario_id,
      'reserva',
      `Reserva ${nuevo_estado}`,
      `Folio ${reserva.folio} — ${reserva.destino} fue marcada como ${nuevo_estado}`
    );
    await crearNotificacion(
      reserva.usuario_id,
      'reserva',
      'Tu reserva fue actualizada',
      `La reserva ${reserva.folio} para ${reserva.destino} ahora está ${nuevo_estado}`
    );
  } catch (e) {
    console.error('[basedatos] actualizarEstadoReserva:', e);
  }
}

// ============================================================
// DESTINOS (ADMIN & READ)
// ============================================================

export async function obtenerTodosLosDestinos(): Promise<any[]> {
  try {
    const db = await obtenerIDB();
    const dests = await tx(db, 'destinos', 'readonly', async (t) => todos(t.objectStore('destinos')));
    return dests.sort((a: any, b: any) => a.id - b.id);
  } catch (e) {
    console.error('[basedatos] obtenerTodosLosDestinos:', e);
    return [];
  }
}

export async function crearDestino(destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'destinos', 'readwrite', async (t) => {
      await prom(t.objectStore('destinos').add({
        nombre: destino.nombre,
        categoria: destino.categoria,
        descripcion: destino.descripcion,
        precio: destino.precio,
        activo: 1,
        creado_en: new Date().toISOString()
      }));
    });
  } catch (e) {
    console.error('[basedatos] crearDestino:', e);
  }
}

export async function actualizarDestino(id: number, destino: { nombre: string; categoria: string; descripcion: string; precio: number }): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'destinos', 'readwrite', async (t) => {
      const store = t.objectStore('destinos');
      const d: any = await prom(store.get(id));
      if (d) {
        await prom(store.put({
          ...d,
          nombre: destino.nombre,
          categoria: destino.categoria,
          descripcion: destino.descripcion,
          precio: destino.precio
        }));
      }
    });
  } catch (e) {
    console.error('[basedatos] actualizarDestino:', e);
  }
}

export async function toggleActivoDestinoAdmin(id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'destinos', 'readwrite', async (t) => {
      const store = t.objectStore('destinos');
      const d: any = await prom(store.get(id));
      if (d) {
        await prom(store.put({ ...d, activo: d.activo ? 0 : 1 }));
      }
    });
  } catch (e) {
    console.error('[basedatos] toggleActivoDestinoAdmin:', e);
  }
}

export async function eliminarDestino(id: number): Promise<void> {
  try {
    const db = await obtenerIDB();
    await tx(db, 'destinos', 'readwrite', async (t) => {
      await prom(t.objectStore('destinos').delete(id));
    });
  } catch (e) {
    console.error('[basedatos] eliminarDestino:', e);
  }
}