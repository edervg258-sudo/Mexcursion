// ============================================================
//  lib/TemaContext.tsx — Contexto global de tema (claro/oscuro)
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tema, TemaOscuro } from './tema';

type TemaType = typeof Tema | typeof TemaOscuro;

type TemaContextType = {
  tema: TemaType;
  toggleTema: () => void;
  isDark: boolean;
};

const TemaContext = createContext<TemaContextType>({
  tema: Tema,
  toggleTema: () => {},
  isDark: false,
});

const TEMA_STORAGE_KEY = '@tema_manual';

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [manualTema, setManualTema] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TEMA_STORAGE_KEY).then((stored) => {
      if (stored) {
        setManualTema(stored as 'light' | 'dark');
      }
    });
  }, []);

  const toggleTema = async () => {
    const newTema = manualTema === 'dark' ? 'light' : 'dark';
    setManualTema(newTema);
    await AsyncStorage.setItem(TEMA_STORAGE_KEY, newTema);
  };

  const currentScheme = manualTema || systemScheme || 'light';
  const tema = currentScheme === 'dark' ? TemaOscuro : Tema;
  const isDark = currentScheme === 'dark';

  return (
    <TemaContext.Provider value={{ tema, toggleTema, isDark }}>
      {children}
    </TemaContext.Provider>
  );
}

/** Hook para consumir el tema dinámico en cualquier componente */
export function useTemaContext() {
  return useContext(TemaContext);
}
