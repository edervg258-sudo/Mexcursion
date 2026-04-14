import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated, Image, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import MapaRutas from '../../components/MapaRutas';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { RUTAS_TEMATICAS, RutaTematica } from '../../lib/datos/rutas-tematicas';
import { useIdioma } from '../../lib/IdiomaContext';
import { alternarFavorito, cargarFavoritos, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { Estado } from '../../lib/tipos';
import { SkeletonFilas } from './skeletonloader';

const DIFICULTAD_COLOR: Record<string, string> = {
  'Fácil': '#3AB7A5', 'Moderada': '#e9c46a', 'Exigente': '#DD331D',
};

// ─── Chip selector de ruta ───────────────────────────────────────────────────
const RutaChip = React.memo(function RutaChip({
  ruta, activa, onPress,
}: { ruta: RutaTematica; activa: boolean; onPress: () => void }) {
  const { tema } = useTemaContext();
  return (
    <TouchableOpacity
      style={[
        es.rutaChip,
        { backgroundColor: activa ? ruta.color : tema.superficie, borderColor: activa ? ruta.color : tema.borde },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={es.rutaChipEmoji}>{ruta.emoji}</Text>
      <Text style={[es.rutaChipNombre, { color: activa ? '#fff' : tema.texto }]} numberOfLines={2}>
        {ruta.nombre}
      </Text>
      <Text style={[es.rutaChipDias, { color: activa ? 'rgba(255,255,255,0.85)' : tema.textoMuted }]}>
        {ruta.estadoIds.length * ruta.diasPorEstado} días
      </Text>
    </TouchableOpacity>
  );
});

// ─── Ítem en el timeline de destinos ────────────────────────────────────────
const TimelineItem = React.memo(function TimelineItem({
  estado, index, total, esFavorito, rutaColor, onPress, onToggleFav,
}: {
  estado: Estado; index: number; total: number; esFavorito: boolean;
  rutaColor: string; onPress: () => void; onToggleFav: () => void;
}) {
  const { tema } = useTemaContext();
  const escalaFav = useRef(new Animated.Value(1)).current;

  const handleFav = () => {
    Animated.sequence([
      Animated.spring(escalaFav, { toValue: 1.45, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }),
      Animated.spring(escalaFav, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 4 }),
    ]).start();
    onToggleFav();
  };

  return (
    <View style={es.timelineItem}>
      {index < total - 1 && <View style={[es.timelineLinea, { backgroundColor: tema.borde }]} />}
      <View style={[es.timelineNum, { backgroundColor: rutaColor }]}>
        <Text style={es.timelineNumTxt}>{index + 1}</Text>
      </View>
      <TouchableOpacity
        style={[es.timelineCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <ExpoImage
          source={estado.imagen}
          style={es.timelineImg}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={String(estado.id)}
        />
        <View style={es.timelineInfo}>
          <Text style={[es.timelineNombre, { color: tema.texto }]} numberOfLines={1}>{estado.nombre}</Text>
          <Text style={[es.timelineDesc,   { color: tema.textoMuted }]} numberOfLines={2}>{estado.descripcion}</Text>
          <Text style={[es.timelinePrecio, { color: rutaColor }]}>
            Desde ${estado.precio.toLocaleString()} MXN
          </Text>
        </View>
        <View style={es.timelineAcciones}>
          <TouchableOpacity onPress={handleFav} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Animated.View style={{ transform: [{ scale: escalaFav }] }}>
              <Image
                source={esFavorito
                  ? require('../../assets/images/favoritos_rojo.png')
                  : require('../../assets/images/favoritos_gris.png')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[es.timelineChevron, { color: rutaColor }]}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();

  const [tab,        setTab]        = useState<'rutas' | 'mapa'>('rutas');
  const [rutaActiva, setRutaActiva] = useState<RutaTematica>(RUTAS_TEMATICAS[0]);
  const [usuarioId,  setUsuarioId]  = useState<string | null>(null);
  const [favoritos,  setFavoritos]  = useState<number[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      fadeAnim.setValue(0);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { setCargando(false); return; }
      setUsuarioId(usuario.id);
      const idsFav = await cargarFavoritos(usuario.id);
      setFavoritos(idsFav);
      setCargando(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
    };
    cargar();
  }, [fadeAnim]));

  const toggleFavorito = useCallback(async (estadoId: number) => {
    if (!usuarioId) { return; }
    setFavoritos(prev =>
      prev.includes(estadoId) ? prev.filter(id => id !== estadoId) : [...prev, estadoId]
    );
    await alternarFavorito(usuarioId, estadoId);
  }, [usuarioId]);

  const irADetalle = useCallback((estado: Estado) => {
    router.push({ pathname: '/(tabs)/detalle', params: { nombre: estado.nombre, categoria: estado.categoria } } as never);
  }, []);

  const estadosRuta = useMemo(() =>
    rutaActiva.estadoIds
      .map(id => TODOS_LOS_ESTADOS.find(e => e.id === id))
      .filter((e): e is Estado => !!e),
    [rutaActiva]
  );

  const costoTotal = useMemo(() =>
    estadosRuta.reduce((s, e) => s + e.precio, 0),
    [estadosRuta]
  );

  const diasTotal = rutaActiva.estadoIds.length * rutaActiva.diasPorEstado;

  const polylineCoords = useMemo(() =>
    estadosRuta
      .filter(e => e.latitude && e.longitude)
      .map(e => ({ latitude: e.latitude!, longitude: e.longitude! })),
    [estadosRuta]
  );

  const selectorRutas = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={es.selectorScroll}
    >
      {RUTAS_TEMATICAS.map(r => (
        <RutaChip key={r.id} ruta={r} activa={rutaActiva.id === r.id} onPress={() => setRutaActiva(r)} />
      ))}
    </ScrollView>
  );

  if (cargando) {
    return (
      <TabChrome esPC={esPC}>
        <SkeletonFilas cantidad={6} />
      </TabChrome>
    );
  }

  return (
    <TabChrome esPC={esPC} testID="rutas-screen">
      <View style={{ flex: 1 }}>
        <TopActionHeader
          title={t('tab_rutas')}
          showInlineLogo={false}
          onNotificationsPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0)}
        />

        {/* Tabs — ocultar "Mapa" en web si no queremos confundir, pero lo dejamos porque web tiene su propia vista */}
        <View style={[es.tabBar, { backgroundColor: tema.superficieBlanca, borderBottomColor: tema.borde }]}>
          {(['rutas', 'mapa'] as const).map(key => (
            <TouchableOpacity
              key={key}
              style={[es.tabBtn, tab === key && { borderBottomColor: rutaActiva.color }]}
              onPress={() => setTab(key)}
              activeOpacity={0.75}
            >
              <Text style={[es.tabBtnTxt, { color: tab === key ? rutaActiva.color : tema.textoMuted }]}>
                {key === 'rutas' ? '🗺️  Itinerario' : '📍  Mapa'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectorRutas}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

          {/* ══ TAB: RUTAS (Itinerario) ══════════════════════════════════════ */}
          {tab === 'rutas' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={es.rutasScroll}>

              {/* Hero de la ruta */}
              <View style={[es.rutaHeader, { backgroundColor: rutaActiva.color }]}>
                <Text style={es.rutaHeaderEmoji}>{rutaActiva.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={es.rutaHeaderNombre}>{rutaActiva.nombre}</Text>
                  <Text style={es.rutaHeaderDesc}>{rutaActiva.descripcion}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={[es.statsBanner, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                {[
                  { emoji: '📍', val: String(estadosRuta.length),        lbl: 'destinos' },
                  { emoji: '⌛', val: `~${diasTotal}`,                   lbl: 'días' },
                  { emoji: '💰', val: `$${costoTotal.toLocaleString()}`, lbl: 'MXN total' },
                  { emoji: '🗓️', val: String(rutaActiva.diasPorEstado), lbl: 'días c/u' },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.lbl}>
                    <View style={es.statItem}>
                      <Text style={es.statEmoji}>{s.emoji}</Text>
                      <Text style={[es.statVal, { color: tema.texto }]}>{s.val}</Text>
                      <Text style={[es.statLbl, { color: tema.textoMuted }]}>{s.lbl}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={[es.statDivisor, { backgroundColor: tema.borde }]} />}
                  </React.Fragment>
                ))}
              </View>

              {/* Info práctica */}
              <View style={[es.infoGrid, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <View style={es.infoItem}>
                  <Text style={es.infoEmoji}>📅</Text>
                  <View>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Mejor época</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]}>{rutaActiva.mejorEpoca}</Text>
                  </View>
                </View>
                <View style={[es.infoDivisor, { backgroundColor: tema.borde }]} />
                <View style={es.infoItem}>
                  <Text style={es.infoEmoji}>🚌</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Transporte</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]} numberOfLines={2}>{rutaActiva.transporte}</Text>
                  </View>
                </View>
                <View style={[es.infoDivisor, { backgroundColor: tema.borde }]} />
                <View style={es.infoItem}>
                  <Text style={es.infoEmoji}>💵</Text>
                  <View>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Presupuesto/día</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]}>{rutaActiva.presupuestoDiario}</Text>
                  </View>
                </View>
              </View>

              {/* Dificultad + Tags */}
              <View style={es.tagsRow}>
                <View style={[es.tagDificultad, { backgroundColor: DIFICULTAD_COLOR[rutaActiva.dificultad] + '22', borderColor: DIFICULTAD_COLOR[rutaActiva.dificultad] }]}>
                  <Text style={[es.tagDificultadTxt, { color: DIFICULTAD_COLOR[rutaActiva.dificultad] }]}>
                    {rutaActiva.dificultad === 'Fácil' ? '🟢' : rutaActiva.dificultad === 'Moderada' ? '🟡' : '🔴'} {rutaActiva.dificultad}
                  </Text>
                </View>
                {rutaActiva.tags.map(tag => (
                  <View key={tag} style={[es.tag, { backgroundColor: rutaActiva.color + '22', borderColor: rutaActiva.color + '55' }]}>
                    <Text style={[es.tagTxt, { color: rutaActiva.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Highlights */}
              <View style={[es.highlightsBox, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.highlightsTitulo, { color: tema.texto }]}>✨ Experiencias clave</Text>
                {rutaActiva.highlights.map((h, i) => (
                  <View key={i} style={es.highlightFila}>
                    <View style={[es.highlightPunto, { backgroundColor: rutaActiva.color }]} />
                    <Text style={[es.highlightTxt, { color: tema.textoSecundario }]}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* Timeline de destinos */}
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>Orden de visita</Text>
              <View style={es.timeline}>
                {estadosRuta.map((estado, i) => (
                  <TimelineItem
                    key={estado.id}
                    estado={estado}
                    index={i}
                    total={estadosRuta.length}
                    esFavorito={favoritos.includes(estado.id)}
                    rutaColor={rutaActiva.color}
                    onPress={() => irADetalle(estado)}
                    onToggleFav={() => toggleFavorito(estado.id)}
                  />
                ))}
              </View>

              {/* Botón "Ver en el mapa" — solo en nativo */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[es.btnVerMapa, { backgroundColor: isDark ? rutaActiva.colorOscuro : rutaActiva.color }]}
                  onPress={() => setTab('mapa')}
                  activeOpacity={0.85}
                >
                  <Text style={es.btnVerMapaTxt}>📍  Ver ruta en el mapa</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ══ TAB: MAPA ════════════════════════════════════════════════════ */}
          {tab === 'mapa' && (
            <MapaRutas
              rutaActiva={rutaActiva}
              estadosRuta={estadosRuta}
              polylineCoords={polylineCoords}
              favoritos={favoritos}
              isDark={isDark}
              tema={tema as unknown as Record<string, string>}
              onToggleFav={toggleFavorito}
              onIrADetalle={irADetalle}
            />
          )}
        </Animated.View>
      </View>
    </TabChrome>
  );
}

const es = StyleSheet.create({
  tabBar:           { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:           { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnTxt:        { fontSize: 13, fontWeight: '700' },

  selectorScroll:   { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rutaChip:         { minWidth: 100, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, gap: 4 },
  rutaChipEmoji:    { fontSize: 22 },
  rutaChipNombre:   { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  rutaChipDias:     { fontSize: 10, fontWeight: '500' },

  rutasScroll:      { paddingBottom: 20 },

  rutaHeader:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 18, paddingVertical: 18 },
  rutaHeaderEmoji:  { fontSize: 36, marginTop: 2 },
  rutaHeaderNombre: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  rutaHeaderDesc:   { fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 18 },

  statsBanner:      { flexDirection: 'row', marginHorizontal: 14, marginVertical: 12, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, alignItems: 'center' },
  statItem:         { flex: 1, alignItems: 'center', gap: 2 },
  statEmoji:        { fontSize: 16 },
  statVal:          { fontSize: 13, fontWeight: '800' },
  statLbl:          { fontSize: 10, fontWeight: '500' },
  statDivisor:      { width: 1, height: 36 },

  infoGrid:         { marginHorizontal: 14, marginBottom: 12, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  infoItem:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoEmoji:        { fontSize: 18, marginTop: 2 },
  infoLbl:          { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  infoVal:          { fontSize: 13, fontWeight: '700' },
  infoDivisor:      { height: 1 },

  tagsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 14, marginBottom: 12 },
  tagDificultad:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  tagDificultadTxt: { fontSize: 12, fontWeight: '700' },
  tag:              { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tagTxt:           { fontSize: 11, fontWeight: '600' },

  highlightsBox:    { marginHorizontal: 14, marginBottom: 14, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  highlightsTitulo: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  highlightFila:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightPunto:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  highlightTxt:     { fontSize: 13, lineHeight: 18, flex: 1 },

  seccionTitulo:    { fontSize: 15, fontWeight: '800', marginHorizontal: 14, marginBottom: 10 },

  timeline:         { paddingHorizontal: 14, paddingTop: 4 },
  timelineItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12, position: 'relative' },
  timelineLinea:    { position: 'absolute', left: 13, top: 28, width: 2, bottom: -12, zIndex: 0 },
  timelineNum:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, marginTop: 6 },
  timelineNumTxt:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  timelineCard:     { flex: 1, flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, minHeight: 80 },
  timelineImg:      { width: 72, height: 80 },
  timelineInfo:     { flex: 1, padding: 10, justifyContent: 'center', gap: 3 },
  timelineNombre:   { fontSize: 14, fontWeight: '800' },
  timelineDesc:     { fontSize: 11, lineHeight: 15 },
  timelinePrecio:   { fontSize: 11, fontWeight: '700' },
  timelineAcciones: { paddingHorizontal: 10, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  timelineChevron:  { fontSize: 22, fontWeight: '700', lineHeight: 26 },

  btnVerMapa:       { marginHorizontal: 14, marginTop: 10, borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  btnVerMapaTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});
