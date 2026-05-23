// MapaRutas.web.tsx — mapa real con Leaflet + OpenStreetMap
// Muestra los destinos del itinerario sobre un mapa interactivo con una
// polilínea que los conecta en orden de visita.
import { Ionicons } from '@expo/vector-icons';
import L from 'leaflet';
import React, { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Estado } from '../lib/tipos';

// ── Inyectar CSS de Leaflet desde CDN (solo una vez) ─────────────────────────
if (typeof document !== 'undefined') {
  if (!document.querySelector('[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }
}

// ── Ícono numerado con color de ruta ─────────────────────────────────────────
const crearIcono = (numero: number, color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif">${numero}</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
    popupAnchor:[0, -18],
  });

// ── Ajusta el viewport a los puntos automáticamente ──────────────────────────
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) { return; }
    if (coords.length === 1) {
      map.setView(coords[0], 8);
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48] });
    }
  }, [coords, map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function MapaRutas({
  rutaColor, rutaNombre, estadosRuta, polylineCoords,
  numerosEstados, favoritos, tema, onToggleFav, onIrADetalle,
}: Props) {
  const latLons: [number, number][] = polylineCoords.map(c => [c.latitude, c.longitude]);

  // Centro inicial: México
  const centro: [number, number] = [23.6345, -102.5528];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.fondo as string }}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado */}
      <View style={[s.header, { backgroundColor: rutaColor }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerNombre}>{rutaNombre}</Text>
          <Text style={s.headerSub}>
            {estadosRuta.length} {estadosRuta.length === 1 ? 'destino' : 'destinos'} · mapa interactivo
          </Text>
        </View>
      </View>

      {/* Mapa Leaflet */}
      <View style={s.mapaContenedor}>
        {estadosRuta.length === 0 ? (
          <View style={[s.mapaVacio, { backgroundColor: tema.superficie as string }]}>
            <Ionicons name="map-outline" size={36} color="#3AB7A5" style={{ marginBottom: 8 }} />
            <Text style={[s.mapaVacioTxt, { color: tema.textoSecundario as string }]}>
              Agrega destinos para ver tu ruta en el mapa.
            </Text>
          </View>
        ) : (
          /* @ts-ignore — MapContainer usa props de React DOM, no de RN */
          <MapContainer
            center={centro}
            zoom={5}
            style={{ height: 360, width: '100%', borderRadius: 14 }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Polilínea conectando destinos en orden */}
            {latLons.length >= 2 && (
              <Polyline
                positions={latLons}
                pathOptions={{ color: rutaColor, weight: 4, opacity: 0.85, dashArray: '8 5' }}
              />
            )}

            {/* Marcadores numerados — usa el índice original del timeline */}
            {estadosRuta.map((estado, i) => {
              if (estado.latitude === null || estado.latitude === undefined || estado.longitude === null || estado.longitude === undefined) {return null;}
              const numero = numerosEstados?.[i] ?? i + 1;
              return (
                <Marker
                  key={estado.id}
                  position={[estado.latitude, estado.longitude]}
                  icon={crearIcono(numero, rutaColor)}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <strong style={{ fontSize: 14 }}>{estado.nombre}</strong>
                      <p style={{ margin: '4px 0 2px', fontSize: 12, color: '#666' }}>
                        {estado.categoria}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: rutaColor, fontWeight: 700 }}>
                        Desde ${estado.precio.toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <FitBounds coords={latLons} />
          </MapContainer>
        )}
      </View>

      {/* Tarjetas horizontales con el orden del trayecto */}
      {estadosRuta.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.caminoScroll}
        >
          {estadosRuta.map((estado, i) => (
            <View key={estado.id} style={s.caminoItem}>
              <TouchableOpacity
                style={[s.caminoCard, { borderColor: rutaColor }]}
                onPress={() => onIrADetalle(estado)}
                activeOpacity={0.85}
              >
                <ExpoImage
                  source={estado.imagen}
                  style={s.caminoImg}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  recyclingKey={String(estado.id)}
                />
                <View style={[s.caminoOverlay, { backgroundColor: rutaColor + '99' }]} />
                <View style={[s.caminoNum, { backgroundColor: rutaColor }]}>
                  <Text style={s.caminoNumTxt}>{numerosEstados?.[i] ?? i + 1}</Text>
                </View>
                <TouchableOpacity
                  style={s.caminoFav}
                  onPress={() => onToggleFav(estado.id)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Image
                    source={
                      favoritos.includes(estado.id)
                        ? require('../assets/images/favoritos_rojo.png')
                        : require('../assets/images/favoritos_gris.png')
                    }
                    style={{ width: 16, height: 16 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={s.caminoInfo}>
                  <Text style={s.caminoNombre} numberOfLines={1}>{estado.nombre}</Text>
                  <Text style={s.caminoPrecio}>${estado.precio.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>

              {i < estadosRuta.length - 1 && (
                <View style={s.flecha}>
                  <View style={[s.flechaLinea, { backgroundColor: rutaColor }]} />
                  <Text style={[s.flechaPunta, { color: rutaColor }]}>›</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const CARD_W = 130;
const CARD_H = 160;

const s = StyleSheet.create({
  scroll:         { paddingBottom: 16 },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  headerNombre:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  mapaContenedor: { marginHorizontal: 14, marginTop: 12, marginBottom: 4, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:      { height: 200, alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 20 },
  mapaVacioTxt:   { fontSize: 13, textAlign: 'center', fontWeight: '600' },

  caminoScroll:   { paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center' },
  caminoItem:     { flexDirection: 'row', alignItems: 'center' },
  caminoCard:     { width: CARD_W, height: CARD_H, borderRadius: 14, overflow: 'hidden', borderWidth: 2 },
  caminoImg:      { width: '100%', height: '100%', position: 'absolute' },
  caminoOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_H * 0.55 },
  caminoNum:      { position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  caminoNumTxt:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  caminoFav:      { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  caminoInfo:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  caminoNombre:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  caminoPrecio:   { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '600' },
  flecha:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 2 },
  flechaLinea:    { width: 16, height: 2 },
  flechaPunta:    { fontSize: 22, fontWeight: '800', lineHeight: 26, marginLeft: -4 },
});
