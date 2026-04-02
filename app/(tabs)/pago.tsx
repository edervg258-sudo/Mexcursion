import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sombra } from '../../lib/estilos';
import { agregarHistorial, crearNotificacion, guardarReserva, obtenerUsuarioActivo } from '../../lib/supabase-db';

type MetodoPago = 'tarjeta' | 'spei' | 'oxxo';

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

const METODOS = [
  { id: 'tarjeta', emoji: '💳', label: 'Tarjeta',   sub: 'Crédito o débito' },
  { id: 'spei',    emoji: '🏦', label: 'SPEI',       sub: 'Transferencia'   },
  { id: 'oxxo',    emoji: '🏪', label: 'OXXO Pay',   sub: 'Pago en tienda'  },
];

export default function PagoScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero, email } =
    useLocalSearchParams<Record<string, string>>();

  const [metodo, setMetodo]         = useState<MetodoPago>('tarjeta');
  const [numTarjeta, setNum]        = useState('');
  const [vencimiento, setVenc]      = useState('');
  const [cvv, setCvv]               = useState('');
  const [titular, setTitular]       = useState('');
  const [procesando, setProcesando] = useState(false);

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
    setProcesando(true);
    const folio = 'MX' + Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        setProcesando(false);
        Alert.alert('Sesión requerida', 'Inicia sesión para completar tu reserva.');
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
        'confirmada'
      );

      if (!ok) {
        setProcesando(false);
        Alert.alert('Error', 'No se pudo guardar la reserva. Verifica tu conexión e intenta de nuevo.');
        return;
      }

      await agregarHistorial(
        usuario.id,
        'reserva',
        'Nueva reserva',
        `Reserva ${folio} — ${nombre}, paquete ${paquete}, $${parseInt(precio ?? '0').toLocaleString()} MXN`
      );
      await crearNotificacion(
        usuario.id,
        'reserva',
        'Reserva confirmada',
        `Tu reserva ${folio} para ${nombre} ha sido confirmada. Fecha: ${fecha}`
      );
    } catch (e) {
      setProcesando(false);
      Alert.alert('Error inesperado', 'Ocurrió un problema al procesar el pago. Intenta de nuevo.');
      return;
    }

    setProcesando(false);
    router.replace({
      pathname: '/(tabs)/confirmacion',
      params: { nombre, paquete, precio, personas, fecha, nombre_viajero, email, folio, metodo, ref_oxxo: refOxxo },
    } as any);
  };

  const Campo = ({ label, valor, onChange, placeholder, teclado = 'default', seguro = false }: any) => (
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
        />
      </View>
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
            <Text style={es.titulo}>Método de pago</Text>
            <Text style={es.subtitulo}>{nombre} · Paquete {paquete}</Text>
          </View>
        </View>

        <IndicadorPasos actual={1} />

        <ScrollView contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={es.tarjetaMonto}>
            <Text style={es.montoLabel}>Total a pagar</Text>
            <Text style={es.monto}>${parseInt(precio ?? '0').toLocaleString()}<Text style={es.montoMXN}> MXN</Text></Text>
            <View style={es.separadorMonto} />
            <View style={es.filasMonto}>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>Destino</Text><Text style={es.datoPagoValor}>{nombre}</Text></View>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>Personas</Text><Text style={es.datoPagoValor}>{personas}</Text></View>
              <View style={es.datoPago}><Text style={es.datoPagoLabel}>Fecha</Text><Text style={es.datoPagoValor}>{fecha}</Text></View>
            </View>
          </View>

          <Text style={es.seccionTitulo}>Selecciona tu método</Text>
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
                <Text style={es.formularioTitulo}>💳 Datos de la tarjeta</Text>
              </View>
              <View style={es.formularioCuerpo}>
                <Campo
                  label="Número de tarjeta"
                  valor={numTarjeta}
                  onChange={(v: string) => setNum(formatTarjeta(v))}
                  placeholder="0000 0000 0000 0000"
                  teclado="numeric"
                />
                <Campo
                  label="Titular de la tarjeta"
                  valor={titular}
                  onChange={setTitular}
                  placeholder="NOMBRE APELLIDO"
                />
                <View style={es.filaDos}>
                  <View style={{ flex: 1 }}>
                    <Text style={es.label}>Vencimiento</Text>
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
                  <Text style={es.textoSegura}>🔒  Conexión cifrada SSL · Datos no almacenados</Text>
                </View>
              </View>
            </View>
          )}

          {metodo === 'spei' && (
            <View style={es.formulario}>
              <View style={es.formularioHeader}>
                <Text style={es.formularioTitulo}>🏦 Instrucciones SPEI</Text>
              </View>
              <View style={es.formularioCuerpo}>
                {['Abre tu aplicación bancaria', 'Realiza una transferencia SPEI a la siguiente CLABE', `Usa como referencia tu correo: ${email}`, 'Presiona "Confirmar" — tu reserva se activa al recibir el pago'].map((txt, i) => (
                  <View key={i} style={es.filaInstruccion}>
                    <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                    <Text style={es.instruccionTexto}>{txt}</Text>
                  </View>
                ))}
                <View style={es.cajaClabe}>
                  <Text style={es.clabeLabel}>CLABE interbancaria</Text>
                  <Text style={es.clabe}>032180000118359719</Text>
                  <Text style={es.clabeLabel}>HSBC · Mexcursion SA de CV</Text>
                </View>
              </View>
            </View>
          )}

          {metodo === 'oxxo' && (
            <View style={es.formulario}>
              <View style={es.formularioHeader}>
                <Text style={es.formularioTitulo}>🏪 Pago en OXXO</Text>
              </View>
              <View style={es.formularioCuerpo}>
                {['Acude a cualquier tienda OXXO', 'Indica que realizarás un pago de servicio', 'Proporciona la referencia de pago', 'Guarda tu comprobante y presiona "Confirmar"'].map((txt, i) => (
                  <View key={i} style={es.filaInstruccion}>
                    <View style={es.numerito}><Text style={es.numeritoTexto}>{i + 1}</Text></View>
                    <Text style={es.instruccionTexto}>{txt}</Text>
                  </View>
                ))}
                <View style={es.cajaClabe}>
                  <Text style={es.clabeLabel}>Referencia de pago</Text>
                  <Text style={es.clabe}>{refOxxo}</Text>
                  <Text style={es.clabeLabel}>Monto: ${parseInt(precio ?? '0').toLocaleString()} MXN · Vigencia 48 h</Text>
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
                  {metodo === 'tarjeta' ? '🔒  Pagar ahora' : '✓  Confirmar reserva'}
                </Text>}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const es = StyleSheet.create({
  contenedor:         { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:         { opacity: 0.1, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  area:               { flex: 1 },

  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  btnVolver:          { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  chevron:            { fontSize: 26, color: '#3AB7A5', lineHeight: 30 },
  logo:               { width: 36, height: 36 },
  titulo:             { fontSize: 16, fontWeight: '700', color: '#333' },
  subtitulo:          { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },

  indicadorPasos:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filaPaso:           { alignItems: 'center', gap: 4 },
  circuloPaso:        { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  circuloActivo:      { backgroundColor: '#3AB7A5' },
  circuloCompleto:    { backgroundColor: '#3AB7A5' },
  checkPaso:          { color: '#fff', fontSize: 13, fontWeight: '700' },
  numPaso:            { fontSize: 12, fontWeight: '700', color: '#aaa' },
  etiquetaPaso:       { fontSize: 10, color: '#aaa', fontWeight: '500' },
  etiquetaActiva:     { color: '#3AB7A5', fontWeight: '700' },
  lineaPaso:          { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 6, marginBottom: 14 },
  lineaCompleta:      { backgroundColor: '#3AB7A5' },

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
  input:              { flex: 1, fontSize: 14, color: '#333' },
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