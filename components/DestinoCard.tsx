// ============================================================
//  components/DestinoCard.tsx
// ============================================================

import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
  Animated, Platform, StyleSheet,
  Text, TouchableOpacity, View, type ImageSourcePropType,
} from 'react-native';

interface Destino {
  id: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagen: ImageSourcePropType;
  favorito: boolean;
}

interface Props {
  item: Destino;
  fadeAnim: Animated.Value;
  animFav: Animated.Value;
  onToggleFavorito: (id: number) => void;
  resumenResenas?: {
    promedio: number;
    total: number;
  };
}

export const DestinoCard = React.memo(function DestinoCard({ item, fadeAnim, animFav, onToggleFavorito, resumenResenas }: Props) {
  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={s.tarjetaContenedor}>
        <TouchableOpacity
          testID="destination-card"
          style={s.tarjeta}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Abrir destino ${item.nombre}`}
          accessibilityHint="Muestra paquetes y detalle del destino"
          onPress={() => router.push({
            pathname: '/(tabs)/detalle',
            params: { nombre: item.nombre, categoria: item.categoria },
          } as never)}
        >
          <Image
            source={item.imagen}
            style={s.imagenTarjeta}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            placeholder={{ color: '#d0ece9' }}
            transition={200}
          />
          <View style={s.sombra} />
          <View style={s.badgeCategoria}>
            <Text style={s.textoBadge}>{item.categoria}</Text>
          </View>
          <View style={s.badgePrecio}>
            <Text style={s.textoPrecio}>Desde ${item.precio.toLocaleString()}</Text>
          </View>
          {resumenResenas?.total ? (
            <View style={s.badgeResenas}>
              <Text style={s.textoBadgeResenas}>
                {resumenResenas.promedio.toFixed(1)} ★ · {resumenResenas.total} reseñas
              </Text>
            </View>
          ) : null}
          <Text style={s.nombreTarjeta}>{item.nombre}</Text>
          <Text style={s.descripcionTarjeta} numberOfLines={2}>{item.descripcion}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.botonFavorito}
          onPress={() => onToggleFavorito(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={item.favorito ? `Quitar ${item.nombre} de favoritos` : `Agregar ${item.nombre} a favoritos`}
        >
          <Animated.View style={{ transform: [{ scale: animFav }] }}>
            <Image
              source={item.favorito
                ? require('../assets/images/favoritos_rojo.png')
                : require('../assets/images/favoritos_gris.png')}
              style={{ width: 20, height: 20 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  tarjetaContenedor: { position: 'relative', marginBottom: 14 },
  tarjeta: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 192,
    ...Platform.select({
      ios: {
        shadowColor: '#1A3D38',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      default: { elevation: 6 },
    }),
  },
  imagenTarjeta:    { width: '100%', height: '100%', position: 'absolute' },
  sombra:           { position: 'absolute', bottom: 0, left: 0, right: 0, height: 96, backgroundColor: 'rgba(0,0,0,0.45)' },
  badgeCategoria:   { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(46,154,138,0.92)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14 },
  textoBadge:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  badgePrecio:      { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14 },
  textoPrecio:      { color: '#fff', fontSize: 11, fontWeight: '600' },
  badgeResenas:     { position: 'absolute', top: 12, left: 92, backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, maxWidth: '58%' },
  textoBadgeResenas:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  nombreTarjeta:    { position: 'absolute', bottom: 32, left: 14, fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  descripcionTarjeta:{ position: 'absolute', bottom: 12, left: 14, fontSize: 12, color: 'rgba(255,255,255,0.92)', width: '72%', lineHeight: 16 },
  botonFavorito:    {
    position: 'absolute', top: 12, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
      default: { elevation: 4 },
    }),
  },
});
