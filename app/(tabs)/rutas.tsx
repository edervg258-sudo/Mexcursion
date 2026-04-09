import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Image as ExpoImage } from 'expo-image';
import { Href, router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, ImageSourcePropType,
  Platform, ScrollView, Share,
  Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';

import { ModalAgregarSugerencia }  from '../../components/Rutas/ModalAgregarSugerencia';
import { ModalDetalleSugerencia }  from '../../components/Rutas/ModalDetalleSugerencia';
import { ModalNuevoItinerario }    from '../../components/Rutas/ModalNuevoItinerario';
import { VistaDetalleItinerario }  from '../../components/Rutas/VistaDetalleItinerario';
import { TabChrome }               from '../../components/TabChrome';
import {
  COLORES_NIVEL, Nivel, PAQUETES_POR_ESTADO,
  SUGERENCIAS_RUTAS, TODOS_LOS_ESTADOS, parsearClaveRuta,
} from '../../lib/constantes';
import { s } from '../../lib/estilos_rutas';
import { useIdioma } from '../../lib/IdiomaContext';
import { SkeletonFilas } from './skeletonloader';
import {
  Itinerario,
  alternarDestinoItinerario,
  crearItinerario,
  eliminarItinerario,
  obtenerItinerarios,
  obtenerRutasSugeridas,
  obtenerUsuarioActivo,
  reordenarItinerarioItems,
} from '../../lib/supabase-db';

// ─────────────────────────────────────────────────────────────────────────────
//  Util: color de nivel con opacidad
// ─────────────────────────────────────────────────────────────────────────────
const colorNivel = (nivel: string, opacity = 1) => {
  const base = COLORES_NIVEL[nivel as Nivel] ?? '#888';
  if (opacity === 1) return base;
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const { width } = useWindowDimensions();
  const esPC      = width >= 768;
  const { t, idioma } = useIdioma();

  const [usuarioId,         setUsuarioId]         = useState<string | null>(null);
  const [itinerarios,       setItinerarios]        = useState<Itinerario[]>([]);
  const [rutasSugeridas,    setRutasSugeridas]     = useState<any[]>([]);
  const [cargando,          setCargando]           = useState(true);
  const [itinerarioActivo,  setItinerarioActivo]   = useState<Itinerario | null>(null);

  // Modales
  const [modalNuevoVisible, setModalNuevoVisible]  = useState(false);
  const [nuevoNombre,       setNuevoNombre]        = useState('');
  const [modalRutaVisible,  setModalRutaVisible]   = useState(false);
  const [rutaDetalle,       setRutaDetalle]        = useState<any | null>(null);
  const [modalItiVisible,   setModalItiVisible]    = useState(false);
  const [nuevoNombreIti,    setNuevoNombreIti]     = useState('');
  const [claveParaAgregar,  setClaveParaAgregar]   = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Android navigation bar ─────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('visible');
    NavigationBar.setButtonStyleAsync('dark');
  }, []);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      fadeAnim.setValue(0);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        Alert.alert(
          t('rut_sesion_requerida'),
          t('rut_sesion_msg'),
          [{ text: t('rut_ir'), onPress: () => router.replace('/login' as Href) }],
        );
        return;
      }
      setUsuarioId(usuario.id);
      const [itis, sg] = await Promise.all([
        obtenerItinerarios(usuario.id),
        obtenerRutasSugeridas(),
      ]);
      setItinerarios(itis);
      setRutasSugeridas(sg.length > 0 ? sg : SUGERENCIAS_RUTAS.map(r => ({ ...r, activo: 1 })));
      setCargando(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    };
    cargar();
  }, []));

  // ── Helpers ────────────────────────────────────────────────────────────────
  const imagenDeEstado = useCallback((estado: string): ImageSourcePropType =>
    TODOS_LOS_ESTADOS.find(e => e.nombre === estado)?.imagen
    ?? require('../../assets/images/mapa.png'), []);

  const calcularTotales = useCallback((items: any[]) => {
    let costoTotal = 0, diasTotales = 0;
    items.forEach(({ estado, nivel }) => {
      const paqL = PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO['default'];
      const paq  = paqL?.find((p: any) => p.nivel === nivel) ?? paqL?.[0];
      if (paq) {
        costoTotal  += parseInt(paq.precioTotal.replace(/[^0-9]/g, ''), 10) || 0;
        diasTotales += paq.diasRecomendados;
      }
    });
    return { costoTotal, diasTotales };
  }, []);

  // ── Acciones: itinerarios ──────────────────────────────────────────────────
  const handleCrearItinerario = async () => {
    if (!usuarioId || !nuevoNombre.trim()) return;
    const res = await crearItinerario(usuarioId, nuevoNombre.trim());
    setItinerarios(res);
    setNuevoNombre('');
    setModalNuevoVisible(false);
  };

  const handleEliminarItinerario = (id: number) => {
    Alert.alert(t('rut_eliminar_viaje_titulo'), t('rut_eliminar_viaje_msg'), [
      { text: t('rut_cancelar'), style: 'cancel' },
      { text: t('rut_eliminar'), style: 'destructive', onPress: async () => {
        if (!usuarioId) return;
        const res = await eliminarItinerario(usuarioId, id);
        setItinerarios(res);
        if (itinerarioActivo?.id === id) setItinerarioActivo(null);
      }},
    ]);
  };

  const handleQuitarItem = async (clave: string) => {
    if (!usuarioId || !itinerarioActivo) return;
    const itis = await alternarDestinoItinerario(usuarioId, itinerarioActivo.id, clave);
    setItinerarios(itis);
    setItinerarioActivo(itis.find(i => i.id === itinerarioActivo.id) ?? null);
  };

  const moverItem = async (idx: number, dir: -1 | 1) => {
    if (!usuarioId || !itinerarioActivo?.items) return;
    const arr = [...itinerarioActivo.items];
    const [item] = arr.splice(idx, 1);
    arr.splice(idx + dir, 0, item);
    const itis = await reordenarItinerarioItems(usuarioId, itinerarioActivo.id, arr);
    setItinerarios(itis);
    setItinerarioActivo(itis.find(i => i.id === itinerarioActivo.id) ?? null);
  };

  const compartirItinerario = async (items: any[], nombre: string) => {
    const { costoTotal, diasTotales } = calcularTotales(items);
    let msg = `🗺️ *${t('rut_mis_viajes')}: ${nombre}*\n\n`;
    items.forEach((it, i) => {
      msg += `${i + 1}. ${it.titulo} (${t(('rut_' + it.nivel) as any)})\n`;
    });
    msg += `\n⌛ ~${diasTotales} ${t('rut_dia_plural')}\n💰 $${costoTotal.toLocaleString()} MXN\n\n${t('rut_comp_footer')}`;
    try {
      await Share.share({ message: msg, title: nombre });
    } catch (e) {
      console.warn('[compartirItinerario]', e);
    }
  };

  // ── Acciones: rutas sugeridas ──────────────────────────────────────────────
  const abrirDetalleSugerida = (item: any) => {
    setRutaDetalle(item);
    setModalRutaVisible(true);
  };

  const iniciarAgregarSugerida = (item: any) => {
    setClaveParaAgregar(`${item.estado}|${item.nivel}`);
    setModalRutaVisible(false);
    setModalItiVisible(true);
  };

  const agregarSugeridaAItinerario = async (itiId: number) => {
    if (!usuarioId || !claveParaAgregar) return;
    const res = await alternarDestinoItinerario(usuarioId, itiId, claveParaAgregar);
    setItinerarios(res);
    setModalItiVisible(false);
    setClaveParaAgregar(null);
    Alert.alert('✅', t('rut_toast_agregado_msg'));
  };

  const crearItiYAgregar = async () => {
    if (!usuarioId || !claveParaAgregar || !nuevoNombreIti.trim()) return;
    const nombreBuscado = nuevoNombreIti.trim();
    const nuevos = await crearItinerario(usuarioId, nombreBuscado);
    setItinerarios(nuevos);
    // ✅ Buscar por nombre, no asumir índice 0
    const recien = nuevos.find(i => i.nombre === nombreBuscado) ?? nuevos.at(-1);
    if (recien) {
      const res = await alternarDestinoItinerario(usuarioId, recien.id, claveParaAgregar);
      setItinerarios(res);
    }
    setNuevoNombreIti('');
    setModalItiVisible(false);
    setClaveParaAgregar(null);
    Alert.alert('✅', t('rut_toast_creado_agr_msg'));
  };

  // ── Vista detalle itinerario ───────────────────────────────────────────────
  if (itinerarioActivo) {
    const items = (itinerarioActivo.items ?? []).map(clave => {
      const sg = rutasSugeridas.find(r => String(r.id) === clave);
      if (sg) return { clave, titulo: sg.titulo, estado: sg.estado, nivel: sg.nivel };
      const p = parsearClaveRuta(clave);
      return { clave, titulo: p.estado, estado: p.estado, nivel: p.nivel };
    });
    const { costoTotal, diasTotales } = calcularTotales(items);
    const nivelMasUsado = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.nivel] = (acc[it.nivel] ?? 0) + 1;
      return acc;
    }, {});
    const nivelTop = t(('rut_' + (Object.entries(nivelMasUsado).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medio')) as any);

    return (
      <VistaDetalleItinerario
        esPC={esPC}
        itinerarioActivo={itinerarioActivo}
        setItinerarioActivo={setItinerarioActivo}
        items={items}
        costoTotal={costoTotal}
        diasTotales={diasTotales}
        nivelTop={nivelTop}
        compartirItinerario={compartirItinerario}
        handleEliminarItinerario={handleEliminarItinerario}
        handleQuitarItem={handleQuitarItem}
        moverItem={moverItem}
        colorNivel={colorNivel}
        imagenDeEstado={imagenDeEstado}
        t={t}
      />
    );
  }

  // ── Vista de carga ─────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <TabChrome esPC={esPC}>
        <SkeletonFilas cantidad={5} />
      </TabChrome>
    );
  }

  // ── Vista principal ────────────────────────────────────────────────────────
  const sugeridas = rutasSugeridas.filter(r => r.activo !== 0);

  return (
    <TabChrome esPC={esPC}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={s.contenedorScroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.heroBox}>
            <Text style={s.heroTitulo}>{t('rut_mis_viajes_hero')}</Text>
            <Text style={s.heroSub}>{t('rut_mis_viajes_hero_sub')}</Text>
            <TouchableOpacity style={s.heroBtnNuevo} onPress={() => setModalNuevoVisible(true)} activeOpacity={0.85}>
              <Text style={s.heroBtnTxt}>{t('rut_nuevo_viaje_btn')}</Text>
            </TouchableOpacity>
          </View>

          {/* Itinerarios */}
          {itinerarios.length === 0 ? (
            <View style={s.vacioPrincipal}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🗺️</Text>
              <Text style={s.tituloVacioP}>{t('rut_sin_itis_aun')}</Text>
              <Text style={s.subVacioP}>{t('rut_sin_itis_msg')}</Text>
            </View>
          ) : (
            <>
              <View style={s.seccionHead}>
                <Text style={s.seccionTitulo}>{t('rut_mis_itinerarios')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollHorizontal}>
                {itinerarios.map((iti, idx) => {
                  const count   = (iti.items ?? []).length;
                  const ACENTOS = ['#3AB7A5', '#e9c46a', '#DD331D', '#4B7BEC', '#8A2BE2'];
                  const accent  = ACENTOS[idx % ACENTOS.length];
                  return (
                    <TouchableOpacity
                      key={iti.id}
                      style={[s.itiCard, { borderTopColor: accent }]}
                      onPress={() => setItinerarioActivo(iti)}
                      activeOpacity={0.82}
                    >
                      <View style={[s.itiStrip, { backgroundColor: accent }]} />
                      <View style={s.itiCardBody}>
                        <Text style={s.itiNombre} numberOfLines={2}>{iti.nombre}</Text>
                        <Text style={s.itiCount}>
                          {count} {count === 1 ? t('rut_destino') : t('rut_destinos')}
                        </Text>
                        <View style={s.itiImgsRow}>
                          {(iti.items ?? []).slice(0, 3).map((clave, i) => {
                            const { estado } = parsearClaveRuta(clave);
                            return (
                              <ExpoImage
                                key={i}
                                source={imagenDeEstado(estado)}
                                style={[s.itiMiniImg, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                              />
                            );
                          })}
                          {count === 0 && <Text style={s.itiVacioTxt}>{t('rut_sin_destinos_aun')}</Text>}
                        </View>
                        <View style={[s.itiChevron, { backgroundColor: accent + '22' }]}>
                          <Text style={[s.itiChevronTxt, { color: accent }]}>{t('rut_ver_itinerario')} →</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Rutas sugeridas */}
          {sugeridas.length > 0 && (
            <>
              <View style={s.divisor} />
              <View style={s.seccionHead}>
                <Text style={s.seccionTitulo}>{t('rut_sugeridas')}</Text>
                <Text style={s.seccionSub}>{t('rut_inspiracion')}</Text>
              </View>
              <View style={s.gridSugeridas}>
                {sugeridas.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.tarjetaSug}
                    onPress={() => abrirDetalleSugerida(item)}
                    activeOpacity={0.85}
                  >
                    <ExpoImage
                      source={typeof item.imagen === 'string' ? { uri: item.imagen } : imagenDeEstado(item.estado)}
                      style={s.imgSug}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                      recyclingKey={String(item.id)}
                    />
                    <View style={s.gradienteSug} />
                    <View style={[s.badgeNivel, { backgroundColor: colorNivel(item.nivel) }]}>
                      <Text style={s.badgeNivelTxt}>{t(('rut_' + item.nivel) as any)}</Text>
                    </View>
                    <View style={s.infoSug}>
                      <Text style={s.tituloSug} numberOfLines={1}>{item.titulo}</Text>
                      <Text style={s.estadoSug}>{item.estado}</Text>
                      <View style={s.tapHint}>
                        <Text style={s.tapHintTxt}>Ver detalles →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>

      {/* BottomSheets */}
      <ModalNuevoItinerario
        visible={modalNuevoVisible}
        onClose={() => { setModalNuevoVisible(false); setNuevoNombre(''); }}
        nuevoNombre={nuevoNombre}
        setNuevoNombre={setNuevoNombre}
        handleCrearItinerario={handleCrearItinerario}
        t={t}
      />

      <ModalDetalleSugerencia
        visible={modalRutaVisible}
        onClose={() => setModalRutaVisible(false)}
        rutaDetalle={rutaDetalle}
        idioma={idioma}
        t={t}
        colorNivel={colorNivel}
        imagenDeEstado={imagenDeEstado}
        iniciarAgregarSugerida={iniciarAgregarSugerida}
      />

      <ModalAgregarSugerencia
        visible={modalItiVisible}
        onClose={() => setModalItiVisible(false)}
        itinerarios={itinerarios}
        nuevoNombreIti={nuevoNombreIti}
        setNuevoNombreIti={setNuevoNombreIti}
        agregarSugeridaAItinerario={agregarSugeridaAItinerario}
        crearItiYAgregar={crearItiYAgregar}
        t={t}
      />
    </TabChrome>
  );
}
