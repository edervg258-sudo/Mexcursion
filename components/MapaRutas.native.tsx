// MapaRutas.native.tsx — implementación con expo-maps (compatible con Expo)
import { Image as ExpoImage } from 'expo-image';
import React, { useState } from 'react';
import { Image, NativeModules, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TODOS_LOS_ESTADOS } from '../lib/constantes';
import { RutaTematica } from '../lib/datos/rutas-tematicas';
import { Estado } from '../lib/tipos';

// Detectar si expo-maps nativo está disponible (solo en development builds, no en Expo Go)
const MAPS_DISPONIBLE = !!NativeModules.ExpoMaps;

// Lazy-load expo-maps solo si el módulo nativo está disponible
let ExpoMap: any = null;
let Marker: any = null;
if (MAPS_DISPONIBLE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Maps = require('expo-maps');
    ExpoMap = Maps.default;
    Marker = Maps.Marker;
  } catch {
    // fallback
  }
}

// ── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIA_COLORES: Record<string, string> = {
  Aventura: '#4B7BEC',
  Playa: '#3AB7A5',
  Cultura: '#e9c46a',
  Gastronomía: '#DD331D',
  Ciudad: '#8A2BE2',
};

const MEXICO_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
};

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  rutaActiva: RutaTematica;
  estadosRuta: Estado[];
  polylineCoords: { latitude: number; longitude: number }[];
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  onToggleFav: (id: number) => void;
  onIrADetalle: (estado: Estado) => void;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function MapaRutas({
  rutaActiva,
  estadosRuta: _estadosRuta,
  polylineCoords: _polylineCoords,
  favoritos,
  isDark,
  tema,
  onToggleFav,
  onIrADetalle,
}: Props) {
  const [estadoSel, setEstadoSel] = useState<Estado | null>(null);

  const estadosFiltrados = TODOS_LOS_ESTADOS.filter(e => e.latitude && e.longitude);

  // Fallback si el módulo nativo no está disponible (Expo Go, etc)
  if (!MAPS_DISPONIBLE || !ExpoMap || !Marker) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#555', textAlign: 'center', marginBottom: 6 }}>
          Mapa no disponible
        </Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>
          El mapa requiere un build de desarrollo.{'\n'}
          No está disponible en Expo Go.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ExpoMap
        style={{ flex: 1 }}
        initialCamera={{
          center: MEXICO_REGION,
          zoom: 4.5,
        }}
        mapStyle={isDark ? 'dark' : 'light'}
      >
        {/* Markers de estados */}
        {estadosFiltrados.map(estado => {
          const enRuta = rutaActiva.estadoIds.includes(estado.id);
          const color = enRuta
            ? rutaActiva.color
            : CATEGORIA_COLORES[estado.categoria] ?? '#888';
          const orden = enRuta ? rutaActiva.estadoIds.indexOf(estado.id) + 1 : null;

          return (
            <Marker
              key={estado.id}
              latitude={estado.latitude!}
              longitude={estado.longitude!}
              onPress={() => setEstadoSel(estado)}
            >
              <View
                style={[
                  s.marker,
                  {
                    backgroundColor: color,
                    borderColor: enRuta ? '#fff' : 'transparent',
                  },
                ]}
              >
                {orden !== null ? (
                  <Text style={s.markerNum}>{orden}</Text>
                ) : (
                  <Text style={s.markerDot}>•</Text>
                )}
              </View>
            </Marker>
          );
        })}
      </ExpoMap>

      {/* Mini-card del estado seleccionado */}
      {estadoSel && (
        <View
          style={[
            s.estadoCard,
            {
              backgroundColor: tema.superficieBlanca as string,
              borderColor: tema.borde as string,
            },
          ]}
        >
          <ExpoImage
            source={estadoSel.imagen}
            style={s.estadoCardImg}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.cardNombre, { color: tema.texto as string }]}>
              {estadoSel.nombre}
            </Text>
            <Text
              style={[s.cardDesc, { color: tema.textoMuted as string }]}
              numberOfLines={1}
            >
              {estadoSel.descripcion}
            </Text>
            <Text style={[s.cardPrecio, { color: rutaActiva.color }]}>
              Desde ${estadoSel.precio.toLocaleString()} MXN
            </Text>
          </View>
          <View style={s.cardBtns}>
            <TouchableOpacity
              onPress={() => onToggleFav(estadoSel.id)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Image
                source={
                  favoritos.includes(estadoSel.id)
                    ? require('../assets/images/favoritos_rojo.png')
                    : require('../assets/images/favoritos_gris.png')
                }
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnVer, { backgroundColor: rutaActiva.color }]}
              onPress={() => onIrADetalle(estadoSel)}
              activeOpacity={0.85}
            >
              <Text style={s.btnVerTxt}>Ver →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerNum: { color: '#fff', fontSize: 14, fontWeight: '800' },
  markerDot: { color: '#fff', fontSize: 12 },
  estadoCard: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  estadoCardImg: { width: 76, height: 76 },
  cardNombre: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cardDesc: { fontSize: 11, marginBottom: 3 },
  cardPrecio: { fontSize: 12, fontWeight: '700' },
  cardBtns: { paddingHorizontal: 12, gap: 10, alignItems: 'center' },
  btnVer: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  btnVerTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
