import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import MapaRutas from '../../components/MapaRutas';
import { RutaChip } from '../../components/Rutas/RutaChip';
import { TimelineItem } from '../../components/Rutas/TimelineItem';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { PAQUETES_POR_ESTADO, TODOS_LOS_ESTADOS, parsearClaveRuta, resolverInfoRuta } from '../../lib/constantes';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { RUTAS_TEMATICAS, RutaTematica } from '../../lib/datos/rutas-tematicas';
import { useIdioma } from '../../lib/IdiomaContext';
import { Itinerario, alternarFavorito, cargarFavoritos, crearItinerario, eliminarItinerario, obtenerItinerarios, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { Estado } from '../../lib/tipos';
import { SkeletonFilas } from './skeletonloader';

// ─── Imagen representativa por ruta (usada en el hero) ──────────────────────
import guanajuatoImg from '../../assets/images/guanajuato.png';
import chiapasImg from '../../assets/images/chiapas.png';
import sinaloaImg from '../../assets/images/sinaloa.png';
import jaliscoImg from '../../assets/images/jalisco.png';
import chihuahuaImg from '../../assets/images/chihuahua.png';

const RUTA_IMG: Record<string, number> = {
  colonial: guanajuatoImg,
  maya:     chiapasImg,
  pacifico: sinaloaImg,
  sabor:    jaliscoImg,
  aventura: chihuahuaImg,
};

const DIFICULTAD_COLOR: Record<string, string> = {
  'Fácil': '#3AB7A5', 'Moderada': '#e9c46a', 'Exigente': '#DD331D',
};

const NIVEL_COLOR: Record<string, string> = {
  economico: '#3AB7A5',
  medio: '#e9c46a',
  premium: '#DD331D',
};

const extraerMonto = (precio: string) => {
  const match = String(precio ?? '').replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();

  const [vistaPrincipal, setVistaPrincipal] = useState<'mis-itinerarios' | 'rutas-sugeridas'>('mis-itinerarios');
  const [tab,        setTab]        = useState<'rutas' | 'mapa'>('rutas');
  const [rutaActiva, setRutaActiva] = useState<RutaTematica>(RUTAS_TEMATICAS[0]);
  const [usuarioId,  setUsuarioId]  = useState<string | null>(null);
  const [favoritos,  setFavoritos]  = useState<number[]>([]);
  const [itinerarios, setItinerarios] = useState<Itinerario[]>([]);
  const [itinerarioExpandidoId, setItinerarioExpandidoId] = useState<number | null>(null);
  const [modalNuevoVisible, setModalNuevoVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [cargando,   setCargando]   = useState(true);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scrollY   = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      fadeAnim.setValue(0);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        setUsuarioId(null);
        setFavoritos([]);
        setItinerarios([]);
        setCargando(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
        return;
      }
      setUsuarioId(usuario.id);
      const [idsFav, itinerariosUsuario] = await Promise.all([
        cargarFavoritos(usuario.id),
        obtenerItinerarios(usuario.id),
      ]);
      setFavoritos(idsFav);
      setItinerarios(itinerariosUsuario);
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

  const itinerariosResumen = useMemo(() =>
    itinerarios.map(itinerario => {
      const destinos = (itinerario.items ?? []).map(clave => {
        const { estado, nivel } = parsearClaveRuta(clave);
        const info = resolverInfoRuta(clave);
        const estadoEncontrado = TODOS_LOS_ESTADOS.find(item => item.nombre === estado);
        const paquete = (PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO.default ?? []).find(item => item.nivel === nivel);
        return {
          clave,
          estado,
          nivel,
          titulo: info.titulo,
          precioTotal: info.precioTotal,
          diasRecomendados: info.diasRecomendados,
          categoria: estadoEncontrado?.categoria ?? '',
          descripcion: estadoEncontrado?.descripcion ?? '',
          color: paquete?.color ?? NIVEL_COLOR[nivel] ?? '#3AB7A5',
        };
      });

      return {
        ...itinerario,
        destinos,
        totalDestinos: destinos.length,
        diasEstimados: destinos.reduce((suma, destino) => suma + destino.diasRecomendados, 0),
        totalEstimado: destinos.reduce((suma, destino) => suma + extraerMonto(destino.precioTotal), 0),
      };
    }),
  [itinerarios]);

  const crearNuevoItinerario = useCallback(async () => {
    if (!usuarioId || !nuevoNombre.trim()) {
      return;
    }
    const actualizados = await crearItinerario(usuarioId, nuevoNombre.trim());
    setItinerarios(actualizados);
    const creado = actualizados[0];
    if (creado) {
      setItinerarioExpandidoId(creado.id);
    }
    setNuevoNombre('');
    setModalNuevoVisible(false);
  }, [nuevoNombre, usuarioId]);

  const borrarItinerario = useCallback((itinerario: Itinerario) => {
    if (!usuarioId) {
      return;
    }
    Alert.alert(
      t('rut_eliminar_viaje'),
      t('rut_confirmar_borrar', { nombre: itinerario.nombre }),
      [
        { text: t('rut_cancelar'), style: 'cancel' },
        {
          text: t('rut_eliminar'),
          style: 'destructive',
          onPress: async () => {
            const actualizados = await eliminarItinerario(usuarioId, itinerario.id);
            setItinerarios(actualizados);
            if (itinerarioExpandidoId === itinerario.id) {
              setItinerarioExpandidoId(null);
            }
          },
        },
      ]
    );
  }, [itinerarioExpandidoId, t, usuarioId]);

  const abrirDetalleDesdeClave = useCallback((clave: string) => {
    const { estado } = parsearClaveRuta(clave);
    const estadoEncontrado = TODOS_LOS_ESTADOS.find(item => item.nombre === estado);
    router.push({
      pathname: '/(tabs)/detalle',
      params: { nombre: estado, categoria: estadoEncontrado?.categoria ?? '' },
    } as never);
  }, []);

  const obtenerEtiquetaNivel = useCallback((nivel: string) => {
    if (nivel === 'economico') return t('rut_economico');
    if (nivel === 'premium') return t('rut_premium');
    return t('rut_medio');
  }, [t]);

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
          onNotificationsPress={() => setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES as never), 0)}
        />

        <View style={[es.vistaBar, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
          {[
            { key: 'mis-itinerarios' as const, label: t('rut_mis_itinerarios') },
            { key: 'rutas-sugeridas' as const, label: t('rut_sugeridas') },
          ].map(opcion => {
            const activa = vistaPrincipal === opcion.key;
            return (
              <TouchableOpacity
                key={opcion.key}
                testID={opcion.key === 'mis-itinerarios' ? 'my-itineraries-tab' : 'suggested-routes-tab'}
                style={[
                  es.vistaBtn,
                  {
                    backgroundColor: activa ? tema.primarioSuave : 'transparent',
                    borderColor: activa ? tema.primario : tema.borde,
                  },
                ]}
                onPress={() => setVistaPrincipal(opcion.key)}
                activeOpacity={0.8}
              >
                <Text style={[es.vistaBtnTxt, { color: activa ? tema.primario : tema.textoMuted }]}>
                  {opcion.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {vistaPrincipal === 'rutas-sugeridas' && (
          <>
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
          </>
        )}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {vistaPrincipal === 'mis-itinerarios' && (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={es.misRutasScroll}
            >
              <View style={[es.heroMisViajes, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.heroMisViajesTitulo, { color: tema.texto }]}>{t('rut_mis_viajes_hero')}</Text>
                <Text style={[es.heroMisViajesSubtitulo, { color: tema.textoSecundario }]}>
                  {t('rut_mis_viajes_hero_sub')}
                </Text>

                {usuarioId ? (
                  <TouchableOpacity
                    style={[es.btnCrearViaje, { backgroundColor: tema.primario }]}
                    testID="create-itinerary-button"
                    onPress={() => setModalNuevoVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={es.btnCrearViajeTxt}>{t('rut_nuevo_viaje_btn')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[es.btnCrearViaje, { backgroundColor: tema.primario }]}
                    onPress={() => router.push(RUTAS_APP.PERFIL as never)}
                    activeOpacity={0.85}
                  >
                    <Text style={es.btnCrearViajeTxt}>{t('rut_ir')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!usuarioId ? (
                <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                  <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sesion_requerida')}</Text>
                  <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sesion_msg')}</Text>
                </View>
              ) : itinerariosResumen.length === 0 ? (
                <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                  <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sin_itis_aun')}</Text>
                  <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sin_itis_msg')}</Text>
                  <TouchableOpacity
                    style={[es.btnExplorar, { borderColor: tema.primario }]}
                    onPress={() => router.push('/(tabs)/menu' as never)}
                    activeOpacity={0.85}
                  >
                    <Text style={[es.btnExplorarTxt, { color: tema.primario }]}>{t('rut_explorar')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                itinerariosResumen.map(itinerario => {
                  const expandido = itinerarioExpandidoId === itinerario.id;
                  return (
                    <View
                      key={itinerario.id}
                      style={[es.itinerarioCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
                    >
                      <View style={es.itinerarioHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[es.itinerarioNombre, { color: tema.texto }]}>{itinerario.nombre}</Text>
                          <Text style={[es.itinerarioMeta, { color: tema.textoMuted }]}>
                            {itinerario.totalDestinos} {t(itinerario.totalDestinos === 1 ? 'rut_destino' : 'rut_destinos')} · {itinerario.diasEstimados} {t(itinerario.diasEstimados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                          </Text>
                        </View>
                        <View style={[es.itinerarioTotal, { backgroundColor: tema.primarioSuave }]}>
                          <Text style={[es.itinerarioTotalLabel, { color: tema.primario }]}>{t('rut_presupuesto')}</Text>
                          <Text style={[es.itinerarioTotalValor, { color: tema.texto }]}>${itinerario.totalEstimado.toLocaleString('es-MX')} MXN</Text>
                        </View>
                      </View>

                      <View style={es.destinosPreview}>
                        {itinerario.destinos.slice(0, 3).map(destino => (
                          <View
                            key={destino.clave}
                            style={[es.destinoPreviewChip, { backgroundColor: `${destino.color}18`, borderColor: `${destino.color}55` }]}
                          >
                            <Text style={[es.destinoPreviewTxt, { color: destino.color }]}>{destino.estado}</Text>
                          </View>
                        ))}
                        {itinerario.totalDestinos > 3 ? (
                          <View style={[es.destinoPreviewChip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                            <Text style={[es.destinoPreviewTxt, { color: tema.textoMuted }]}>+{itinerario.totalDestinos - 3}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={es.itinerarioAcciones}>
                        <TouchableOpacity
                          style={[es.btnSecundario, { borderColor: tema.borde }]}
                          onPress={() => setItinerarioExpandidoId(expandido ? null : itinerario.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[es.btnSecundarioTxt, { color: tema.texto }]}>
                            {expandido ? t('rut_cancelar') : t('rut_ver_itinerario')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={es.btnEliminar}
                          onPress={() => borrarItinerario(itinerario)}
                          activeOpacity={0.85}
                        >
                          <Text style={es.btnEliminarTxt}>{t('rut_eliminar')}</Text>
                        </TouchableOpacity>
                      </View>

                      {expandido && (
                        <View style={[es.itinerarioDetalle, { borderTopColor: tema.borde }]}>
                          {itinerario.destinos.length === 0 ? (
                            <View style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                              <Text style={[es.destinoTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                              <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                            </View>
                          ) : (
                            itinerario.destinos.map((destino, index) => (
                              <TouchableOpacity
                                key={destino.clave}
                                style={[es.destinoFila, { backgroundColor: tema.superficie }]}
                                onPress={() => abrirDetalleDesdeClave(destino.clave)}
                                activeOpacity={0.85}
                              >
                                <View style={[es.destinoIndice, { backgroundColor: destino.color }]}>
                                  <Text style={es.destinoIndiceTxt}>{index + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[es.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                                  <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>
                                    {destino.estado} · {obtenerEtiquetaNivel(destino.nivel)} · {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                                  </Text>
                                  <Text style={[es.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                                </View>
                                <Text style={[es.destinoAbrir, { color: tema.primario }]}>{t('res_ver_destino')}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ══ TAB: RUTAS ══════════════════════════════════════════════════ */}
          {vistaPrincipal === 'rutas-sugeridas' && tab === 'rutas' && (
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
          {vistaPrincipal === 'rutas-sugeridas' && tab === 'mapa' && (
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

      <Modal
        visible={modalNuevoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNuevoVisible(false)}
      >
        <View style={es.modalOverlay}>
          <View style={[es.modalCard, { backgroundColor: tema.superficieBlanca }]}>
            <Text style={[es.modalTitulo, { color: tema.texto }]}>{t('rut_nuevo_iti_titulo')}</Text>
            <Text style={[es.modalSubtitulo, { color: tema.textoSecundario }]}>{t('rut_nuevo_iti_sub')}</Text>
            <TextInput
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholder={t('rut_ph_nuevo_iti')}
              placeholderTextColor={tema.textoMuted}
              style={[es.modalInput, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
            />
            <TouchableOpacity
              style={[es.modalBtnPrincipal, { backgroundColor: tema.primario }, !nuevoNombre.trim() && es.modalBtnDisabled]}
              onPress={crearNuevoItinerario}
              disabled={!nuevoNombre.trim()}
              activeOpacity={0.85}
            >
              <Text style={es.modalBtnPrincipalTxt}>{t('rut_crear_viaje')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={es.modalBtnCerrar}
              onPress={() => {
                setModalNuevoVisible(false);
                setNuevoNombre('');
              }}
              activeOpacity={0.85}
            >
              <Text style={[es.modalBtnCerrarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TabChrome>
  );
}

const es = StyleSheet.create({
  vistaBar:         { flexDirection: 'row', marginHorizontal: 14, marginTop: 10, marginBottom: 10, borderWidth: 1, borderRadius: 14, padding: 4, gap: 6 },
  vistaBtn:         { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  vistaBtnTxt:      { fontSize: 13, fontWeight: '800' },
  tabBar:           { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:           { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnTxt:        { fontSize: 13, fontWeight: '700' },

  selectorContenedor: { height: 84 },
  selectorScroll:   { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 0, gap: 8, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },

  misRutasScroll:   { paddingHorizontal: 14, paddingBottom: 24, gap: 12 },
  heroMisViajes:    { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  heroMisViajesTitulo: { fontSize: 21, fontWeight: '900', marginBottom: 6 },
  heroMisViajesSubtitulo: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  btnCrearViaje:    { borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnCrearViajeTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  estadoVacio:      { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center' },
  estadoVacioTitulo:{ fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  estadoVacioTexto: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  btnExplorar:      { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11 },
  btnExplorarTxt:   { fontSize: 13, fontWeight: '800' },
  itinerarioCard:   { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  itinerarioHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  itinerarioNombre: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  itinerarioMeta:   { fontSize: 12, fontWeight: '600' },
  itinerarioTotal:  { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120 },
  itinerarioTotalLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  itinerarioTotalValor: { fontSize: 13, fontWeight: '800' },
  destinosPreview:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  destinoPreviewChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  destinoPreviewTxt:{ fontSize: 12, fontWeight: '700' },
  itinerarioAcciones: { flexDirection: 'row', gap: 10 },
  btnSecundario:    { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnSecundarioTxt: { fontSize: 13, fontWeight: '800' },
  btnEliminar:      { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFECEB' },
  btnEliminarTxt:   { fontSize: 13, fontWeight: '800', color: '#DD331D' },
  itinerarioDetalle:{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 10 },
  destinoFila:      { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 12, alignItems: 'center' },
  destinoIndice:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoIndiceTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:    { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  destinoDescripcion:{ fontSize: 12, lineHeight: 18, marginBottom: 4 },
  destinoPrecio:    { fontSize: 12, fontWeight: '800' },
  destinoAbrir:     { fontSize: 12, fontWeight: '800', maxWidth: 72, textAlign: 'right' },

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

  btnVerMapa:       { marginHorizontal: 14, marginTop: 10, borderRadius: 25, paddingVertical: 13, alignItems: 'center' },
  btnVerMapaTxt:    { color: '#fff', fontSize: 14, fontWeight: '800' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:        { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  modalTitulo:      { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSubtitulo:   { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  modalInput:       { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  modalBtnPrincipal:{ borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  modalBtnDisabled: { opacity: 0.45 },
  modalBtnPrincipalTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalBtnCerrar:   { paddingVertical: 14, alignItems: 'center' },
  modalBtnCerrarTxt:{ fontSize: 13, fontWeight: '700' },
});
