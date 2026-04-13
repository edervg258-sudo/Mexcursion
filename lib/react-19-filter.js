// Filtra advertencias conocidas de librerías externas incompatibles con React 19.
// Solo activo en desarrollo para no suprimir errores reales en producción.
if (__DEV__) {
  const WARN_PATTERNS = [
    'Accessing element.ref was removed in React 19',
    'elementRefGetterWithDeprecationWarning',
    'component is `forwardRef`',
    'BottomSheet',
    'GestureDetector',
    'ref is now a regular prop',
    'will be removed from the JSX Element type',
    'element.ref',
    'JSX Element type',
    'future release',
  ];

  const ERROR_PATTERNS = [
    'element.ref',
    'Accessing element.ref',
  ];

  const originalWarn = console.warn; // eslint-disable-line no-console
  console.warn = (message, ...args) => { // eslint-disable-line no-console
    const msg = String(message);
    if (WARN_PATTERNS.some(p => msg.includes(p))) return;
    originalWarn(message, ...args);
  };

  const originalError = console.error; // eslint-disable-line no-console
  console.error = (message, ...args) => { // eslint-disable-line no-console
    const msg = String(message);
    if (
      ERROR_PATTERNS.some(p => msg.includes(p)) &&
      (msg.includes('BottomSheet') || msg.includes('GestureDetector') || msg.includes('registerError'))
    ) return;
    originalError(message, ...args);
  };
}
