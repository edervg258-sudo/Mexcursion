export type ErrorKind = 'network' | 'timeout' | 'auth' | 'validation' | 'provider' | 'unknown';

export type NormalizedError = {
  kind: ErrorKind;
  message: string;
  retryable: boolean;
};

export function normalizeError(error: unknown): NormalizedError {
  const raw = error instanceof Error ? error.message : String(error ?? 'Error desconocido');
  const message = raw.toLowerCase();

  if (message.includes('timeout')) {
    return { kind: 'timeout', message: raw, retryable: true };
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('offline')
  ) {
    return { kind: 'network', message: raw, retryable: true };
  }
  if (
    message.includes('session') ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('jwt')
  ) {
    return { kind: 'auth', message: raw, retryable: false };
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return { kind: 'validation', message: raw, retryable: false };
  }
  if (
    message.includes('mercadopago') ||
    message.includes('checkout') ||
    message.includes('payment') ||
    message.includes('rejected')
  ) {
    return { kind: 'provider', message: raw, retryable: true };
  }

  return { kind: 'unknown', message: raw, retryable: true };
}

export function userMessageForError(normalized: NormalizedError): string {
  if (normalized.kind === 'timeout') {
    return 'La operación tardó demasiado. Intenta nuevamente.';
  }
  if (normalized.kind === 'network') {
    return 'No hay conexión estable. Verifica tu internet e inténtalo de nuevo.';
  }
  if (normalized.kind === 'auth') {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }
  if (normalized.kind === 'validation') {
    return 'Hay datos inválidos. Revisa la información e intenta otra vez.';
  }
  if (normalized.kind === 'provider') {
    return 'El proveedor de pago no respondió correctamente. Intenta de nuevo en unos minutos.';
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}

