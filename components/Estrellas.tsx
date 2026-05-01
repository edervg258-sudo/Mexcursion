import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  valor: number;
  tamaño?: number;
  seleccionable?: boolean;
  onSelect?: (n: number) => void;
};

export function Estrellas({ valor, tamaño = 18, seleccionable = false, onSelect }: Props) {
  return (
    <View
      style={{ flexDirection: 'row', gap: 2 }}
      testID="rating-stars"
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Calificación: ${valor} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          testID={`star-${n}`}
          disabled={!seleccionable}
          onPress={() => onSelect?.(n)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Calificar ${n} estrellas`}
          accessibilityState={{ disabled: !seleccionable }}
        >
          <Text style={{ fontSize: tamaño, color: n <= valor ? '#f5a623' : '#ddd' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
