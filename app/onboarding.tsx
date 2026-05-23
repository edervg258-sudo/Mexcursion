import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated, Dimensions, ScrollView,
    StatusBar, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

type Slide = {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  descripcion: string;
  color: string;
  fondo: string;
};

const SLIDES: Slide[] = [
  {
    icono: 'map-outline',
    titulo: 'Descubre México',
    descripcion: 'Explora los 32 estados del país con paquetes personalizados para cada presupuesto.',
    color: '#3AB7A5',
    fondo: '#f0faf9',
  },
  {
    icono: 'diamond-outline',
    titulo: 'Elige tu paquete',
    descripcion: 'Desde opciones económicas hasta experiencias premium. Tú decides cómo viajar.',
    color: '#e9c46a',
    fondo: '#fef9e7',
  },
  {
    icono: 'calendar-outline',
    titulo: 'Reserva al instante',
    descripcion: 'Llena tus datos, elige fecha y confirma tu lugar en segundos.',
    color: '#DD331D',
    fondo: '#fdf2f0',
  },
  {
    icono: 'heart-outline',
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

        <View style={s.headerRow}>
          <View style={{ flex: 1 }} />
          {indice < SLIDES.length - 1 && (
            <TouchableOpacity onPress={saltar} style={s.btnSaltar}>
              <Text style={s.txtSaltar}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>

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
              <View style={[s.circulo, { backgroundColor: sl.color + '22' }]}>
                <View style={[s.circuloInner, { backgroundColor: sl.color + '33' }]}>
                  <Ionicons name={sl.icono} size={72} color={sl.color} />
                </View>
              </View>
              <Text style={[s.titulo, { color: sl.color }]}>{sl.titulo}</Text>
              <Text style={s.descripcion}>{sl.descripcion}</Text>
            </View>
          ))}
        </Animated.ScrollView>

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

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.btnSiguiente, { backgroundColor: slide.color }]}
            onPress={siguiente}
            activeOpacity={0.85}
          >
            <Text style={s.txtSiguiente}>
              {indice === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {indice === SLIDES.length - 1 && (
            <TouchableOpacity onPress={() => router.push('/login' as never)} style={s.btnYaTengo}>
              <Text style={s.txtYaTengo}>Ya tengo cuenta — Iniciar sesión</Text>
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
  titulo:       { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  descripcion:  { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, maxWidth: 300 },
  puntos:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  punto:        { height: 8, borderRadius: 4 },
  footer:       { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  btnSiguiente: { borderRadius: 25, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 4 },
  txtSiguiente: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnYaTengo:   { alignItems: 'center' },
  txtYaTengo:   { fontSize: 14, color: '#888', fontWeight: '500' },
});
