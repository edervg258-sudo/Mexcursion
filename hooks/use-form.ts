import { useState } from 'react';

type StringValues = Record<string, string>;

export function useForm<T extends StringValues>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errores, setErrores] = useState<Partial<Record<keyof T, string>>>({});
  const [cargando, setCargando] = useState(false);

  const setField = (key: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (errores[key]) {
      setErrores(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const setError = (key: keyof T, msg: string) => {
    setErrores(prev => ({ ...prev, [key]: msg || undefined }));
  };

  const setErrors = (errors: Partial<Record<keyof T, string>>) => {
    setErrores(errors);
  };

  const reset = () => {
    setValues(initialValues);
    setErrores({});
    setCargando(false);
  };

  return { values, errores, cargando, setCargando, setField, setError, setErrors, reset };
}
