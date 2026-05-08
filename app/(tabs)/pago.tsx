import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { PagoTarjeta } from '../../components/PagoTarjeta';
import { normalizeError, userMessageForError } from '../../lib/error-handling';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import { agregarHistorial, crearNotificacion, guardarReserva, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { estadoReservaPorMetodo, generarReferenciaOxxo, type MetodoPago } from '../../lib/utilidades/pago';

export default function PagoScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero: _nombre_viajero, email, telefono: _telefono, notas } =
    useLocalSearchParams<Record<string, string>>();
  const { t } = useIdioma();
  const { tema, isDark } = useTemaContext();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_pago'), t('rsv_paso_confirmacion')];
  const METODOS = [
    { id: 'tarjeta', emoji: '💳', label: t('pago_tarjeta'),   sub: 'Pago simulado con tarjeta' },
    { id: 'spei',    emoji: '🏦', label: t('pago_spei'),       sub: t('pago_transferencia')  },
    { id: 'oxxo',    emoji: '🏪', label: t('pago_oxxo'),       sub: t('pago_tienda')         },
  ];

  const [metodo, setMetodo]         = useState<MetodoPago>('tarjeta');
  const [procesando, setProcesando] = useState(false);
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [errorPago, setErrorPago]   = useState<{ mensaje: string } | null>(null);
  const totalReserva = parseInt(precio ?? '0');
  const totalPersonas = parseInt(personas ?? '1');
  // Re-entrancy guard: prevents duplicate reservations from double-tap or stale callbacks
  const procesandoRef = useRef(false);
  const [externalReference] = useState(
    () => `mexcursion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Stable OXXO reference derived deterministically from booking params (no Math.random)
  const [refOxxo] = useState(() =>
    generarReferenciaOxxo(`${nombre ?? ''}${paquete ?? ''}${fecha ?? ''}${personas ?? ''}`)
  );

  const pagar = async () => {
    if (metodo === 'tarjeta') {
      setMostrarTarjeta(true);
      return;
    }
    await procesarPago();
  };

  const procesarPago = async (folioOverride?: string) => {
    // Re-entrancy guard: reject if already processing
    if (procesandoRef.current) {
      return;
    }
    procesandoRef.current = true;
    setProcesando(true);

    const folio = folioOverride ?? ('MX' + Math.random().toString(36).slice(2, 8).toUpperCase());
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

          const estadoReserva = estadoReservaPorMetodo(metodo);
          const payload = [
            usuario.id,
            folio,
            nombre ?? '',
            paquete ?? '',
            fecha ?? '',
            totalPersonas,
            totalReserva,
            metodo,
            estadoReserva,
            notas ?? '',
          ] as const;

          let saveResult = await guardarReserva(...payload);
          // Reintento único para fallos transitorios de red/proveedor.
          if (saveResult === 'failed') {
            await new Promise(resolve => setTimeout(resolve, 800));
            saveResult = await guardarReserva(...payload);
          }
          if (saveResult === 'queued_offline') {
            throw new Error('save_queued_offline');
          }
          if (saveResult === 'failed') {
            throw new Error('save_failed');
          }

          const pagoPendiente = estadoReserva === 'pendiente';
          await crearNotificacion(
            usuario.id,
            pagoPendiente ? 'pago_pendiente' : 'pago_exitoso',
            pagoPendiente ? `Pago pendiente - Folio: ${folio}` : `Pago confirmado - Folio: ${folio}`,
            JSON.stringify({ folio, metodo, estado: estadoReserva })
          );
          await agregarHistorial(
            usuario.id,
            'pago',
            pagoPendiente ? `Pago pendiente con ${metodo} - Folio: ${folio}` : `Pago realizado con ${metodo} - Folio: ${folio}`,
            JSON.stringify({ folio, metodo, monto: totalReserva, estado: estadoReserva })
          );
        })(),
        timeoutPromise,
      ]);

      procesandoRef.current = false;
      setProcesando(false);
      router.push({
        pathname: '/(tabs)/confirmacion',
        params: {
          nombre,
          paquete,
          precio: String(totalReserva),
          personas: String(totalPersonas),
          fecha,
          nombre_viajero: _nombre_viajero,
          telefono: _telefono,
          notas,
          folio,
          metodo,
          ref_oxxo: metodo === 'oxxo' ? refOxxo : '',
          estado: estadoReservaPorMetodo(metodo),
        },
      });
    } catch (err) {
      procesandoRef.current = false;
      setProcesando(false);
      console.error('[pago] process_payment error', err);
      if (err instanceof Error && err.message === 'no_session') {
        Alert.alert(t('pago_sesion_requerida'), t('pago_sesion_msg'));
      } else if (err instanceof Error && err.message === 'timeout') {
        setErrorPago({ mensaje: 'La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.' });
      } else if (err instanceof Error && err.message === 'save_failed') {
        setErrorPago({ mensaje: 'No se pudo guardar la reserva. Intenta de nuevo.' });
      } else if (err instanceof Error && err.message === 'save_queued_offline') {
        setErrorPago({ mensaje: 'No se pudo confirmar la reserva en este momento. Intenta nuevamente cuando tengas mejor conexion.' });
      } else {
        const normalized = normalizeError(err);
        setErrorPago({ mensaje: userMessageForError(normalized) });
      }
    }
  };

  const handlePagoTarjetaSuccess = async (paymentId: string) => {
    setMostrarTarjeta(false);
    await procesarPago(paymentId.slice(0, 20).toUpperCase());
  };
  const handlePagoTarjetaError = (error: string) => {
    const normalized = normalizeError(error);
    console.error('[pago] simulated_card_payment error', error);
    Alert.alert('Error en pago', userMessageForError(normalized));
  };

  const handlePagoTarjetaBack = () => {
    setMostrarTarjeta(false);
  };

  if (mostrarTarjeta) {
    return (
      <PagoTarjeta
        amount={totalReserva}
        description={`Reserva ${nombre} - ${paquete}`}
        payerEmail={email}
        externalReference={externalReference}
        onSuccess={handlePagoTarjetaSuccess}
        onError={handlePagoTarjetaError}
        onBack={handlePagoTarjetaBack}
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
          <Text style={es.monto}>${totalReserva.toLocaleString()}<Text style={es.montoMXN}> MXN</Text></Text>
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
                <Text style={es.clabeLabel}>{t('pago_oxxo_monto', { precio: totalReserva.toLocaleString() })}</Text>
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
