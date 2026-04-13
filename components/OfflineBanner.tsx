import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../hooks/use-network-status';
import { useTemaContext } from '../lib/TemaContext';

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const { isDark } = useTemaContext();
  const offline = !isConnected || !isInternetReachable;

  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="Sin conexión a internet"
      style={[styles.container, { backgroundColor: isDark ? '#3F201D' : '#FBEAE7' }]}
    >
      <Text style={[styles.text, { color: isDark ? '#FFD9D2' : '#8A2A1E' }]}>
        Sin conexión. Algunas acciones se sincronizarán cuando vuelva el internet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  text: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
});

