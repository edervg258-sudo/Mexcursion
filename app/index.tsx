import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { haySesionActiva } from '../lib/supabase-db';

export default function Index() {
  useEffect(() => {
    haySesionActiva().then(activa => {
      router.replace(activa ? '/(tabs)/menu' : '/registro');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F0', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3AB7A5" />
    </View>
  );
}
