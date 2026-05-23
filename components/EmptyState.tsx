import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTemaContext } from '../lib/TemaContext';

type Props = {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  subtitulo?: string;
  colorIcono?: string;
  btnLabel?: string;
  onBtnPress?: () => void;
};

export function EmptyState({ icono, titulo, subtitulo, colorIcono, btnLabel, onBtnPress }: Props) {
  const { tema } = useTemaContext();
  const color = colorIcono ?? '#3AB7A5';

  return (
    <View style={es.contenedor}>
      <View style={[es.circulo, { backgroundColor: color + '18' }]}>
        <Ionicons name={icono} size={40} color={color} />
      </View>
      <Text style={[es.titulo, { color: tema.texto }]}>{titulo}</Text>
      {!!subtitulo && (
        <Text style={[es.subtitulo, { color: tema.textoMuted }]}>{subtitulo}</Text>
      )}
      {!!btnLabel && !!onBtnPress && (
        <TouchableOpacity style={[es.btn, { backgroundColor: color }]} onPress={onBtnPress} activeOpacity={0.85}>
          <Text style={es.btnTexto}>{btnLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const es = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 32, gap: 10 },
  circulo:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  titulo:     { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  subtitulo:  { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  btn:        { marginTop: 8, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 28 },
  btnTexto:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
