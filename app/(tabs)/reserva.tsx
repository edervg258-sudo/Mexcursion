import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';

export default function ReservaScreen() {
  const { nombre, paquete, precio } =
    useLocalSearchParams<{ nombre: string; paquete: string; precio: string }>();
  const { t } = useIdioma();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_pago'), t('rsv_paso_confirmacion')];

  const [nombre_viajero, setNombreViajero] = useState('');
  const [email, setEmail]                 = useState('');
  const [telefono, setTelefono]           = useState('');
  const [personas, setPersonas]           = useState(1);
  const [fecha, setFecha]                 = useState('');
  const [notas, setNotas]                 = useState('');
  const [errores, setErrores]             = useState<Record<string, string>>({});

  const precioUnitario = parseInt(precio ?? '0');
  const total          = precioUnitario * personas;

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nombre_viajero.trim()) { e.nombre = t('rsv_err_nombre'); }
    if (!email.includes('@'))   { e.email  = t('rsv_err_correo'); }
    if (!telefono.trim())       { e.tel    = t('rsv_err_telefono'); }

    // Validar fecha real y futura (formato DD/MM/AAAA)
    const partes = fecha.split('/');
    const dia    = parseInt(partes[0], 10);
    const mes    = parseInt(partes[1], 10);
    const anio   = parseInt(partes[2], 10);
    const fechaObj = new Date(anio, mes - 1, dia);
    const hoy      = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaValida = partes.length === 3
      && !isNaN(fechaObj.getTime())
      && fechaObj.getFullYear() === anio
      && fechaObj.getMonth() === mes - 1
      && fechaObj.getDate() === dia
      && fechaObj >= hoy;
    if (!fechaValida) { e.fecha = t('rsv_err_fecha'); }

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const formatFecha = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) { return d; }
    if (d.length <= 4) { return `${d.slice(0, 2)}/${d.slice(2)}`; }
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  };

  const continuar = () => {
    if (!validar()) { return; }
    router.push({
      pathname: '/(tabs)/pago',
      params: { nombre, paquete, precio: String(total), personas: String(personas), fecha, nombre_viajero, email, telefono, notas },
    } as never);
  };

  const Campo = ({ icono, label, valor, onChange, error, placeholder, teclado = 'default', seguro = false, testID }: { icono?: string; label: string; valor: string; onChange: (v: string) => void; error?: string; placeholder?: string; teclado?: KeyboardTypeOptions; seguro?: boolean; testID?: string }) => (
    <View style={es.grupoCampo}>
      <Text style={es.label}>{label}</Text>
      <View style={[es.cajaInput, !!error && es.cajaInputError]}>
        {icono ? <Text style={es.iconoCampo}>{icono}</Text> : null}
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint="Campo del formulario de reserva"
          style={es.input}
          value={valor}
          onChangeText={(t: string) => { onChange(t); if (error) { setErrores(e => ({ ...e })); } }}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType={teclado}
          secureTextEntry={seguro}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
        />
      </View>
      {error ? <Text style={es.textoError}>⚠ {error}</Text> : null}
    </View>
  );

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

          <View style={es.grupoCampo}>
            <Text style={es.label}>{t('rsv_num_personas')}</Text>
            <View style={es.filaPersonas}>
              <TouchableOpacity
                style={es.btnPersona}
                onPress={() => setPersonas(p => Math.max(1, p - 1))}
                activeOpacity={0.8}
              >
                <Text style={es.textoPersona}>−</Text>
              </TouchableOpacity>
              <Text style={es.numPersonas}>{personas}</Text>
              <TouchableOpacity
                style={es.btnPersona}
                onPress={() => setPersonas(p => Math.min(20, p + 1))}
                activeOpacity={0.8}
              >
                <Text style={es.textoPersona}>+</Text>
              </TouchableOpacity>
              <View style={es.cajaTotalPersonas}>
                <Text style={es.totalLabel}>{t('rsv_total')}</Text>
                <Text style={es.totalMonto}>${total.toLocaleString()} MXN</Text>
              </View>
            </View>
          </View>

          <Campo testID="traveler-name-input" icono="👤" label={t('rsv_nombre')} valor={nombre_viajero} onChange={setNombreViajero} error={errores.nombre} placeholder={t('rsv_ph_nombre')} />
          <Campo testID="traveler-email-input" icono="✉️" label={t('rsv_correo')} valor={email} onChange={setEmail} error={errores.email} placeholder={t('rsv_ph_correo')} teclado="email-address" />
          <Campo testID="traveler-phone-input" icono="📱" label={t('rsv_telefono')} valor={telefono} onChange={setTelefono} error={errores.tel} placeholder={t('rsv_ph_telefono')} teclado="phone-pad" />
          <Campo testID="travel-date-input" icono="📅" label={t('rsv_fecha')} valor={fecha} onChange={(v: string) => setFecha(formatFecha(v))} error={errores.fecha} placeholder={t('rsv_ph_fecha')} />

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
            style={es.btnContinuar}
            onPress={continuar}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continuar a pago"
          >
            <Text style={es.textoContinuar}>{t('rsv_continuar')}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
    </BookingStepLayout>
  );
}

const es = StyleSheet.create({
  scroll:            { padding: 16, maxWidth: 700, alignSelf: 'center', width: '100%' },

  tarjetaResumen: { 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    marginBottom: 18, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#eee',
    ...sombra({ opacity: 0.1, radius: 6, offsetY: 2, elevation: 3 }),
  },
  resumenHeader:     { backgroundColor: '#3AB7A5', paddingHorizontal: 18, paddingVertical: 12 },
  resumenHeaderTexto:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  resumenCuerpo:     { paddingHorizontal: 18, paddingVertical: 8 },
  filaResumen:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  resumenLabel:      { fontSize: 13, color: '#888' },
  resumenValor:      { fontSize: 13, fontWeight: '700', color: '#333' },

  grupoCampo:        { marginBottom: 14 },
  label:             { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginLeft: 4 },
  cajaInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    borderWidth: 1.5, 
    borderColor: '#3AB7A5', 
    paddingHorizontal: 16, 
    minHeight: 48,
    ...sombra({ opacity: 0.05, radius: 4, offsetY: 1, elevation: 1 }),
  },
  cajaInputError:    { borderColor: '#DD331D' },
  iconoCampo:        { fontSize: 16, marginRight: 8 },
  input:             { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0, outlineWidth: 0 },
  textoError:        { fontSize: 11, color: '#DD331D', marginTop: 4, marginLeft: 14 },

  filaPersonas:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btnPersona: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#3AB7A5', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...sombra({ opacity: 0.2, radius: 4, offsetY: 2, elevation: 3 }),
  },
  textoPersona:      { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  numPersonas:       { fontSize: 26, fontWeight: '800', color: '#333', minWidth: 34, textAlign: 'center' },
  cajaTotalPersonas: { flex: 1, backgroundColor: '#f0faf9', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'flex-end' },
  totalLabel:        { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  totalMonto:        { fontSize: 17, fontWeight: '800', color: '#3AB7A5' },

  btnContinuar: { 
    backgroundColor: '#DD331D', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 8,
    ...sombra({ color: '#DD331D', opacity: 0.3, radius: 8, offsetY: 4, elevation: 5 }),
  },
  textoContinuar:    { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
