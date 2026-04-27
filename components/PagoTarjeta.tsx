import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

function formatNumeroTarjeta(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatVencimiento(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function PagoTarjeta({
  amount,
  description: _description,
  payerEmail: _payerEmail,
  externalReference,
  onSuccess,
  onError: _onError,
  onBack,
}: PagoTarjetaProps) {
  const { isDark } = useTemaContext();

  const [numero, setNumero]     = useState('');
  const [nombre, setNombre]     = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvc, setCvc]           = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const color = (light: string, dark: string) => (isDark ? dark : light);

  const validar = (): string | null => {
    const digits = numero.replace(/\s/g, '');
    if (digits.length !== 16) return 'Ingresa un número de tarjeta válido (16 dígitos).';
    if (!nombre.trim()) return 'Ingresa el nombre del titular.';
    const [mm, yy] = vencimiento.split('/');
    const mes = parseInt(mm ?? '', 10);
    const anio = parseInt('20' + (yy ?? ''), 10);
    if (isNaN(mes) || mes < 1 || mes > 12) return 'Fecha de vencimiento inválida.';
    const hoy = new Date();
    if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
      return 'La tarjeta está vencida.';
    }
    if (cvc.replace(/\D/g, '').length < 3) return 'CVC inválido.';
    return null;
  };

  const handlePagar = async () => {
    setError(null);
    const validationError = validar();
    if (validationError) { setError(validationError); return; }

    setProcesando(true);
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1800));
    setProcesando(false);

    // Generate a simulated payment ID tied to the externalReference
    const simulatedPaymentId = `sim_${externalReference.slice(-12)}_${Date.now().toString(36)}`;
    onSuccess(simulatedPaymentId);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color('#fff', '#1a1a1a') }}
      contentContainerStyle={estilos.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.header}>
        <Text style={[estilos.titulo, { color: color('#333', '#fff') }]}>Datos de la tarjeta</Text>
        <Text style={[estilos.subtitulo, { color: color('#666', '#aaa') }]}>
          Pago simulado — implementación real próximamente
        </Text>
      </View>

      <View style={[estilos.tarjetaMonto, { backgroundColor: '#3AB7A5' }]}>
        <Text style={estilos.montoLabel}>Total a pagar</Text>
        <Text style={estilos.monto}>${amount.toLocaleString()}<Text style={estilos.montoMXN}> MXN</Text></Text>
      </View>

      <View style={[estilos.aviso, { backgroundColor: color('#fff8e1', '#2a2510'), borderColor: color('#ffe082', '#4a4020') }]}>
        <Text style={[estilos.avisoTexto, { color: color('#7a6200', '#c8a800') }]}>
          Modo simulación — no se realizará ningún cargo real.
        </Text>
      </View>

      {/* Número de tarjeta */}
      <Text style={[estilos.label, { color: color('#555', '#aaa') }]}>Número de tarjeta</Text>
      <TextInput
        style={[estilos.input, { borderColor: color('#ddd', '#444'), color: color('#333', '#fff'), backgroundColor: color('#fff', '#2a2a2a') }]}
        value={numero}
        onChangeText={v => setNumero(formatNumeroTarjeta(v))}
        placeholder="1234 5678 9012 3456"
        placeholderTextColor={color('#bbb', '#666')}
        keyboardType="number-pad"
        maxLength={19}
      />

      {/* Nombre del titular */}
      <Text style={[estilos.label, { color: color('#555', '#aaa') }]}>Nombre del titular</Text>
      <TextInput
        style={[estilos.input, { borderColor: color('#ddd', '#444'), color: color('#333', '#fff'), backgroundColor: color('#fff', '#2a2a2a') }]}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Como aparece en la tarjeta"
        placeholderTextColor={color('#bbb', '#666')}
        autoCapitalize="characters"
      />

      {/* Vencimiento + CVC */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.label, { color: color('#555', '#aaa') }]}>Vencimiento</Text>
          <TextInput
            style={[estilos.input, { borderColor: color('#ddd', '#444'), color: color('#333', '#fff'), backgroundColor: color('#fff', '#2a2a2a') }]}
            value={vencimiento}
            onChangeText={v => setVencimiento(formatVencimiento(v))}
            placeholder="MM/AA"
            placeholderTextColor={color('#bbb', '#666')}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.label, { color: color('#555', '#aaa') }]}>CVC</Text>
          <TextInput
            style={[estilos.input, { borderColor: color('#ddd', '#444'), color: color('#333', '#fff'), backgroundColor: color('#fff', '#2a2a2a') }]}
            value={cvc}
            onChangeText={v => setCvc(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            placeholderTextColor={color('#bbb', '#666')}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>

      {error && (
        <View style={[estilos.errorBanner, { backgroundColor: color('#FEF0EE', '#2A1210') }]}>
          <Text style={estilos.errorTexto}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[estilos.btnPagar, procesando && { opacity: 0.6 }]}
        onPress={handlePagar}
        disabled={procesando}
        activeOpacity={0.85}
      >
        {procesando
          ? <ActivityIndicator color="#fff" />
          : <Text style={estilos.btnTexto}>Pagar ahora</Text>}
      </TouchableOpacity>

      {onBack && (
        <TouchableOpacity onPress={onBack} style={estilos.btnVolver} activeOpacity={0.7}>
          <Text style={[estilos.btnVolverTexto, { color: color('#666', '#aaa') }]}>← Volver</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  content:      { paddingHorizontal: 16, paddingVertical: 20, maxWidth: 700, alignSelf: 'center', width: '100%' },
  header:       { marginBottom: 20 },
  titulo:       { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitulo:    { fontSize: 13 },
  tarjetaMonto: { borderRadius: 20, padding: 20, marginBottom: 16, ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }) },
  montoLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 },
  monto:        { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 42 },
  montoMXN:     { fontSize: 18, fontWeight: '600' },
  aviso:        { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 20 },
  avisoTexto:   { fontSize: 12, fontWeight: '600' },
  label:        { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input:        { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, letterSpacing: 1 },
  errorBanner:  { borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#DD331D33' },
  errorTexto:   { color: '#DD331D', fontSize: 13, fontWeight: '600' },
  btnPagar:     { backgroundColor: '#3AB7A5', borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginTop: 24, ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }) },
  btnTexto:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnVolver:    { alignItems: 'center', marginTop: 16 },
  btnVolverTexto: { fontSize: 14 },
});
