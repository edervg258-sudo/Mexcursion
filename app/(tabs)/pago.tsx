import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardTypeOptions,
  ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { PagoMercadoPago } from '../../components/PagoMercadoPago';
import { normalizeError, userMessageForError } from '../../lib/error-handling';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import { addBreadcrumb, captureApiError } from '../../lib/sentry';
import { agregarHistorial, crearNotificacion, guardarReserva, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';

type MetodoPago = 'mercadopago' | 'tarjeta' | 'spei' | 'oxxo';

export default function PagoScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero: _nombre_viajero, email, telefono: _telefono, notas } =
    useLocalSearchParams<Record<string, string>>();
  const { t } = useIdioma();
  const { tema, isDark } = useTemaContext();
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
  const [errorPago, setErrorPago]   = useState<{ mensaje: string } | null>(null);
  // Re-entrancy guard: prevents duplicate reservations from double-tap or stale callbacks
  const procesandoRef = useRef(false);

  const formatTarjeta = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatVenc = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  // Stable OXXO reference derived deterministically from booking params (no Math.random)
  const [refOxxo] = useState(() => {
    const seed = `${nombre ?? ''}${paquete ?? ''}${fecha ?? ''}${personas ?? ''}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0; }
    return '85700000' + (h % 100_000_000).toString().padStart(8, '0');
  });

  const pagar = async () => {
    if (metodo === 'mercadopago') {
      setMostrarMercadoPago(true);
      return;
    }
    await procesarPago();
  };

  const procesarPago = async (folioOverride?: string) => {
    // Re-entrancy guard: reject if already processing (covers double-tap and MP callback races)
    if (procesandoRef.current) {
      return;
    }
    procesandoRef.current = true;
    setProcesando(true);

    const folio = folioOverride ?? ('MX' + Math.random().toString(36).slice(2, 8).toUpperCase());
    addBreadcrumb({
      category: 'payments',
      message: 'payment_started',
      data: { metodo, folio, nombre, paquete, precio, personas },
    });

    // 30-second timeout so a hung network doesn't spin forever
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 30_000)
    );

    try {
      await Promise.race([
        (async () => {
          const usuario = await obtenerUsuarioActivo();
          if (!usuario) {
            throw new Error('no_session');
          }

          const payload = [
            usuario.id,
            folio,
            nombre ?? '',
            paquete ?? '',
            fecha ?? '',
            parseInt(personas ?? '1'),
            parseInt(precio ?? '0'),
            metodo,
            'confirmada',
            notas ?? '',
          ] as const;

          let ok = await guardarReserva(...payload);
          // Reintento único para fallos transitorios de red/proveedor.
          if (!ok) {
            await new Promise(resolve => setTimeout(resolve, 800));
            ok = await guardarReserva(...payload);
          }
          if (!ok) {
            throw new Error('save_failed');
          }

          await crearNotificacion(usuario.id, 'pago_exitoso', `Pago confirmado - Folio: ${folio}`, JSON.stringify({ folio, metodo }));
          await agregarHistorial(usuario.id, 'pago', `Pago realizado con ${metodo} - Folio: ${folio}`, JSON.stringify({ folio, metodo, monto: parseInt(precio ?? '0') * parseInt(personas ?? '1') }));
        })(),
        timeoutPromise,
      ]);

      procesandoRef.current = false;
      setProcesando(false);
      addBreadcrumb({
        category: 'payments',
        message: 'payment_completed',
        data: { metodo, folio },
      });
      router.push({ pathname: '/(tabs)/confirmacion', params: { folio, metodo } });
    } catch (err) {
      procesandoRef.current = false;
      setProcesando(false);
      captureApiError({
        feature: 'payments',
        action: 'process_payment',
        error: err,
        metadata: { metodo, folio, nombre, paquete },
      });
      if (err instanceof Error && err.message === 'no_session') {
        Alert.alert(t('pago_sesion_requerida'), t('pago_sesion_msg'));
      } else if (err instanceof Error && err.message === 'timeout') {
        setErrorPago({ mensaje: 'La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.' });
      } else if (err instanceof Error && err.message === 'save_failed') {
        setErrorPago({ mensaje: 'No se pudo guardar la reserva. Intenta de nuevo.' });
      } else {
        const normalized = normalizeError(err);
        setErrorPago({ mensaje: userMessageForError(normalized) });
      }
    }
  };

  const handlePagoMercadoPagoSuccess = async (paymentId: string) => {
    setMostrarMercadoPago(false);
    // Use the real MP payment ID as folio so retries are idempotent
    const folio = `MP${paymentId}`.slice(0, 20);
    await procesarPago(folio);
  };
  const handlePagoMercadoPagoError = (error: string) => {
    setMostrarMercadoPago(false);
    const normalized = normalizeError(error);
    captureApiError({
      feature: 'payments',
      action: 'mercadopago_checkout',
      error,
      metadata: { nombre, paquete, precio, personas },
    });
    Alert.alert('Error en pago', userMessageForError(normalized));
  };
  const handlePagoMercadoPagoCancel = () => setMostrarMercadoPago(false);

  const Campo = ({ label, valor, onChange, placeholder, teclado = 'default', seguro = false }: {
    label: string; valor: string; onChange: (v: string) => void;
    placeholder?: string; teclado?: KeyboardTypeOptions; seguro?: boolean;
  }) => (
    <View style={es.grupoCampo}>
      <Text style={[es.label, { color: tema.textoSecundario }]}>{label}</Text>
      <View style={[es.cajaInput, { backgroundColor: tema.inputFondo, borderColor: tema.bordeInput }]}>
        <TextInput
          style={[es.input, { color: tema.texto }]}
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={tema.textoMuted}
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
      <ScrollView testID="pago-screen" contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Tarjeta monto — siempre verde, no necesita dark mode */}
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

        {/* Métodos */}
        <Text style={[es.seccionTitulo, { color: tema.textoSecundario }]}>{t('pago_selecciona')}</Text>
        <View style={es.filaMetodos}>
          {METODOS.map(m => (
            <TouchableOpacity
              key={m.id}
              testID={`payment-method-${m.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Método de pago ${m.label}`}
              accessibilityHint="Selecciona este método de pago"
              style={[
                es.btnMetodo,
                { backgroundColor: tema.superficieBlanca, borderColor: tema.borde },
                metodo === m.id && { borderColor: '#3AB7A5', backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' },
              ]}
              onPress={() => { setMetodo(m.id as MetodoPago); setErrorPago(null); }}
              activeOpacity={0.8}
            >
              <Text style={es.emojiMetodo}>{m.emoji}</Text>
              <Text style={[es.labelMetodo, { color: tema.textoMuted }, metodo === m.id && es.labelMetodoActivo]}>{m.label}</Text>
              <Text style={[es.subMetodo, { color: tema.textoMuted }, metodo === m.id && { color: '#3AB7A5' }]}>{m.sub}</Text>
              {metodo === m.id && <View style={es.checkMetodo}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjeta */}
        {metodo === 'tarjeta' && (
          <View style={[es.formulario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <View style={[es.formularioHeader, { backgroundColor: tema.superficie, borderBottomColor: tema.borde }]}>
              <Text style={[es.formularioTitulo, { color: tema.texto }]}>{t('pago_datos_tarjeta')}</Text>
            </View>
            <View style={es.formularioCuerpo}>
              <Campo label={t('pago_num_tarjeta')} valor={numTarjeta} onChange={v => setNum(formatTarjeta(v))} placeholder="0000 0000 0000 0000" teclado="numeric" />
              <Campo label={t('pago_titular')} valor={titular} onChange={setTitular} placeholder="NOMBRE APELLIDO" />
              <View style={es.filaDos}>
                <View style={{ flex: 1 }}>
                  <Text style={[es.label, { color: tema.textoSecundario }]}>{t('pago_vencimiento')}</Text>
                  <View style={[es.cajaInput, { backgroundColor: tema.inputFondo, borderColor: tema.bordeInput }]}>
                    <TextInput style={[es.input, { color: tema.texto }]} value={vencimiento} onChangeText={v => setVenc(formatVenc(v))} placeholder="MM/AA" placeholderTextColor={tema.textoMuted} keyboardType="numeric" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[es.label, { color: tema.textoSecundario }]}>CVV</Text>
                  <View style={[es.cajaInput, { backgroundColor: tema.inputFondo, borderColor: tema.bordeInput }]}>
                    <TextInput style={[es.input, { color: tema.texto }]} value={cvv} onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))} placeholder="•••" placeholderTextColor={tema.textoMuted} keyboardType="numeric" secureTextEntry />
                  </View>
                </View>
              </View>
              <View style={[es.cajaSegura, { backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' }]}>
                <Text style={es.textoSegura}>{t('pago_ssl')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* SPEI */}
        {metodo === 'spei' && (
          <View style={[es.formulario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <View style={[es.formularioHeader, { backgroundColor: tema.superficie, borderBottomColor: tema.borde }]}>
              <Text style={[es.formularioTitulo, { color: tema.texto }]}>{t('pago_spei_titulo')}</Text>
            </View>
            <View style={es.formularioCuerpo}>
              {[t('pago_spei_paso1'), t('pago_spei_paso2'), t('pago_spei_paso3', { email: email ?? '' }), t('pago_spei_paso4')].map((txt, i) => (
                <View key={i} style={es.filaInstruccion}>
                  <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                  <Text style={[es.instruccionTexto, { color: tema.textoSecundario }]}>{txt}</Text>
                </View>
              ))}
              <View style={[es.cajaClabe, { backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' }]}>
                <Text style={es.clabeLabel}>{t('pago_spei_clabe')}</Text>
                <Text style={[es.clabe, { color: tema.texto }]}>032180000118359719</Text>
                <Text style={es.clabeLabel}>HSBC · Mexcursion SA de CV</Text>
              </View>
            </View>
          </View>
        )}

        {/* OXXO */}
        {metodo === 'oxxo' && (
          <View style={[es.formulario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <View style={[es.formularioHeader, { backgroundColor: tema.superficie, borderBottomColor: tema.borde }]}>
              <Text style={[es.formularioTitulo, { color: tema.texto }]}>{t('pago_oxxo_titulo')}</Text>
            </View>
            <View style={es.formularioCuerpo}>
              {[t('pago_oxxo_paso1'), t('pago_oxxo_paso2'), t('pago_oxxo_paso3'), t('pago_oxxo_paso4')].map((txt, i) => (
                <View key={i} style={es.filaInstruccion}>
                  <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                  <Text style={[es.instruccionTexto, { color: tema.textoSecundario }]}>{txt}</Text>
                </View>
              ))}
              <View style={[es.cajaClabe, { backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' }]}>
                <Text style={es.clabeLabel}>{t('pago_oxxo_ref')}</Text>
                <Text style={[es.clabe, { color: tema.texto }]}>{refOxxo}</Text>
                <Text style={es.clabeLabel}>{t('pago_oxxo_monto', { precio: parseInt(precio ?? '0').toLocaleString() })}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Banner de error con reintento */}
        {errorPago && (
          <View style={[es.bannerError, { backgroundColor: isDark ? '#2A1210' : '#FEF0EE' }]}>
            <Text style={es.bannerErrorTxt}>{errorPago.mensaje}</Text>
            <TouchableOpacity
              onPress={() => { setErrorPago(null); procesarPago(); }}
              style={es.btnReintentar}
            >
              <Text style={es.btnReintentarTxt}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          testID="pay-submit-button"
          accessibilityRole="button"
          accessibilityLabel={metodo === 'tarjeta' ? 'Pagar ahora' : 'Confirmar pago'}
          accessibilityHint="Confirma tu método de pago y continúa"
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

  tarjetaMonto:       { backgroundColor: '#3AB7A5', borderRadius: 20, padding: 20, marginBottom: 20, ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }) },
  montoLabel:         { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  monto:              { color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 46 },
  montoMXN:           { fontSize: 20, fontWeight: '600' },
  separadorMonto:     { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 14 },
  filasMonto:         { flexDirection: 'row', justifyContent: 'space-between' },
  datoPago:           { alignItems: 'center', flex: 1 },
  datoPagoLabel:      { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 },
  datoPagoValor:      { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  seccionTitulo:      { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  filaMetodos:        { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnMetodo:          { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1.5, gap: 3, ...sombra({ opacity: 0.05, radius: 4, offsetY: 2, elevation: 1 }) },
  emojiMetodo:        { fontSize: 24 },
  labelMetodo:        { fontSize: 12, fontWeight: '600' },
  labelMetodoActivo:  { color: '#3AB7A5', fontWeight: '700' },
  subMetodo:          { fontSize: 9 },
  checkMetodo:        { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },

  formulario:         { borderRadius: 18, marginBottom: 20, overflow: 'hidden', borderWidth: 1, ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }) },
  formularioHeader:   { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1 },
  formularioTitulo:   { fontSize: 14, fontWeight: '700' },
  formularioCuerpo:   { padding: 16, gap: 12 },
  grupoCampo:         { gap: 6 },
  label:              { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  cajaInput:          { flexDirection: 'row', alignItems: 'center', borderRadius: 25, borderWidth: 1.5, paddingHorizontal: 16, height: 48 },
  input:              { flex: 1, fontSize: 14 } as never,
  filaDos:            { flexDirection: 'row', gap: 12 },
  cajaSegura:         { borderRadius: 12, padding: 12, alignItems: 'center' },
  textoSegura:        { fontSize: 12, color: '#3AB7A5', fontWeight: '500' },

  filaInstruccion:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  numerito:           { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  numeritoTexto:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  instruccionTexto:   { fontSize: 13, lineHeight: 20, flex: 1 },
  cajaClabe:          { borderRadius: 14, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#3AB7A5' },
  clabeLabel:         { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  clabe:              { fontSize: 18, fontWeight: '800', letterSpacing: 2 },

  bannerError:        { borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#DD331D33' },
  bannerErrorTxt:     { flex: 1, fontSize: 13, color: '#DD331D', fontWeight: '600', lineHeight: 18 },
  btnReintentar:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#DD331D', flexShrink: 0 },
  btnReintentarTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  btnPagar:           { backgroundColor: '#DD331D', borderRadius: 25, paddingVertical: 16, alignItems: 'center', ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }) },
  textoPagar:         { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
