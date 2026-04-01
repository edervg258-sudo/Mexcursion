import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Image, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sombra } from '../../lib/estilos';

const PASOS = ['Reserva', 'Pago', 'Confirmación'];

const IndicadorPasos = ({ actual }: { actual: number }) => (
  <View style={es.indicadorPasos}>
    {PASOS.map((paso, i) => {
      const activo   = i === actual;
      const completo = i < actual;
      return (
        <React.Fragment key={paso}>
          <View style={es.filaPaso}>
            <View style={[es.circuloPaso, activo && es.circuloActivo, completo && es.circuloCompleto]}>
              {completo
                ? <Text style={es.checkPaso}>✓</Text>
                : <Text style={[es.numPaso, activo && { color: '#fff' }]}>{i + 1}</Text>}
            </View>
            <Text style={[es.etiquetaPaso, activo && es.etiquetaActiva]}>{paso}</Text>
          </View>
          {i < PASOS.length - 1 && (
            <View style={[es.lineaPaso, completo && es.lineaCompleta]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

export default function ReservaScreen() {
  const { nombre, paquete, precio } =
    useLocalSearchParams<{ nombre: string; paquete: string; precio: string }>();

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
    if (!nombre_viajero.trim()) e.nombre = 'Ingresa tu nombre completo';
    if (!email.includes('@'))   e.email  = 'Ingresa un correo válido';
    if (!telefono.trim())       e.tel    = 'Ingresa tu teléfono';
    if (!fecha.trim())          e.fecha  = 'Ingresa la fecha de viaje';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const continuar = () => {
    if (!validar()) return;
    router.push({
      pathname: '/(tabs)/pago',
      params: { nombre, paquete, precio: String(total), personas: String(personas), fecha, nombre_viajero, email },
    } as any);
  };

  const Campo = ({ icono, label, valor, onChange, error, placeholder, teclado = 'default', seguro = false }: any) => (
    <View style={es.grupoCampo}>
      <Text style={es.label}>{label}</Text>
      <View style={[es.cajaInput, !!error && es.cajaInputError]}>
        {icono ? <Text style={es.iconoCampo}>{icono}</Text> : null}
        <TextInput
          style={es.input}
          value={valor}
          onChangeText={(t: string) => { onChange(t); if (error) setErrores(e => ({ ...e })); }}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType={teclado}
          secureTextEntry={seguro}
          autoCapitalize="none"
        />
      </View>
      {error ? <Text style={es.textoError}>⚠ {error}</Text> : null}
    </View>
  );

  return (
    <View style={es.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={es.imagenMapa} resizeMode="contain" />

      <SafeAreaView style={es.area}>
        <View style={es.header}>
          <TouchableOpacity onPress={() => router.back()} style={es.btnVolver}>
            <Text style={es.chevron}>‹</Text>
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={es.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={es.titulo}>Datos del viaje</Text>
            <Text style={es.subtitulo}>{nombre} · Paquete {paquete}</Text>
          </View>
        </View>

        <IndicadorPasos actual={0} />

        <ScrollView contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={es.tarjetaResumen}>
            <View style={es.resumenHeader}>
              <Text style={es.resumenHeaderTexto}>Resumen de tu selección</Text>
            </View>
            <View style={es.resumenCuerpo}>
              {[
                { label: 'Destino', valor: nombre ?? '' },
                { label: 'Paquete', valor: paquete ?? '' },
                { label: 'Precio por persona', valor: `$${precioUnitario.toLocaleString()} MXN` },
              ].map(f => (
                <View key={f.label} style={es.filaResumen}>
                  <Text style={es.resumenLabel}>{f.label}</Text>
                  <Text style={es.resumenValor}>{f.valor}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={es.grupoCampo}>
            <Text style={es.label}>Número de personas</Text>
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
                <Text style={es.totalLabel}>Total</Text>
                <Text style={es.totalMonto}>${total.toLocaleString()} MXN</Text>
              </View>
            </View>
          </View>

          <Campo icono="👤" label="Nombre completo"      valor={nombre_viajero} onChange={setNombreViajero} error={errores.nombre} placeholder="Juan Pérez" />
          <Campo icono="✉️" label="Correo electrónico"   valor={email}          onChange={setEmail}          error={errores.email}  placeholder="juan@correo.com"  teclado="email-address" />
          <Campo icono="📱" label="Teléfono"             valor={telefono}       onChange={setTelefono}       error={errores.tel}    placeholder="55 1234 5678"     teclado="phone-pad" />
          <Campo icono="📅" label="Fecha de viaje (DD/MM/AAAA)" valor={fecha}  onChange={setFecha}          error={errores.fecha}  placeholder="15/08/2025" />

          <View style={es.grupoCampo}>
            <Text style={es.label}>Notas adicionales <Text style={{ color: '#bbb', fontWeight: '400' }}>(opcional)</Text></Text>
            <TextInput
              style={[es.cajaInput, { height: 88, paddingTop: 12, paddingHorizontal: 18 }]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Alergias, preferencias especiales, etc."
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={es.btnContinuar} onPress={continuar} activeOpacity={0.85}>
            <Text style={es.textoContinuar}>Continuar al pago →</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const es = StyleSheet.create({
  contenedor:        { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:        { opacity: 0.1, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  area:              { flex: 1 },

  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  btnVolver:         { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  chevron:           { fontSize: 26, color: '#3AB7A5', lineHeight: 30 },
  logo:              { width: 36, height: 36 },
  titulo:            { fontSize: 16, fontWeight: '700', color: '#333' },
  subtitulo:         { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },

  indicadorPasos:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filaPaso:          { alignItems: 'center', gap: 4 },
  circuloPaso:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  circuloActivo:     { backgroundColor: '#3AB7A5' },
  circuloCompleto:   { backgroundColor: '#3AB7A5' },
  checkPaso:         { color: '#fff', fontSize: 13, fontWeight: '700' },
  numPaso:           { fontSize: 12, fontWeight: '700', color: '#aaa' },
  etiquetaPaso:      { fontSize: 10, color: '#aaa', fontWeight: '500' },
  etiquetaActiva:    { color: '#3AB7A5', fontWeight: '700' },
  lineaPaso:         { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 6, marginBottom: 14 },
  lineaCompleta:     { backgroundColor: '#3AB7A5' },

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
  input:             { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0 },
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