import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated, Dimensions, ScrollView,
    StatusBar, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🗺️',
    titulo: 'Descubre México',
    descripcion: 'Explora los 32 estados del país con paquetes personalizados para cada presupuesto.',
    color: '#3AB7A5',
    fondo: '#f0faf9',
  },
  {
    emoji: '💎',
    titulo: 'Elige tu paquete',
    descripcion: 'Desde opciones económicas hasta experiencias premium. Tú decides cómo viajar.',
    color: '#e9c46a',
    fondo: '#fef9e7',
  },
  {
    emoji: '📋',
    titulo: 'Reserva al instante',
    descripcion: 'Paga con tarjeta, SPEI u OXXO. Tu folio de reserva en segundos.',
    color: '#DD331D',
    fondo: '#fdf2f0',
  },
  {
    emoji: '❤️',
    titulo: 'Guarda tus favoritos',
    descripcion: 'Crea tu lista de destinos soñados y arma tu ruta perfecta.',
    color: '#3AB7A5',
    fondo: '#f0faf9',
  },
];

export default function OnboardingScreen() {
  const [indice, setIndice] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const siguiente = () => {
    if (indice < SLIDES.length - 1) {
      const nuevo = indice + 1;
      scrollRef.current?.scrollTo({ x: W * nuevo, animated: true });
      setIndice(nuevo);
    } else {
      router.push('/registro' as never);
    }
  };

  const saltar = () => router.push('/registro' as never);

  const slide = SLIDES[indice];

  return (
    <View style={[s.contenedor, { backgroundColor: slide.fondo }]}>
      <StatusBar barStyle="dark-content" backgroundColor={slide.fondo} />
      <SafeAreaView style={s.segura}>

        {/* Botón saltar */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }} />
          {indice < SLIDES.length - 1 && (
            <TouchableOpacity onPress={saltar} style={s.btnSaltar}>
              <Text style={s.txtSaltar}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides con scroll */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{ flex: 1 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
        >
          {SLIDES.map((sl, i) => (
            <View key={i} style={[s.slide, { width: W }]}>
              {/* Círculo decorativo */}
              <View style={[s.circulo, { backgroundColor: sl.color + '22' }]}>
                <View style={[s.circuloInner, { backgroundColor: sl.color + '44' }]}>
                  <Text style={s.emoji}>{sl.emoji}</Text>
                </View>
              </View>

              <Text style={[s.titulo, { color: sl.color }]}>{sl.titulo}</Text>
              <Text style={s.descripcion}>{sl.descripcion}</Text>
            </View>
          ))}
        </Animated.ScrollView>

        {/* Puntos indicadores */}
        <View style={s.puntos}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                s.punto,
                {
                  backgroundColor: i === indice ? slide.color : '#ddd',
                  width: i === indice ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Botón siguiente / empezar */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.btnSiguiente, { backgroundColor: slide.color }]}
            onPress={siguiente}
            activeOpacity={0.85}
          >
            <Text style={s.txtSiguiente}>
              {indice === SLIDES.length - 1 ? '¡Empezar! →' : 'Siguiente →'}
            </Text>
          </TouchableOpacity>

          {indice === SLIDES.length - 1 && (
            <TouchableOpacity onPress={() => router.push('/login' as never)} style={s.btnYaTengo}>
              <Text style={s.txtYaTengo}>Ya tengo cuenta → Iniciar sesión</Text>
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  contenedor:   { flex: 1 },
  segura:       { flex: 1 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  btnSaltar:    { paddingHorizontal: 14, paddingVertical: 8 },
  txtSaltar:    { fontSize: 14, color: '#aaa', fontWeight: '600' },
  slide:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  circulo:      { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  circuloInner: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  emoji:        { fontSize: 72 },
  titulo:       { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  descripcion:  { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, maxWidth: 300 },
  puntos:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  punto:        { height: 8, borderRadius: 4 },
  footer:       { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  btnSiguiente: { borderRadius: 25, paddingVertical: 16, alignItems: 'center', elevation: 4 },
  txtSiguiente: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnYaTengo:   { alignItems: 'center' },
  txtYaTengo:   { fontSize: 14, color: '#888', fontWeight: '500' },
});
