import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Image, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CodigoBarrasOxxo from '../../components/CodigoBarrasOxxo';
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
              {completo || activo
                ? <Text style={es.checkPaso}>✓</Text>
                : <Text style={es.numPaso}>{i + 1}</Text>}
            </View>
            <Text style={[es.etiquetaPaso, (activo || completo) && es.etiquetaActiva]}>{paso}</Text>
          </View>
          {i < PASOS.length - 1 && (
            <View style={[es.lineaPaso, (completo || actual > i) && es.lineaCompleta]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

export default function ConfirmacionScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero, email, folio, metodo, ref_oxxo } =
    useLocalSearchParams<Record<string, string>>();

  const { width } = useWindowDimensions();
  const anchoBarcode = Math.min(width - 64, 340);

  const escala   = useRef(new Animated.Value(0)).current;
  const opacidad = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(escala, { toValue: 1, useNativeDriver: true, tension: 55, friction: 6 }),
      Animated.parallel([
        Animated.timing(opacidad, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideY,   { toValue: 0,  duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const etiquetaMetodo: Record<string, string> = {
    tarjeta: '💳 Tarjeta de crédito/débito',
    spei:    '🏦 Transferencia SPEI',
    oxxo:    '🏪 OXXO Pay',
  };

  const detalles = [
    { label: 'Viajero',      valor: nombre_viajero,                              icono: '👤' },
    { label: 'Destino',      valor: nombre,                                       icono: '📍' },
    { label: 'Paquete',      valor: paquete,                                      icono: '🎒' },
    { label: 'Fecha',        valor: fecha,                                        icono: '📅' },
    { label: 'Personas',     valor: personas,                                     icono: '👥' },
    { label: 'Método',       valor: etiquetaMetodo[metodo ?? ''] ?? metodo,       icono: '💰' },
    { label: 'Total pagado', valor: `$${parseInt(precio ?? '0').toLocaleString()} MXN`, icono: '✅' },
  ];

  return (
    <View style={es.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={es.imagenMapa} resizeMode="contain" />

      <SafeAreaView style={es.area}>
        <View style={es.header}>
          <Image source={require('../../assets/images/logo.png')} style={es.logo} resizeMode="contain" />
          <Text style={es.headerTitulo}>Mexcursión</Text>
        </View>

        <IndicadorPasos actual={2} />

        <ScrollView contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false}>

          <Animated.View style={[es.circuloCheck, { transform: [{ scale: escala }] }]}>
            <View style={es.circuloInterno}>
              <Text style={es.checkIcon}>✓</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: opacidad, transform: [{ translateY: slideY }], alignItems: 'center', width: '100%' }}>

            <Text style={es.titulo}>¡Reserva confirmada!</Text>
            <Text style={es.subtitulo}>Tu aventura por México está lista. Guarda tu folio.</Text>

            <View style={es.tarjetaFolio}>
              <View style={es.folioHeader}>
                <Text style={es.folioHeaderTexto}>Folio de reserva</Text>
              </View>
              <View style={es.folioCuerpo}>
                <Text style={es.folioNum}>{folio}</Text>
                <View style={es.folioDestino}>
                  <Text style={es.folioDestinoTexto}>📍 {nombre} · {fecha}</Text>
                </View>
              </View>
            </View>

            <View style={es.tarjetaDetalle}>
              <View style={es.detalleHeader}>
                <Text style={es.detalleTitulo}>Detalle de tu viaje</Text>
              </View>
              {detalles.map((d, i) => (
                <View key={i} style={[es.filaDetalle, i < detalles.length - 1 && es.filaDetalleBorde]}>
                  <Text style={es.filaIcono}>{d.icono}</Text>
                  <Text style={es.filaLabel}>{d.label}</Text>
                  <Text style={es.filaValor} numberOfLines={1}>{d.valor}</Text>
                </View>
              ))}
            </View>

            {metodo === 'oxxo' ? (
              <CodigoBarrasOxxo
                referencia={ref_oxxo ?? folio ?? '00000000'}
                precio={precio ?? '0'}
                ancho={anchoBarcode}
              />
            ) : (
              <View style={es.nota}>
                <Text style={es.notaTexto}>
                  📱  Guarda este folio — lo necesitarás al presentarte en el destino.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={es.btnPrimario}
              onPress={() => router.replace('/(tabs)/menu' as any)}
              activeOpacity={0.85}
            >
              <Text style={es.textoBtnPrimario}>Explorar más destinos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={es.btnSecundario}
              onPress={() => router.replace('/(tabs)/mis_reservas' as any)}
              activeOpacity={0.85}
            >
              <Text style={es.textoBtnSecundario}>Ver mis reservas</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const es = StyleSheet.create({
  contenedor:         { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:         { opacity: 0.1, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  area:               { flex: 1 },

  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  logo:               { width: 36, height: 36 },
  headerTitulo:       { fontSize: 17, fontWeight: '800', color: '#333' },

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

  scroll:             { padding: 20, alignItems: 'center', maxWidth: 700, alignSelf: 'center', width: '100%' },

  circuloCheck:       { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(58,183,165,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: 10 },
  circuloInterno: { 
    width: 76, 
    height: 76, 
    borderRadius: 38, 
    backgroundColor: '#3AB7A5', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...sombra({ color: '#3AB7A5', opacity: 0.4, radius: 10, offsetY: 4, elevation: 6 }),
  },
  checkIcon:          { fontSize: 38, color: '#fff', fontWeight: '700', lineHeight: 44 },

  titulo:             { fontSize: 26, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 6 },
  subtitulo:          { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 22 },

  tarjetaFolio: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: 16, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#eee',
    ...sombra({ opacity: 0.1, radius: 8, offsetY: 4, elevation: 4 }),
  },
  folioHeader:        { backgroundColor: '#3AB7A5', paddingVertical: 10, paddingHorizontal: 18 },
  folioHeaderTexto:   { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  folioCuerpo:        { paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', gap: 8 },
  folioNum:           { fontSize: 30, fontWeight: '800', color: '#333', letterSpacing: 4 },
  folioDestino:       { backgroundColor: '#f0faf9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  folioDestinoTexto:  { fontSize: 12, color: '#3AB7A5', fontWeight: '600' },

  tarjetaDetalle: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    marginBottom: 14, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#eee',
    ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }),
  },
  detalleHeader:      { backgroundColor: '#f8f8f8', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detalleTitulo:      { fontSize: 13, fontWeight: '700', color: '#555' },
  filaDetalle:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 10 },
  filaDetalleBorde:   { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  filaIcono:          { fontSize: 16, width: 24, textAlign: 'center' },
  filaLabel:          { fontSize: 13, color: '#888', flex: 1 },
  filaValor:          { fontSize: 13, fontWeight: '700', color: '#333', maxWidth: '55%', textAlign: 'right' },

  nota:               { width: '100%', backgroundColor: '#fff8e1', borderRadius: 14, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#e9c46a' },
  notaTexto:          { fontSize: 13, color: '#8a6200', lineHeight: 20 },

  btnPrimario: { 
    width: '100%', 
    backgroundColor: '#DD331D', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginBottom: 10,
    ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }),
  },
  textoBtnPrimario:   { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  btnSecundario:      { width: '100%', borderWidth: 1.5, borderColor: '#3AB7A5', borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  textoBtnSecundario: { color: '#3AB7A5', fontSize: 15, fontWeight: '700' },
});