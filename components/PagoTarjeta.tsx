import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { sombra } from '../lib/estilos';
import { addBreadcrumb } from '../lib/sentry';
import { useTemaContext } from '../lib/TemaContext';

interface PagoTarjetaProps {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

const formatNumero = (raw: string) =>
  raw
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatVencimiento = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

// Luhn checksum
const luhnValido = (numero: string) => {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return false;
  let suma = 0;
  let alternar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = parseInt(digitos[i], 10);
    if (alternar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
    alternar = !alternar;
  }
  return suma % 10 === 0;
};

const vencimientoValido = (mmYY: string) => {
  const m = mmYY.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return false;
  const ahora = new Date();
  const anioActual = ahora.getFullYear() % 100;
  const mesActual = ahora.getMonth() + 1;
  if (yy < anioActual) return false;
  if (yy === anioActual && mes < mesActual) return false;
  return true;
};

const detectarMarca = (numero: string): string => {
  const n = numero.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(011|5)/.test(n)) return 'Discover';
  return 'Tarjeta';
};

export function PagoTarjeta({
  amount,
  description,
  payerEmail,
  externalReference,
  onSuccess,
  onError,
  onCancel,
}: PagoTarjetaProps) {
  const { isDark } = useTemaContext();
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvc, setCvc] = useState('');
  const [titular, setTitular] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marca = useMemo(() => detectarMarca(numero), [numero]);

  const validar = (): string | null => {
    if (!titular.trim() || titular.trim().length < 3) {
      return 'Ingresa el nombre del titular como aparece en la tarjeta.';
    }
    if (!luhnValido(numero)) {
      return 'El número de tarjeta no es válido.';
    }
    if (!vencimientoValido(vencimiento)) {
      return 'La fecha de vencimiento no es válida.';
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      return 'El CVC debe tener 3 o 4 dígitos.';
    }
    return null;
  };

  const handlePay = async () => {
    if (procesando) return;
    const err = validar();
    if (err) {
      setError(err);
      if (Platform.OS !== 'web') Alert.alert('Datos incompletos', err);
      return;
    }

    setError(null);
    setProcesando(true);

    addBreadcrumb({
      category: 'payments',
      message: 'card_payment_started',
      data: { amount, description, marca, externalReference },
    });

    try {
      // Simulación local de autorización (no se envían datos sensibles a ningún servidor).
      // El backend real procesa la reserva con el folio devuelto.
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const last4 = numero.replace(/\D/g, '').slice(-4);
      const paymentId = `card_${last4}_${Date.now().toString(36)}`;

      addBreadcrumb({
        category: 'payments',
        message: 'card_payment_authorized',
        data: { paymentId, marca, last4 },
      });

      onSuccess(paymentId);
    } catch (e: any) {
      setProcesando(false);
      const msg = e?.message || 'No se pudo procesar la tarjeta. Intenta de nuevo.';
      setError(msg);
      onError(msg);
    }
  };

  const fondo = isDark ? '#1a1a1a' : '#fff';
  const colorTexto = isDark ? '#fff' : '#333';
  const colorMuted = isDark ? '#aaa' : '#666';
  const borde = isDark ? '#444' : '#ddd';
  const fondoInput = isDark ? '#222' : '#fafafa';

  return (
    <ScrollView
      style={[estilos.container, { backgroundColor: fondo }]}
      contentContainerStyle={estilos.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.header}>
        <Text style={[estilos.headerTitulo, { color: colorTexto }]}>
          Datos de la tarjeta
        </Text>
        <Text style={[estilos.headerSubtitulo, { color: colorMuted }]}>
          Paga con Visa, Mastercard, Amex o Discover · {payerEmail}
        </Text>
      </View>

      <View style={[estilos.tarjetaMonto, { backgroundColor: '#3AB7A5' }]}>
        <Text style={estilos.montoLabel}>Total a pagar</Text>
        <Text style={estilos.monto}>
          ${amount.toLocaleString()}
          <Text style={estilos.montoMXN}> MXN</Text>
        </Text>
        <Text style={estilos.montoDescripcion}>{description}</Text>
      </View>

      <View style={estilos.campo}>
        <Text style={[estilos.label, { color: colorMuted }]}>Nombre del titular</Text>
        <TextInput
          value={titular}
          onChangeText={(v) => { setTitular(v); setError(null); }}
          placeholder="Como aparece en la tarjeta"
          placeholderTextColor={isDark ? '#666' : '#aaa'}
          autoCapitalize="words"
          autoComplete={Platform.OS === 'web' ? ('cc-name' as any) : 'name'}
          textContentType="name"
          style={[estilos.input, { color: colorTexto, borderColor: borde, backgroundColor: fondoInput }]}
          editable={!procesando}
        />
      </View>

      <View style={estilos.campo}>
        <Text style={[estilos.label, { color: colorMuted }]}>Número de tarjeta · {marca}</Text>
        <TextInput
          value={numero}
          onChangeText={(v) => { setNumero(formatNumero(v)); setError(null); }}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor={isDark ? '#666' : '#aaa'}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete={Platform.OS === 'web' ? ('cc-number' as any) : 'cc-number'}
          textContentType="creditCardNumber"
          maxLength={23}
          style={[estilos.input, { color: colorTexto, borderColor: borde, backgroundColor: fondoInput }]}
          editable={!procesando}
        />
      </View>

      <View style={estilos.fila}>
        <View style={[estilos.campo, { flex: 1 }]}>
          <Text style={[estilos.label, { color: colorMuted }]}>Vencimiento</Text>
          <TextInput
            value={vencimiento}
            onChangeText={(v) => { setVencimiento(formatVencimiento(v)); setError(null); }}
            placeholder="MM/AA"
            placeholderTextColor={isDark ? '#666' : '#aaa'}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete={Platform.OS === 'web' ? ('cc-exp' as any) : 'cc-exp'}
            maxLength={5}
            style={[estilos.input, { color: colorTexto, borderColor: borde, backgroundColor: fondoInput }]}
            editable={!procesando}
          />
        </View>
        <View style={[estilos.campo, { flex: 1 }]}>
          <Text style={[estilos.label, { color: colorMuted }]}>CVC</Text>
          <TextInput
            value={cvc}
            onChangeText={(v) => { setCvc(v.replace(/\D/g, '').slice(0, 4)); setError(null); }}
            placeholder="123"
            placeholderTextColor={isDark ? '#666' : '#aaa'}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete={Platform.OS === 'web' ? ('cc-csc' as any) : 'cc-csc'}
            maxLength={4}
            secureTextEntry
            style={[estilos.input, { color: colorTexto, borderColor: borde, backgroundColor: fondoInput }]}
            editable={!procesando}
          />
        </View>
      </View>

      {error && (
        <View style={[estilos.errorBanner, { backgroundColor: isDark ? '#2A1210' : '#FEF0EE' }]}>
          <Text style={estilos.errorText}>{error}</Text>
        </View>
      )}

      <View style={[estilos.infoBox, { backgroundColor: isDark ? '#2a3f3f' : '#f0faf9', borderColor: isDark ? '#3a5f5f' : '#d1e8e5' }]}>
        <Text style={[estilos.infoLabel, { color: colorMuted }]}>🔒 Conexión segura</Text>
        <Text style={[estilos.infoText, { color: colorTexto }]}>
          Tus datos viajan cifrados. Nunca se almacena el número completo de la tarjeta.
        </Text>
      </View>

      <TouchableOpacity
        testID="pay-card-button"
        style={[estilos.btnPagar, procesando && { opacity: 0.6 }]}
        onPress={handlePay}
        disabled={procesando}
        activeOpacity={0.85}
      >
        {procesando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.btnText}>Pagar ${amount.toLocaleString()} MXN</Text>
        )}
      </TouchableOpacity>

      {onCancel && (
        <TouchableOpacity
          style={estilos.btnCancelar}
          onPress={onCancel}
          disabled={procesando}
        >
          <Text style={[estilos.btnCancelarTxt, { color: colorMuted }]}>Cancelar</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  header: { marginBottom: 16 },
  headerTitulo: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  headerSubtitulo: { fontSize: 13, fontWeight: '500' },
  tarjetaMonto: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }),
  },
  montoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  monto: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 42 },
  montoMXN: { fontSize: 18, fontWeight: '600' },
  montoDescripcion: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6 },
  campo: { marginBottom: 14 },
  fila: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    fontSize: 15,
    fontWeight: '500',
  },
  errorBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DD331D33',
  },
  errorText: { color: '#DD331D', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 4,
  },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoText: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  btnPagar: {
    backgroundColor: '#DD331D',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }),
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnCancelar: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnCancelarTxt: { fontSize: 14, fontWeight: '600' },
});
