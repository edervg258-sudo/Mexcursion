import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sombra } from '../lib/estilos';
import { useTemaContext } from '../lib/TemaContext';

interface PagoTarjetaProps {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onBack?: () => void;
}

export function PagoTarjeta({
  amount,
  description: _description,
  payerEmail: _payerEmail,
  externalReference,
  onSuccess,
  onError,
  onBack,
}: PagoTarjetaProps) {
  const { isDark } = useTemaContext();
  const [loading, setLoading] = useState(false);
  const [titular, setTitular] = useState('');
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const numeroNormalizado = numero.replace(/\s/g, '');

  const handleCheckout = () => {
    if (!titular.trim()) {
      const mensaje = 'Ingresa el nombre del titular.';
      setError(mensaje);
      onError(mensaje);
      return;
    }
    if (!/^\d{16}$/.test(numeroNormalizado)) {
      const mensaje = 'Ingresa un numero de tarjeta de 16 digitos.';
      setError(mensaje);
      onError(mensaje);
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(vencimiento.trim())) {
      const mensaje = 'Ingresa una fecha de vencimiento valida en formato MM/AA.';
      setError(mensaje);
      onError(mensaje);
      return;
    }
    if (!/^\d{3,4}$/.test(cvv.trim())) {
      const mensaje = 'Ingresa un CVV valido.';
      setError(mensaje);
      onError(mensaje);
      return;
    }

    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(`sim-card-${externalReference}`);
    }, 900);
  };

  return (
    <ScrollView
      style={[estilos.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      contentContainerStyle={estilos.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.header}>
        <Text style={[estilos.headerTitulo, { color: isDark ? '#fff' : '#333' }]}>
          Datos de la tarjeta
        </Text>
        <Text style={[estilos.headerSubtitulo, { color: isDark ? '#aaa' : '#666' }]}>
          Pago simulado para pruebas
        </Text>
      </View>

      <View style={estilos.tarjetaMonto}>
        <Text style={estilos.montoLabel}>Total a pagar</Text>
        <Text style={estilos.monto}>${amount.toLocaleString()}<Text style={estilos.montoMXN}> MXN</Text></Text>
      </View>

      <View style={[estilos.formulario, { backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
        <View style={[estilos.formularioHeader, { backgroundColor: isDark ? '#1a1a1a' : '#f7f7f7', borderBottomColor: isDark ? '#444' : '#e6e6e6' }]}>
          <Text style={[estilos.formularioTitulo, { color: isDark ? '#fff' : '#333' }]}>Captura de tarjeta</Text>
        </View>
        <View style={estilos.formularioCuerpo}>
          <TextInput
            testID="cardholder-name-input"
            style={[estilos.input, { color: isDark ? '#fff' : '#333', borderColor: isDark ? '#555' : '#ddd', backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}
            placeholder="Nombre del titular"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={titular}
            onChangeText={(value) => { setTitular(value); if (error) { setError(null); } }}
            accessibilityLabel="Nombre del titular de la tarjeta"
          />
          <TextInput
            testID="card-number-input"
            style={[estilos.input, { color: isDark ? '#fff' : '#333', borderColor: isDark ? '#555' : '#ddd', backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}
            placeholder="Numero de tarjeta"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={numero}
            onChangeText={(value) => { setNumero(value.replace(/\D/g, '')); if (error) { setError(null); } }}
            keyboardType="number-pad"
            maxLength={16}
            accessibilityLabel="Número de tarjeta, 16 dígitos"
          />
          <View style={estilos.fila}>
            <TextInput
              testID="card-expiry-input"
              style={[estilos.input, estilos.inputMitad, { color: isDark ? '#fff' : '#333', borderColor: isDark ? '#555' : '#ddd', backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}
              placeholder="MM/AA"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={vencimiento}
              onChangeText={(value) => { setVencimiento(value); if (error) { setError(null); } }}
              maxLength={5}
              accessibilityLabel="Fecha de vencimiento en formato MM/AA"
            />
            <TextInput
              testID="card-cvv-input"
              style={[estilos.input, estilos.inputMitad, { color: isDark ? '#fff' : '#333', borderColor: isDark ? '#555' : '#ddd', backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}
              placeholder="CVV"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={cvv}
              onChangeText={(value) => { setCvv(value.replace(/\D/g, '')); if (error) { setError(null); } }}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Código de seguridad CVV"
            />
          </View>
          <View style={[estilos.infoBox, { backgroundColor: isDark ? '#2a3f3f' : '#f0faf9', borderColor: isDark ? '#3a5f5f' : '#d1e8e5' }]}>
            <Text style={[estilos.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>
              Pago de tarjeta simulado. No se realiza ningun cobro real.
            </Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={[estilos.errorBanner, { backgroundColor: isDark ? '#2A1210' : '#FEF0EE' }]}>
          <Text style={estilos.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        testID="pay-card-button"
        style={[estilos.btnPagar, loading && { opacity: 0.7 }]}
        onPress={handleCheckout}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Pagar ${amount.toLocaleString()} pesos`}
        accessibilityState={{ disabled: loading }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={estilos.btnPagarText}>Pagar ahora</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        testID="back-to-payment-methods-button"
        style={estilos.btnVolver}
        onPress={onBack}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Volver a métodos de pago"
      >
        <Text style={estilos.btnVolverText}>Volver a metodos de pago</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 20,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitulo: {
    fontSize: 13,
    fontWeight: '500',
  },
  tarjetaMonto: {
    backgroundColor: '#3AB7A5',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }),
  },
  montoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 6,
  },
  monto: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  montoMXN: {
    fontSize: 18,
    fontWeight: '600',
  },
  formulario: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }),
  },
  formularioHeader: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  formularioTitulo: {
    fontSize: 14,
    fontWeight: '700',
  },
  formularioCuerpo: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  fila: {
    flexDirection: 'row',
    gap: 12,
  },
  inputMitad: {
    flex: 1,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DD331D33',
  },
  errorText: {
    color: '#DD331D',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  btnPagar: {
    backgroundColor: '#DD331D',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }),
  },
  btnPagarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnVolver: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3AB7A5',
    backgroundColor: 'transparent',
  },
  btnVolverText: {
    color: '#3AB7A5',
    fontSize: 15,
    fontWeight: '700',
  },
});
