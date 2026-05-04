// MapaRutas.native.tsx — Leaflet embebido en WebView
// Usa OpenStreetMap (sin API key). Funciona en Expo Go y builds de producción.
import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';
import { Image as ExpoImage } from 'expo-image';
import { Estado } from '../lib/tipos';

interface Punto {
  lat: number;
  lon: number;
  nombre: string;
  categoria: string;
  precio: number;
  numero: number;
}

interface Props {
  rutaColor: string;
  rutaNombre: string;
  estadosRuta: Estado[];
  polylineCoords: { latitude: number; longitude: number }[];
  numerosEstados?: number[];
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  onToggleFav: (id: number) => void;
  onIrADetalle: (estado: Estado) => void;
}

// ── HTML con Leaflet embebido ─────────────────────────────────────────────────
const generarHtml = (puntos: Punto[], color: string, isDark: boolean): string => {
  const puntosJson = JSON.stringify(puntos);
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
    body { background: ${isDark ? '#1a1a1a' : '#f0f0f0'}; }
    #mapa { height: 100vh; width: 100%; }
    .leaflet-container { background: ${isDark ? '#1a1a1a' : '#e8e0d8'}; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var puntos = ${puntosJson};
    var color  = "${color}";

    var mapa = L.map('mapa', { zoomControl: true, attributionControl: true });

    L.tileLayer("${tileUrl}", {
      attribution: "${attribution}",
      maxZoom: 19
    }).addTo(mapa);

    function crearIcono(numero) {
      return L.divIcon({
        className: '',
        html: '<div style="background:' + color + ';color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);font-family:sans-serif">' + numero + '</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18]
      });
    }

    var coords = [];

    puntos.forEach(function(p) {
      coords.push([p.lat, p.lon]);
      L.marker([p.lat, p.lon], { icon: crearIcono(p.numero) })
        .bindPopup(
          '<div style="font-family:sans-serif;min-width:140px">' +
          '<strong style="font-size:14px">' + p.nombre + '</strong>' +
          '<p style="margin:4px 0 2px;font-size:12px;color:#777">' + p.categoria + '</p>' +
          '<p style="margin:0;font-size:12px;color:' + color + ';font-weight:700">Desde $' +
          p.precio.toLocaleString('es-MX') + ' MXN</p></div>'
        )
        .addTo(mapa);
    });

    if (coords.length >= 2) {
      L.polyline(coords, {
        color: color,
        weight: 4,
        opacity: 0.9,
        dashArray: '8 5',
        lineJoin: 'round'
      }).addTo(mapa);
    }

    if (coords.length === 0) {
      mapa.setView([23.6345, -102.5528], 5);
    } else if (coords.length === 1) {
      mapa.setView(coords[0], 8);
    } else {
      mapa.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  </script>
</body>
</html>`;
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function MapaRutas({
  rutaColor, rutaNombre, estadosRuta, polylineCoords,
  numerosEstados, favoritos, isDark, tema, onToggleFav, onIrADetalle,
}: Props) {
  const puntos: Punto[] = useMemo(
    () =>
      estadosRuta
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.latitude != null && e.longitude != null)
        .map(({ e, i }) => ({
          lat: e.latitude!,
          lon: e.longitude!,
          nombre: e.nombre,
          categoria: e.categoria,
          precio: e.precio,
          numero: numerosEstados?.[i] ?? i + 1,
        })),
    [estadosRuta, numerosEstados],
  );

  const html = useMemo(
    () => generarHtml(puntos, rutaColor, isDark),
    [puntos, rutaColor, isDark],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Encabezado */}
      <View style={[s.header, { backgroundColor: rutaColor }]}>
        <Text style={s.headerNombre}>{rutaNombre}</Text>
        <Text style={s.headerSub}>
          {estadosRuta.length} {estadosRuta.length === 1 ? 'destino' : 'destinos'} · mapa interactivo
        </Text>
      </View>

      {/* Mapa Leaflet en WebView */}
      {estadosRuta.length === 0 ? (
        <View style={[s.mapaVacio, { backgroundColor: tema.superficie as string }]}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🗺️</Text>
          <Text style={[s.mapaVacioTxt, { color: tema.textoSecundario as string }]}>
            Agrega destinos para ver tu ruta en el mapa.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ html }}
          style={s.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scrollEnabled={false}
        />
      )}

      {/* Tarjetas horizontales */}
      {estadosRuta.length > 0 && (
        <View style={[s.destinosBar, { backgroundColor: tema.superficieBlanca as string, borderTopColor: tema.borde as string }]}>
          <View style={s.destinosFila}>
            {estadosRuta.map((estado, i) => (
              <TouchableOpacity
                key={estado.id}
                style={[s.destinoChip, { borderColor: rutaColor }]}
                onPress={() => onIrADetalle(estado)}
                activeOpacity={0.85}
              >
                <ExpoImage
                  source={estado.imagen}
                  style={s.destinoChipImg}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                <View style={[s.destinoChipOverlay, { backgroundColor: rutaColor + 'CC' }]}>
                  <Text style={s.destinoChipNum}>{numerosEstados?.[i] ?? i + 1}</Text>
                </View>
                <Text style={[s.destinoChipNombre, { color: tema.texto as string }]} numberOfLines={1}>
                  {estado.nombre}
                </Text>
                <TouchableOpacity
                  onPress={() => onToggleFav(estado.id)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  style={s.favBtn}
                >
                  <Image
                    source={
                      favoritos.includes(estado.id)
                        ? require('../assets/images/favoritos_rojo.png')
                        : require('../assets/images/favoritos_gris.png')
                    }
                    style={{ width: 14, height: 14 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header:          { paddingHorizontal: 16, paddingVertical: 12 },
  headerNombre:    { fontSize: 16, fontWeight: '900', color: '#fff' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  webview:         { flex: 1 },

  mapaVacio:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  mapaVacioTxt:    { fontSize: 14, textAlign: 'center', fontWeight: '600' },

  destinosBar:     { borderTopWidth: 1, paddingVertical: 10 },
  destinosFila:    { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  destinoChip:     { width: 80, borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', paddingBottom: 6 },
  destinoChipImg:  { width: '100%', height: 56 },
  destinoChipOverlay: { position: 'absolute', top: 0, left: 0, width: 22, height: 22, borderBottomRightRadius: 10, alignItems: 'center', justifyContent: 'center' },
  destinoChipNum:  { color: '#fff', fontSize: 11, fontWeight: '900' },
  destinoChipNombre: { fontSize: 10, fontWeight: '700', paddingHorizontal: 4, paddingTop: 4, textAlign: 'center' },
  favBtn:          { marginTop: 2 },
});
