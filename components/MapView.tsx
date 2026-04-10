// ============================================================
//  components/MapView.tsx  —  Mapa interactivo (Expo Go compatible)
// ============================================================

import React from 'react';
import { View, StyleSheet, Platform, Dimensions, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTemaContext } from '../lib/TemaContext';
import { MapaEstatico } from './MapaEstatico';

const { width: _width } = Dimensions.get('window');

interface MapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  zoom?: number;
  style?: object;
}

export function MapaInteractivo({
  latitude = 19.4326, // CDMX por defecto
  longitude = -99.1332,
  title,
  description,
  zoom = 10,
  style
}: MapViewProps) {
  const { isDark } = useTemaContext();

  // Para proyecto escolar: usar mapa estático
  const ES_PROYECTO_ESCOLAR = false; // Cambiar a true para mapas estáticos

  if (ES_PROYECTO_ESCOLAR) {
    return (
      <MapaEstatico
        latitude={latitude}
        longitude={longitude}
        title={title || 'Ubicación del destino'}
        style={style}
      />
    );
  }

  // Generar HTML para mapa simple con Leaflet (OpenStreetMap - sin API key)
  const generateMapHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: ${isDark ? '#242f3e' : '#fff'}; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none; }
        ${isDark ? '.leaflet-tile { filter: brightness(0.8) contrast(1.1); }' : ''}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        try {
          var map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);

          L.marker([${latitude}, ${longitude}])
            .addTo(map)
            .bindPopup('<b>${title || 'Destino'}</b><br>${description || ''}');
        } catch (error) {
          document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Error cargando mapa</div>';
        }
      </script>
    </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    // Para web, usar iframe con OpenStreetMap (sin API key requerida)
    const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;

    return (
      <View style={[estilos.container, style]}>
        <iframe
          src={openStreetMapUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
          }}
          allowFullScreen
          loading="lazy"
        />
      </View>
    );
  }

  // Para mobile (Expo Go), usar WebView con Leaflet
  return (
    <View style={[estilos.container, style]}>
      <WebView
        source={{ html: generateMapHTML() }}
        style={estilos.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        renderLoading={() => (
          <View style={estilos.loading}>
            <Text style={estilos.loadingText}>Cargando mapa...</Text>
          </View>
        )}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          // Fallback: mostrar mapa estático
          // eslint-disable-next-line no-console
          console.warn('Error cargando mapa interactivo, usando fallback');
        }}
      />

      {/* Fallback si no hay coordenadas o error */}
      {(!latitude || !longitude) && (
        <View style={[estilos.container, estilos.fallback]}>
          <Text style={estilos.fallbackText}>📍 Ubicación no disponible</Text>
          <Text style={estilos.fallbackSubtext}>Mapa no configurado para este destino</Text>
        </View>
      )}

      <View style={estilos.overlay}>
        <TouchableOpacity
          style={estilos.btnAbrir}
          onPress={() => {
            // Abrir en navegador con OpenStreetMap
            const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`;
            // En Expo Go, esto abre el navegador
            if (Platform.OS === 'web') {
              window.open(url, '_blank');
            } else {
              // Para mobile, mostrar mensaje
              Alert.alert('Abrir mapa', 'Esta función requiere una app de mapas externa instalada.');
            }
          }}
        >
          <Text style={estilos.btnTexto}>🗺️ Ver en mapa completo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  btnAbrir: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  btnTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  fallbackSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
});