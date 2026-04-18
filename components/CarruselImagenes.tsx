// ============================================================
//  components/CarruselImagenes.tsx
// ============================================================

import { Image } from 'expo-image';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const CAROUSEL_H = 260;
const ARROW_TOP  = CAROUSEL_H / 2 - 16;

const arrowBase = {
  position: 'absolute' as const,
  top: ARROW_TOP,
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.90)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  zIndex: 10, elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.18,
  shadowRadius: 4,
};

interface Props {
  imagenes: string[];
  color: string;
  ancho: number;
}

export const CarruselImagenes = React.memo(function CarruselImagenes({ imagenes, color, ancho }: Props) {
  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnims  = useRef(imagenes.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const sincronizarPunto = useCallback((i: number) => {
    Animated.parallel(
      dotAnims.map((anim, idx) =>
        Animated.spring(anim, { toValue: idx === i ? 1 : 0, useNativeDriver: false, tension: 70, friction: 12 })
      )
    ).start();
    setIndice(i);
  }, [dotAnims]);

  const irA = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ x: ancho * i, animated: true });
    sincronizarPunto(i);
  }, [ancho, sincronizarPunto]);

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => sincronizarPunto(Math.round(e.nativeEvent.contentOffset.x / ancho))}
          style={{ borderRadius: 14 }}
        >
          {imagenes.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={{ width: ancho, height: CAROUSEL_H, borderRadius: 14 }}
              contentFit="cover"
              transition={250}
            />
          ))}
        </ScrollView>

        {imagenes.length > 1 && (
          <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{indice + 1}/{imagenes.length}</Text>
          </View>
        )}

        {imagenes.length > 1 && indice > 0 && (
          <TouchableOpacity activeOpacity={0.75} onPress={() => irA(indice - 1)} style={{ ...arrowBase, left: 10 }}>
            <Text style={{ fontSize: 22, color: '#333', fontWeight: '700', lineHeight: 28 }}>‹</Text>
          </TouchableOpacity>
        )}
        {imagenes.length > 1 && indice < imagenes.length - 1 && (
          <TouchableOpacity activeOpacity={0.75} onPress={() => irA(indice + 1)} style={{ ...arrowBase, right: 10 }}>
            <Text style={{ fontSize: 22, color: '#333', fontWeight: '700', lineHeight: 28 }}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {imagenes.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => irA(i)}>
            <Animated.View style={{
              width: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 22] }),
              height: 8, borderRadius: 4,
              backgroundColor: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['#ddd', color] }),
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});
