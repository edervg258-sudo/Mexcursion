import { router } from 'expo-router';
import { useEffect } from 'react';
import { obtenerUsuarioActivo } from '../lib/supabase-db';

export default function Index() {
  useEffect(() => {
    obtenerUsuarioActivo().then(usuario => {
      if (usuario) {
        router.replace('/(tabs)/menu');
      } else {
        router.replace('/registro');
      }
    });
  }, []);

  return null;
}
