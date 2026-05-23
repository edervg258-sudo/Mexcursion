import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { useToast } from '../../components/Toast';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import { agregarHistorial, crearNotificacion, guardarReserva, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { normalizeError, userMessageForError } from '../../lib/error-handling';

// ─── Calendario funcional (web + nativo sin dependencias externas) ────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_ES  = ['L','M','X','J','V','S','D'];

function parseFechaDDMMAAAA(s: string): Date | null {
  const p = s.split('/');
  if (p.length !== 3) { return null; }
  const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  if (isNaN(d.getTime())) { return null; }
  if (d.getFullYear() !== parseInt(p[2]) || d.getMonth() !== parseInt(p[1]) - 1 || d.getDate() !== parseInt(p[0])) { return null; }
  return d;
}

function formatDDMMAAAA(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

const CalendarioPicker = ({ fecha, onSelect, color }: { fecha: string; onSelect: (f: string) => void; color?: string }) => {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const [visible, setVisible]  = useState(false);
  const [mesBase, setMesBase]  = useState(() => {
    const selec = parseFechaDDMMAAAA(fecha);
    return selec ? new Date(selec.getFullYear(), selec.getMonth(), 1) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  const seleccionado = parseFechaDDMMAAAA(fecha);
  const ac = color ?? '#3AB7A5';

  const primerDia = (() => {
    const d = mesBase.getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const diasEnMes = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) { celdas.push(null); }

  const elegirDia = (dia: number) => {
    const f = new Date(mesBase.getFullYear(), mesBase.getMonth(), dia);
    if (f < hoy) { return; }
    onSelect(formatDDMMAAAA(f));
    setVisible(false);
  };

  const prevMes = () => setMesBase(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMes = () => setMesBase(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  if (Platform.OS === 'web') {
    const valorISO = seleccionado
      ? `${seleccionado.getFullYear()}-${String(seleccionado.getMonth()+1).padStart(2,'0')}-${String(seleccionado.getDate()).padStart(2,'0')}`
      : '';
    const hoySO = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    return (
      <View style={[es.cajaInput, { paddingVertical: 0, minHeight: 48 }]}>
        {/* @ts-ignore: input HTML nativo en web */}
        <input
          type="date"
          value={valorISO}
          min={hoySO}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            if (!v) { return; }
            const [y, m, d] = v.split('-');
            onSelect(`${d}/${m}/${y}`);
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: valorISO ? '#333' : '#bbb',
            fontFamily: 'inherit',
            height: 46,
            width: '100%',
            cursor: 'pointer',
          } as React.CSSProperties}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[es.cajaInput, { justifyContent: 'space-between' }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[es.input, { color: fecha ? '#333' : '#bbb', flex: 1 }]}>
          {fecha || 'DD/MM/AAAA'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#3AB7A5" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={es.calOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={es.calCaja}>
              <View style={es.calNav}>
                <TouchableOpacity onPress={prevMes} style={es.calNavBtn}>
                  <Ionicons name="chevron-back" size={22} color={ac} />
                </TouchableOpacity>
                <Text style={es.calNavTitulo}>
                  {MESES_ES[mesBase.getMonth()]} {mesBase.getFullYear()}
                </Text>
                <TouchableOpacity onPress={nextMes} style={es.calNavBtn}>
                  <Ionicons name="chevron-forward" size={22} color={ac} />
                </TouchableOpacity>
              </View>
              <View style={es.calFilaDias}>
                {DIAS_ES.map(d => (
                  <View key={d} style={es.calCeldaDia}>
                    <Text style={es.calDiaTxt}>{d}</Text>
                  </View>
                ))}
              </View>
              <View style={es.calGrid}>
                {celdas.map((dia, i) => {
                  if (!dia) { return <View key={`v${i}`} style={es.calCelda} />; }
                  const fd = new Date(mesBase.getFullYear(), mesBase.getMonth(), dia);
                  const pasado  = fd < hoy;
                  const esHoy   = fd.toDateString() === hoy.toDateString();
                  const selec   = seleccionado?.toDateString() === fd.toDateString();
                  return (
                    <TouchableOpacity
                      key={`d${i}`}
                      style={es.calCelda}
                      onPress={() => !pasado && elegirDia(dia)}
                      disabled={pasado}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        es.calCirculo,
                        selec  && { backgroundColor: ac },
                        esHoy && !selec && { backgroundColor: ac + '22', borderWidth: 1.5, borderColor: ac },
                      ]}>
                        <Text style={[
                          es.calNumeroDia,
                          selec  && { color: '#fff', fontWeight: '800' },
                          esHoy && !selec && { color: ac, fontWeight: '700' },
                          pasado && { color: '#ddd' },
                        ]}>{dia}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─── Campo de formulario (fuera del componente para evitar remount en cada render) ─
interface CampoProps {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  onLimpiarError?: () => void;
  error?: string;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  seguro?: boolean;
  testID?: string;
  isValid?: boolean;
}

const Campo = React.memo(({
  label, valor, onChange, onLimpiarError, error,
  placeholder, teclado = 'default', seguro = false, testID, isValid,
}: CampoProps) => (
  <View style={es.grupoCampo}>
    <Text style={es.label}>{label}</Text>
    <View style={[
      es.cajaInput,
      !!error   && es.cajaInputError,
      !!isValid && es.cajaInputValido,
    ]}>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint="Campo del formulario de reserva"
        style={es.input}
        value={valor}
        onChangeText={(v: string) => {
          onChange(v);
          onLimpiarError?.();
        }}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={teclado}
        secureTextEntry={seguro}
        autoCapitalize="none"
        underlineColorAndroid="transparent"
      />
      {isValid ? <Ionicons name="checkmark-circle" size={18} color="#1A9B8A" /> : null}
    </View>
    {error ? <Text style={es.textoError}>{error}</Text> : null}
  </View>
));

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function ReservaScreen() {
  const { nombre, paquete, precio } =
    useLocalSearchParams<{ nombre: string; paquete: string; precio: string }>();
  const { t } = useIdioma();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_confirmacion')];

  const [nombre_viajero, setNombreViajero] = useState('');
  const [email, setEmail]                 = useState('');
  const [telefono, setTelefono]           = useState('');
  const [personas, setPersonas]           = useState(1);
  const [fecha, setFecha]                 = useState('');
  const [notas, setNotas]                 = useState('');
  const [errores, setErrores]             = useState<Record<string, string>>({});
  const [enviando, setEnviando]           = useState(false);
  const { showToast } = useToast();
  const procesandoRef = useRef(false);

  const precioUnitario = parseInt(precio ?? '0');
  const total          = precioUnitario * personas;

  const limpiarError = (campo: string) => {
    setErrores(prev => {
      if (!prev[campo]) { return prev; }
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

  const validarCampo = (campo: string, valor: string): string => {
    switch (campo) {
      case 'nombre':
        return valor.trim().length < 3 ? t('rsv_err_nombre') : '';
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) ? '' : t('rsv_err_correo');
      case 'tel':
        return valor.replace(/\D/g, '').length >= 10 ? '' : t('rsv_err_telefono');
      case 'fecha': {
        const fechaObj = parseFechaDDMMAAAA(valor);
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        return fechaObj && fechaObj >= hoy ? '' : t('rsv_err_fecha');
      }
      default:
        return '';
    }
  };

  const validar = () => {
    const e: Record<string, string> = {};
    const errNombre = validarCampo('nombre', nombre_viajero);
    const errEmail  = validarCampo('email',  email);
    const errTel    = validarCampo('tel',    telefono);
    const errFecha  = validarCampo('fecha',  fecha);
    if (errNombre) { e.nombre = errNombre; }
    if (errEmail)  { e.email  = errEmail;  }
    if (errTel)    { e.tel    = errTel;    }
    if (errFecha)  { e.fecha  = errFecha;  }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const confirmar = async () => {
    if (!validar()) {
      showToast(t('rsv_completa_datos'), 'error');
      return;
    }
    if (procesandoRef.current) { return; }
    procesandoRef.current = true;
    setEnviando(true);

    const folio = 'MX' + Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        showToast(t('sesion_requerida'), 'error');
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30_000)
      );

      await Promise.race([
        (async () => {
          let resultado = await guardarReserva(
            usuario.id, folio, nombre ?? '', paquete ?? '',
            fecha, personas, total, 'tarjeta', 'confirmada', notas
          );
          if (resultado === 'failed') {
            await new Promise(r => setTimeout(r, 800));
            resultado = await guardarReserva(
              usuario.id, folio, nombre ?? '', paquete ?? '',
              fecha, personas, total, 'tarjeta', 'confirmada', notas
            );
          }
          if (resultado === 'failed') { throw new Error('save_failed'); }

          await crearNotificacion(
            usuario.id, 'pago_exitoso',
            `Reserva confirmada - Folio: ${folio}`,
            JSON.stringify({ folio, estado: 'confirmada' })
          );
          await agregarHistorial(
            usuario.id, 'reserva',
            `Reserva confirmada en ${nombre ?? ''} - Folio: ${folio}`,
            JSON.stringify({ folio, monto: total, estado: 'confirmada' })
          );
        })(),
        timeoutPromise,
      ]);

      router.push({
        pathname: '/(tabs)/confirmacion',
        params: {
          nombre, paquete,
          precio: String(total),
          personas: String(personas),
          fecha,
          nombre_viajero,
          telefono,
          notas,
          folio,
        },
      } as never);
    } catch (err) {
      if (__DEV__) { console.error('Reservation error:', err); }
      const normalized = normalizeError(err);
      if (err instanceof Error && err.message === 'timeout') {
        showToast('La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.', 'error');
      } else if (err instanceof Error && err.message === 'save_failed') {
        showToast('No se pudo guardar la reserva. Intenta de nuevo.', 'error');
      } else {
        showToast(userMessageForError(normalized), 'error');
      }
    } finally {
      procesandoRef.current = false;
      setEnviando(false);
    }
  };


  return (
    <BookingStepLayout
      currentStep={0}
      steps={PASOS}
      title={t('rsv_datos_viaje')}
      subtitle={`${nombre} · ${t('rsv_paquete', { n: paquete ?? '' })}`}
    >
      <ScrollView testID="reserva-screen" contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={es.tarjetaResumen}>
          <View style={es.resumenHeader}>
            <Text style={es.resumenHeaderTexto}>Resumen de tu selección</Text>
          </View>
          <View style={es.resumenCuerpo}>
            {[
              { label: t('rsv_destino'),       valor: nombre ?? '' },
              { label: t('conf_paquete'),       valor: paquete ?? '' },
              { label: t('rsv_precio_persona'), valor: `$${precioUnitario.toLocaleString()} MXN` },
            ].map(f => (
              <View key={f.label} style={es.filaResumen}>
                <Text style={es.resumenLabel}>{f.label}</Text>
                <Text style={es.resumenValor}>{f.valor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Número de personas */}
        <View style={es.grupoCampo}>
          <Text style={es.label}>{t('rsv_num_personas')}</Text>
          <View style={es.filaPersonas}>
            <TouchableOpacity style={es.btnPersona} onPress={() => setPersonas(p => Math.max(1, p - 1))} activeOpacity={0.8}>
              <Text style={es.textoPersona}>−</Text>
            </TouchableOpacity>
            <Text style={es.numPersonas}>{personas}</Text>
            <TouchableOpacity style={es.btnPersona} onPress={() => setPersonas(p => Math.min(20, p + 1))} activeOpacity={0.8}>
              <Text style={es.textoPersona}>+</Text>
            </TouchableOpacity>
            <View style={es.cajaTotalPersonas}>
              <Text style={es.totalLabel}>{t('rsv_total')}</Text>
              <Text style={es.totalMonto}>${total.toLocaleString()} MXN</Text>
            </View>
          </View>
        </View>

        <Campo testID="traveler-name-input"  label={t('rsv_nombre')}   valor={nombre_viajero} onChange={setNombreViajero} onLimpiarError={() => limpiarError('nombre')} error={errores.nombre} placeholder={t('rsv_ph_nombre')}   isValid={nombre_viajero.length > 0 && !errores.nombre && !validarCampo('nombre', nombre_viajero)} />
        <Campo testID="traveler-email-input" label={t('rsv_correo')}   valor={email}          onChange={setEmail}          onLimpiarError={() => limpiarError('email')}  error={errores.email}  placeholder={t('rsv_ph_correo')}   teclado="email-address" isValid={email.length > 0 && !errores.email && !validarCampo('email', email)} />
        <Campo testID="traveler-phone-input" label={t('rsv_telefono')} valor={telefono}       onChange={setTelefono}       onLimpiarError={() => limpiarError('tel')}    error={errores.tel}    placeholder={t('rsv_ph_telefono')} teclado="phone-pad" isValid={telefono.length > 0 && !errores.tel && !validarCampo('tel', telefono)} />

        <View style={es.grupoCampo}>
          <Text style={es.label}>{t('rsv_fecha')}</Text>
          <CalendarioPicker fecha={fecha} onSelect={setFecha} color="#3AB7A5" />
          {errores.fecha ? <Text style={es.textoError}>{errores.fecha}</Text> : null}
        </View>

        <View style={es.grupoCampo}>
          <Text style={es.label}>{t('rsv_notas')}</Text>
          <TextInput
            style={[es.cajaInput, { height: 88, paddingTop: 12, paddingHorizontal: 18 }]}
            value={notas}
            onChangeText={setNotas}
            placeholder={t('rsv_notas_hint')}
            placeholderTextColor="#bbb"
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
          />
        </View>

        <TouchableOpacity
          testID="reserve-continue-button"
          style={[es.btnContinuar, enviando && es.btnContinuarDisabled]}
          onPress={confirmar}
          disabled={enviando}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Confirmar reserva"
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={es.textoContinuar}>{t('rsv_continuar')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </BookingStepLayout>
  );
}

const es = StyleSheet.create({
  scroll:            { padding: 16, maxWidth: 700, alignSelf: 'center', width: '100%' },

  tarjetaResumen:    { backgroundColor: '#fff', borderRadius: 18, marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', ...sombra({ opacity: 0.1, radius: 6, offsetY: 2, elevation: 3 }) },
  resumenHeader:     { backgroundColor: '#3AB7A5', paddingHorizontal: 18, paddingVertical: 12 },
  resumenHeaderTexto:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  resumenCuerpo:     { paddingHorizontal: 18, paddingVertical: 8 },
  filaResumen:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  resumenLabel:      { fontSize: 13, color: '#888' },
  resumenValor:      { fontSize: 13, fontWeight: '700', color: '#333' },

  grupoCampo:        { marginBottom: 14 },
  label:             { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginLeft: 4 },
  cajaInput:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, borderWidth: 1.5, borderColor: '#3AB7A5', paddingHorizontal: 16, minHeight: 48, ...sombra({ opacity: 0.05, radius: 4, offsetY: 1, elevation: 1 }) },
  cajaInputError:    { borderColor: '#DD331D' },
  cajaInputValido:   { borderColor: '#1A9B8A' },
  input:             { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0, outlineWidth: 0 },
  textoError:        { fontSize: 11, color: '#DD331D', marginTop: 4, marginLeft: 14 },

  filaPersonas:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btnPersona:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', ...sombra({ opacity: 0.2, radius: 4, offsetY: 2, elevation: 3 }) },
  textoPersona:      { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  numPersonas:       { fontSize: 26, fontWeight: '800', color: '#333', minWidth: 34, textAlign: 'center' },
  cajaTotalPersonas: { flex: 1, backgroundColor: '#f0faf9', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'flex-end' },
  totalLabel:        { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  totalMonto:        { fontSize: 17, fontWeight: '800', color: '#3AB7A5' },

  btnContinuar:      { backgroundColor: '#3AB7A5', borderRadius: 25, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...sombra({ opacity: 0.2, radius: 6, offsetY: 3, elevation: 4 }) },
  btnContinuarDisabled: { backgroundColor: '#9DB8B3', opacity: 0.7 },
  textoContinuar:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  calOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  calCaja:       { backgroundColor: '#fff', borderRadius: 22, padding: 20, width: 320, ...sombra({ opacity: 0.2, radius: 20, offsetY: 8, elevation: 10 }) },
  calNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn:     { padding: 6 },
  calNavTitulo:  { fontSize: 15, fontWeight: '800', color: '#333' },
  calFilaDias:   { flexDirection: 'row', marginBottom: 6 },
  calCeldaDia:   { flex: 1, alignItems: 'center' },
  calDiaTxt:     { fontSize: 11, fontWeight: '700', color: '#aaa' },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calCelda:      { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCirculo:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calNumeroDia:  { fontSize: 13, color: '#333', fontWeight: '500' },
});
