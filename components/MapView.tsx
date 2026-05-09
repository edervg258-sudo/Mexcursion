// ============================================================
//  components/MapView.tsx  —  Mapa interactivo (Expo Go compatible)
// ============================================================

import L from 'leaflet';
import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Alert, View, StyleSheet, Platform, Dimensions, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTemaContext } from '../lib/TemaContext';
import { MapaEstatico } from './MapaEstatico';

// Inyectar CSS de Leaflet (solo en web, solo una vez)
if (typeof document !== 'undefined') {
  if (!document.querySelector('[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }
}

function CentrarMapa({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom);
  }, [lat, lon, zoom, map]);
  return null;
}

const iconoMarcador = L.divIcon({
  className: '',
  html: `<div style="background:#E91E63;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -18],
});

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
    return (
      <View style={[estilos.container, style]}>
        {/* @ts-expect-error — MapContainer usa props de React DOM */}
        <MapContainer
          center={[latitude, longitude]}
          zoom={zoom}
          style={{ height: '100%', width: '100%', borderRadius: 12 }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={[latitude, longitude]} icon={iconoMarcador}>
            {title && (
              <Popup>
                <div style={{ fontFamily: 'sans-serif', minWidth: 140 }}>
                  <strong style={{ fontSize: 14 }}>{title}</strong>
                  {description && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{description}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
          <CentrarMapa lat={latitude} lon={longitude} zoom={zoom} />
        </MapContainer>
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