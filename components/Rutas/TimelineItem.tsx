// ============================================================
//  components/Rutas/TimelineItem.tsx
// ============================================================

import { Image as ExpoImage } from 'expo-image';
import React, { useRef } from 'react';
import {
  Animated, Image, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useTemaContext } from '../../lib/TemaContext';
import { Estado } from '../../lib/tipos';

interface Props {
  estado: Estado;
  index: number;
  total: number;
  esFavorito: boolean;
  rutaColor: string;
  onPress: () => void;
  onToggleFav: () => void;
}

export const TimelineItem = React.memo(function TimelineItem({
  estado, index, total, esFavorito, rutaColor, onPress, onToggleFav,
}: Props) {
  const { tema } = useTemaContext();
  const escalaFav  = useRef(new Animated.Value(1)).current;
  const escalaCard = useRef(new Animated.Value(1)).current;

  const handleFav = () => {
    Animated.sequence([
      Animated.spring(escalaFav, { toValue: 1.45, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }),
      Animated.spring(escalaFav, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 4 }),
    ]).start();
    onToggleFav();
  };

  const handlePressIn  = () =>
    Animated.spring(escalaCard, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 60, bounciness: 2 }).start();
  const handlePressOut = () =>
    Animated.spring(escalaCard, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6 }).start();

  return (
    <Animated.View style={[s.timelineItem, { transform: [{ scale: escalaCard }] }]}>
      {index < total - 1 && <View style={[s.timelineLinea, { backgroundColor: tema.borde }]} />}
      <View style={[s.timelineNum, { backgroundColor: rutaColor }]}>
        <Text style={s.timelineNumTxt}>{index + 1}</Text>
      </View>
      <TouchableOpacity
        style={[s.timelineCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <ExpoImage
          source={estado.imagen}
          style={s.timelineImg}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={String(estado.id)}
        />
        <View style={s.timelineInfo}>
          <Text style={[s.timelineNombre, { color: tema.texto }]} numberOfLines={1}>{estado.nombre}</Text>
          <Text style={[s.timelineDesc,   { color: tema.textoMuted }]} numberOfLines={2}>{estado.descripcion}</Text>
          <Text style={[s.timelinePrecio, { color: rutaColor }]}>
            Desde ${estado.precio.toLocaleString()} MXN
          </Text>
        </View>
        <View style={s.timelineAcciones}>
          <TouchableOpacity onPress={handleFav} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Animated.View style={{ transform: [{ scale: escalaFav }] }}>
              <Image
                source={esFavorito
                  ? require('../../assets/images/favoritos_rojo.png')
                  : require('../../assets/images/favoritos_gris.png')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[s.timelineChevron, { color: rutaColor }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  timelineItem:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, position: 'relative' },
  timelineLinea:   { position: 'absolute', left: 13, top: 28, width: 2, bottom: -10, zIndex: 0 },
  timelineNum:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, marginTop: 6 },
  timelineNumTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  timelineCard:    { flex: 1, flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, minHeight: 64 },
  timelineImg:     { width: 64, height: 64 },
  timelineInfo:    { flex: 1, padding: 9, justifyContent: 'center', gap: 2 },
  timelineNombre:  { fontSize: 13, fontWeight: '800' },
  timelineDesc:    { fontSize: 11, lineHeight: 14 },
  timelinePrecio:  { fontSize: 10, fontWeight: '700' },
  timelineAcciones:{ paddingHorizontal: 8, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  timelineChevron: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
});
