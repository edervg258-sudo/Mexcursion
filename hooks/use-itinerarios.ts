import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Platform } from 'react-native';
import {
  PAQUETES_POR_ESTADO,
  TODOS_LOS_ESTADOS,
  generarClaveRuta,
  parsearClaveRuta,
  resolverInfoRuta,
} from '../lib/constantes';
import { useIdioma } from '../lib/IdiomaContext';
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
} from '../lib/supabase-db';
import { COLORES_NIVEL, Estado, Nivel } from '../lib/tipos';

const COLOR_RUTA = '#3AB7A5';

const extraerMonto = (precio: string) => {
  const match = String(precio ?? '').replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export type DestinoResumen = {
  clave: string;
  estado: string;
  nivel: string;
  titulo: string;
  precioTotal: string;
  diasRecomendados: number;
  categoria: string;
  descripcion: string;
  color: string;
  latitude: number | undefined;
  longitude: number | undefined;
  estadoCompleto: Estado | undefined;
};

export type ItinerarioResumen = Itinerario & {
  destinos: DestinoResumen[];
  totalDestinos: number;
  diasEstimados: number;
  totalEstimado: number;
};

export function useItinerarios() {
  const { t } = useIdioma();

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [itinerarios, setItinerarios] = useState<Itinerario[]>([]);
  const [itinerarioExpandidoId, setItinerarioExpandidoId] = useState<number | null>(null);
  const [tabPorItinerario, setTabPorItinerario] = useState<Record<number, 'destinos' | 'mapa'>>({});
  const [modalAgregarDestino, setModalAgregarDestino] = useState<{ itinerarioId: number } | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cargando, setCargando] = useState(true);
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

  const itinerariosResumen = useMemo<ItinerarioResumen[]>(() =>
    itinerarios.map(itinerario => {
      const destinos: DestinoResumen[] = (itinerario.items ?? []).map(clave => {
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
          color: paquete?.color ?? COLORES_NIVEL[nivel as Nivel] ?? COLOR_RUTA,
          latitude: estadoEncontrado?.latitude,
          longitude: estadoEncontrado?.longitude,
          estadoCompleto: estadoEncontrado,
        };
      });
      return {
        ...itinerario,
        destinos,
        totalDestinos: destinos.length,
        diasEstimados: destinos.reduce((suma, d) => suma + d.diasRecomendados, 0),
        totalEstimado: destinos.reduce((suma, d) => suma + extraerMonto(d.precioTotal), 0),
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

  const agregarDestinoAItinerario = useCallback(async (
    itinerarioId: number,
    estadoNombre: string,
    nivel: Nivel,
  ) => {
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
    if (nivel === 'economico') { return t('rut_economico'); }
    if (nivel === 'premium') { return t('rut_premium'); }
    return t('rut_medio');
  }, [t]);

  const cambiarTabItinerario = useCallback((itinerarioId: number, tab: 'destinos' | 'mapa') => {
    setTabPorItinerario(prev => ({ ...prev, [itinerarioId]: tab }));
  }, []);

  const itinerarioActivoParaAgregar = useMemo(() => {
    if (!modalAgregarDestino) { return null; }
    return itinerariosResumen.find(it => it.id === modalAgregarDestino.itinerarioId) ?? null;
  }, [modalAgregarDestino, itinerariosResumen]);

  return {
    usuarioId,
    favoritos,
    itinerariosResumen,
    itinerarioExpandidoId,
    setItinerarioExpandidoId,
    tabPorItinerario,
    modalAgregarDestino,
    setModalAgregarDestino,
    creandoNuevo,
    setCreandoNuevo,
    nuevoNombre,
    setNuevoNombre,
    editandoId,
    nombreEditado,
    setNombreEditado,
    cargando,
    fadeAnim,
    itinerarioActivoParaAgregar,
    toggleFavorito,
    irADetalle,
    crearNuevoItinerario,
    iniciarEdicion,
    confirmarEdicion,
    cancelarEdicion,
    borrarItinerario,
    quitarDestinoDeItinerario,
    agregarDestinoAItinerario,
    abrirDetalleDesdeClave,
    obtenerEtiquetaNivel,
    cambiarTabItinerario,
  };
}
