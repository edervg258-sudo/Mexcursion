import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { PagoMercadoPago } from '../../components/PagoMercadoPago';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import { agregarHistorial, crearNotificacion, guardarReserva, obtenerUsuarioActivo } from '../../lib/supabase-db';

type MetodoPago = 'tarjeta' | 'spei' | 'oxxo';

export default function PagoScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero: _nombre_viajero, email, telefono: _telefono, notas } =
    useLocalSearchParams<Record<string, string>>();
  const { t } = useIdioma();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_pago'), t('rsv_paso_confirmacion')];
  const METODOS = [
    { id: 'mercadopago', emoji: '💳', label: 'MercadoPago',   sub: 'Pago seguro en línea' },
    { id: 'tarjeta', emoji: '💳', label: t('pago_tarjeta'),   sub: t('pago_credito_debito') },
    { id: 'spei',    emoji: '🏦', label: t('pago_spei'),       sub: t('pago_transferencia')  },
    { id: 'oxxo',    emoji: '🏪', label: t('pago_oxxo'),       sub: t('pago_tienda')         },
  ];

  const [metodo, setMetodo]         = useState<MetodoPago>('mercadopago');
  const [numTarjeta, setNum]        = useState('');
  const [vencimiento, setVenc]      = useState('');
  const [cvv, setCvv]               = useState('');
  const [titular, setTitular]       = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mostrarMercadoPago, setMostrarMercadoPago] = useState(false);

  const formatTarjeta = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatVenc = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  const [refOxxo] = useState(
    '85700000' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  );

  const pagar = async () => {
    if (metodo === 'mercadopago') {
      // Para MercadoPago, mostrar el checkout
      setMostrarMercadoPago(true);
      return;
    }

    // Para otros métodos, procesar normalmente
    await procesarPago();
  };

  const procesarPago = async () => {
    setProcesando(true);
    const folio = 'MX' + Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        setProcesando(false);
        Alert.alert(t('pago_sesion_requerida'), t('pago_sesion_msg'));
        return;
      }

      const ok = await guardarReserva(
        usuario.id,
        folio,
        nombre ?? '',
        paquete ?? '',
        fecha ?? '',
        parseInt(personas ?? '1'),
        parseInt(precio ?? '0'),
        metodo,
        'confirmada',
        notas ?? undefined
      );

      if (!ok) {
        setProcesando(false);
        Alert.alert(t('pago_error'), t('pago_error_msg'));
        return;
      }

      // Crear notificación
      await crearNotificacion(
        usuario.id,
        'pago_exitoso',
        `Pago confirmado - Folio: ${folio}`,
        { folio, metodo }
      );

      // Agregar al historial
      await agregarHistorial(
        usuario.id,
        'pago',
        `Pago realizado con ${metodo} - Folio: ${folio}`,
        { folio, metodo, monto: parseInt(precio ?? '0') * parseInt(personas ?? '1') }
      );

      setProcesando(false);
      router.push({
        pathname: '/(tabs)/confirmacion',
        params: { folio, metodo }
      });
    } catch {
      setProcesando(false);
      Alert.alert(t('pago_error'), t('pago_error_msg'));
    }
  };

  const handlePagoMercadoPagoSuccess = async (_paymentId: string) => {
    setMostrarMercadoPago(false);
    // Procesar como pago exitoso
    await procesarPago();
  };

  const handlePagoMercadoPagoError = (error: string) => {
    setMostrarMercadoPago(false);
    Alert.alert('Error en pago', error);
  };

  const handlePagoMercadoPagoCancel = () => {
    setMostrarMercadoPago(false);
  };

  const Campo = ({ label, valor, onChange, placeholder, teclado = 'default', seguro = false }: { label: string; valor: string; onChange: (v: string) => void; placeholder?: string; teclado?: string; seguro?: boolean }) => (
    <View style={es.grupoCampo}>
      <Text style={es.label}>{label}</Text>
      <View style={es.cajaInput}>
        <TextInput
          style={es.input}
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType={teclado}
          secureTextEntry={seguro}
          autoCapitalize="characters"
          underlineColorAndroid="transparent"
        />
      </View>
    </View>
  );

  if (mostrarMercadoPago) {
    return (
      <PagoMercadoPago
        amount={parseInt(precio ?? '0') * parseInt(personas ?? '1')}
        description={`Reserva ${nombre} - ${paquete}`}
        onSuccess={handlePagoMercadoPagoSuccess}
        onError={handlePagoMercadoPagoError}
        onCancel={handlePagoMercadoPagoCancel}
      />
    );
  }

  return (
    <BookingStepLayout
      currentStep={1}
      steps={PASOS}
      title={t('pago_titulo')}
      subtitle={`${nombre} · ${t('rsv_paquete', { n: paquete ?? '' })}`}
    >
        <ScrollView contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={es.tarjetaMonto}>
            <Text style={es.montoLabel}>{t('pago_total')}</Text>
            <Text style={es.monto}>${parseInt(precio ?? '0').toLocaleString()}<Text style={es.montoMXN}> MXN</Text></Text>
            <View style={es.separadorMonto} />
            <View style={es.filasMonto}>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>{t('pago_destino')}</Text><Text style={es.datoPagoValor}>{nombre}</Text></View>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>{t('pago_personas')}</Text><Text style={es.datoPagoValor}>{personas}</Text></View>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>{t('pago_fecha')}</Text><Text style={es.datoPagoValor}>{fecha}</Text></View>
            </View>
          </View>

          <Text style={es.seccionTitulo}>{t('pago_selecciona')}</Text>
          <View style={es.filaMetodos}>
            {METODOS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[es.btnMetodo, metodo === m.id && es.btnMetodoActivo]}
                onPress={() => setMetodo(m.id as MetodoPago)}
                activeOpacity={0.8}
              >
                <Text style={es.emojiMetodo}>{m.emoji}</Text>
                <Text style={[es.labelMetodo, metodo === m.id && es.labelMetodoActivo]}>{m.label}</Text>
                <Text style={[es.subMetodo, metodo === m.id && { color: '#3AB7A5' }]}>{m.sub}</Text>
                {metodo === m.id && <View style={es.checkMetodo}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text></View>}
              </TouchableOpacity>
            ))}
          </View>

          {metodo === 'tarjeta' && (
            <View style={es.formulario}>
              <View style={es.formularioHeader}>
                <Text style={es.formularioTitulo}>{t('pago_datos_tarjeta')}</Text>
              </View>
              <View style={es.formularioCuerpo}>
                <Campo
                  label={t('pago_num_tarjeta')}
                  valor={numTarjeta}
                  onChange={(v: string) => setNum(formatTarjeta(v))}
                  placeholder="0000 0000 0000 0000"
                  teclado="numeric"
                />
                <Campo
                  label={t('pago_titular')}
                  valor={titular}
                  onChange={setTitular}
                  placeholder="NOMBRE APELLIDO"
                />
                <View style={es.filaDos}>
                  <View style={{ flex: 1 }}>
                    <Text style={es.label}>{t('pago_vencimiento')}</Text>
                    <View style={es.cajaInput}>
                      <TextInput
                        style={es.input}
                        value={vencimiento}
                        onChangeText={v => setVenc(formatVenc(v))}
                        placeholder="MM/AA"
                        placeholderTextColor="#bbb"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={es.label}>CVV</Text>
                    <View style={es.cajaInput}>
                      <TextInput
                        style={es.input}
                        value={cvv}
                        onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        placeholderTextColor="#bbb"
                        keyboardType="numeric"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>
                <View style={es.cajaSegura}>
                  <Text style={es.textoSegura}>{t('pago_ssl')}</Text>
                </View>
              </View>
            </View>
          )}

          {metodo === 'spei' && (
            <View style={es.formulario}>
              <View style={es.formularioHeader}>
                <Text style={es.formularioTitulo}>{t('pago_spei_titulo')}</Text>
              </View>
              <View style={es.formularioCuerpo}>
                {[t('pago_spei_paso1'), t('pago_spei_paso2'), t('pago_spei_paso3', { email: email ?? '' }), t('pago_spei_paso4')].map((txt, i) => (
                  <View key={i} style={es.filaInstruccion}>
                    <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                    <Text style={es.instruccionTexto}>{txt}</Text>
                  </View>
                ))}
                <View style={es.cajaClabe}>
                  <Text style={es.clabeLabel}>{t('pago_spei_clabe')}</Text>
                  <Text style={es.clabe}>032180000118359719</Text>
                  <Text style={es.clabeLabel}>HSBC · Mexcursion SA de CV</Text>
                </View>
              </View>
            </View>
          )}

          {metodo === 'oxxo' && (
            <View style={es.formulario}>
              <View style={es.formularioHeader}>
                <Text style={es.formularioTitulo}>{t('pago_oxxo_titulo')}</Text>
              </View>
              <View style={es.formularioCuerpo}>
                {[t('pago_oxxo_paso1'), t('pago_oxxo_paso2'), t('pago_oxxo_paso3'), t('pago_oxxo_paso4')].map((txt, i) => (
                  <View key={i} style={es.filaInstruccion}>
                    <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                    <Text style={es.instruccionTexto}>{txt}</Text>
                  </View>
                ))}
                <View style={es.cajaClabe}>
                  <Text style={es.clabeLabel}>{t('pago_oxxo_ref')}</Text>
                  <Text style={es.clabe}>{refOxxo}</Text>
                  <Text style={es.clabeLabel}>{t('pago_oxxo_monto', { precio: parseInt(precio ?? '0').toLocaleString() })}</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[es.btnPagar, procesando && { opacity: 0.7 }]}
            onPress={pagar}
            activeOpacity={0.85}
            disabled={procesando}
          >
            {procesando
              ? <ActivityIndicator color="#fff" />
              : <Text style={es.textoPagar}>
                  {metodo === 'tarjeta' ? t('pago_btn_pagar') : t('pago_btn_confirmar')}
                </Text>}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
    </BookingStepLayout>
  );
}

const es = StyleSheet.create({
  scroll:             { padding: 16, maxWidth: 700, alignSelf: 'center', width: '100%' },

  tarjetaMonto: { 
    backgroundColor: '#3AB7A5', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20, 
    ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }),
  },
  montoLabel:         { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  monto:              { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 46 },
  montoMXN:           { fontSize: 20, fontWeight: '600' },
  separadorMonto:     { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 14 },
  filasMonto:         { flexDirection: 'row', justifyContent: 'space-between' },
  datoPago:           { alignItems: 'center', flex: 1 },
  datoPagoLabel:      { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 },
  datoPagoValor:      { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  seccionTitulo:      { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  filaMetodos:        { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnMetodo:          { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', gap: 3, ...sombra({ opacity: 0.05, radius: 4, offsetY: 2, elevation: 1 }) },
  btnMetodoActivo:    { borderColor: '#3AB7A5', backgroundColor: '#f0faf9', ...sombra({ opacity: 0.1, radius: 6, offsetY: 2, elevation: 3 }) },
  emojiMetodo:        { fontSize: 24 },
  labelMetodo:        { fontSize: 12, color: '#888', fontWeight: '600' },
  labelMetodoActivo:  { color: '#3AB7A5', fontWeight: '700' },
  subMetodo:          { fontSize: 9, color: '#bbb' },
  checkMetodo:        { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },

  formulario:         { backgroundColor: '#fff', borderRadius: 18, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }) },
  formularioHeader:   { backgroundColor: '#f8f8f8', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  formularioTitulo:   { fontSize: 14, fontWeight: '700', color: '#333' },
  formularioCuerpo:   { padding: 16, gap: 12 },
  grupoCampo:         { gap: 6 },
  label:              { fontSize: 13, fontWeight: '600', color: '#555', marginLeft: 4 },
  cajaInput:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 25, borderWidth: 1.5, borderColor: '#3AB7A5', paddingHorizontal: 16, height: 48 },
  input:              { flex: 1, fontSize: 14, color: '#333', outlineWidth: 0 },
  filaDos:            { flexDirection: 'row', gap: 12 },
  cajaSegura:         { backgroundColor: '#f0faf9', borderRadius: 12, padding: 12, alignItems: 'center' },
  textoSegura:        { fontSize: 12, color: '#3AB7A5', fontWeight: '500' },

  filaInstruccion:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  numerito:           { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  numeritoTexto:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  instruccionTexto:   { fontSize: 13, color: '#555', lineHeight: 20, flex: 1 },
  cajaClabe:          { backgroundColor: '#f0faf9', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#3AB7A5' },
  clabeLabel:         { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  clabe:              { fontSize: 18, fontWeight: '800', color: '#333', letterSpacing: 2 },

  btnPagar: { 
    backgroundColor: '#DD331D', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center', 
    ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }),
  },
  textoPagar:         { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
