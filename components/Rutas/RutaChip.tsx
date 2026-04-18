// ============================================================
//  components/Rutas/RutaChip.tsx
// ============================================================

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RutaTematica } from '../../lib/datos/rutas-tematicas';
import { useTemaContext } from '../../lib/TemaContext';

const RUTA_IMG: Record<string, number> = {
  colonial: require('../../assets/images/guanajuato.png') as number,
  maya:     require('../../assets/images/chiapas.png') as number,
  pacifico: require('../../assets/images/sinaloa.png') as number,
  sabor:    require('../../assets/images/jalisco.png') as number,
  aventura: require('../../assets/images/chihuahua.png') as number,
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
      style={[
        s.chip,
        { backgroundColor: activa ? ruta.color : tema.superficie, borderColor: activa ? ruta.color : tema.borde },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
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
