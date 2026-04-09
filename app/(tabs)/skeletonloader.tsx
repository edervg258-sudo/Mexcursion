import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// ============================================================
//  SkeletonLoader.tsx — componente reutilizable
//  Uso: import { SkeletonTarjeta, SkeletonLista } from './(tabs)/skeletonloader'
// ============================================================

// Requerido por Expo Router para que no muestre WARN de pantalla sin default export
export default function SkeletonLoaderScreen() { return null; }

// ── Animación base ────────────────────────────────────────────────────────
const usePulso = () => {
  const opacidad = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacidad]);
  return opacidad;
};

// ── Bloque genérico ───────────────────────────────────────────────────────
export const Bloque = ({
  ancho = '100%', alto = 16, radio = 8, estilo = {},
}: {
  ancho?: number | string; alto?: number; radio?: number; estilo?: any;
}) => {
  const opacidad = usePulso();
  return (
    <Animated.View
      style={[
        s.bloque,
        { width: ancho as any, height: alto, borderRadius: radio, opacity: opacidad },
        estilo,
      ]}
    />
  );
};

// ── Skeleton de tarjeta de destino ────────────────────────────────────────
export const SkeletonTarjeta = () => {
  const opacidad = usePulso();
  return (
    <Animated.View style={[s.tarjeta, { opacity: opacidad }]}>
      {/* Imagen */}
      <View style={s.tarjetaImagen} />
      {/* Badge categoría */}
      <View style={[s.tarjetaBadge, { top: 10, left: 10, width: 70 }]} />
      {/* Badge precio */}
      <View style={[s.tarjetaBadge, { bottom: 10, right: 10, width: 90 }]} />
      {/* Nombre */}
      <View style={[s.tarjetaTexto, { bottom: 30, left: 14, width: '50%' }]} />
      {/* Descripción */}
      <View style={[s.tarjetaTexto, { bottom: 12, left: 14, width: '35%', height: 10 }]} />
    </Animated.View>
  );
};

// ── Skeleton de lista de destinos (varias tarjetas) ───────────────────────
export const SkeletonLista = ({ cantidad = 3 }: { cantidad?: number }) => (
  <View style={s.lista}>
    {Array.from({ length: cantidad }).map((_, i) => (
      <SkeletonTarjeta key={i} />
    ))}
  </View>
);

// ── Skeleton de perfil ────────────────────────────────────────────────────
export const SkeletonPerfil = () => {
  const opacidad = usePulso();
  return (
    <Animated.View style={[s.perfilContenedor, { opacity: opacidad }]}>
      <View style={s.perfilAvatar} />
      <View style={{ gap: 8 }}>
        <View style={[s.bloque, { width: 140, height: 16 }]} />
        <View style={[s.bloque, { width: 100, height: 12 }]} />
      </View>
    </Animated.View>
  );
};

// ── Skeleton de fila de lista (reservas, notificaciones) ──────────────────
export const SkeletonFila = () => {
  const opacidad = usePulso();
  return (
    <Animated.View style={[s.fila, { opacity: opacidad }]}>
      <View style={s.filaCirculo} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[s.bloque, { width: '60%', height: 14 }]} />
        <View style={[s.bloque, { width: '90%', height: 11 }]} />
        <View style={[s.bloque, { width: '30%', height: 10 }]} />
      </View>
    </Animated.View>
  );
};

export const SkeletonFilas = ({ cantidad = 4 }: { cantidad?: number }) => (
  <View style={s.lista}>
    {Array.from({ length: cantidad }).map((_, i) => (
      <SkeletonFila key={i} />
    ))}
  </View>
);

const s = StyleSheet.create({
  bloque:           { backgroundColor: '#e0e0e0', borderRadius: 8 },
  lista:            { padding: 14, gap: 14 },

  // Tarjeta
  tarjeta:          { borderRadius: 16, height: 190, backgroundColor: '#e8e8e8', overflow: 'hidden' },
  tarjetaImagen:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#d0d0d0' },
  tarjetaBadge:     { position: 'absolute', height: 22, borderRadius: 12, backgroundColor: '#bbb' },
  tarjetaTexto:     { position: 'absolute', height: 14, borderRadius: 7, backgroundColor: '#bbb' },

  // Perfil
  perfilContenedor: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 10 },
  perfilAvatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: '#d0d0d0' },

  // Fila
  fila:             { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  filaCirculo:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#d0d0d0' },
});
