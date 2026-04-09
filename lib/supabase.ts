// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan las variables de entorno de Supabase. Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
    debug: false,
    // En web, React Strict Mode desmonta/remonta componentes en desarrollo,
    // dejando Web Locks huérfanos que bloquean getSession() hasta 5 segundos
    // y forman una cola infinita cuando múltiples tabs montan simultáneamente.
    // La app es de un solo tab, así que el lock es innecesario.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(Platform.OS === 'web' && { lock: (_: string, __: number, fn: () => Promise<any>) => fn() } as any),
  },
});