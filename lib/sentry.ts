// lib/sentry.ts — no-op stubs (Sentry ha sido removido del proyecto)
// Los archivos existentes mantienen sus imports sin cambios; estas funciones simplemente
// redirigen errores y mensajes al logger nativo.

type BreadcrumbInput = {
  category: string;
  message: string;
  level?: string;
  data?: Record<string, unknown>;
};

type ApiErrorInput = {
  feature: string;
  action: string;
  error: unknown;
  metadata?: Record<string, unknown>;
};

export const initSentry = () => {};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  console.error('[ERROR]', error, context);
};

export const captureMessage = (message: string, level = 'info', context?: Record<string, unknown>) => {
  if (__DEV__) console.log(`[${level.toUpperCase()}]`, message, context);
};

export const setUser = (_user: { id: string; email?: string; username?: string }) => {};

export const addBreadcrumb = (_input: BreadcrumbInput) => {};

export const setTag = (_key: string, _value: string) => {};

export const captureApiError = ({ feature, action, error }: ApiErrorInput) => {
  console.error(`[API ERROR] ${feature}/${action}`, error);
};
