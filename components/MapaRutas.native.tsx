// MapaRutas.native.tsx — expo-maps 0.12.x (AppleMaps/GoogleMaps)
// Muestra los destinos del itinerario personalizado y traza una polilínea
// (línea recta) que conecta sus coordenadas en orden de visita.
import { Image as ExpoImage } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Estado } from '../lib/tipos';

// Lazy-load expo-maps. En Expo Go el módulo nativo no está disponible.
let AppleMaps: any = null;
let GoogleMaps: any = null;
let MAPS_DISPONIBLE = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const Maps = require('expo-maps');
  AppleMaps = Maps.AppleMaps;
  GoogleMaps = Maps.GoogleMaps;
  MAPS_DISPONIBLE = !!(AppleMaps?.View && GoogleMaps?.View);
} catch {
  MAPS_DISPONIBLE = false;
}

const MEXICO_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
};

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

export default function MapaRutas({
  rutaColor,
  estadosRuta,
  polylineCoords,
  favoritos,
  isDark,
  tema,
  onToggleFav,
  onIrADetalle,
}: Props) {
  const [estadoSel, setEstadoSel] = useState<Estado | null>(null);

  // Markers solo de los destinos del itinerario, numerados por orden de visita
  const markers = useMemo(
    () =>
      estadosRuta
        .filter(e => e.latitude && e.longitude)
        .map((estado, i) => {
          const orden = i + 1;
          const base = {
            id: String(estado.id),
            coordinates: { latitude: estado.latitude!, longitude: estado.longitude! },
            title: estado.nombre,
            tintColor: rutaColor,
          };

          if (Platform.OS === 'ios') {
            return { ...base, monogram: String(orden) };
          }
          return { ...base, snippet: `Parada ${orden}` };
        }),
    [estadosRuta, rutaColor],
  );

  // Polyline para la ruta personalizada
  const polylines = useMemo(() => {
    if (polylineCoords.length < 2) { return []; }
    return [
      {
        id: 'ruta-itinerario',
        coordinates: polylineCoords,
        color: rutaColor,
        width: 4,
      },
    ];
  }, [polylineCoords, rutaColor]);

  const handleMarkerClick = (event: { id?: string }) => {
    if (!event?.id) { return; }
    const estado = estadosRuta.find(e => String(e.id) === event.id);
    if (estado) { setEstadoSel(estado); }
  };

  // Calcular un zoom razonable según la dispersión de las coordenadas
  const cameraPosition = useMemo(() => {
    if (polylineCoords.length === 0) {
      return { coordinates: MEXICO_REGION, zoom: 4.5 };
    }
    const lats = polylineCoords.map(c => c.latitude);
    const lons = polylineCoords.map(c => c.longitude);
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2;
    const span = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lons) - Math.min(...lons)
    );
    // zoom heurístico
    let zoom = 5.5;
    if (span < 1) { zoom = 7; }
    else if (span < 3) { zoom = 6; }
    else if (span < 6) { zoom = 5.5; }
    else if (span < 12) { zoom = 5; }
    else { zoom = 4.5; }
    return {
      coordinates: { latitude: centerLat, longitude: centerLon },
      zoom,
    };
  }, [polylineCoords]);

  if (!MAPS_DISPONIBLE) {
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
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={markers}
          polylines={polylines}
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          onMarkerClick={handleMarkerClick}
        />
      ) : (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={markers}
          polylines={polylines}
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          onMarkerClick={handleMarkerClick}
        />
      )}

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
            <Text style={[s.cardPrecio, { color: rutaColor }]}>
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
              style={[s.btnVer, { backgroundColor: rutaColor }]}
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
