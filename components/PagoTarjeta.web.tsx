import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { sombra } from '../lib/estilos';
import { useTemaContext } from '../lib/TemaContext';

interface PagoTarjetaProps {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function PagoTarjeta({ amount }: PagoTarjetaProps) {
  const { isDark } = useTemaContext();

  return (
    <ScrollView
      style={[es.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      contentContainerStyle={es.content}
    >
      <View style={[es.tarjetaMonto, { backgroundColor: '#3AB7A5' }]}>
        <Text style={es.montoLabel}>Total a pagar</Text>
        <Text style={es.monto}>
          ${amount.toLocaleString()}
          <Text style={es.montoMXN}> MXN</Text>
        </Text>
      </View>

      <View style={[es.aviso, { backgroundColor: isDark ? '#2a3f3f' : '#f0faf9', borderColor: isDark ? '#3a5f5f' : '#d1e8e5' }]}>
        <Text style={es.avisoEmoji}>📱</Text>
        <Text style={[es.avisoTitulo, { color: isDark ? '#fff' : '#333' }]}>
          Pago con tarjeta en la app móvil
        </Text>
        <Text style={[es.avisoTexto, { color: isDark ? '#aaa' : '#666' }]}>
          El pago con tarjeta requiere la app de Mexcursion en tu teléfono.{'\n'}
          Descárgala o usa SPEI / OXXO como método de pago alternativo.
        </Text>
      </View>
    </ScrollView>
  );
}

const es = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  tarjetaMonto: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }),
  },
  montoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  monto: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 42 },
  montoMXN: { fontSize: 18, fontWeight: '600' },
  aviso: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  avisoEmoji: { fontSize: 40, marginBottom: 4 },
  avisoTitulo: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  avisoTexto: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
