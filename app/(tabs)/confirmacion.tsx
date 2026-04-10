import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import CodigoBarrasOxxo from '../../components/CodigoBarrasOxxo';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';

export default function ConfirmacionScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero, telefono, notas, folio, metodo, ref_oxxo } =
    useLocalSearchParams<Record<string, string>>();
  const { t } = useIdioma();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_pago'), t('rsv_paso_confirmacion')];

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
  }, [escala, opacidad, slideY]);

  const etiquetaMetodo: Record<string, string> = {
    tarjeta: t('pago_metodo_tarjeta'),
    spei:    t('pago_metodo_spei'),
    oxxo:    t('pago_metodo_oxxo'),
  };

  const detalles = [
    { label: t('conf_viajero'),  valor: nombre_viajero,                              icono: '👤' },
    { label: t('conf_telefono'), valor: telefono,                                    icono: '📱' },
    { label: t('conf_destino'),  valor: nombre,                                      icono: '📍' },
    { label: t('conf_paquete'),  valor: paquete,                                     icono: '🎒' },
    { label: t('conf_fecha'),    valor: fecha,                                       icono: '📅' },
    { label: t('conf_personas'), valor: personas,                                    icono: '👥' },
    { label: t('conf_metodo'),   valor: etiquetaMetodo[metodo ?? ''] ?? metodo,      icono: '💰' },
    { label: t('conf_total'),    valor: `$${parseInt(precio ?? '0').toLocaleString()} MXN`, icono: '✅' },
  ].filter(d => d.valor);

  return (
    <BookingStepLayout
      currentStep={2}
      steps={PASOS}
      showLogoOnly
      brandTitle="Mexcursión"
    >
        <ScrollView contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false}>

          <Animated.View style={[es.circuloCheck, { transform: [{ scale: escala }] }]}>
            <View style={es.circuloInterno}>
              <Text style={es.checkIcon}>✓</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: opacidad, transform: [{ translateY: slideY }], alignItems: 'center', width: '100%' }}>

            <Text style={es.titulo}>{t('conf_titulo')}</Text>
            <Text style={es.subtitulo}>{t('conf_subtitulo')}</Text>

            <View style={es.tarjetaFolio}>
              <View style={es.folioHeader}>
                <Text style={es.folioHeaderTexto}>{t('conf_folio')}</Text>
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
                <Text style={es.detalleTitulo}>{t('conf_detalle')}</Text>
              </View>
              {detalles.map((d, i) => (
                <View key={i} style={[es.filaDetalle, i < detalles.length - 1 && es.filaDetalleBorde]}>
                  <Text style={es.filaIcono}>{d.icono}</Text>
                  <Text style={es.filaLabel}>{d.label}</Text>
                  <Text style={es.filaValor} numberOfLines={1}>{d.valor}</Text>
                </View>
              ))}
            </View>

            {!!notas && (
              <View style={es.cajaNota}>
                <Text style={es.cajaNotaTitulo}>{t('conf_notas')}</Text>
                <Text style={es.cajaNotaTexto}>{notas}</Text>
              </View>
            )}

            {metodo === 'oxxo' ? (
              <CodigoBarrasOxxo
                referencia={ref_oxxo ?? folio ?? '00000000'}
                precio={precio ?? '0'}
                ancho={anchoBarcode}
              />
            ) : (
              <View style={es.nota}>
                <Text style={es.notaTexto}>{t('conf_aviso')}</Text>
              </View>
            )}

            <TouchableOpacity
              style={es.btnPrimario}
              onPress={() => router.replace('/(tabs)/menu' as never)}
              activeOpacity={0.85}
            >
              <Text style={es.textoBtnPrimario}>{t('conf_explorar')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={es.btnSecundario}
              onPress={() => router.replace('/(tabs)/mis_reservas' as never)}
              activeOpacity={0.85}
            >
              <Text style={es.textoBtnSecundario}>{t('conf_mis_reservas')}</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </Animated.View>
        </ScrollView>
    </BookingStepLayout>
  );
}

const es = StyleSheet.create({
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
  cajaNota:           { width: '100%', backgroundColor: '#f0faf9', borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#3AB7A5' },
  cajaNotaTitulo:     { fontSize: 12, fontWeight: '700', color: '#3AB7A5', marginBottom: 4 },
  cajaNotaTexto:      { fontSize: 13, color: '#555', lineHeight: 20 },

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
