import React, { useRef } from 'react';
import {
  Animated, Dimensions, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { CarruselImagenes } from '../CarruselImagenes';
import { Estrellas } from '../Estrellas';
import { Paquete } from '../../lib/constantes';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import { TraduccionClave } from '../../lib/traducciones';

const { width: W } = Dimensions.get('window');
const CARD_W = Math.min(W, 800);
const EXPAND_DUR = 280;

interface Props {
  paquete: Paquete;
  idx: number;
  expandido: boolean;
  enRuta: boolean;
  entradaAnim: Animated.Value;
  onToggle: () => void;
  onAgregarARuta: () => void;
  onReservar: () => void;
}

export function TarjetaPaquete({
  paquete,
  idx,
  expandido,
  enRuta,
  entradaAnim,
  onToggle,
  onAgregarARuta,
  onReservar,
}: Props) {
  const { t, idioma } = useIdioma();
  const { tema } = useTemaContext();

  const cabAnim     = useRef(new Animated.Value(1)).current;
  const rutaAnim    = useRef(new Animated.Value(1)).current;
  const reservarAnim = useRef(new Animated.Value(1)).current;
  const expandAnim  = useRef(new Animated.Value(expandido ? 1 : 0)).current;
  const visto       = useRef(expandido);

  const spring = (anim: Animated.Value, to: number) =>
    Animated.spring(anim, { toValue: to, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: to < 1 ? 2 : 7 }).start();

  const handleToggle = () => {
    const abriendo = !expandido;
    if (abriendo) {
      visto.current = true;
      Animated.timing(expandAnim, { toValue: 1, duration: EXPAND_DUR, useNativeDriver: false }).start();
    } else {
      Animated.timing(expandAnim, { toValue: 0, duration: EXPAND_DUR, useNativeDriver: false }).start(() => {
        visto.current = false;
      });
    }
    onToggle();
  };

  return (
    <Animated.View style={{
      opacity: entradaAnim,
      transform: [{ translateY: entradaAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    }}>
      <View style={[es.tarjeta, { borderColor: paquete.color, backgroundColor: tema.superficieBlanca }]}>
        {/* Cabecera */}
        <TouchableOpacity
          style={[es.cabecera, { backgroundColor: paquete.color }]}
          onPressIn={() => spring(cabAnim, 0.97)}
          onPressOut={() => spring(cabAnim, 1)}
          onPress={handleToggle}
          activeOpacity={1}
        >
          <Animated.View style={[es.cabeceraInner, { transform: [{ scale: cabAnim }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={es.emoji}>{paquete.emoji}</Text>
              <View>
                <Text style={es.etiqueta}>{t(('rut_' + paquete.nivel) as TraduccionClave)}</Text>
                <Text style={es.precio}>{paquete.precioTotal}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={es.dias}>
                {paquete.diasRecomendados} {t(paquete.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
              </Text>
              <Text style={es.chevron}>{expandido ? '▲' : '▼'}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Cuerpo animado */}
        {(expandido || visto.current) && (
          <Animated.View style={[es.cuerpo, {
            maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2400] }),
            opacity:   expandAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] }),
            overflow: 'hidden',
          }]}>
            <CarruselImagenes
              imagenes={paquete.imagenesHotel}
              color={paquete.color}
              ancho={Math.min(W - 28 * 2, CARD_W - 28)}
            />

            {/* Hotel */}
            <View style={es.seccion}>
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>{t('det_hotel')}</Text>
              <Text style={[es.nombreHotel, { color: tema.texto }]}>{paquete.hotel}</Text>
              <Estrellas valor={paquete.estrellas} tamaño={12} />
              <Text style={[es.textoInfo, { color: tema.textoSecundario }]}>{paquete.descripcionHotel[idioma]}</Text>
              <Text style={es.precioLinea}>{paquete.precioHotel}</Text>
              <View style={es.chipsList}>
                {paquete.incluye[idioma].map(inc => (
                  <View key={inc} style={es.chipIncluye}>
                    <Text style={es.chipIncluyeTxt}>✓ {inc}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[es.divisor, { backgroundColor: tema.borde }]} />

            {/* Restaurante */}
            <View style={es.seccion}>
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>{t('det_restaurante')}</Text>
              <Text style={[es.nombreHotel, { color: tema.texto }]}>{paquete.restaurante}</Text>
              <Text style={es.tipoCocina}>{paquete.tipoCocina[idioma]}</Text>
              <Text style={[es.textoInfo, { color: tema.textoSecundario }]}>{t('det_platillo', { p: paquete.platillo[idioma] })}</Text>
              <Text style={es.precioLinea}>{paquete.precioRestaurante}</Text>
            </View>

            <View style={[es.divisor, { backgroundColor: tema.borde }]} />

            {/* Transporte */}
            <View style={es.seccion}>
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>{t('det_transporte')}</Text>
              <Text style={[es.textoInfo, { color: tema.textoSecundario }]}>{paquete.transporte[idioma]}</Text>
              <Text style={es.precioLinea}>{paquete.precioTransporte}</Text>
            </View>

            <View style={[es.divisor, { backgroundColor: tema.borde }]} />

            {/* Actividades */}
            <View style={es.seccion}>
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>{t('det_actividades')}</Text>
              {paquete.actividades[idioma].map((act, i) => (
                <View key={i} style={es.filaActividad}>
                  <View style={[es.puntoActividad, { backgroundColor: paquete.color }]} />
                  <Text style={[es.textoActividad, { color: tema.textoSecundario }]}>{act}</Text>
                </View>
              ))}
            </View>

            {/* Botones */}
            <View style={es.filaBotones}>
              <TouchableOpacity
                testID="add-itinerary-button"
                style={[es.botonRuta, enRuta && es.botonRutaActivo]}
                onPressIn={() => spring(rutaAnim, 0.93)}
                onPressOut={() => spring(rutaAnim, 1)}
                onPress={onAgregarARuta}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={enRuta ? 'Gestionar itinerario' : 'Agregar a itinerario'}
              >
                <Animated.View style={{ transform: [{ scale: rutaAnim }] }}>
                  <Text style={es.textoBotonRuta}>
                    {enRuta ? t('det_en_ruta') : t('det_add_itinerario')}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                testID="reserve-package-button"
                style={[es.botonReservar, { backgroundColor: paquete.color }]}
                onPressIn={() => spring(reservarAnim, 0.93)}
                onPressOut={() => spring(reservarAnim, 1)}
                onPress={onReservar}
                activeOpacity={1}
              >
                <Animated.View style={{ transform: [{ scale: reservarAnim }] }}>
                  <Text style={es.textoBotonReservar}>{t('det_reservar')}</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const es = StyleSheet.create({
  tarjeta:       { borderRadius: 18, borderWidth: 2, marginBottom: 16, overflow: 'hidden' },
  cabecera:      { paddingHorizontal: 16, paddingVertical: 14 },
  cabeceraInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  emoji:         { fontSize: 20, color: '#fff', fontWeight: '800' },
  etiqueta:      { fontSize: 16, fontWeight: '800', color: '#fff' },
  precio:        { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  dias:          { fontSize: 12, color: '#fff', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chevron:       { fontSize: 12, color: '#fff', fontWeight: '700' },
  cuerpo:        { padding: 16 },
  seccion:       { marginBottom: 4 },
  seccionTitulo: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  nombreHotel:   { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tipoCocina:    { fontSize: 12, color: '#3AB7A5', fontWeight: '600', marginBottom: 4 },
  textoInfo:     { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  precioLinea:   { fontSize: 13, fontWeight: '700', color: '#DD331D', marginTop: 2 },
  chipsList:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chipIncluye:   { backgroundColor: '#f0faf9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#3AB7A5' },
  chipIncluyeTxt:{ fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  divisor:       { height: 1, marginVertical: 14 },
  filaActividad: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  puntoActividad:{ width: 8, height: 8, borderRadius: 4 },
  textoActividad:{ fontSize: 13, flex: 1 },
  filaBotones:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonRuta:     { flex: 1, backgroundColor: '#3AB7A5', paddingVertical: 13, borderRadius: 25, alignItems: 'center', elevation: 3 },
  botonRutaActivo:{ backgroundColor: '#27897b' },
  textoBotonRuta:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  botonReservar: { flex: 1, paddingVertical: 13, borderRadius: 25, alignItems: 'center', elevation: 3 },
  textoBotonReservar: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
