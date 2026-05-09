// MapView.native.tsx — Leaflet embebido en WebView (Android / iOS)
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { useTemaContext } from '../lib/TemaContext';

interface MapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  zoom?: number;
  style?: object;
}

const generarHtml = (lat: number, lon: number, titulo: string, desc: string, zoom: number, isDark: boolean) => {
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    #mapa { height: 100vh; width: 100%; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var mapa = L.map('mapa', { zoomControl: true }).setView([${lat}, ${lon}], ${zoom});
    L.tileLayer("${tileUrl}", { attribution: "${attribution}", maxZoom: 19 }).addTo(mapa);
    var icono = L.divIcon({
      className: '',
      html: '<div style="background:#E91E63;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -18]
    });
    L.marker([${lat}, ${lon}], { icon: icono })
      .addTo(mapa)
      .bindPopup('<div style="font-family:sans-serif"><strong>${titulo}</strong>${desc ? '<p style="margin:4px 0 0;font-size:12px;color:#666">${desc}</p>' : ''}</div>');
  </script>
</body>
</html>`;
};

export function MapaInteractivo({ latitude = 19.4326, longitude = -99.1332, title = '', description = '', zoom = 10, style }: MapViewProps) {
  const { isDark } = useTemaContext();

  const html = useMemo(
    () => generarHtml(latitude, longitude, title, description, zoom, isDark),
    [latitude, longitude, title, description, zoom, isDark],
  );

  return (
    <View style={[s.contenedor, style]}>
      <WebView
        source={{ html }}
        style={s.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scrollEnabled={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  webview:    { flex: 1 },
});
