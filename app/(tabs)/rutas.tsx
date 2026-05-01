import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Modal, Platform, RefreshControl, ScrollView,
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

// ─── Constantes visuales ───────────────────────────────────────────────────
const NIVEL_COLOR: Record<string, string> = {
  economico: '#3AB7A5',
  medio: '#e9c46a',
  premium: '#DD331D',
};

const COLOR_RUTA = '#3AB7A5'; // color base para itinerarios personalizados

const extraerMonto = (precio: string) => {
  const match = String(precio ?? '').replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Mis Itinerarios
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();

  const [usuarioId,  setUsuarioId]  = useState<string | null>(null);
  const [favoritos,  setFavoritos]  = useState<number[]>([]);
  const [itinerarios, setItinerarios] = useState<Itinerario[]>([]);
  const [itinerarioExpandidoId, setItinerarioExpandidoId] = useState<number | null>(null);
  const [tabPorItinerario, setTabPorItinerario] = useState<Record<number, 'destinos' | 'mapa'>>({});
  const [modalAgregarDestino, setModalAgregarDestino] = useState<{ itinerarioId: number } | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cargando,    setCargando]    = useState(true);
  const [recargando,  setRecargando]  = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const cargarDatos = useCallback(async (esRecarga = false) => {
    if (!esRecarga) { setCargando(true); fadeAnim.setValue(0); }
    const usuario = await obtenerUsuarioActivo();
    if (!usuario) {
      setUsuarioId(null);
      setFavoritos([]);
      setItinerarios([]);
    } else {
      setUsuarioId(usuario.id);
      const [idsFav, itinerariosUsuario] = await Promise.all([
        cargarFavoritos(usuario.id),
        obtenerItinerarios(usuario.id),
      ]);
      setFavoritos(idsFav);
      setItinerarios(itinerariosUsuario);
    }
    setCargando(false);
    setRecargando(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [fadeAnim]);

  useFocusEffect(useCallback(() => { cargarDatos(); }, [cargarDatos]));

  const onRefresh = useCallback(async () => {
    setRecargando(true);
    await cargarDatos(true);
  }, [cargarDatos]);

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

  // Procesar itinerarios para vista
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
          color: paquete?.color ?? NIVEL_COLOR[nivel] ?? COLOR_RUTA,
          latitude: estadoEncontrado?.latitude,
          longitude: estadoEncontrado?.longitude,
          estadoCompleto: estadoEncontrado,
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

  const quitarDestinoDeItinerario = useCallback(async (itinerarioId: number, clave: string) => {
    if (!usuarioId) { return; }
    const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
    setItinerarios(actualizados);
  }, [usuarioId]);

  const agregarDestinoAItinerario = useCallback(async (itinerarioId: number, estadoNombre: string, nivel: 'economico' | 'medio' | 'premium') => {
    if (!usuarioId) { return; }
    const clave = generarClaveRuta(estadoNombre, nivel);
    const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
    setItinerarios(actualizados);
    setModalAgregarDestino(null);
  }, [usuarioId]);

  const abrirDetalleDesdeClave = useCallback((clave: string) => {
    const { estado } = parsearClaveRuta(clave);
    const estadoEncontrado = TODOS_LOS_ESTADOS.find(item => item.nombre === estado);
    router.push({
      pathname: '/(tabs)/detalle',
      params: { nombre: estado, categoria: estadoEncontrado?.categoria ?? '' },
    } as never);
  }, []);

  const obtenerEtiquetaNivel = useCallback((nivel: string) => {
    if (nivel === 'economico') {return t('rut_economico');}
    if (nivel === 'premium') {return t('rut_premium');}
    return t('rut_medio');
  }, [t]);

  const cambiarTabItinerario = useCallback((itinerarioId: number, tab: 'destinos' | 'mapa') => {
    setTabPorItinerario(prev => ({ ...prev, [itinerarioId]: tab }));
  }, []);

  // Estados disponibles para agregar al itinerario activo
  const itinerarioActivoParaAgregar = useMemo(() => {
    if (!modalAgregarDestino) {return null;}
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
            contentContainerStyle={es.misRutasScroll}
            refreshControl={
              <RefreshControl
                refreshing={recargando}
                onRefresh={onRefresh}
                colors={['#3AB7A5']}
                tintColor="#3AB7A5"
              />
            }
          >
            {/* Hero "Mis viajes" */}
            <View style={[es.heroMisViajes, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
              <Text style={[es.heroMisViajesTitulo, { color: tema.texto }]}>{t('rut_mis_viajes_hero')}</Text>
              <Text style={[es.heroMisViajesSubtitulo, { color: tema.textoSecundario }]}>
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
                      style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
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
                        style={[es.btnInlineCrear, { backgroundColor: tema.primario }, !nuevoNombre.trim() && es.modalBtnDisabled]}
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
                    <Text style={es.btnCrearViajeTxt}>+ {t('rut_nuevo_viaje_btn')}</Text>
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
                const tabActivo = tabPorItinerario[itinerario.id] ?? 'destinos';
                const polylineCoords = itinerario.destinos
                  .filter(d => d.latitude && d.longitude)
                  .map(d => ({ latitude: d.latitude!, longitude: d.longitude! }));

                return (
                  <View
                    key={itinerario.id}
                    style={[es.itinerarioCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
                  >
                    <View style={es.itinerarioHeader}>
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
                                <Text style={es.edicionBtnGuardarTxt}>✓</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[es.edicionBtnCancelar, { borderColor: tema.borde }]}
                                onPress={cancelarEdicion}
                                activeOpacity={0.85}
                              >
                                <Text style={[es.edicionBtnCancelarTxt, { color: tema.textoMuted }]}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => iniciarEdicion(itinerario)} activeOpacity={0.7}>
                            <View style={es.nombreFila}>
                              <Text style={[es.itinerarioNombre, { color: tema.texto }]}>{itinerario.nombre}</Text>
                              <Text style={[es.iconoEditar, { color: tema.textoMuted }]}>✏️</Text>
                            </View>
                          </TouchableOpacity>
                        )}
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
                      {itinerario.totalDestinos === 0 ? (
                        <View style={[es.destinoPreviewChip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <Text style={[es.destinoPreviewTxt, { color: tema.textoMuted }]}>{t('rut_sin_destinos_aun')}</Text>
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
                        {/* Tabs Destinos / Mapa */}
                        <View style={[es.tabsItinerario, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <TouchableOpacity
                            style={[
                              es.tabItinerarioBtn,
                              tabActivo === 'destinos' && { backgroundColor: tema.primario },
                            ]}
                            onPress={() => cambiarTabItinerario(itinerario.id, 'destinos')}
                            activeOpacity={0.85}
                          >
                            <Text style={[
                              es.tabItinerarioBtnTxt,
                              { color: tabActivo === 'destinos' ? '#fff' : tema.textoMuted },
                            ]}>
                              📍 {t('rut_destinos_tab') || 'Destinos'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              es.tabItinerarioBtn,
                              tabActivo === 'mapa' && { backgroundColor: tema.primario },
                            ]}
                            onPress={() => cambiarTabItinerario(itinerario.id, 'mapa')}
                            activeOpacity={0.85}
                          >
                            <Text style={[
                              es.tabItinerarioBtnTxt,
                              { color: tabActivo === 'mapa' ? '#fff' : tema.textoMuted },
                            ]}>
                              🗺️ {t('rut_mapa_tab') || 'Mapa'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Contenido del tab */}
                        {tabActivo === 'destinos' ? (
                          <View style={{ gap: 10 }}>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[es.destinoTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                                  <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                                </View>
                              </View>
                            ) : (
                              itinerario.destinos.map((destino, index) => (
                                <View key={destino.clave} style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                                  <View style={[es.destinoIndice, { backgroundColor: destino.color }]}>
                                    <Text style={es.destinoIndiceTxt}>{index + 1}</Text>
                                  </View>
                                  <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => abrirDetalleDesdeClave(destino.clave)}
                                    activeOpacity={0.85}
                                  >
                                    <Text style={[es.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                                    <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>
                                      {destino.estado} · {obtenerEtiquetaNivel(destino.nivel)} · {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                                    </Text>
                                    <Text style={[es.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={es.destinoQuitar}
                                    onPress={() => quitarDestinoDeItinerario(itinerario.id, destino.clave)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                  >
                                    <Text style={es.destinoQuitarTxt}>✕</Text>
                                  </TouchableOpacity>
                                </View>
                              ))
                            )}

                            {/* Botón agregar destino */}
                            <TouchableOpacity
                              style={[es.btnAgregarDestino, { borderColor: tema.primario }]}
                              onPress={() => setModalAgregarDestino({ itinerarioId: itinerario.id })}
                              activeOpacity={0.85}
                            >
                              <Text style={[es.btnAgregarDestinoTxt, { color: tema.primario }]}>
                                + {t('rut_agregar_destino') || 'Agregar destino'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          // Tab Mapa
                          <View style={[es.mapaContenedor, { borderColor: tema.borde }]}>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.mapaVacio, { backgroundColor: tema.superficie }]}>
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>🗺️</Text>
                                <Text style={[es.estadoVacioTitulo, { color: tema.texto, fontSize: 14 }]}>
                                  {t('rut_mapa_vacio_titulo') || 'Sin destinos'}
                                </Text>
                                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario, fontSize: 12 }]}>
                                  {t('rut_mapa_vacio_msg') || 'Agrega destinos para ver tu ruta en el mapa.'}
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

      {/* Modal: agregar destino al itinerario */}
      <Modal
        visible={!!modalAgregarDestino}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAgregarDestino(null)}
      >
        <View style={es.modalOverlay}>
          <View style={[es.modalCard, { backgroundColor: tema.superficieBlanca, maxHeight: '85%' }]}>
            <Text style={[es.modalTitulo, { color: tema.texto }]}>
              {t('rut_agregar_destino_titulo') || 'Agregar destino'}
            </Text>
            <Text style={[es.modalSubtitulo, { color: tema.textoSecundario }]}>
              {t('rut_agregar_destino_sub') || 'Elige un estado y un nivel de paquete.'}
            </Text>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {TODOS_LOS_ESTADOS.map(estado => {
                const clavesYaIncluidas = new Set(
                  itinerarioActivoParaAgregar?.destinos.map(d => d.clave) ?? []
                );
                const niveles: ('economico' | 'medio' | 'premium')[] = ['economico', 'medio', 'premium'];
                const nivelesDisponibles = niveles.filter(
                  n => !clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n))
                );

                if (nivelesDisponibles.length === 0) {return null;}

                return (
                  <View
                    key={estado.id}
                    style={[es.estadoPickerFila, { backgroundColor: tema.superficie, borderColor: tema.borde }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[es.estadoPickerNombre, { color: tema.texto }]}>{estado.nombre}</Text>
                      <Text style={[es.estadoPickerCategoria, { color: tema.textoMuted }]}>{estado.categoria}</Text>
                    </View>
                    <View style={es.estadoPickerNiveles}>
                      {nivelesDisponibles.map(nivel => (
                        <TouchableOpacity
                          key={nivel}
                          style={[
                            es.estadoPickerNivelBtn,
                            { backgroundColor: NIVEL_COLOR[nivel] + '22', borderColor: NIVEL_COLOR[nivel] },
                          ]}
                          onPress={() => modalAgregarDestino && agregarDestinoAItinerario(modalAgregarDestino.itinerarioId, estado.nombre, nivel)}
                          activeOpacity={0.85}
                        >
                          <Text style={[es.estadoPickerNivelTxt, { color: NIVEL_COLOR[nivel] }]}>
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
              style={es.modalBtnCerrar}
              onPress={() => setModalAgregarDestino(null)}
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
  misRutasScroll:   { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 10, gap: 12 },
  heroMisViajes:    { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  heroMisViajesTitulo: { fontSize: 21, fontWeight: '900', marginBottom: 6 },
  heroMisViajesSubtitulo: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  btnCrearViaje:    { borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnCrearViajeTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Creación inline
  creacionInline:    { gap: 10 },
  inputInline:       { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  creacionInlineBtns:{ flexDirection: 'row', gap: 10 },
  btnInlineCancelar: { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCancelarTxt: { fontSize: 13, fontWeight: '800' },
  btnInlineCrear:    { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCrearTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

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
  itinerarioDetalle:{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },

  // Tabs Destinos / Mapa
  tabsItinerario:   { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tabItinerarioBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tabItinerarioBtnTxt: { fontSize: 13, fontWeight: '800' },

  destinoFila:      { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 12, alignItems: 'center' },
  destinoIndice:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoIndiceTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:    { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  destinoDescripcion:{ fontSize: 12, lineHeight: 18, marginBottom: 4 },
  destinoPrecio:    { fontSize: 12, fontWeight: '800' },
  destinoQuitar:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFECEB', alignItems: 'center', justifyContent: 'center' },
  destinoQuitarTxt: { color: '#DD331D', fontSize: 14, fontWeight: '800' },

  // Botón agregar destino
  btnAgregarDestino:{ borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAgregarDestinoTxt: { fontSize: 13, fontWeight: '800' },

  // Mapa
  mapaContenedor:   { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:        { padding: 28, alignItems: 'center', justifyContent: 'center' },

  // Modal agregar destino
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:        { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  modalTitulo:      { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSubtitulo:   { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  modalBtnDisabled: { opacity: 0.45 },
  modalBtnCerrar:   { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnCerrarTxt:{ fontSize: 13, fontWeight: '700' },

  // Edición inline de nombre
  nombreFila:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  iconoEditar:        { fontSize: 13 },
  edicionInline:      { gap: 8, marginBottom: 4 },
  edicionInput:       { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '800' },
  edicionBtns:        { flexDirection: 'row', gap: 8 },
  edicionBtnGuardar:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edicionBtnGuardarTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  edicionBtnCancelar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  edicionBtnCancelarTxt: { fontSize: 14, fontWeight: '800' },
  btnDisabled:        { opacity: 0.4 },

  // Picker de estados
  estadoPickerFila: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  estadoPickerNombre: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  estadoPickerCategoria: { fontSize: 11, fontWeight: '600' },
  estadoPickerNiveles: { flexDirection: 'row', gap: 6 },
  estadoPickerNivelBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  estadoPickerNivelTxt: { fontSize: 11, fontWeight: '800' },
});
