import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@auth_rl_';
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos

type RegistroIntento = {
  intentos: number;
  bloqueadoHasta: number | null;
};

const llave = (email: string) => `${KEY_PREFIX}${email.toLowerCase().trim()}`;

async function leerRegistro(email: string): Promise<RegistroIntento> {
  try {
    const raw = await AsyncStorage.getItem(llave(email));
    if (!raw) return { intentos: 0, bloqueadoHasta: null };
    return JSON.parse(raw) as RegistroIntento;
  } catch {
    return { intentos: 0, bloqueadoHasta: null };
  }
}

async function guardarRegistro(email: string, registro: RegistroIntento): Promise<void> {
  try {
    await AsyncStorage.setItem(llave(email), JSON.stringify(registro));
  } catch { /* no-op */ }
}

export async function verificarBloqueo(email: string): Promise<{ bloqueado: boolean; minutosRestantes?: number }> {
  const registro = await leerRegistro(email);
  if (!registro.bloqueadoHasta) return { bloqueado: false };

  const ahora = Date.now();
  if (ahora < registro.bloqueadoHasta) {
    const minutosRestantes = Math.ceil((registro.bloqueadoHasta - ahora) / 60_000);
    return { bloqueado: true, minutosRestantes };
  }

  // Bloqueo expirado — limpiar
  await guardarRegistro(email, { intentos: 0, bloqueadoHasta: null });
  return { bloqueado: false };
}

export async function registrarIntentoFallido(email: string): Promise<void> {
  const registro = await leerRegistro(email);
  const nuevosIntentos = registro.intentos + 1;

  if (nuevosIntentos >= MAX_INTENTOS) {
    await guardarRegistro(email, {
      intentos: nuevosIntentos,
      bloqueadoHasta: Date.now() + BLOQUEO_MS,
    });
  } else {
    await guardarRegistro(email, { intentos: nuevosIntentos, bloqueadoHasta: null });
  }
}

export async function limpiarBloqueo(email: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(llave(email));
  } catch { /* no-op */ }
}
