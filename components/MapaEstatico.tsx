// ============================================================
//  components/MapaEstatico.tsx  —  Mapa estático simple (sin APIs)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTemaContext } from '../lib/TemaContext';

interface MapaEstaticoProps {
  latitude?: number;
  longitude?: number;
  title?: string;
  style?: ViewStyle;
}

export function MapaEstatico({
  latitude,
  longitude,
  title = 'Ubicación',
  style
}: MapaEstaticoProps) {
  const { isDark } = useTemaContext();

  return (
    <View style={[estilos.container, style, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
      <View style={estilos.mapPlaceholder}>
        <Text style={[estilos.mapIcon, { color: isDark ? '#fff' : '#666' }]}>🗺️</Text>
        <Text style={[estilos.title, { color: isDark ? '#fff' : '#333' }]}>
          {title}
        </Text>
        {latitude && longitude && (
          <Text style={[estilos.coords, { color: isDark ? '#ccc' : '#666' }]}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        )}
        <Text style={[estilos.note, { color: isDark ? '#999' : '#888' }]}>
          Mapa interactivo no disponible{'\n'}en modo escolar
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  coords: {
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 12,
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});