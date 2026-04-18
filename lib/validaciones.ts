// ============================================================
//  lib/validaciones.ts  —  Validaciones de formularios y datos
// ============================================================

import { Estado, Nivel, CategoriaEstado } from './tipos';

// Validaciones de email
export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validación de teléfono mexicano
export const validarTelefono = (telefono: string): boolean => {
  const regex = /^[0-9]{10}$/;
  return regex.test(telefono.replace(/\s+/g, ''));
};

// Validación de fecha futura
export const validarFechaFutura = (fecha: string): boolean => {
  const [dia, mes, anio] = fecha.split('/').map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fechaObj >= hoy;
};

// Validación de tarjeta de crédito con algoritmo de Luhn
export const validarTarjeta = (numero: string): boolean => {
  const numeroLimpio = numero.replace(/\s+/g, '');
  if (!/^[0-9]{13,19}$/.test(numeroLimpio)) return false;

  // Algoritmo de Luhn
  let suma = 0;
  let doble = false;
  for (let i = numeroLimpio.length - 1; i >= 0; i--) {
    let digito = parseInt(numeroLimpio[i], 10);
    if (doble) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    doble = !doble;
  }
  return suma % 10 === 0;
};

// Validación de fechas de viaje (no más de 1 año adelante)
export const validarFechaViaje = (fecha: string): boolean => {
  const [dia, mes, anio] = fecha.split('/').map(Number);
  const fechaViaje = new Date(anio, mes - 1, dia);
  const unAnioDesdeAhora = new Date();
  unAnioDesdeAhora.setFullYear(unAnioDesdeAhora.getFullYear() + 1);

  return fechaViaje <= unAnioDesdeAhora;
};

// Validación de nombre completo
export const validarNombreCompleto = (nombre: string): boolean => {
  return nombre.trim().length >= 3 && nombre.trim().split(' ').length >= 2;
};

// Validación de contraseña segura
export const validarContrasena = (contrasena: string): { valido: boolean; mensaje: string } => {
  if (contrasena.length < 8) {
    return { valido: false, mensaje: 'Debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(contrasena)) {
    return { valido: false, mensaje: 'Debe incluir al menos una mayúscula' };
  }
  if (!/[a-z]/.test(contrasena)) {
    return { valido: false, mensaje: 'Debe incluir al menos una minúscula' };
  }
  if (!/[0-9]/.test(contrasena)) {
    return { valido: false, mensaje: 'Debe incluir al menos un número' };
  }
  return { valido: true, mensaje: 'Contraseña segura' };
};

// Validación de datos de reserva
export const validarReserva = (datos: {
  nombre_viajero: string;
  email: string;
  telefono: string;
  fecha: string;
  personas: number;
  notas?: string;
}): { valido: boolean; errores: Record<string, string> } => {
  const errores: Record<string, string> = {};

  if (!validarNombreCompleto(datos.nombre_viajero)) {
    errores.nombre = 'Nombre completo requerido (mínimo 2 palabras)';
  }

  if (!validarEmail(datos.email)) {
    errores.email = 'Correo electrónico inválido';
  }

  if (!validarTelefono(datos.telefono)) {
    errores.telefono = 'Teléfono debe tener 10 dígitos';
  }

  if (!validarFechaFutura(datos.fecha)) {
    errores.fecha = 'Fecha debe ser futura';
  }

  if (!validarFechaViaje(datos.fecha)) {
    errores.fecha = 'Fecha no puede ser más de 1 año adelante';
  }

  if (datos.personas < 1 || datos.personas > 10) {
    errores.personas = 'Número de personas debe ser entre 1 y 10';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores
  };
};

// Sanitización de inputs
export const sanitizarInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover tags HTML básicos
    .slice(0, 500); // Limitar longitud
};

// Validación de archivos (imágenes de perfil)
export const validarImagen = (uri: string, size?: number): boolean => {
  const extensionesValidas = ['jpg', 'jpeg', 'png', 'gif'];
  const extension = uri.split('.').pop()?.toLowerCase();
  const tamañoMaximo = 5 * 1024 * 1024; // 5MB

  if (!extension || !extensionesValidas.includes(extension)) {
    return false;
  }

  if (size && size > tamañoMaximo) {
    return false;
  }

  return true;
};