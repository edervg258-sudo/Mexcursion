import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { BookingStepLayout } from '../../components/BookingStepLayout';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';

type DetalleItem = {
  label: string;
  valor: string | undefined;
  icono: React.ComponentProps<typeof Ionicons>['name'];
};

export default function ConfirmacionScreen() {
  const { nombre, paquete, precio, personas, fecha, nombre_viajero, telefono, notas, folio } =
    useLocalSearchParams<Record<string, string>>();
  const { t } = useIdioma();
  const { tema, isDark } = useTemaContext();
  const PASOS = [t('rsv_paso_reserva'), t('rsv_paso_confirmacion')];

  const escala   = useRef(new Animated.Value(0)).current;
  const opacidad = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(escala, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 55, friction: 6 }),
      Animated.parallel([
        Animated.timing(opacidad, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(slideY,   { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
  }, [escala, opacidad, slideY]);

  const detallesBase: DetalleItem[] = [
    { label: t('conf_viajero'),  valor: nombre_viajero, icono: 'person-outline'    },
    { label: t('conf_telefono'), valor: telefono,       icono: 'call-outline'      },
    { label: t('conf_destino'),  valor: nombre,         icono: 'location-outline'  },
    { label: t('conf_paquete'),  valor: paquete,        icono: 'briefcase-outline' },
    { label: t('conf_fecha'),    valor: fecha,          icono: 'calendar-outline'  },
    { label: t('conf_personas'), valor: personas,       icono: 'people-outline'    },
    { label: t('conf_total'),    valor: `$${parseInt(precio ?? '0').toLocaleString()} MXN`, icono: 'card-outline' },
  ];
  const detalles = detallesBase.filter(d => d.valor);

  return (
    <BookingStepLayout
      currentStep={1}
      steps={PASOS}
      showLogoOnly
      brandTitle="Mexcursión"
    >
      <ScrollView testID="confirmacion-screen" contentContainerStyle={es.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View style={[es.circuloCheck, { transform: [{ scale: escala }] }]}>
          <View style={es.circuloInterno}>
            <Ionicons name="checkmark" size={38} color="#fff" />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: opacidad, transform: [{ translateY: slideY }], alignItems: 'center', width: '100%' }}>

          <Text style={[es.titulo, { color: tema.texto }]}>{t('conf_titulo')}</Text>
          <Text style={[es.subtitulo, { color: tema.textoMuted }]}>{t('conf_subtitulo')}</Text>

          {/* Folio */}
          <View style={[es.tarjetaFolio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <View style={es.folioHeader}>
              <Text style={es.folioHeaderTexto}>{t('conf_folio')}</Text>
            </View>
            <View style={es.folioCuerpo}>
              <Text style={[es.folioNum, { color: tema.texto }]}>{folio}</Text>
              <View style={[es.folioDestino, { backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' }]}>
                <Ionicons name="location-outline" size={12} color="#3AB7A5" />
                <Text style={es.folioDestinoTexto}>{nombre} · {fecha}</Text>
              </View>
            </View>
          </View>

          {/* Detalle de reserva */}
          <View style={[es.tarjetaDetalle, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <View style={[es.detalleHeader, { backgroundColor: tema.superficie, borderBottomColor: tema.borde }]}>
              <Text style={[es.detalleTitulo, { color: tema.textoSecundario }]}>{t('conf_detalle')}</Text>
            </View>
            {detalles.map((d, i) => (
              <View key={i} style={[es.filaDetalle, i < detalles.length - 1 && [es.filaDetalleBorde, { borderBottomColor: tema.borde }]]}>
                <Ionicons name={d.icono} size={16} color="#3AB7A5" style={{ width: 24 }} />
                <Text style={[es.filaLabel, { color: tema.textoMuted }]}>{d.label}</Text>
                <Text style={[es.filaValor, { color: tema.texto }]} numberOfLines={1}>{d.valor}</Text>
              </View>
            ))}
          </View>

          {!!notas && (
            <View style={[es.cajaNota, { backgroundColor: isDark ? tema.primarioSuave : '#f0faf9' }]}>
              <Text style={es.cajaNotaTitulo}>{t('conf_notas')}</Text>
              <Text style={[es.cajaNotaTexto, { color: tema.textoSecundario }]}>{notas}</Text>
            </View>
          )}

          <View style={[es.nota, { backgroundColor: isDark ? '#2A2510' : '#fff8e1' }]}>
            <Ionicons name="information-circle-outline" size={16} color={isDark ? '#D4A520' : '#8a6200'} style={{ marginTop: 1 }} />
            <Text style={[es.notaTexto, { color: isDark ? '#D4A520' : '#8a6200' }]}>{t('conf_aviso')}</Text>
          </View>

          <TouchableOpacity
            style={es.btnPrimario}
            onPress={() => router.replace('/(tabs)/menu' as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Explorar más destinos"
          >
            <Text style={es.textoBtnPrimario}>{t('conf_explorar')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[es.btnSecundario, { borderColor: '#3AB7A5' }]}
            onPress={() => router.replace('/(tabs)/mis_reservas' as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ir a mis reservas"
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

  circuloCheck:   { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(58,183,165,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: 10 },
  circuloInterno: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', ...sombra({ color: '#3AB7A5', opacity: 0.4, radius: 10, offsetY: 4, elevation: 6 }) },

  titulo:             { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitulo:          { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22 },

  tarjetaFolio:   { width: '100%', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, ...sombra({ opacity: 0.1, radius: 8, offsetY: 4, elevation: 4 }) },
  folioHeader:    { backgroundColor: '#3AB7A5', paddingVertical: 10, paddingHorizontal: 18 },
  folioHeaderTexto: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  folioCuerpo:    { paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', gap: 8 },
  folioNum:       { fontSize: 30, fontWeight: '800', letterSpacing: 4 },
  folioDestino:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  folioDestinoTexto: { fontSize: 12, color: '#3AB7A5', fontWeight: '600' },

  tarjetaDetalle: { width: '100%', borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }) },
  detalleHeader:  { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  detalleTitulo:  { fontSize: 13, fontWeight: '700' },
  filaDetalle:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 10 },
  filaDetalleBorde: { borderBottomWidth: 1 },
  filaLabel:      { fontSize: 13, flex: 1 },
  filaValor:      { fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  nota:           { width: '100%', borderRadius: 14, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#e9c46a', flexDirection: 'row', gap: 8 },
  notaTexto:      { fontSize: 13, lineHeight: 20, flex: 1 },
  cajaNota:       { width: '100%', borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#3AB7A5' },
  cajaNotaTitulo: { fontSize: 12, fontWeight: '700', color: '#3AB7A5', marginBottom: 4 },
  cajaNotaTexto:  { fontSize: 13, lineHeight: 20 },

  btnPrimario:    { width: '100%', backgroundColor: '#3AB7A5', borderRadius: 25, paddingVertical: 16, alignItems: 'center', marginBottom: 10, ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }) },
  textoBtnPrimario: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  btnSecundario:  { width: '100%', borderWidth: 1.5, borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  textoBtnSecundario: { color: '#3AB7A5', fontSize: 15, fontWeight: '700' },
});
