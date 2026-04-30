// MapaRutas.web.tsx — visualización de itinerario personalizado para web
// Dibuja el trayecto como una polilínea SVG conectando las coordenadas
// de los destinos del itinerario sobre un mapa estático de México.
import { Image as ExpoImage } from 'expo-image';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Estado } from '../lib/tipos';

interface Props {
  rutaColor: string;
  rutaNombre: string;
  estadosRuta: Estado[];
  polylineCoords: { latitude: number; longitude: number }[];
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  onToggleFav: (id: number) => void;
  onIrADetalle: (estado: Estado) => void;
}

// Bounding box aproximado de México para proyectar lat/lon → coordenadas SVG.
const MX_BOUNDS = {
  minLat: 14.5, maxLat: 32.7,
  minLon: -118.4, maxLon: -86.7,
};
const MAP_W = 360;
const MAP_H = 220;

const proyectar = (lat: number, lon: number) => {
  const x = ((lon - MX_BOUNDS.minLon) / (MX_BOUNDS.maxLon - MX_BOUNDS.minLon)) * MAP_W;
  const y = MAP_H - ((lat - MX_BOUNDS.minLat) / (MX_BOUNDS.maxLat - MX_BOUNDS.minLat)) * MAP_H;
  return { x: Math.max(8, Math.min(MAP_W - 8, x)), y: Math.max(8, Math.min(MAP_H - 8, y)) };
};

export default function MapaRutas({
  rutaColor, rutaNombre, estadosRuta, polylineCoords, favoritos, tema, onToggleFav, onIrADetalle,
}: Props) {
  // Convertir coordenadas a puntos SVG
  const puntos = useMemo(
    () => polylineCoords.map(c => proyectar(c.latitude, c.longitude)),
    [polylineCoords]
  );
  const polylineStr = puntos.map(p => `${p.x},${p.y}`).join(' ');

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
          <Text style={s.headerSub}>Recorrido visual · {estadosRuta.length} destinos</Text>
        </View>
      </View>

      {/* Mapa SVG simplificado de México con la ruta */}
      {puntos.length > 0 && (
        <View style={[s.mapaContainer, { backgroundColor: tema.superficie as string, borderColor: tema.borde as string }]}>
          <svg
            // @ts-expect-error svg props no tipados en RN-Web
            xmlns="http://www.w3.org/2000/svg"
            width={MAP_W}
            height={MAP_H}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ display: 'block' }}
          >
            {/* Fondo decorativo */}
            <rect x="0" y="0" width={MAP_W} height={MAP_H} fill={tema.superficie as string} />
            {/* Línea del trayecto */}
            {puntos.length >= 2 && (
              <polyline
                points={polylineStr}
                fill="none"
                stroke={rutaColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 4"
              />
            )}
            {/* Marcadores numerados */}
            {puntos.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="11" fill={rutaColor} stroke="#fff" strokeWidth="2.5" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
          <Text style={[s.mapaLeyenda, { color: tema.textoMuted as string }]}>
            Trayecto entre {puntos.length} {puntos.length === 1 ? 'destino' : 'destinos'} · línea recta
          </Text>
        </View>
      )}

      {/* Camino visual horizontal con tarjetas */}
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
                <Text style={s.caminoNumTxt}>{i + 1}</Text>
              </View>
              <TouchableOpacity
                style={s.caminoFav}
                onPress={() => onToggleFav(estado.id)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Image
                  source={favoritos.includes(estado.id)
                    ? require('../assets/images/favoritos_rojo.png')
                    : require('../assets/images/favoritos_gris.png')}
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

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const CARD_W = 130;
const CARD_H = 160;

const s = StyleSheet.create({
  scroll:         { paddingBottom: 16 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  headerNombre:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  mapaContainer:  { marginHorizontal: 14, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center' },
  mapaLeyenda:    { fontSize: 11, fontWeight: '600', marginTop: 8 },

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
