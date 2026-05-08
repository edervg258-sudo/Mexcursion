// lib/sentry.ts — stubs vacíos (Sentry eliminado)

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
export const captureException = (_error: unknown, _context?: Record<string, unknown>) => {};
export const captureMessage = (_message: string, _level?: string, _context?: Record<string, unknown>) => {};
export const setUser = (_user: { id: string; email?: string; username?: string }) => {};
export const addBreadcrumb = (_input: BreadcrumbInput) => {};
export const setTag = (_key: string, _value: string) => {};
export const captureApiError = (_input: ApiErrorInput) => {};
