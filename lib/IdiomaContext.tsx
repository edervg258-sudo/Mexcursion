// ============================================================
//  lib/IdiomaContext.tsx  —  Contexto global de idioma
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Idioma, type TraduccionClave, TEXTOS } from './traducciones';

const STORAGE_KEY = 'mx_idioma';

interface IdiomaContextValue {
  idioma: Idioma;
  cambiarIdioma: (lang: Idioma) => Promise<void>;
  /** Shorthand: t('clave') o t('clave', { var: val }) */
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
}

const IdiomaContext = createContext<IdiomaContextValue>({
  idioma: 'es',
  cambiarIdioma: async () => {},
  t: (clave) => clave,
});

export function IdiomaProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>('es');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'en' || val === 'es') setIdioma(val);
    });
  }, []);

  const cambiarIdioma = useCallback(async (lang: Idioma) => {
    setIdioma(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (clave: TraduccionClave, vars?: Record<string, string | number>) => {
      let txt = TEXTOS[idioma][clave] ?? clave;
      if (vars) for (const [k, v] of Object.entries(vars)) txt = txt.replaceAll(`{${k}}`, String(v));
      return txt;
    },
    [idioma],
  );

  return (
    <IdiomaContext.Provider value={{ idioma, cambiarIdioma, t }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  return useContext(IdiomaContext);
}
