// ============================================================
// basedatos.ts — Implementación nativa con Expo SQLite
// ============================================================

import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

// ─────────────────────────────────────────────
// Abrir BD
// ─────────────────────────────────────────────
export async function obtenerBD(): Promise<SQLite.SQLiteDatabase> {

  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('mexcursion.db');

  await db.execAsync(`
    
    CREATE TABLE IF NOT EXISTS usuarios(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      nombre_usuario TEXT UNIQUE,
      correo TEXT UNIQUE,
      contrasena TEXT,
      telefono TEXT,
      idioma TEXT,
      notificaciones INTEGER,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS sesiones_activas(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      clave_sesion TEXT,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS favoritos(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      estado_id INTEGER,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS rutas(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      nombre_ruta TEXT,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS destinos_ruta(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ruta_id INTEGER,
      clave_paquete TEXT,
      orden_visita INTEGER,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS reservas(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      folio TEXT UNIQUE,
      destino TEXT,
      paquete TEXT,
      fecha TEXT,
      personas INTEGER,
      total REAL,
      metodo TEXT,
      estado TEXT,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS resenas(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      destino TEXT,
      calificacion INTEGER,
      comentario TEXT,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS notificaciones(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      tipo TEXT,
      titulo TEXT,
      mensaje TEXT,
      leida INTEGER DEFAULT 0,
      creado_en TEXT
    );

    CREATE TABLE IF NOT EXISTS historial(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      tipo TEXT,
      titulo TEXT,
      detalle TEXT,
      creado_en TEXT
    );

  `);

  _db = db;

  return db;
}

// ============================================================
// USUARIOS
// ============================================================

export async function registrarUsuario(
  nombre:string,
  nombre_usuario:string,
  correo:string,
  contrasena:string
):Promise<{exito:boolean,error?:string}>{

  try{

    const db = await obtenerBD();

    const existeCorreo = await db.getFirstAsync(
      `SELECT id FROM usuarios WHERE correo=?`,
      [correo]
    );

    if(existeCorreo)
      return {exito:false,error:'Ya existe una cuenta con ese correo.'};

    const existeUsuario = await db.getFirstAsync(
      `SELECT id FROM usuarios WHERE nombre_usuario=?`,
      [nombre_usuario]
    );

    if(existeUsuario)
      return {exito:false,error:'Ese nombre de usuario ya está en uso.'};

    const resultado = await db.runAsync(
      `INSERT INTO usuarios
      (nombre,nombre_usuario,correo,contrasena,telefono,idioma,notificaciones,creado_en)
      VALUES(?,?,?,?,?,?,?,?)`,
      [
        nombre,
        nombre_usuario,
        correo,
        contrasena,
        '',
        'es',
        1,
        new Date().toISOString()
      ]
    );

    await db.runAsync(
      `INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,leida,creado_en) VALUES(?,?,?,?,0,?)`,
      [resultado.lastInsertRowId, 'sistema', 'Bienvenido a Mexcursión', 'Descubre los mejores destinos de México. ¡Empieza a explorar!', new Date().toISOString()]
    );

    return {exito:true};

  }catch{

    return {exito:false,error:'Error al registrar.'};

  }

}

// ─────────────────────────────────────────────
// BUSCAR POR CORREO (recuperar contraseña)
// ─────────────────────────────────────────────
export async function buscarUsuarioPorCorreo(correo:string):Promise<any|null>{

  try{

    const db = await obtenerBD();

    const usuario = await db.getFirstAsync(
      `SELECT * FROM usuarios WHERE correo=?`,
      [correo]
    );

    return usuario ?? null;

  }catch{

    return null;

  }

}

// ─────────────────────────────────────────────

export async function iniciarSesion(
  correo:string,
  contrasena:string
):Promise<{exito:boolean;usuario?:any;error?:string}>{

  try{

    const db = await obtenerBD();

    const usuario:any = await db.getFirstAsync(
      `SELECT * FROM usuarios WHERE correo=?`,
      [correo]
    );

    if(!usuario || usuario.contrasena !== contrasena)
      return {exito:false,error:'Correo o contraseña incorrectos.'};

    await db.runAsync(`DELETE FROM sesiones_activas`);

    await db.runAsync(
      `INSERT INTO sesiones_activas
      (usuario_id,clave_sesion,creado_en)
      VALUES(?,?,?)`,
      [
        usuario.id,
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36),
        new Date().toISOString()
      ]
    );

    return {exito:true,usuario};

  }catch{

    return {exito:false,error:'Error al iniciar sesión.'};

  }

}

// ─────────────────────────────────────────────

export async function cerrarSesion():Promise<void>{

  try{

    const db = await obtenerBD();

    await db.runAsync(`DELETE FROM sesiones_activas`);

  }catch{}

}

// ─────────────────────────────────────────────

export async function obtenerUsuarioActivo():Promise<any|null>{

  try{

    const db = await obtenerBD();

    const sesion:any = await db.getFirstAsync(
      `SELECT usuario_id FROM sesiones_activas LIMIT 1`
    );

    if(!sesion) return null;

    return await db.getFirstAsync(
      `SELECT * FROM usuarios WHERE id=?`,
      [sesion.usuario_id]
    );

  }catch{

    return null;

  }

}

// ─────────────────────────────────────────────

export async function cambiarContrasena(
  usuario_id:number,
  contrasena_actual:string,
  contrasena_nueva:string
):Promise<{exito:boolean,error?:string}>{

  try{

    const db = await obtenerBD();

    const usuario:any = await db.getFirstAsync(
      `SELECT contrasena FROM usuarios WHERE id=?`,
      [usuario_id]
    );

    if(!usuario || usuario.contrasena !== contrasena_actual)
      return {exito:false,error:'La contraseña actual es incorrecta.'};

    await db.runAsync(
      `UPDATE usuarios SET contrasena=? WHERE id=?`,
      [contrasena_nueva,usuario_id]
    );

    return {exito:true};

  }catch{

    return {exito:false,error:'Error al cambiar contraseña.'};

  }

}

// ─────────────────────────────────────────────

export async function actualizarPerfil(
  usuario_id:number,
  campos:{nombre?:string;nombre_usuario?:string;telefono?:string}
):Promise<{exito:boolean,error?:string}>{

  try{

    const db = await obtenerBD();

    const usuario:any = await db.getFirstAsync(
      `SELECT * FROM usuarios WHERE id=?`,
      [usuario_id]
    );

    if(!usuario)
      return {exito:false,error:'Usuario no encontrado.'};

    await db.runAsync(
      `UPDATE usuarios
       SET nombre=?,
           nombre_usuario=?,
           telefono=?
       WHERE id=?`,
      [
        campos.nombre ?? usuario.nombre,
        campos.nombre_usuario ?? usuario.nombre_usuario,
        campos.telefono ?? usuario.telefono,
        usuario_id
      ]
    );

    return {exito:true};

  }catch{

    return {exito:false,error:'Error al actualizar perfil.'};

  }

}

// ─────────────────────────────────────────────

export async function actualizarPreferencias(
  usuario_id:number,
  campos:{idioma?:string;notificaciones?:number}
):Promise<void>{

  try{

    const db = await obtenerBD();

    const actual:any = await db.getFirstAsync(
      `SELECT idioma, notificaciones FROM usuarios WHERE id=?`,
      [usuario_id]
    );

    await db.runAsync(
      `UPDATE usuarios
       SET idioma=?,
           notificaciones=?
       WHERE id=?`,
      [
        campos.idioma        ?? actual?.idioma        ?? 'es',
        campos.notificaciones ?? actual?.notificaciones ?? 1,
        usuario_id
      ]
    );

  }catch{}

}

// ============================================================
// FAVORITOS
// ============================================================

export async function cargarFavoritos(usuario_id:number):Promise<number[]>{
  try{
    const db = await obtenerBD();
    const filas = await db.getAllAsync<{estado_id:number}>(
      `SELECT estado_id FROM favoritos WHERE usuario_id=?`,
      [usuario_id]
    );
    return filas.map(f => f.estado_id);
  }catch{
    return [];
  }
}

export async function alternarFavorito(usuario_id:number, estado_id:number):Promise<number[]>{
  try{
    const db = await obtenerBD();
    const existente = await db.getFirstAsync(
      `SELECT id FROM favoritos WHERE usuario_id=? AND estado_id=?`,
      [usuario_id, estado_id]
    );
    if(existente){
      await db.runAsync(
        `DELETE FROM favoritos WHERE usuario_id=? AND estado_id=?`,
        [usuario_id, estado_id]
      );
    }else{
      await db.runAsync(
        `INSERT INTO favoritos (usuario_id, estado_id, creado_en) VALUES(?,?,?)`,
        [usuario_id, estado_id, new Date().toISOString()]
      );
    }
    return cargarFavoritos(usuario_id);
  }catch{
    return [];
  }
}

// ============================================================
// RUTAS
// ============================================================

export async function cargarRuta(usuario_id:number):Promise<string[]>{
  try{
    const db = await obtenerBD();
    const ruta = await db.getFirstAsync<{id:number}>(
      `SELECT id FROM rutas WHERE usuario_id=? LIMIT 1`,
      [usuario_id]
    );
    if(!ruta) return [];
    const destinos = await db.getAllAsync<{clave_paquete:string}>(
      `SELECT clave_paquete FROM destinos_ruta WHERE ruta_id=? ORDER BY orden_visita`,
      [ruta.id]
    );
    return destinos.map(d => d.clave_paquete);
  }catch{
    return [];
  }
}

export async function alternarDestino(usuario_id:number, clave_paquete:string):Promise<string[]>{
  try{
    const db = await obtenerBD();
    let ruta = await db.getFirstAsync<{id:number}>(
      `SELECT id FROM rutas WHERE usuario_id=? LIMIT 1`,
      [usuario_id]
    );
    if(!ruta){
      await db.runAsync(
        `INSERT INTO rutas (usuario_id, nombre_ruta, creado_en) VALUES(?,?,?)`,
        [usuario_id, 'Mi Ruta', new Date().toISOString()]
      );
      ruta = await db.getFirstAsync<{id:number}>(
        `SELECT id FROM rutas WHERE usuario_id=? LIMIT 1`,
        [usuario_id]
      );
    }
    if(!ruta) return [];
    const existente = await db.getFirstAsync(
      `SELECT id FROM destinos_ruta WHERE ruta_id=? AND clave_paquete=?`,
      [ruta.id, clave_paquete]
    );
    if(existente){
      await db.runAsync(
        `DELETE FROM destinos_ruta WHERE ruta_id=? AND clave_paquete=?`,
        [ruta.id, clave_paquete]
      );
    }else{
      const orden = await db.getFirstAsync<{max_orden:number}>(
        `SELECT COALESCE(MAX(orden_visita),0)+1 as max_orden FROM destinos_ruta WHERE ruta_id=?`,
        [ruta.id]
      );
      await db.runAsync(
        `INSERT INTO destinos_ruta (ruta_id, clave_paquete, orden_visita, creado_en) VALUES(?,?,?,?)`,
        [ruta.id, clave_paquete, orden?.max_orden ?? 1, new Date().toISOString()]
      );
    }
    return cargarRuta(usuario_id);
  }catch{
    return [];
  }
}

// ============================================================
// RESET CONTRASENA
// ============================================================

export async function resetContrasena(correo:string, nueva_contrasena:string):Promise<{exito:boolean;error?:string}>{
  try{
    const db = await obtenerBD();
    const usuario = await db.getFirstAsync<{id:number}>(
      `SELECT id FROM usuarios WHERE correo=?`,
      [correo]
    );
    if(!usuario) return {exito:false, error:'No se encontró la cuenta.'};
    await db.runAsync(
      `UPDATE usuarios SET contrasena=? WHERE id=?`,
      [nueva_contrasena, usuario.id]
    );
    return {exito:true};
  }catch{
    return {exito:false, error:'Error al restablecer contraseña.'};
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
    const db = await obtenerBD();
    await db.runAsync(
      `INSERT INTO reservas (usuario_id, folio, destino, paquete, fecha, personas, total, metodo, estado, creado_en)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`,
      [usuario_id, folio, destino, paquete, fecha, personas, total, metodo, estado]
    );
    return true;
  } catch (e: any) {
    console.error('Error guardando reserva:', e);
    return false;
  }
}

export async function cargarReservas(usuario_id:number):Promise<any[]>{
  try{
    const db = await obtenerBD();
    return await db.getAllAsync(
      `SELECT * FROM reservas WHERE usuario_id=? ORDER BY creado_en DESC`,
      [usuario_id]
    );
  }catch{
    return [];
  }
}

// ============================================================
// RESEÑAS
// ============================================================

export async function cargarResenas(destino:string):Promise<any[]>{
  try{
    const db = await obtenerBD();
    return await db.getAllAsync(
      `SELECT r.*, u.nombre FROM resenas r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.destino=? ORDER BY r.creado_en DESC`,
      [destino]
    );
  }catch{
    return [];
  }
}

export async function guardarResena(
  usuario_id:number,
  destino:string,
  calificacion:number,
  comentario:string
):Promise<{exito:boolean;error?:string}>{
  try{
    const db = await obtenerBD();
    await db.runAsync(
      `INSERT INTO resenas (usuario_id,destino,calificacion,comentario,creado_en) VALUES(?,?,?,?,?)`,
      [usuario_id, destino, calificacion, comentario, new Date().toISOString()]
    );
    await crearNotificacion(usuario_id, 'resena', 'Gracias por tu reseña', `Tu reseña de ${destino} ayuda a otros viajeros a decidir.`);
    return {exito:true};
  }catch{
    return {exito:false, error:'Error al guardar reseña.'};
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
    const db = await obtenerBD();
    await db.runAsync(
      `INSERT INTO historial (usuario_id, tipo, titulo, detalle, creado_en) VALUES (?,?,?,?,datetime('now'))`,
      [usuario_id, tipo, titulo, detalle]
    );
  } catch (e) {
    console.error('Error historial:', e);
  }
}

export async function cargarHistorial(usuario_id: number): Promise<any[]> {
  try {
    const db = await obtenerBD();
    return await db.getAllAsync(
      `SELECT * FROM historial WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 50`,
      [usuario_id]
    );
  } catch {
    return [];
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
    const db = await obtenerBD();
    await db.runAsync(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, leida, creado_en) VALUES (?,?,?,?,0,datetime('now'))`,
      [usuario_id, tipo, titulo, mensaje]
    );
  } catch (e) {
    console.error('Error notificación:', e);
  }
}

export async function cargarNotificaciones(usuario_id:number):Promise<any[]>{
  try{
    const db = await obtenerBD();
    return await db.getAllAsync(
      `SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY creado_en DESC`,
      [usuario_id]
    );
  }catch{
    return [];
  }
}

export async function marcarNotificacionLeida(id:number):Promise<void>{
  try{
    const db = await obtenerBD();
    await db.runAsync(`UPDATE notificaciones SET leida=1 WHERE id=?`, [id]);
  }catch{}
}

export async function marcarTodasLeidas(usuario_id:number):Promise<void>{
  try{
    const db = await obtenerBD();
    await db.runAsync(`UPDATE notificaciones SET leida=1 WHERE usuario_id=?`, [usuario_id]);
  }catch{}
}

// ============================================================
// ADMIN
// ============================================================

export async function cargarTodosLosUsuarios(): Promise<any[]> {
  try {
    const db = await obtenerBD();
    // Migrate: add tipo/activo columns if not present yet
    try { await db.execAsync(`ALTER TABLE usuarios ADD COLUMN tipo TEXT DEFAULT 'normal'`); } catch {}
    try { await db.execAsync(`ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1`); } catch {}
    const usuarios: any[] = await db.getAllAsync(`SELECT * FROM usuarios ORDER BY nombre`);
    const reservas: any[] = await db.getAllAsync(`SELECT usuario_id FROM reservas`);
    return usuarios.map(u => ({
      ...u,
      tipo: u.tipo ?? 'normal',
      activo: u.activo ?? 1,
      reservas_count: reservas.filter((r: any) => r.usuario_id === u.id).length,
    }));
  } catch {
    return [];
  }
}

export async function cargarTodasLasReservas(): Promise<any[]> {
  try {
    const db = await obtenerBD();
    return await db.getAllAsync(
      `SELECT r.*, u.nombre as nombre_usuario
       FROM reservas r
       LEFT JOIN usuarios u ON u.id = r.usuario_id
       ORDER BY r.creado_en DESC`
    );
  } catch {
    return [];
  }
}

export async function cambiarTipoUsuario(usuario_id: number, tipo: string): Promise<void> {
  try {
    const db = await obtenerBD();
    try { await db.execAsync(`ALTER TABLE usuarios ADD COLUMN tipo TEXT DEFAULT 'normal'`); } catch {}
    await db.runAsync(`UPDATE usuarios SET tipo=? WHERE id=?`, [tipo, usuario_id]);
  } catch {}
}

export async function toggleActivoUsuarioAdmin(usuario_id: number): Promise<void> {
  try {
    const db = await obtenerBD();
    try { await db.execAsync(`ALTER TABLE usuarios ADD COLUMN activo INTEGER DEFAULT 1`); } catch {}
    await db.runAsync(
      `UPDATE usuarios SET activo = CASE WHEN activo=1 THEN 0 ELSE 1 END WHERE id=?`,
      [usuario_id]
    );
  } catch {}
}