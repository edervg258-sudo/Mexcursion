import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTemaContext } from '../lib/TemaContext';

type NotificationIconButtonProps = {
  onPress: () => void;
};

export function NotificationIconButton({ onPress }: NotificationIconButtonProps) {
  const { tema, isDark } = useTemaContext();

  return (
    <TouchableOpacity
      testID="notification-button"
      style={[
        styles.botonIcono,
        {
          backgroundColor: isDark ? tema.superficie : tema.superficieBlanca,
          borderColor: isDark ? tema.borde : tema.bordeInput,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificaciones"
      activeOpacity={0.8}
    >
      <Image source={require('../assets/images/notificaciones.png')} style={styles.iconoEncabezado} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botonIcono: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  iconoEncabezado: { width: 28, height: 28 },
});
