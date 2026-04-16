// MapaRutas.web.tsx — visualización de ruta para web (sin react-native-maps)
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RUTA_IMG_WEB: Record<string, number> = {
  colonial: require('../assets/images/guanajuato.png') as number,
  maya:     require('../assets/images/chiapas.png') as number,
  pacifico: require('../assets/images/sinaloa.png') as number,
  sabor:    require('../assets/images/jalisco.png') as number,
  aventura: require('../assets/images/chihuahua.png') as number,
};
import { RutaTematica } from '../lib/datos/rutas-tematicas';
import { Estado } from '../lib/tipos';

interface Props {
  rutaActiva: RutaTematica;
  estadosRuta: Estado[];
  polylineCoords: { latitude: number; longitude: number }[];
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  onToggleFav: (id: number) => void;
  onIrADetalle: (estado: Estado) => void;
}

export default function MapaRutas({
  rutaActiva, estadosRuta, favoritos, tema, onToggleFav, onIrADetalle,
}: Props) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.fondo as string }}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado visual de la ruta */}
      <View style={[s.header, { backgroundColor: rutaActiva.color }]}>
        {RUTA_IMG_WEB[rutaActiva.id] ? (
          <Image source={RUTA_IMG_WEB[rutaActiva.id]} style={s.headerImg} resizeMode="cover" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.headerNombre}>{rutaActiva.nombre}</Text>
          <Text style={s.headerSub}>Recorrido visual · {estadosRuta.length} destinos</Text>
        </View>
      </View>

      {/* Camino visual horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.caminoScroll}
      >
        {estadosRuta.map((estado, i) => (
          <View key={estado.id} style={s.caminoItem}>
            {/* Tarjeta destino */}
            <TouchableOpacity
              style={[s.caminoCard, { borderColor: rutaActiva.color }]}
              onPress={() => onIrADetalle(estado)}
              activeOpacity={0.85}
            >
              <ExpoImage
                source={estado.imagen}
                style={s.caminoImg}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={String(estado.id)}
              />
              <View style={[s.caminoOverlay, { backgroundColor: rutaActiva.color + '99' }]} />
              <View style={[s.caminoNum, { backgroundColor: rutaActiva.color }]}>
                <Text style={s.caminoNumTxt}>{i + 1}</Text>
              </View>
              <TouchableOpacity
                style={s.caminoFav}
                onPress={() => onToggleFav(estado.id)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Image
                  source={favoritos.includes(estado.id)
                    ? require('../assets/images/favoritos_rojo.png')
                    : require('../assets/images/favoritos_gris.png')}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <View style={s.caminoInfo}>
                <Text style={s.caminoNombre} numberOfLines={1}>{estado.nombre}</Text>
                <Text style={s.caminoPrecio}>${estado.precio.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>

            {/* Flecha conectora */}
            {i < estadosRuta.length - 1 && (
              <View style={s.flecha}>
                <View style={[s.flechaLinea, { backgroundColor: rutaActiva.color }]} />
                <Text style={[s.flechaPunta, { color: rutaActiva.color }]}>›</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Detalle de cada destino */}
      <Text style={[s.seccionTitulo, { color: tema.texto as string }]}>Destinos en detalle</Text>
      {estadosRuta.map((estado, i) => (
        <TouchableOpacity
          key={estado.id}
          style={[s.detalleCard, { backgroundColor: tema.superficieBlanca as string, borderColor: tema.borde as string }]}
          onPress={() => onIrADetalle(estado)}
          activeOpacity={0.85}
        >
          <View style={[s.detalleNum, { backgroundColor: rutaActiva.color }]}>
            <Text style={s.detalleNumTxt}>{i + 1}</Text>
          </View>
          <ExpoImage
            source={estado.imagen}
            style={s.detalleImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <View style={s.detalleInfo}>
            <Text style={[s.detalleNombre, { color: tema.texto as string }]}>{estado.nombre}</Text>
            <Text style={[s.detalleDesc, { color: tema.textoMuted as string }]} numberOfLines={2}>
              {estado.descripcion}
            </Text>
            <Text style={[s.detallePrecio, { color: rutaActiva.color }]}>
              Desde ${estado.precio.toLocaleString()} MXN · {rutaActiva.diasPorEstado} días
            </Text>
          </View>
          <View style={s.detalleBtns}>
            <TouchableOpacity onPress={() => onToggleFav(estado.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Image
                source={favoritos.includes(estado.id)
                  ? require('../assets/images/favoritos_rojo.png')
                  : require('../assets/images/favoritos_gris.png')}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={[s.detalleChevron, { color: rutaActiva.color }]}>›</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const CARD_W = 130;
const CARD_H = 160;

const s = StyleSheet.create({
  scroll:         { paddingBottom: 20 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  headerImg:      { width: 38, height: 38, borderRadius: 8 },
  headerNombre:   { fontSize: 17, fontWeight: '900', color: '#fff' },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  caminoScroll:   { paddingHorizontal: 14, paddingVertical: 18, alignItems: 'center' },
  caminoItem:     { flexDirection: 'row', alignItems: 'center' },
  caminoCard:     { width: CARD_W, height: CARD_H, borderRadius: 14, overflow: 'hidden', borderWidth: 2 },
  caminoImg:      { width: '100%', height: '100%', position: 'absolute' },
  caminoOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_H * 0.55 },
  caminoNum:      { position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  caminoNumTxt:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  caminoFav:      { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  caminoInfo:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  caminoNombre:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  caminoPrecio:   { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '600' },
  flecha:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 2 },
  flechaLinea:    { width: 16, height: 2 },
  flechaPunta:    { fontSize: 22, fontWeight: '800', lineHeight: 26, marginLeft: -4 },

  seccionTitulo:  { fontSize: 16, fontWeight: '800', marginHorizontal: 14, marginTop: 4, marginBottom: 10 },

  detalleCard:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  detalleNum:     { width: 28, height: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, flexShrink: 0 },
  detalleNumTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  detalleImg:     { width: 68, height: 80 },
  detalleInfo:    { flex: 1, padding: 10, gap: 3 },
  detalleNombre:  { fontSize: 14, fontWeight: '800' },
  detalleDesc:    { fontSize: 11, lineHeight: 15 },
  detallePrecio:  { fontSize: 11, fontWeight: '700' },
  detalleBtns:    { paddingHorizontal: 10, gap: 8, alignItems: 'center' },
  detalleChevron: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
});
