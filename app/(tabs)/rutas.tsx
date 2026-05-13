import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, Modal, Platform, ScrollView, Share,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import MapaRutas from '../../components/MapaRutas';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { useToast } from '../../components/Toast';
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
  duplicarItinerario,
  eliminarItinerario,
  obtenerItinerarios,
  obtenerUsuarioActivo,
  reordenarItinerarioItems,
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

const COLOR_RUTA = '#3AB7A5';

const extraerMonto = (precio: string) => {
  const match = String(precio ?? '').replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const validarNombre = (nombre: string): string | null => {
  const n = nombre.trim();
  if (n.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (n.length > 60) return 'El nombre no puede superar los 60 caracteres.';
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PANTALLA PRINCIPAL — Mis Itinerarios
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();
  const toast            = useToast();

  const [usuarioId,    setUsuarioId]    = useState<string | null>(null);
  const [favoritos,    setFavoritos]    = useState<number[]>([]);
  const [itinerarios,  setItinerarios]  = useState<Itinerario[]>([]);
  const [itinerarioExpandidoId, setItinerarioExpandidoId] = useState<number | null>(null);
  const [tabPorItinerario, setTabPorItinerario] = useState<Record<number, 'destinos' | 'mapa'>>({});
  const [modalAgregarDestino, setModalAgregarDestino] = useState<{ itinerarioId: number } | null>(null);
  const [confirmarBorrado,   setConfirmarBorrado]   = useState<Itinerario | null>(null);
  const [busquedaModal,  setBusquedaModal]  = useState('');
  const [creandoNuevo,   setCreandoNuevo]   = useState(false);
  const [nuevoNombre,    setNuevoNombre]    = useState('');
  const [editandoId,     setEditandoId]     = useState<number | null>(null);
  const [nombreEditado,  setNombreEditado]  = useState('');
  // cargandoPantalla: carga inicial completa; guardandoAccion: mutación puntual
  const [cargandoPantalla, setCargandoPantalla] = useState(true);
  const [guardandoAccion,  setGuardandoAccion]  = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // IDs de favoritos con petición en vuelo — evita doble tap
  const favoritosEnVuelo = useRef(new Set<number>());

  // ─── Carga inicial ────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargandoPantalla(true);
      fadeAnim.setValue(0);
      try {
        const usuario = await obtenerUsuarioActivo();
        if (!usuario) {
          setUsuarioId(null);
          setFavoritos([]);
          setItinerarios([]);
          return;
        }
        setUsuarioId(usuario.id);
        const [idsFav, itinerariosUsuario] = await Promise.all([
          cargarFavoritos(usuario.id),
          obtenerItinerarios(usuario.id),
        ]);
        setFavoritos(idsFav);
        setItinerarios(itinerariosUsuario);
      } catch (e) {
        if (__DEV__) console.error('Error cargando rutas:', e);
        toast.mostrar(t('error_cargar_rutas') || 'No se pudieron cargar tus itinerarios', 'error');
      } finally {
        setCargandoPantalla(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
      }
    };
    cargar();
  }, [fadeAnim]));

  // ─── Favoritos ────────────────────────────────────────────────────────────
  const toggleFavorito = useCallback(async (estadoId: number) => {
    if (!usuarioId || favoritosEnVuelo.current.has(estadoId)) return;
    favoritosEnVuelo.current.add(estadoId);

    const yaEraFavorito = favoritos.includes(estadoId);
    // Actualización optimista
    setFavoritos(prev =>
      yaEraFavorito ? prev.filter(id => id !== estadoId) : [...prev, estadoId]
    );
    try {
      await alternarFavorito(usuarioId, estadoId);
    } catch (e) {
      if (__DEV__) console.error('Error actualizando favorito:', e);
      // Revertir si el servidor falló
      setFavoritos(prev =>
        yaEraFavorito ? [...prev, estadoId] : prev.filter(id => id !== estadoId)
      );
      toast.mostrar(t('error_favorito') || 'No se pudo actualizar favoritos', 'error');
    } finally {
      favoritosEnVuelo.current.delete(estadoId);
    }
  }, [usuarioId, favoritos]);

  const irADetalle = useCallback((estado: Estado) => {
    router.push({ pathname: '/(tabs)/detalle', params: { nombre: estado.nombre, categoria: estado.categoria } } as never);
  }, []);

  // ─── Cómputo de resumen por itinerario ───────────────────────────────────
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
          titulo:           info.titulo,
          precioTotal:      info.precioTotal,
          diasRecomendados: info.diasRecomendados,
          categoria:        estadoEncontrado?.categoria  ?? '',
          color:            paquete?.color ?? NIVEL_COLOR[nivel] ?? COLOR_RUTA,
          latitude:         estadoEncontrado?.latitude,
          longitude:        estadoEncontrado?.longitude,
          tieneCoordenadas: estadoEncontrado?.latitude != null && estadoEncontrado?.longitude != null,
          estadoCompleto:   estadoEncontrado,
        };
      });
      return {
        ...itinerario,
        destinos,
        totalDestinos:  destinos.length,
        diasEstimados:  destinos.reduce((s, d) => s + d.diasRecomendados, 0),
        totalEstimado:  destinos.reduce((s, d) => s + extraerMonto(d.precioTotal), 0),
      };
    }),
  [itinerarios]);

  // ─── Crear itinerario ─────────────────────────────────────────────────────
  const crearNuevoItinerario = useCallback(async () => {
    if (!usuarioId || guardandoAccion) return;
    const nombre = nuevoNombre.trim();
    const err    = validarNombre(nombre);
    if (err) { Alert.alert('Nombre inválido', err); return; }
    const idsPrevios = new Set(itinerarios.map(it => it.id));
    setGuardandoAccion(true);
    try {
      const actualizados = await crearItinerario(usuarioId, nombre);
      // Buscar por ID nuevo — evita ambigüedad cuando ya existe un itinerario con el mismo nombre
      const creado = actualizados.find(it => !idsPrevios.has(it.id));
      if (!creado) throw new Error('No se recibió confirmación del servidor.');
      setItinerarios(actualizados);
      setItinerarioExpandidoId(creado.id);
      setNuevoNombre('');
      setCreandoNuevo(false);
      toast.mostrar(t('rut_toast_creado'), 'success');
    } catch (e: any) {
      if (__DEV__) console.error('Error creando itinerario:', e);
      toast.mostrar(e?.message ?? (t('error_crear_viaje') || 'No se pudo crear el itinerario'), 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [nuevoNombre, usuarioId, guardandoAccion, itinerarios]);

  // ─── Editar nombre ────────────────────────────────────────────────────────
  const iniciarEdicion = useCallback((itinerario: Itinerario) => {
    setEditandoId(itinerario.id);
    setNombreEditado(itinerario.nombre);
  }, []);

  const confirmarEdicion = useCallback(async (itinerarioId: number) => {
    if (!usuarioId || guardandoAccion) return;
    const nombre = nombreEditado.trim();
    const actual = itinerarios.find(it => it.id === itinerarioId)?.nombre ?? '';
    if (nombre === actual) { cancelarEdicion(); return; }
    const err = validarNombre(nombre);
    if (err) { Alert.alert('Nombre inválido', err); return; }
    setGuardandoAccion(true);
    try {
      const actualizados = await renombrarItinerario(usuarioId, itinerarioId, nombre);
      const ok = actualizados.find(it => it.id === itinerarioId && it.nombre === nombre);
      // Si no encontramos el item renombrado, algo falló — dejamos el input abierto
      if (!ok) throw new Error('No se recibió confirmación del servidor.');
      setItinerarios(actualizados);
      setEditandoId(null);
      setNombreEditado('');
      toast.mostrar(t('rut_toast_renombrado'), 'success');
    } catch (e: any) {
      if (__DEV__) console.error('Error renombrando itinerario:', e);
      toast.mostrar((e?.message ?? (t('error_renombrar_viaje') || 'No se pudo renombrar')) + '. Intenta de nuevo', 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [usuarioId, nombreEditado, itinerarios, guardandoAccion]);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setNombreEditado('');
  }, []);

  // ─── Eliminar itinerario ──────────────────────────────────────────────────
  const borrarItinerario = useCallback((itinerario: Itinerario) => {
    if (!usuarioId || guardandoAccion) return;
    setConfirmarBorrado(itinerario);
  }, [usuarioId, guardandoAccion]);

  const ejecutarBorrado = useCallback(async () => {
    if (!usuarioId || !confirmarBorrado) return;
    const id = confirmarBorrado.id;
    setConfirmarBorrado(null);
    setGuardandoAccion(true);
    try {
      const actualizados = await eliminarItinerario(usuarioId, id);
      if (actualizados.some(it => it.id === id)) {
        throw new Error('No se pudo eliminar. Intenta de nuevo.');
      }
      setItinerarios(actualizados);
      if (itinerarioExpandidoId === id) setItinerarioExpandidoId(null);
      toast.mostrar(t('rut_toast_eliminado'), 'info');
    } catch (e: any) {
      if (__DEV__) console.error('Error eliminando itinerario:', e);
      toast.mostrar(e?.message ?? (t('error_eliminar_viaje') || 'No se pudo eliminar el itinerario'), 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [confirmarBorrado, itinerarioExpandidoId, t, toast, usuarioId]);

  // ─── Duplicar itinerario ──────────────────────────────────────────────────
  const duplicar = useCallback(async (itinerario: Itinerario) => {
    if (!usuarioId || guardandoAccion) return;
    setGuardandoAccion(true);
    try {
      const actualizados = await duplicarItinerario(usuarioId, itinerario.id, `${itinerario.nombre} (copia)`);
      setItinerarios(actualizados);
      toast.mostrar(t('rut_toast_duplicado'), 'success');
    } catch (e) {
      if (__DEV__) console.error('Error duplicando itinerario:', e);
      toast.mostrar(t('error_duplicar_viaje') || 'No se pudo duplicar el itinerario', 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [guardandoAccion, t, toast, usuarioId]);

  // ─── Compartir itinerario ─────────────────────────────────────────────────
  const compartir = useCallback(async (
    itinerario: { nombre: string; destinos: { titulo: string; estado: string }[]; diasEstimados: number; totalEstimado: number }
  ) => {
    const lineas = [
      t('rut_comp_titulo', { nombre: itinerario.nombre }),
      '',
      ...itinerario.destinos.map((d, i) => `${i + 1}. ${d.titulo} (${d.estado})`),
      '',
      t('rut_comp_duracion2', { n: String(itinerario.diasEstimados) }),
      t('rut_comp_costo2', { c: itinerario.totalEstimado.toLocaleString('es-MX') }),
      '',
      t('rut_comp_footer'),
    ];
    try {
      await Share.share({ message: lineas.join('\n') });
    } catch { /* usuario canceló */ }
  }, [t]);

  // ─── Quitar / agregar destinos ────────────────────────────────────────────
  const quitarDestinoDeItinerario = useCallback(async (itinerarioId: number, clave: string) => {
    if (!usuarioId || guardandoAccion) return;
    setGuardandoAccion(true);
    try {
      const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
      setItinerarios(actualizados);
    } catch (e) {
      if (__DEV__) console.error('Error quitando destino:', e);
      toast.mostrar(t('error_quitar_destino') || 'No se pudo quitar el destino', 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [usuarioId, guardandoAccion]);

  const agregarDestinoAItinerario = useCallback(async (
    itinerarioId: number,
    estadoNombre: string,
    nivel: 'economico' | 'medio' | 'premium',
  ) => {
    if (!usuarioId || guardandoAccion) return;
    const clave = generarClaveRuta(estadoNombre, nivel);
    setGuardandoAccion(true);
    try {
      const actualizados = await alternarDestinoItinerario(usuarioId, itinerarioId, clave);
      setItinerarios(actualizados);
      setModalAgregarDestino(null);
      setBusquedaModal('');
      toast.mostrar(t('rut_toast_agregado') || 'Destino agregado', 'success');
    } catch (e) {
      if (__DEV__) console.error('Error agregando destino:', e);
      toast.mostrar(t('error_agregar_destino') || 'No se pudo agregar el destino', 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [usuarioId, guardandoAccion]);

  // ─── Reordenar destinos (↑ / ↓) ──────────────────────────────────────────
  const moverDestino = useCallback(async (
    itinerarioId: number,
    items: string[],
    index: number,
    direccion: 'up' | 'down',
  ) => {
    if (!usuarioId || guardandoAccion) return;
    const nuevoIndex = direccion === 'up' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= items.length) return;
    const nuevas = [...items];
    [nuevas[index], nuevas[nuevoIndex]] = [nuevas[nuevoIndex], nuevas[index]];
    setGuardandoAccion(true);
    try {
      const actualizados = await reordenarItinerarioItems(usuarioId, itinerarioId, nuevas);
      if (actualizados.length > 0) setItinerarios(actualizados);
    } catch (e) {
      if (__DEV__) console.error('Error reordenando destinos:', e);
      toast.mostrar(t('error_reordenar') || 'No se pudo reordenar los destinos', 'error');
    } finally {
      setGuardandoAccion(false);
    }
  }, [usuarioId, guardandoAccion]);

  // ─── Helpers de navegación y UI ──────────────────────────────────────────
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
    if (nivel === 'premium')   return t('rut_premium');
    return t('rut_medio');
  }, [t]);

  const cambiarTabItinerario = useCallback((itinerarioId: number, tab: 'destinos' | 'mapa') => {
    setTabPorItinerario(prev => ({ ...prev, [itinerarioId]: tab }));
  }, []);

  // ─── Datos del modal de agregar destino ──────────────────────────────────
  const itinerarioActivoParaAgregar = useMemo(() => {
    if (!modalAgregarDestino) return null;
    return itinerariosResumen.find(it => it.id === modalAgregarDestino.itinerarioId) ?? null;
  }, [modalAgregarDestino, itinerariosResumen]);

  // Calculado una sola vez fuera del map del modal
  const clavesYaIncluidas = useMemo(() =>
    new Set(itinerarioActivoParaAgregar?.destinos.map(d => d.clave) ?? []),
  [itinerarioActivoParaAgregar]);

  const estadosFiltradosModal = useMemo(() => {
    const q = busquedaModal.trim().toLowerCase();
    if (!q) return TODOS_LOS_ESTADOS;
    return TODOS_LOS_ESTADOS.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.categoria.toLowerCase().includes(q)
    );
  }, [busquedaModal]);

  const sinResultadosEnModal = estadosFiltradosModal.length === 0;
  const todosYaAgregadosEnModal = useMemo(() => {
    if (sinResultadosEnModal) return false;
    const niveles: ('economico' | 'medio' | 'premium')[] = ['economico', 'medio', 'premium'];
    return estadosFiltradosModal.every(estado =>
      niveles.every(n => clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n)))
    );
  }, [sinResultadosEnModal, estadosFiltradosModal, clavesYaIncluidas]);

  const cerrarModal = useCallback(() => {
    setModalAgregarDestino(null);
    setBusquedaModal('');
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (cargandoPantalla) {
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
            removeClippedSubviews={true}
          >
            {/* ── Hero "Mis viajes" ── */}
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
                      maxLength={60}
                      style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
                    />
                    {nuevoNombre.trim().length > 0 && nuevoNombre.trim().length < 3 && (
                      <Text style={es.inputHint}>Mínimo 3 caracteres</Text>
                    )}
                    <View style={es.creacionInlineBtns}>
                      <TouchableOpacity
                        style={[es.btnInlineCancelar, { borderColor: tema.borde }]}
                        onPress={() => { setCreandoNuevo(false); setNuevoNombre(''); }}
                        disabled={guardandoAccion}
                        activeOpacity={0.85}
                      >
                        <Text style={[es.btnInlineCancelarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnInlineCrear, { backgroundColor: tema.primario },
                          (nuevoNombre.trim().length < 3 || guardandoAccion) && es.modalBtnDisabled]}
                        onPress={crearNuevoItinerario}
                        disabled={nuevoNombre.trim().length < 3 || guardandoAccion}
                        activeOpacity={0.85}
                      >
                        <Text style={es.btnInlineCrearTxt}>
                          {guardandoAccion ? 'Creando…' : t('rut_crear_viaje')}
                        </Text>
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

            {/* ── Estado vacío: sin sesión ── */}
            {!usuarioId ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={es.estadoVacioIcono}>🗺️</Text>
                <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sesion_requerida')}</Text>
                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>
                  {t('rut_sesion_msg') || 'Inicia sesión para crear itinerarios, marcar favoritos y ver tu ruta en el mapa.'}
                </Text>
                <TouchableOpacity
                  style={[es.btnExplorar, { borderColor: tema.primario }]}
                  onPress={() => router.push(RUTAS_APP.PERFIL as never)}
                  activeOpacity={0.85}
                >
                  <Text style={[es.btnExplorarTxt, { color: tema.primario }]}>{t('rut_ir')}</Text>
                </TouchableOpacity>
              </View>

            /* ── Estado vacío: sin itinerarios ── */
            ) : itinerariosResumen.length === 0 ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={es.estadoVacioIcono}>✈️</Text>
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

            /* ── Lista de itinerarios ── */
            ) : (
              itinerariosResumen.map(itinerario => {
                const expandido  = itinerarioExpandidoId === itinerario.id;
                const tabActivo  = tabPorItinerario[itinerario.id] ?? 'destinos';
                const polylineCoords = itinerario.destinos
                  .filter(d => d.latitude != null && d.longitude != null)
                  .map(d => ({ latitude: d.latitude!, longitude: d.longitude! }));
                const todasSinCoordenadas =
                  itinerario.destinos.length > 0 && polylineCoords.length === 0;

                return (
                  <View
                    key={itinerario.id}
                    style={[es.itinerarioCard, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}
                  >
                    {/* ─ Header: nombre + presupuesto ─ */}
                    <View style={es.itinerarioHeader}>
                      <View style={{ flex: 1 }}>
                        {editandoId === itinerario.id ? (
                          <View style={es.edicionInline}>
                            <TextInput
                              value={nombreEditado}
                              onChangeText={setNombreEditado}
                              autoFocus
                              maxLength={60}
                              editable={!guardandoAccion}
                              style={[es.edicionInput, { backgroundColor: tema.superficie, borderColor: tema.primario, color: tema.texto }]}
                              onSubmitEditing={() => confirmarEdicion(itinerario.id)}
                              returnKeyType="done"
                            />
                            <View style={es.edicionBtns}>
                              <TouchableOpacity
                                style={[es.edicionBtnGuardar, { backgroundColor: tema.primario },
                                  (!nombreEditado.trim() || guardandoAccion) && es.btnDisabled]}
                                onPress={() => confirmarEdicion(itinerario.id)}
                                disabled={!nombreEditado.trim() || guardandoAccion}
                                activeOpacity={0.85}
                              >
                                <Text style={es.edicionBtnGuardarTxt}>{guardandoAccion ? '…' : '✓'}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[es.edicionBtnCancelar, { borderColor: tema.borde }]}
                                onPress={cancelarEdicion}
                                disabled={guardandoAccion}
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
                          {itinerario.totalDestinos} {t(itinerario.totalDestinos === 1 ? 'rut_destino' : 'rut_destinos')}
                          {' · '}
                          {itinerario.diasEstimados} {t(itinerario.diasEstimados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                        </Text>
                      </View>
                      <View style={[es.itinerarioTotal, { backgroundColor: tema.primarioSuave }]}>
                        <Text style={[es.itinerarioTotalLabel, { color: tema.primario }]}>{t('rut_presupuesto')}</Text>
                        <Text style={[es.itinerarioTotalValor, { color: tema.texto }]}>
                          ${itinerario.totalEstimado.toLocaleString('es-MX')} MXN
                        </Text>
                      </View>
                    </View>

                    {/* ─ Chips de preview ─ */}
                    <View style={es.destinosPreview}>
                      {itinerario.destinos.slice(0, 3).map(destino => (
                        <View
                          key={destino.clave}
                          style={[es.destinoPreviewChip, { backgroundColor: `${destino.color}18`, borderColor: `${destino.color}55` }]}
                        >
                          <Text style={[es.destinoPreviewTxt, { color: destino.color }]}>{destino.estado}</Text>
                        </View>
                      ))}
                      {itinerario.totalDestinos > 3 && (
                        <View style={[es.destinoPreviewChip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <Text style={[es.destinoPreviewTxt, { color: tema.textoMuted }]}>+{itinerario.totalDestinos - 3}</Text>
                        </View>
                      )}
                      {itinerario.totalDestinos === 0 && (
                        <View style={[es.destinoPreviewChip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          <Text style={[es.destinoPreviewTxt, { color: tema.textoMuted }]}>{t('rut_sin_destinos_aun')}</Text>
                        </View>
                      )}
                    </View>

                    {/* ─ Acciones de la tarjeta ─ */}
                    <View style={es.itinerarioAcciones}>
                      <TouchableOpacity
                        style={[es.btnSecundario, { borderColor: tema.borde }]}
                        onPress={() => setItinerarioExpandidoId(expandido ? null : itinerario.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={[es.btnSecundarioTxt, { color: tema.texto }]}>
                          {expandido
                            ? t('rut_cancelar')
                            : itinerario.totalDestinos > 0
                              ? t('rut_ver_itinerario')
                              : 'Agregar destinos'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnIcono, { borderColor: tema.borde }, guardandoAccion && es.btnDisabled]}
                        onPress={() => duplicar(itinerario)}
                        disabled={guardandoAccion}
                        activeOpacity={0.85}
                        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                      >
                        <Text style={[es.btnIconoTxt, { color: tema.textoMuted }]}>⧉</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnIcono, { borderColor: tema.borde }]}
                        onPress={() => compartir(itinerario)}
                        activeOpacity={0.85}
                        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                      >
                        <Text style={[es.btnIconoTxt, { color: tema.textoMuted }]}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnEliminar, guardandoAccion && es.btnDisabled]}
                        onPress={() => borrarItinerario(itinerario)}
                        disabled={guardandoAccion}
                        activeOpacity={0.85}
                      >
                        <Text style={es.btnEliminarTxt}>{t('rut_eliminar')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* ─ Detalle expandido ─ */}
                    {expandido && (
                      <View style={[es.itinerarioDetalle, { borderTopColor: tema.borde }]}>
                        {/* Tabs Destinos / Mapa */}
                        <View style={[es.tabsItinerario, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                          {(['destinos', 'mapa'] as const).map(tab => (
                            <TouchableOpacity
                              key={tab}
                              style={[es.tabItinerarioBtn, tabActivo === tab && { backgroundColor: tema.primario }]}
                              onPress={() => cambiarTabItinerario(itinerario.id, tab)}
                              activeOpacity={0.85}
                            >
                              <Text style={[es.tabItinerarioBtnTxt, { color: tabActivo === tab ? '#fff' : tema.textoMuted }]}>
                                {tab === 'destinos'
                                  ? `📍 ${t('rut_destinos_tab') || 'Destinos'}`
                                  : `🗺️ ${t('rut_mapa_tab') || 'Mapa'}`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* ── Tab Destinos ── */}
                        {tabActivo === 'destinos' ? (
                          <View>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.destinoFilaVacia, { backgroundColor: tema.superficie }]}>
                                <Text style={[es.destinoTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                                <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                              </View>
                            ) : (
                              itinerario.destinos.map((destino, index) => {
                                const esPrimero = index === 0;
                                const esUltimo  = index === itinerario.destinos.length - 1;
                                const colorBadge = esPrimero ? '#3AB7A5' : esUltimo ? '#DD331D' : destino.color;
                                const etiqueta   = esPrimero ? 'Inicio' : esUltimo ? 'Final' : `Parada ${index + 1}`;

                                return (
                                  <View key={destino.clave} style={es.destinoTimelineRow}>
                                    {/* Línea vertical + índice */}
                                    <View style={es.destinoTimelineLeft}>
                                      <View style={[es.destinoIndice, { backgroundColor: colorBadge }]}>
                                        <Text style={es.destinoIndiceTxt}>{index + 1}</Text>
                                      </View>
                                      {!esUltimo && <View style={[es.timelineLine, { backgroundColor: tema.borde }]} />}
                                    </View>

                                    {/* Tarjeta del destino */}
                                    <View style={[es.destinoFilaContenido, { backgroundColor: tema.superficie }]}>
                                      <Text style={[es.etiquetaParada, { color: colorBadge }]}>{etiqueta}</Text>

                                      <TouchableOpacity
                                        onPress={() => abrirDetalleDesdeClave(destino.clave)}
                                        activeOpacity={0.85}
                                      >
                                        <Text style={[es.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                                        <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>
                                          {destino.estado} · {obtenerEtiquetaNivel(destino.nivel)} · {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                                        </Text>
                                        <View style={es.destinoPrecioFila}>
                                          <Text style={[es.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                                          {!destino.tieneCoordenadas && (
                                            <View style={[es.sinUbicacionBadge, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
                                              <Text style={[es.sinUbicacionTxt, { color: tema.textoMuted }]}>sin ubicación en mapa</Text>
                                            </View>
                                          )}
                                        </View>
                                      </TouchableOpacity>

                                      {/* Controles: reordenar + quitar */}
                                      <View style={es.destinoControles}>
                                        <View style={es.reordenarBtns}>
                                          <TouchableOpacity
                                            style={[es.reordenarBtn, (esPrimero || guardandoAccion) && es.btnDisabled]}
                                            onPress={() => moverDestino(itinerario.id, itinerario.items ?? [], index, 'up')}
                                            disabled={esPrimero || guardandoAccion}
                                            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                                          >
                                            <Text style={[es.reordenarBtnTxt, { color: esPrimero ? tema.textoMuted : tema.texto }]}>↑</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={[es.reordenarBtn, (esUltimo || guardandoAccion) && es.btnDisabled]}
                                            onPress={() => moverDestino(itinerario.id, itinerario.items ?? [], index, 'down')}
                                            disabled={esUltimo || guardandoAccion}
                                            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                                          >
                                            <Text style={[es.reordenarBtnTxt, { color: esUltimo ? tema.textoMuted : tema.texto }]}>↓</Text>
                                          </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                          style={[es.destinoQuitar, guardandoAccion && es.btnDisabled]}
                                          onPress={() => quitarDestinoDeItinerario(itinerario.id, destino.clave)}
                                          disabled={guardandoAccion}
                                          activeOpacity={0.7}
                                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                        >
                                          <Text style={es.destinoQuitarTxt}>✕</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })
                            )}

                            <TouchableOpacity
                              style={[es.btnAgregarDestino, { borderColor: tema.primario }, guardandoAccion && es.btnDisabled]}
                              onPress={() => setModalAgregarDestino({ itinerarioId: itinerario.id })}
                              disabled={guardandoAccion}
                              activeOpacity={0.85}
                            >
                              <Text style={[es.btnAgregarDestinoTxt, { color: tema.primario }]}>
                                {'+ '}
                                {itinerario.totalDestinos > 0
                                  ? t('rut_agregar_destino_mas') || 'Añadir siguiente parada'
                                  : t('rut_agregar_destino')    || 'Agregar primer destino'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                        /* ── Tab Mapa ── */
                        ) : (
                          <View style={[es.mapaContenedor, { borderColor: tema.borde }]}>
                            {itinerario.destinos.length === 0 ? (
                              <View style={[es.mapaVacio, { backgroundColor: tema.superficie }]}>
                                <Text style={es.estadoVacioIcono}>🗺️</Text>
                                <Text style={[es.estadoVacioTitulo, { color: tema.texto, fontSize: 14 }]}>
                                  {t('rut_mapa_vacio_titulo') || 'Sin destinos'}
                                </Text>
                                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario, fontSize: 12, marginBottom: 12 }]}>
                                  {t('rut_mapa_vacio_msg') || 'Agrega destinos para ver tu ruta en el mapa.'}
                                </Text>
                                <TouchableOpacity
                                  style={[es.btnExplorar, { borderColor: tema.primario }]}
                                  onPress={() => {
                                    cambiarTabItinerario(itinerario.id, 'destinos');
                                    setModalAgregarDestino({ itinerarioId: itinerario.id });
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <Text style={[es.btnExplorarTxt, { color: tema.primario }]}>+ Agregar primer destino</Text>
                                </TouchableOpacity>
                              </View>
                            ) : todasSinCoordenadas ? (
                              <View style={[es.mapaVacio, { backgroundColor: tema.superficie }]}>
                                <Text style={es.estadoVacioIcono}>📍</Text>
                                <Text style={[es.estadoVacioTitulo, { color: tema.texto, fontSize: 14 }]}>Sin coordenadas</Text>
                                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario, fontSize: 12 }]}>
                                  Ninguno de tus destinos actuales tiene coordenadas disponibles en el mapa.
                                </Text>
                              </View>
                            ) : (
                              <>
                                {/* Franja de resumen encima del mapa */}
                                <View style={[es.mapaResumen, { backgroundColor: tema.primarioSuave }]}>
                                  <Text style={[es.mapaResumenTxt, { color: tema.primario }]}>
                                    {polylineCoords.length} {polylineCoords.length === 1 ? 'parada' : 'paradas'}
                                    {itinerario.diasEstimados > 0 ? `  ·  ${itinerario.diasEstimados} días` : ''}
                                    {itinerario.totalEstimado > 0 ? `  ·  $${itinerario.totalEstimado.toLocaleString('es-MX')} MXN` : ''}
                                  </Text>
                                </View>
                                <View style={{ height: 360 }}>
                                  <MapaRutas
                                    rutaColor={COLOR_RUTA}
                                    rutaNombre={itinerario.nombre}
                                    estadosRuta={itinerario.destinos
                                      .map(d => d.estadoCompleto)
                                      .filter((e): e is Estado => e != null)}
                                    numerosEstados={itinerario.destinos
                                      .map((d, i) => d.estadoCompleto != null ? i + 1 : null)
                                      .filter((n): n is number => n != null)}
                                    polylineCoords={polylineCoords}
                                    favoritos={favoritos}
                                    isDark={isDark}
                                    tema={tema as unknown as Record<string, string>}
                                    onToggleFav={toggleFavorito}
                                    onIrADetalle={irADetalle}
                                  />
                                </View>
                              </>
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

      {/* ══ Modal: confirmar borrado ══ */}
      <Modal
        visible={!!confirmarBorrado}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmarBorrado(null)}
      >
        <View style={es.modalOverlay}>
          <View style={[es.modalCard, { backgroundColor: tema.superficieBlanca }]}>
            <Text style={[es.modalTitulo, { color: tema.texto }]}>{t('rut_eliminar_viaje')}</Text>
            <Text style={[es.modalSubtitulo, { color: tema.textoSecundario }]}>
              {t('rut_confirmar_borrar', { nombre: confirmarBorrado?.nombre ?? '' })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[es.btnInlineCancelar, { flex: 1, borderColor: tema.borde }]}
                onPress={() => setConfirmarBorrado(null)}
                activeOpacity={0.85}
              >
                <Text style={[es.btnInlineCancelarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[es.btnEliminarModal, { flex: 1 }]}
                onPress={ejecutarBorrado}
                activeOpacity={0.85}
              >
                <Text style={es.btnEliminarModalTxt}>{t('rut_eliminar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: agregar destino al itinerario ══ */}
      <Modal
        visible={!!modalAgregarDestino}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <View style={es.modalOverlay}>
          <View style={[es.modalCard, { backgroundColor: tema.superficieBlanca, maxHeight: '85%' }]}>
            <Text style={[es.modalTitulo, { color: tema.texto }]}>
              {t('rut_agregar_destino_titulo') || 'Agregar destino'}
            </Text>
            <Text style={[es.modalSubtitulo, { color: tema.textoSecundario }]}>
              {t('rut_agregar_destino_sub') || 'Elige un estado y un nivel de paquete.'}
            </Text>

            {/* Buscador */}
            <TextInput
              value={busquedaModal}
              onChangeText={setBusquedaModal}
              placeholder="Buscar destino…"
              placeholderTextColor={tema.textoMuted}
              style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto, marginBottom: 10 }]}
            />

            <FlatList
              data={estadosFiltradosModal}
              keyExtractor={item => String(item.id)}
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: estado }) => {
                const niveles: ('economico' | 'medio' | 'premium')[] = ['economico', 'medio', 'premium'];
                const nivelesDisponibles = niveles.filter(
                  n => !clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n))
                );
                if (nivelesDisponibles.length === 0) return null;
                return (
                  <View
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
                            guardandoAccion && es.btnDisabled,
                          ]}
                          onPress={() => modalAgregarDestino && agregarDestinoAItinerario(modalAgregarDestino.itinerarioId, estado.nombre, nivel)}
                          disabled={guardandoAccion}
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
              }}
              ListEmptyComponent={sinResultadosEnModal ? (
                <Text style={[es.modalSubtitulo, { textAlign: 'center', marginTop: 16, color: tema.textoSecundario }]}>
                  Sin resultados para esa búsqueda.
                </Text>
              ) : null}
              ListFooterComponent={todosYaAgregadosEnModal ? (
                <Text style={[es.modalSubtitulo, { textAlign: 'center', marginTop: 16, color: tema.textoSecundario }]}>
                  {busquedaModal.trim()
                    ? 'Ya tienes todos los destinos que coinciden con esa búsqueda.'
                    : 'Ya agregaste todos los destinos disponibles.'}
                </Text>
              ) : null}
            />

            <TouchableOpacity
              style={es.modalBtnCerrar}
              onPress={cerrarModal}
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
  misRutasScroll:      { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 10, gap: 12 },

  // Hero
  heroMisViajes:       { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  heroMisViajesTitulo: { fontSize: 21, fontWeight: '900', marginBottom: 6 },
  heroMisViajesSubtitulo: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  btnCrearViaje:       { borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnCrearViajeTxt:    { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Creación inline
  creacionInline:      { gap: 10 },
  inputInline:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  inputHint:           { fontSize: 11, color: '#DD331D', marginTop: -6 },
  creacionInlineBtns:  { flexDirection: 'row', gap: 10 },
  btnInlineCancelar:   { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCancelarTxt:{ fontSize: 13, fontWeight: '800' },
  btnInlineCrear:      { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnInlineCrearTxt:   { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Estado vacío
  estadoVacio:         { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center' },
  estadoVacioIcono:    { fontSize: 32, marginBottom: 10 },
  estadoVacioTitulo:   { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  estadoVacioTexto:    { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  btnExplorar:         { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11 },
  btnExplorarTxt:      { fontSize: 13, fontWeight: '800' },

  // Tarjeta de itinerario
  itinerarioCard:      { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  itinerarioHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  itinerarioNombre:    { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  itinerarioMeta:      { fontSize: 12, fontWeight: '600' },
  itinerarioTotal:     { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120 },
  itinerarioTotalLabel:{ fontSize: 10, fontWeight: '800', marginBottom: 2 },
  itinerarioTotalValor:{ fontSize: 13, fontWeight: '800' },
  destinosPreview:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  destinoPreviewChip:  { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  destinoPreviewTxt:   { fontSize: 12, fontWeight: '700' },
  itinerarioAcciones:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnSecundario:       { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnSecundarioTxt:    { fontSize: 13, fontWeight: '800' },
  btnIcono:            { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnIconoTxt:         { fontSize: 16, fontWeight: '700' },
  btnEliminar:         { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFECEB' },
  btnEliminarTxt:      { fontSize: 13, fontWeight: '800', color: '#DD331D' },
  btnEliminarModal:    { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', backgroundColor: '#DD331D' },
  btnEliminarModalTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  itinerarioDetalle:   { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },

  // Tabs
  tabsItinerario:      { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tabItinerarioBtn:    { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tabItinerarioBtnTxt: { fontSize: 13, fontWeight: '800' },

  // Timeline de destinos
  destinoTimelineRow:    { flexDirection: 'row', gap: 10, marginBottom: 10 },
  destinoTimelineLeft:   { alignItems: 'center', width: 28 },
  timelineLine:          { width: 2, flex: 1, minHeight: 16, marginTop: 4 },
  destinoFilaContenido:  { flex: 1, borderRadius: 14, padding: 12 },
  destinoFilaVacia:      { borderRadius: 14, padding: 12, marginBottom: 10 },
  etiquetaParada:        { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  destinoIndice:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoIndiceTxt:      { color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:         { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  destinoDescripcion:    { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  destinoPrecioFila:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  destinoPrecio:         { fontSize: 12, fontWeight: '800' },
  sinUbicacionBadge:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  sinUbicacionTxt:       { fontSize: 9, fontWeight: '600' },
  destinoControles:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  reordenarBtns:         { flexDirection: 'row', gap: 4 },
  reordenarBtn:          { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reordenarBtnTxt:       { fontSize: 16, fontWeight: '800' },
  destinoQuitar:         { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFECEB', alignItems: 'center', justifyContent: 'center' },
  destinoQuitarTxt:      { color: '#DD331D', fontSize: 14, fontWeight: '800' },

  // Botón agregar destino
  btnAgregarDestino:     { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAgregarDestinoTxt:  { fontSize: 13, fontWeight: '800' },

  // Mapa
  mapaContenedor:        { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:             { padding: 28, alignItems: 'center', justifyContent: 'center' },
  mapaResumen:           { paddingVertical: 10, paddingHorizontal: 14 },
  mapaResumenTxt:        { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Modal agregar destino
  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:             { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  modalTitulo:           { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSubtitulo:        { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  modalBtnDisabled:      { opacity: 0.45 },
  modalBtnCerrar:        { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnCerrarTxt:     { fontSize: 13, fontWeight: '700' },

  // Edición inline de nombre
  nombreFila:            { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  iconoEditar:           { fontSize: 13 },
  edicionInline:         { gap: 8, marginBottom: 4 },
  edicionInput:          { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '800' },
  edicionBtns:           { flexDirection: 'row', gap: 8 },
  edicionBtnGuardar:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edicionBtnGuardarTxt:  { color: '#fff', fontSize: 16, fontWeight: '900' },
  edicionBtnCancelar:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  edicionBtnCancelarTxt: { fontSize: 14, fontWeight: '800' },
  btnDisabled:           { opacity: 0.4 },

  // Picker de estados
  estadoPickerFila:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  estadoPickerNombre:    { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  estadoPickerCategoria: { fontSize: 11, fontWeight: '600' },
  estadoPickerNiveles:   { flexDirection: 'row', gap: 6 },
  estadoPickerNivelBtn:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  estadoPickerNivelTxt:  { fontSize: 11, fontWeight: '800' },
});
