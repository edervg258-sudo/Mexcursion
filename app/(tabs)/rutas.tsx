import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// ─── Imagen representativa por ruta ─────────────────────────────────────────
const RUTA_IMG: Record<string, number> = {
  colonial: require('../../assets/images/guanajuato.png') as number,
  maya:     require('../../assets/images/chiapas.png') as number,
  pacifico: require('../../assets/images/sinaloa.png') as number,
  sabor:    require('../../assets/images/jalisco.png') as number,
  aventura: require('../../assets/images/chihuahua.png') as number,
};

const DIFICULTAD_COLOR: Record<string, string> = {
  'Fácil': '#3AB7A5', 'Moderada': '#e9c46a', 'Exigente': '#DD331D',
};

// ─── Chip selector de ruta ───────────────────────────────────────────────────
const RutaChip = React.memo(function RutaChip({
  ruta, activa, onPress,
}: { ruta: RutaTematica; activa: boolean; onPress: () => void }) {
  const { tema } = useTemaContext();
  const img = RUTA_IMG[ruta.id];
  return (
    <TouchableOpacity
      style={[
        es.rutaChip,
        { backgroundColor: activa ? ruta.color : tema.superficie, borderColor: activa ? ruta.color : tema.borde },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {img ? (
        <Image source={img} style={es.rutaChipImg} resizeMode="cover" />
      ) : (
        <View style={[es.rutaChipImgPlaceholder, { backgroundColor: ruta.color + '44' }]} />
      )}
      <Text style={[es.rutaChipNombre, { color: activa ? '#fff' : tema.texto }]} numberOfLines={1}>
        {ruta.nombre.replace('Ruta ', '')}
      </Text>
      <Text style={[es.rutaChipDias, { color: activa ? 'rgba(255,255,255,0.85)' : tema.textoMuted }]}>
        {ruta.estadoIds.length * ruta.diasPorEstado}d
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
  const escalaFav  = useRef(new Animated.Value(1)).current;
  const escalaCard = useRef(new Animated.Value(1)).current;

  const handleFav = () => {
    Animated.sequence([
      Animated.spring(escalaFav, { toValue: 1.45, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }),
      Animated.spring(escalaFav, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 4 }),
    ]).start();
    onToggleFav();
  };
  const handlePressIn  = () => Animated.spring(escalaCard, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 60, bounciness: 2 }).start();
  const handlePressOut = () => Animated.spring(escalaCard, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6 }).start();

  return (
    <Animated.View style={[es.timelineItem, { transform: [{ scale: escalaCard }] }]}>
      {index < total - 1 && <View style={[es.timelineLinea, { backgroundColor: tema.borde }]} />}
      <View style={[es.timelineNum, { backgroundColor: rutaColor }]}>
        <Text style={es.timelineNumTxt}>{index + 1}</Text>
      </View>
      <TouchableOpacity
        style={[es.timelineCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
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
    </Animated.View>
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
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scrollY   = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

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

  const difColor = DIFICULTAD_COLOR[rutaActiva.dificultad] ?? '#3AB7A5';

  // Resetear scroll al cambiar de ruta para que el hero aparezca fresco
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollY.setValue(0);
  }, [rutaActiva, scrollY]);

  // Interpolaciones para el fade del hero al hacer scroll
  const heroImgOpacity = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0.82, 0],
    extrapolate: 'clamp',
  });
  const heroOverlayOpacity = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0.52, 0.92],
    extrapolate: 'clamp',
  });

  const selectorRutas = (
    <View style={es.selectorContenedor}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={es.selectorScroll}
      >
        {RUTAS_TEMATICAS.map(r => (
          <RutaChip key={r.id} ruta={r} activa={rutaActiva.id === r.id} onPress={() => setRutaActiva(r)} />
        ))}
      </ScrollView>
    </View>
  );

  if (cargando) {
    return (
      <TabChrome esPC={esPC}>
        <SkeletonFilas cantidad={6} />
      </TabChrome>
    );
  }

  return (
    <TabChrome esPC={esPC} testID="rutas-screen" showLogoWhenNoTitle={false}>
      <View style={{ flex: 1 }}>
        <TopActionHeader
          title={t('tab_rutas')}
          showInlineLogo={false}
          onNotificationsPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0)}
        />

        {/* Tabs sin emojis */}
        <View style={[es.tabBar, { backgroundColor: tema.superficieBlanca, borderBottomColor: tema.borde }]}>
          {(['rutas', 'mapa'] as const).map(key => (
            <TouchableOpacity
              key={key}
              style={[es.tabBtn, tab === key && { borderBottomColor: rutaActiva.color }]}
              onPress={() => setTab(key)}
              activeOpacity={0.75}
            >
              <Text style={[es.tabBtnTxt, { color: tab === key ? rutaActiva.color : tema.textoMuted }]}>
                {key === 'rutas' ? 'Itinerario' : 'Mapa'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectorRutas}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

          {/* ══ TAB: RUTAS ══════════════════════════════════════════════════ */}
          {tab === 'rutas' && (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={es.rutasScroll}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
            >

              {/* Hero compacto con info rápida inline */}
              <View style={[es.rutaHeader, { backgroundColor: rutaActiva.color }]}>
                <Animated.Image
                  source={RUTA_IMG[rutaActiva.id]}
                  style={[es.rutaHeaderImg, { opacity: heroImgOpacity }]}
                  resizeMode="cover"
                />
                <Animated.View style={[es.rutaHeaderOverlay, { opacity: heroOverlayOpacity }]} />
                <View style={es.rutaHeaderTexto}>
                  <Text style={es.rutaHeaderNombre}>{rutaActiva.nombre}</Text>
                  <Text style={es.rutaHeaderDesc} numberOfLines={2}>{rutaActiva.descripcion}</Text>
                </View>
              </View>

              {/* Stats + Info práctica en una sola fila compacta */}
              <View style={[es.infoCompacta, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                {/* Fila stats */}
                <View style={es.statsRow}>
                  {[
                    { val: String(estadosRuta.length),        lbl: 'destinos', color: rutaActiva.color },
                    { val: `${diasTotal}d`,                    lbl: 'total',    color: tema.textoMuted as string },
                    { val: `$${(costoTotal/1000).toFixed(0)}k`,lbl: 'MXN',      color: tema.textoMuted as string },
                    { val: `${rutaActiva.diasPorEstado}d`,     lbl: 'c/destino',color: tema.textoMuted as string },
                  ].map((s, i, arr) => (
                    <React.Fragment key={s.lbl}>
                      <View style={es.statItem}>
                        <Text style={[es.statVal, { color: tema.texto }]}>{s.val}</Text>
                        <Text style={[es.statLbl, { color: tema.textoMuted }]}>{s.lbl}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={[es.statDivisor, { backgroundColor: tema.borde }]} />}
                    </React.Fragment>
                  ))}
                </View>

                <View style={[es.infoDivisorH, { backgroundColor: tema.borde }]} />

                {/* Info práctica en 3 columnas compactas */}
                <View style={es.infoRow}>
                  <View style={es.infoCol}>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Mejor época</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]}>{rutaActiva.mejorEpoca}</Text>
                  </View>
                  <View style={[es.infoColDiv, { backgroundColor: tema.borde }]} />
                  <View style={[es.infoCol, { flex: 2 }]}>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Transporte</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]} numberOfLines={1}>{rutaActiva.transporte}</Text>
                  </View>
                  <View style={[es.infoColDiv, { backgroundColor: tema.borde }]} />
                  <View style={es.infoCol}>
                    <Text style={[es.infoLbl, { color: tema.textoMuted }]}>Presup./día</Text>
                    <Text style={[es.infoVal, { color: tema.texto }]}>{rutaActiva.presupuestoDiario}</Text>
                  </View>
                </View>
              </View>

              {/* Dificultad + Tags (compactos) */}
              <View style={es.tagsRow}>
                <View style={[es.tagDificultad, { backgroundColor: difColor + '22', borderColor: difColor }]}>
                  <View style={[es.difPunto, { backgroundColor: difColor }]} />
                  <Text style={[es.tagDificultadTxt, { color: difColor }]}>{rutaActiva.dificultad}</Text>
                </View>
                {rutaActiva.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={[es.tag, { backgroundColor: rutaActiva.color + '22', borderColor: rutaActiva.color + '55' }]}>
                    <Text style={[es.tagTxt, { color: rutaActiva.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Experiencias clave — compactas */}
              <View style={[es.highlightsBox, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.highlightsTitulo, { color: tema.texto }]}>Experiencias clave</Text>
                <View style={es.highlightsGrid}>
                  {rutaActiva.highlights.map((h, i) => (
                    <View key={i} style={es.highlightFila}>
                      <View style={[es.highlightPunto, { backgroundColor: rutaActiva.color }]} />
                      <Text style={[es.highlightTxt, { color: tema.textoSecundario }]}>{h}</Text>
                    </View>
                  ))}
                </View>
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

              {/* Botón "Ver en el mapa" */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[es.btnVerMapa, { backgroundColor: isDark ? rutaActiva.colorOscuro : rutaActiva.color }]}
                  onPress={() => setTab('mapa')}
                  activeOpacity={0.85}
                >
                  <Text style={es.btnVerMapaTxt}>Ver ruta en el mapa</Text>
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
  tabBtn:           { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnTxt:        { fontSize: 13, fontWeight: '700' },

  selectorContenedor: { height: 84 },
  selectorScroll:   { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 0, gap: 8, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  rutaChip:         { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 10, borderWidth: 1.5, gap: 2, overflow: 'hidden' },
  rutaChipImg:      { width: 32, height: 32, borderRadius: 6, marginBottom: 2 },
  rutaChipImgPlaceholder: { width: 32, height: 32, borderRadius: 6, marginBottom: 2 },
  rutaChipNombre:   { fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 11 },
  rutaChipDias:     { fontSize: 9, fontWeight: '500' },

  rutasScroll:      { paddingBottom: 20, paddingTop: 8 },

  // Hero con imagen de fondo
  rutaHeader:       { height: 118, position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  rutaHeaderImg:    { position: 'absolute', width: '100%', height: '100%' },
  rutaHeaderOverlay:{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#000' },
  rutaHeaderTexto:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  rutaHeaderNombre: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 3 },
  rutaHeaderDesc:   { fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 16 },

  // Info compacta (stats + info práctica en tarjeta unificada)
  infoCompacta:     { marginHorizontal: 14, marginTop: 8, marginBottom: 6, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  statsRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6 },
  statItem:         { flex: 1, alignItems: 'center', gap: 2 },
  statVal:          { fontSize: 14, fontWeight: '800' },
  statLbl:          { fontSize: 9, fontWeight: '500' },
  statDivisor:      { width: 1, height: 30 },
  infoDivisorH:     { height: 1 },
  infoRow:          { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, gap: 0 },
  infoCol:          { flex: 1, gap: 2 },
  infoColDiv:       { width: 1, height: 36, marginHorizontal: 10, alignSelf: 'center' },
  infoLbl:          { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoVal:          { fontSize: 11, fontWeight: '700' },

  tagsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 14, marginBottom: 6, justifyContent: 'center' },
  tagDificultad:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  difPunto:         { width: 7, height: 7, borderRadius: 4 },
  tagDificultadTxt: { fontSize: 11, fontWeight: '700' },
  tag:              { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tagTxt:           { fontSize: 11, fontWeight: '600' },

  highlightsBox:    { marginHorizontal: 14, marginBottom: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  highlightsTitulo: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  highlightsGrid:   { gap: 6 },
  highlightFila:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  highlightPunto:   { width: 7, height: 7, borderRadius: 4, flexShrink: 0, marginTop: 5 },
  highlightTxt:     { fontSize: 12, lineHeight: 17, flex: 1 },

  seccionTitulo:    { fontSize: 14, fontWeight: '800', marginHorizontal: 14, marginBottom: 8 },

  timeline:         { paddingHorizontal: 14, paddingTop: 4 },
  timelineItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, position: 'relative' },
  timelineLinea:    { position: 'absolute', left: 13, top: 28, width: 2, bottom: -10, zIndex: 0 },
  timelineNum:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, marginTop: 6 },
  timelineNumTxt:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  timelineCard:     { flex: 1, flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, minHeight: 64 },
  timelineImg:      { width: 64, height: 64 },
  timelineInfo:     { flex: 1, padding: 9, justifyContent: 'center', gap: 2 },
  timelineNombre:   { fontSize: 13, fontWeight: '800' },
  timelineDesc:     { fontSize: 11, lineHeight: 14 },
  timelinePrecio:   { fontSize: 10, fontWeight: '700' },
  timelineAcciones: { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  timelineChevron:  { fontSize: 20, fontWeight: '700', lineHeight: 24 },

  btnVerMapa:       { marginHorizontal: 14, marginTop: 10, borderRadius: 25, paddingVertical: 13, alignItems: 'center' },
  btnVerMapaTxt:    { color: '#fff', fontSize: 14, fontWeight: '800' },
});
