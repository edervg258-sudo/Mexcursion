// Sobrescribir console.warn para filtrar advertencias específicas de React 19
const originalWarn = console.warn;

console.warn = (message, ...args) => {
  // Ignorar TODAS las advertencias relacionadas con refs de React 19 y librerías externas
  const messageStr = String(message);
  
  if (
    messageStr.includes('Accessing element.ref was removed in React 19') ||
    messageStr.includes('elementRefGetterWithDeprecationWarning') ||
    messageStr.includes('component is `forwardRef`') ||
    messageStr.includes('BottomSheet') ||
    messageStr.includes('GestureDetector') ||
    messageStr.includes('ref is now a regular prop') ||
    messageStr.includes('will be removed from the JSX Element type') ||
    messageStr.includes('element.ref') ||
    messageStr.includes('JSX Element type') ||
    messageStr.includes('future release')
  ) {
    return; // No mostrar estas advertencias
  }
  
  // Mostrar todas las demás advertencias normalmente
  originalWarn(message, ...args);
};

// También filtrar console.error para errores relacionados
const originalError = console.error;

console.error = (message, ...args) => {
  // Ignorar errores específicos que son de librerías externas
  const messageStr = String(message);
  
  if (
    (messageStr.includes('registerError') && 
     (messageStr.includes('BottomSheet') || messageStr.includes('GestureDetector'))) ||
    messageStr.includes('element.ref') ||
    messageStr.includes('Accessing element.ref')
  ) {
    return; // No mostrar estos errores específicos
  }
  
  // Mostrar todos los demás errores normalmente
  originalError(message, ...args);
};

// También filtrar console.log si es necesario
const originalLog = console.log;

console.log = (message, ...args) => {
  const messageStr = String(message);
  
  if (
    messageStr.includes('Accessing element.ref was removed in React 19') ||
    messageStr.includes('elementRefGetterWithDeprecationWarning')
  ) {
    return; // No mostrar estos logs específicos
  }
  
  // Mostrar todos los demás logs normalmente
  originalLog(message, ...args);
};
