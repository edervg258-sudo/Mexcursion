import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert, Animated, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import MapaRutas from '../../components/MapaRutas';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import {
  PAQUETES_POR_ESTADO,
  TODOS_LOS_ESTADOS,
  generarClaveRuta,
  parsearClaveRuta,
  resolverInfoRuta,
} from '../../lib/constantes';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useIdioma } from '../../lib/IdiomaContext';
import {
  Itinerario,
  alternarDestinoItinerario,
  alternarFavorito,
  cargarFavoritos,
  crearItinerario,
  eliminarItinerario,
  obtenerItinerarios,
  obtenerUsuarioActivo,
  renombrarItinerario,
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { Estado } from '../../lib/tipos';
import { SkeletonFilas } from './skeletonloader';

const NIVEL_COLOR: Record<string, string> = {
  economico: '#3AB7A5',
  medio:     '#e9c46a',
  premium:   '#DD331D',
};

const COLOR_RUTA = '#3AB7A5';

const extraerMonto = (precio: string) => {
  const match = String(precio ?? '').replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();

  const [usuarioId,             setUsuarioId]             = useState<string | null>(null);
  const [favoritos,             setFavoritos]             = useState<number[]>([]);
  const [itinerarios,           setItinerarios]           = useState<Itinerario[]>([]);
  const [itinerarioExpandidoId, setItinerarioExpandidoId] = useState<number | null>(null);
  const [tabPorItinerario,      setTabPorItinerario]      = useState<Record<number, 'destinos' | 'mapa'>>({});
  const [modalAgregarDestino,   setModalAgregarDestino]   = useState<{ itinerarioId: number } | null>(null);
  const [creandoNuevo,          setCreandoNuevo]          = useState(false);
  const [nuevoNombre,           setNuevoNombre]           = useState('');
  const [editandoId,            setEditandoId]            = useState<number | null>(null);
  const [nombreEditado,         setNombreEditado]         = useState('');
  const [cargando,              setCargando]              = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const itinerariosResumen = useMemo(() =>
    itinerarios.map(itinerario => {
      const destinos = (itinerario.items ?? []).map(clave => {
        const { estado, nivel } = parsearClaveRuta(clave);
        const info              = resolverInfoRuta(clave);
        const estadoEncontrado  = TODOS_LOS_ESTADOS.find(item => item.nombre === estado);
        const paquete           = (PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO.default ?? []).find(item => item.nivel === nivel);
        return {
          clave,
          estado,
          nivel,
          titulo:          info.titulo,
          precioTotal:     info.precioTotal,
          diasRecomendados:info.diasRecomendados,
          categoria:       estadoEncontrado?.categoria ?? '',
          descripcion:     estadoEncontrado?.descripcion ?? '',
          color:           paquete?.color ?? NIVEL_COLOR[nivel] ?? COLOR_RUTA,
          latitude:        estadoEncontrado?.latitude,
          longitude:       estadoEncontrado?.longitude,
          estadoCompleto:  estadoEncontrado,
        };
      });
      return {
        ...itinerario,
        destinos,
        totalDestinos:  destinos.length,
        diasEstimados:  destinos.reduce((suma, d) => suma + d.diasRecomendados, 0),
        totalEstimado:  destinos.reduce((suma, d) => suma + extraerMonto(d.precioTotal), 0),
      };
    }),
  [itinerarios]);

  const crearNuevoItinerario = useCallback(async () => {
    if (!usuarioId || !nuevoNombre.trim()) { return; }
    const actualizados = await crearItinerario(usuarioId, nuevoNombre.trim());
    setItinerarios(actualizados);
    const creado = actualizados[0];
    if (creado) { setItinerarioExpandidoId(creado.id); }
    setNuevoNombre('');
    setCreandoNuevo(false);
  }, [nuevoNombre, usuarioId]);

  const iniciarEdicion = useCallback((itinerario: Itinerario) => {
    setEditandoId(itinerario.id);
    setNombreEditado(itinerario.nombre);
  }, []);

  const confirmarEdicion = useCallback(async (itinerarioId: number) => {
    if (!usuarioId || !nombreEditado.trim()) { return; }
    const actualizados = await renombrarItinerario(usuarioId, itinerarioId, nombreEditado.trim());
    setItinerarios(actualizados);
    setEditandoId(null);
    setNombreEditado('');
  }, [usuarioId, nombreEditado]);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setNombreEditado('');
  }, []);

  const borrarItinerario = useCallback((itinerario: Itinerario) => {
    if (!usuarioId) { return; }
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
            if (itinerarioExpandidoId === itinerario.id) { setItinerarioExpandidoId(null); }
          },
        },
      ]
    );
  }, [itinerarioExpandidoId, t, usuarioId]);

  const quitarDestinoDeItinerario = useCallback(async (itinerarioId: number, clave: string) => {
    if (!usuarioId) { return; }
    const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
    setItinerarios(actualizados);
  }, [usuarioId]);

  const agregarDestinoAItinerario = useCallback(async (itinerarioId: number, estadoNombre: string, nivel: 'economico' | 'medio' | 'premium') => {
    if (!usuarioId) { return; }
    const clave        = generarClaveRuta(estadoNombre, nivel);
    const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
    setItinerarios(actualizados);
    setModalAgregarDestino(null);
  }, [usuarioId]);

  const abrirDetalleDesdeClave = useCallback((clave: string) => {
    const { estado }       = parsearClaveRuta(clave);
    const estadoEncontrado = TODOS_LOS_ESTADOS.find(item => item.nombre === estado);
    router.push({
      pathname: '/(tabs)/detalle',
      params: { nombre: estado, categoria: estadoEncontrado?.categoria ?? '' },
    } as never);
  }, []);

  const obtenerEtiquetaNivel = useCallback((nivel: string) => {
    if (nivel === 'economico') { return t('rut_economico'); }
    if (nivel === 'premium')   { return t('rut_premium'); }
    return t('rut_medio');
  }, [t]);

  const cambiarTabItinerario = useCallback((itinerarioId: number, tab: 'destinos' | 'mapa') => {
    setTabPorItinerario(prev => ({ ...prev, [itinerarioId]: tab }));
  }, []);

  const itinerarioActivoParaAgregar = useMemo(() => {
    if (!modalAgregarDestino) { return null; }
    return itinerariosResumen.find(it => it.id === modalAgregarDestino.itinerarioId);
  }, [modalAgregarDestino, itinerariosResumen]);

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

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={es.scroll}
          >
            {/* ── Hero ── */}
            <View style={[es.hero, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
              <View style={es.heroIconRow}>
                <View style={[es.heroIconBox, { backgroundColor: tema.primarioSuave }]}>
                  <Ionicons name="map-outline" size={22} color="#3AB7A5" />
                </View>
              </View>
              <Text style={[es.heroTitulo, { color: tema.texto }]}>{t('rut_mis_viajes_hero')}</Text>
              <Text style={[es.heroSubtitulo, { color: tema.textoSecundario }]}>
                {t('rut_mis_viajes_hero_sub')}
              </Text>

              {usuarioId ? (
                creandoNuevo ? (
                  <View style={es.creacionInline}>
                    <TextInput
                      value={nuevoNombre}
                      onChangeText={setNuevoNombre}
                      placeholder={t('rut_ph_nuevo_iti')}
                      placeholderTextColor={tema.textoMuted}
                      autoFocus
                      style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.primario, color: tema.texto }]}
                    />
                    <View style={es.creacionInlineBtns}>
                      <TouchableOpacity
                        style={[es.btnInlineCancelar, { borderColor: tema.borde }]}
                        onPress={() => { setCreandoNuevo(false); setNuevoNombre(''); }}
                        activeOpacity={0.85}
                      >
                        <Text style={[es.btnInlineCancelarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnInlineCrear, { backgroundColor: tema.primario }, !nuevoNombre.trim() && es.btnDisabled]}
                        onPress={crearNuevoItinerario}
                        disabled={!nuevoNombre.trim()}
                        activeOpacity={0.85}
                      >
                        <Text style={es.btnInlineCrearTxt}>{t('rut_crear_viaje')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[es.btnCrearViaje, { backgroundColor: tema.primario }]}
                    testID="create-itinerary-button"
                    onPress={() => setCreandoNuevo(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={es.btnCrearViajeTxt}>{t('rut_nuevo_viaje_btn')}</Text>
                  </TouchableOpacity>
                )
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

            {/* ── Estado vacío ── */}
            {!usuarioId ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Ionicons name="person-outline" size={36} color={tema.textoMuted} style={{ marginBottom: 12 }} />
                <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sesion_requerida')}</Text>
                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sesion_msg')}</Text>
              </View>
            ) : itinerariosResumen.length === 0 ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Ionicons name="briefcase-outline" size={36} color={tema.textoMuted} style={{ marginBottom: 12 }} />
                <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sin_itis_aun')}</Text>
                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sin_itis_msg')}</Text>
                <TouchableOpacity
                  style={[es.btnExplorar, { borderColor: tema.primario }]}
                  onPress={() => router.push('/(tabs)/menu' as never)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="compass-outline" size={15} color={tema.primario} />
                  <Text style={[es.btnExplorarTxt, { color: tema.primario }]}>{t('rut_explorar')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              itinerariosResumen.map(itinerario => {
                const expandido    = itinerarioExpandidoId === itinerario.id;
                const tabActivo    = tabPorItinerario[itinerario.id] ?? 'destinos';
                const polylineCoords = itinerario.destinos
                  .filter(d => d.latitude && d.longitude)
                  .map(d => ({ latitude: d.latitude!, longitude: d.longitude! }));

                return (
                  <View
                    key={itinerario.id}
                    style={[es.card, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
                  >
                    {/* ── Cabecera de la tarjeta ── */}
                    <View style={es.cardHeader}>
                      <View style={{ flex: 1 }}>
                        {editandoId === itinerario.id ? (
                          <View style={es.edicionInline}>
                            <TextInput
                              value={nombreEditado}
                              onChangeText={setNombreEditado}
                              autoFocus
                              style={[es.edicionInput, { backgroundColor: tema.superficie, borderColor: tema.primario, color: tema.texto }]}
                              onSubmitEditing={() => confirmarEdicion(itinerario.id)}
                              returnKeyType="done"
                            />
                            <View style={es.edicionBtns}>
                              <TouchableOpacity
                                style={[es.edicionBtnGuardar, { backgroundColor: tema.primario }, !nombreEditado.trim() && es.btnDisabled]}
                                onPress={() => confirmarEdicion(itinerario.id)}
                                disabled={!nombreEditado.trim()}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="checkmark" size={18} color="#fff" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[es.edicionBtnCancelar, { borderColor: tema.borde }]}
                                onPress={cancelarEdicion}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="close" size={16} color={tema.textoMuted} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => iniciarEdicion(itinerario)} activeOpacity={0.7}>
                            <View style={es.nombreFila}>
                              <Text style={[es.cardNombre, { color: tema.texto }]} numberOfLines={1}>{itinerario.nombre}</Text>
                              <Ionicons name="pencil-outline" size={13} color={tema.textoMuted} />
                            </View>
                          </TouchableOpacity>
                        )}
                        <Text style={[es.cardMeta, { color: tema.textoMuted }]}>
                          {itinerario.totalDestinos} {t(itinerario.totalDestinos === 1 ? 'rut_destino' : 'rut_destinos')}
                          {' · '}
                          {itinerario.diasEstimados} {t(itinerario.diasEstimados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                        </Text>
                      </View>

                      <View style={[es.presupuestoBox, { backgroundColor: tema.primarioSuave }]}>
                        <Text style={[es.presupuestoLabel, { color: tema.primario }]}>{t('rut_presupuesto')}</Text>
                        <Text style={[es.presupuestoValor, { color: tema.texto }]}>
                          ${itinerario.totalEstimado.toLocaleString('es-MX')}
                        </Text>
                        <Text style={[es.presupuestoMoneda, { color: tema.textoMuted }]}>MXN</Text>
                      </View>
                    </View>

                    {/* ── Chips de destinos ── */}
                    <View style={es.chipsRow}>
                      {itinerario.destinos.slice(0, 3).map(destino => (
                        <View
                          key={destino.clave}
                          style={[es.chip, { backgroundColor: `${destino.color}18`, borderColor: `${destino.color}55` }]}
                        >
                          <View style={[es.chipDot, { backgroundColor: destino.color }]} />
                          <Text style={[es.chipTxt, { color: destino.color }]}>{destino.estado}</Text>
                        </View>
                      ))}
                      {itinerario.totalDestinos > 3 && (
                        <View style={[es.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <Text style={[es.chipTxt, { color: tema.textoMuted }]}>+{itinerario.totalDestinos - 3}</Text>
                        </View>
                      )}
                      {itinerario.totalDestinos === 0 && (
                        <View style={[es.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <Text style={[es.chipTxt, { color: tema.textoMuted }]}>{t('rut_sin_destinos_aun')}</Text>
                        </View>
                      )}
                    </View>

                    {/* ── Acciones ── */}
                    <View style={es.cardAcciones}>
                      <TouchableOpacity
                        style={[es.btnVer, { borderColor: tema.primario }]}
                        onPress={() => setItinerarioExpandidoId(expandido ? null : itinerario.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={expandido ? 'chevron-up-outline' : 'list-outline'}
                          size={15}
                          color={tema.primario}
                        />
                        <Text style={[es.btnVerTxt, { color: tema.primario }]}>
                          {expandido ? t('rut_cancelar') : t('rut_ver_itinerario')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={es.btnEliminar}
                        onPress={() => borrarItinerario(itinerario)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DD331D" />
                        <Text style={es.btnEliminarTxt}>{t('rut_eliminar')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* ── Panel expandido ── */}
                    {expandido && (
                      <View style={[es.panelDetalle, { borderTopColor: tema.borde }]}>
                        {/* Tabs */}
                        <View style={[es.tabs, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <TouchableOpacity
                            style={[es.tab, tabActivo === 'destinos' && { backgroundColor: tema.primario }]}
                            onPress={() => cambiarTabItinerario(itinerario.id, 'destinos')}
                            activeOpacity={0.85}
                          >
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color={tabActivo === 'destinos' ? '#fff' : tema.textoMuted}
                            />
                            <Text style={[es.tabTxt, { color: tabActivo === 'destinos' ? '#fff' : tema.textoMuted }]}>
                              {t('rut_destinos_tab')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[es.tab, tabActivo === 'mapa' && { backgroundColor: tema.primario }]}
                            onPress={() => cambiarTabItinerario(itinerario.id, 'mapa')}
                            activeOpacity={0.85}
                          >
                            <Ionicons
                              name="map-outline"
                              size={14}
                              color={tabActivo === 'mapa' ? '#fff' : tema.textoMuted}
                            />
                            <Text style={[es.tabTxt, { color: tabActivo === 'mapa' ? '#fff' : tema.textoMuted }]}>
                              {t('rut_mapa_tab')}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Contenido del tab */}
                        {tabActivo === 'destinos' ? (
                          <View style={{ gap: 8 }}>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.destinoVacio, { backgroundColor: tema.superficie }]}>
                                <Ionicons name="location-outline" size={28} color={tema.textoMuted} style={{ marginBottom: 6 }} />
                                <Text style={[es.destinoVacioTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                                <Text style={[es.destinoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                              </View>
                            ) : (
                              itinerario.destinos.map((destino, index) => (
                                <View key={destino.clave} style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                                  <View style={[es.destinoNumero, { backgroundColor: destino.color }]}>
                                    <Text style={es.destinoNumeroTxt}>{index + 1}</Text>
                                  </View>
                                  <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => abrirDetalleDesdeClave(destino.clave)}
                                    activeOpacity={0.85}
                                  >
                                    <Text style={[es.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                                    <Text style={[es.destinoMeta, { color: tema.textoSecundario }]}>
                                      {destino.estado}
                                      {' · '}
                                      {obtenerEtiquetaNivel(destino.nivel)}
                                      {' · '}
                                      {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                                    </Text>
                                    <Text style={[es.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={es.btnQuitar}
                                    onPress={() => quitarDestinoDeItinerario(itinerario.id, destino.clave)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                  >
                                    <Ionicons name="close" size={14} color="#DD331D" />
                                  </TouchableOpacity>
                                </View>
                              ))
                            )}

                            <TouchableOpacity
                              style={[es.btnAgregar, { borderColor: tema.primario }]}
                              onPress={() => setModalAgregarDestino({ itinerarioId: itinerario.id })}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="add-circle-outline" size={16} color={tema.primario} />
                              <Text style={[es.btnAgregarTxt, { color: tema.primario }]}>
                                {t('rut_agregar_destino')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={[es.mapaContenedor, { borderColor: tema.borde }]}>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.mapaVacio, { backgroundColor: tema.superficie }]}>
                                <Ionicons name="map-outline" size={42} color={tema.textoMuted} style={{ marginBottom: 10 }} />
                                <Text style={[es.destinoVacioTitulo, { color: tema.texto }]}>
                                  {t('rut_mapa_vacio_titulo')}
                                </Text>
                                <Text style={[es.destinoVacioTexto, { color: tema.textoSecundario }]}>
                                  {t('rut_mapa_vacio_msg')}
                                </Text>
                              </View>
                            ) : (
                              <View style={{ height: 360 }}>
                                <MapaRutas
                                  rutaColor={COLOR_RUTA}
                                  rutaNombre={itinerario.nombre}
                                  estadosRuta={itinerario.destinos
                                    .map(d => d.estadoCompleto)
                                    .filter((e): e is Estado => !!e)}
                                  polylineCoords={polylineCoords}
                                  favoritos={favoritos}
                                  isDark={isDark}
                                  tema={tema as unknown as Record<string, string>}
                                  onToggleFav={toggleFavorito}
                                  onIrADetalle={irADetalle}
                                />
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
      </View>

      {/* ── Modal: agregar destino ── */}
      <Modal
        visible={!!modalAgregarDestino}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAgregarDestino(null)}
      >
        <View style={es.modalOverlay}>
          <View style={[es.modalCard, { backgroundColor: tema.superficieBlanca, maxHeight: '85%' }]}>
            <View style={es.modalCabecera}>
              <View>
                <Text style={[es.modalTitulo, { color: tema.texto }]}>
                  {t('rut_agregar_destino_titulo')}
                </Text>
                <Text style={[es.modalSubtitulo, { color: tema.textoSecundario }]}>
                  {t('rut_agregar_destino_sub')}
                </Text>
              </View>
              <TouchableOpacity
                style={[es.modalBtnCerrarX, { backgroundColor: tema.superficie, borderColor: tema.borde }]}
                onPress={() => setModalAgregarDestino(null)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color={tema.textoMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {TODOS_LOS_ESTADOS.map(estado => {
                const clavesYaIncluidas = new Set(
                  itinerarioActivoParaAgregar?.destinos.map(d => d.clave) ?? []
                );
                const niveles: ('economico' | 'medio' | 'premium')[] = ['economico', 'medio', 'premium'];
                const nivelesDisponibles = niveles.filter(
                  n => !clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n))
                );
                if (nivelesDisponibles.length === 0) { return null; }
                return (
                  <View
                    key={estado.id}
                    style={[es.estadoFila, { backgroundColor: tema.superficie, borderColor: tema.borde }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[es.estadoNombre, { color: tema.texto }]}>{estado.nombre}</Text>
                      <Text style={[es.estadoCategoria, { color: tema.textoMuted }]}>{estado.categoria}</Text>
                    </View>
                    <View style={es.nivelesRow}>
                      {nivelesDisponibles.map(nivel => (
                        <TouchableOpacity
                          key={nivel}
                          style={[
                            es.nivelBtn,
                            { backgroundColor: NIVEL_COLOR[nivel] + '22', borderColor: NIVEL_COLOR[nivel] },
                          ]}
                          onPress={() => modalAgregarDestino && agregarDestinoAItinerario(modalAgregarDestino.itinerarioId, estado.nombre, nivel)}
                          activeOpacity={0.85}
                        >
                          <Text style={[es.nivelBtnTxt, { color: NIVEL_COLOR[nivel] }]}>
                            {obtenerEtiquetaNivel(nivel)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[es.btnCerrarModal, { borderColor: tema.borde }]}
              onPress={() => setModalAgregarDestino(null)}
              activeOpacity={0.85}
            >
              <Text style={[es.btnCerrarModalTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TabChrome>
  );
}

const es = StyleSheet.create({
  scroll:              { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 10, gap: 12 },

  // Hero
  hero:                { borderWidth: 1, borderRadius: 18, padding: 20 },
  heroIconRow:         { marginBottom: 12 },
  heroIconBox:         { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitulo:          { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  heroSubtitulo:       { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  btnCrearViaje:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 24, paddingVertical: 13 },
  btnCrearViajeTxt:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Creación inline
  creacionInline:      { gap: 10 },
  inputInline:         { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  creacionInlineBtns:  { flexDirection: 'row', gap: 10 },
  btnInlineCancelar:   { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCancelarTxt:{ fontSize: 13, fontWeight: '600' },
  btnInlineCrear:      { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCrearTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnDisabled:         { opacity: 0.4 },

  // Estado vacío
  estadoVacio:         { borderWidth: 1, borderRadius: 18, padding: 28, alignItems: 'center' },
  estadoVacioTitulo:   { fontSize: 17, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  estadoVacioTexto:    { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  btnExplorar:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11 },
  btnExplorarTxt:      { fontSize: 13, fontWeight: '700' },

  // Tarjeta itinerario
  card:                { borderWidth: 1, borderRadius: 18, padding: 16 },
  cardHeader:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  nombreFila:          { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  cardNombre:          { fontSize: 17, fontWeight: '700', flex: 1 },
  cardMeta:            { fontSize: 12, fontWeight: '500' },
  presupuestoBox:      { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 110, alignItems: 'flex-end' },
  presupuestoLabel:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  presupuestoValor:    { fontSize: 14, fontWeight: '800' },
  presupuestoMoneda:   { fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Chips
  chipsRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:                { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  chipDot:             { width: 6, height: 6, borderRadius: 3 },
  chipTxt:             { fontSize: 12, fontWeight: '600' },

  // Acciones de tarjeta
  cardAcciones:        { flexDirection: 'row', gap: 10 },
  btnVer:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderRadius: 22, paddingVertical: 10 },
  btnVerTxt:           { fontSize: 13, fontWeight: '700' },
  btnEliminar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFECEB' },
  btnEliminarTxt:      { fontSize: 13, fontWeight: '700', color: '#DD331D' },

  // Panel expandido
  panelDetalle:        { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },

  // Tabs
  tabs:                { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tab:                 { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, paddingVertical: 9 },
  tabTxt:              { fontSize: 13, fontWeight: '700' },

  // Destino vacío
  destinoVacio:        { borderRadius: 14, padding: 20, alignItems: 'center' },
  destinoVacioTitulo:  { fontSize: 14, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  destinoVacioTexto:   { fontSize: 12, lineHeight: 18, textAlign: 'center' },

  // Fila de destino
  destinoFila:         { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 12, alignItems: 'center' },
  destinoNumero:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoNumeroTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:       { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  destinoMeta:         { fontSize: 12, lineHeight: 18, marginBottom: 3 },
  destinoPrecio:       { fontSize: 12, fontWeight: '700' },
  btnQuitar:           { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFECEB', alignItems: 'center', justifyContent: 'center' },

  // Botón agregar destino
  btnAgregar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  btnAgregarTxt:       { fontSize: 13, fontWeight: '700' },

  // Edición inline
  edicionInline:       { gap: 8, marginBottom: 4 },
  edicionInput:        { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '700' },
  edicionBtns:         { flexDirection: 'row', gap: 8 },
  edicionBtnGuardar:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edicionBtnCancelar:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Mapa
  mapaContenedor:      { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:           { padding: 32, alignItems: 'center', justifyContent: 'center' },

  // Modal agregar destino
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:           { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  modalCabecera:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  modalTitulo:         { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSubtitulo:      { fontSize: 13, lineHeight: 19 },
  modalBtnCerrarX:     { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  estadoFila:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  estadoNombre:        { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  estadoCategoria:     { fontSize: 11, fontWeight: '500' },
  nivelesRow:          { flexDirection: 'row', gap: 6 },
  nivelBtn:            { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  nivelBtnTxt:         { fontSize: 11, fontWeight: '800' },
  btnCerrarModal:      { paddingVertical: 14, alignItems: 'center', marginTop: 8, borderTopWidth: 1 },
  btnCerrarModalTxt:   { fontSize: 13, fontWeight: '600' },
});
