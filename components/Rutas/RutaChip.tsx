// ============================================================
//  components/Rutas/RutaChip.tsx
// ============================================================

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RutaTematica } from '../../lib/datos/rutas-tematicas';
import { useTemaContext } from '../../lib/TemaContext';

import guanajuatoImg from '../../assets/images/guanajuato.png';
import chiapasImg from '../../assets/images/chiapas.png';
import sinaloaImg from '../../assets/images/sinaloa.png';
import jaliscoImg from '../../assets/images/jalisco.png';
import chihuahuaImg from '../../assets/images/chihuahua.png';

const RUTA_IMG: Record<string, number> = {
  colonial: guanajuatoImg,
  maya:     chiapasImg,
  pacifico: sinaloaImg,
  sabor:    jaliscoImg,
  aventura: chihuahuaImg,
};

interface Props {
  ruta: RutaTematica;
  activa: boolean;
  onPress: () => void;
}

export const RutaChip = React.memo(function RutaChip({ ruta, activa, onPress }: Props) {
  const { tema } = useTemaContext();
  const img = RUTA_IMG[ruta.id];

  return (
    <TouchableOpacity
      testID={`route-chip-${ruta.id}`}
      style={[
        s.chip,
        { backgroundColor: activa ? ruta.color : tema.superficie, borderColor: activa ? ruta.color : tema.borde },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityLabel={`${ruta.nombre}, ${ruta.estadoIds.length * ruta.diasPorEstado} días`}
      accessibilityState={{ selected: activa }}
    >
      {img ? (
        <Image source={img} style={s.img} resizeMode="cover" />
      ) : (
        <View style={[s.imgPlaceholder, { backgroundColor: ruta.color + '44' }]} />
      )}
      <Text style={[s.nombre, { color: activa ? '#fff' : tema.texto }]} numberOfLines={1}>
        {ruta.nombre.replace('Ruta ', '')}
      </Text>
      <Text style={[s.dias, { color: activa ? 'rgba(255,255,255,0.85)' : tema.textoMuted }]}>
        {ruta.estadoIds.length * ruta.diasPorEstado}d
      </Text>
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  chip:           { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 10, borderWidth: 1.5, gap: 2, overflow: 'hidden' },
  img:            { width: 32, height: 32, borderRadius: 6, marginBottom: 2 },
  imgPlaceholder: { width: 32, height: 32, borderRadius: 6, marginBottom: 2 },
  nombre:         { fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 11 },
  dias:           { fontSize: 9, fontWeight: '500' },
});
