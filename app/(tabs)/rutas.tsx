import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Href, router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, Image, ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORES_NIVEL, ETIQUETA_NIVEL, Nivel, PAQUETES_POR_ESTADO,
  PESTANAS, SUGERENCIAS_RUTAS, TODOS_LOS_ESTADOS, parsearClaveRuta,
} from '../../lib/constantes';
import { sombra } from '../../lib/estilos';
import {
  Itinerario,
  alternarDestinoItinerario,
  crearItinerario, eliminarItinerario,
  obtenerItinerarios,
  obtenerRutasSugeridas,
  obtenerUsuarioActivo,
  reordenarItinerarioItems,
} from '../../lib/supabase-db';
import { Tema } from '../../lib/tema';

// ─────────────────────────────────────────────────────────────────────────────
//  Colores de nivel con opacidad controlada
// ─────────────────────────────────────────────────────────────────────────────
const colorNivel = (nivel: string, opacity = 1) => {
  const base = COLORES_NIVEL[nivel as Nivel] ?? '#888';
  if (opacity === 1) return base;
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar (PC)
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = React.memo(({ pestanas, estaActiva, navegarPestana }: any) => (
  <View style={s.sidebar}>
    <Image source={require('../../assets/images/logo.png')} style={s.logoSidebar} resizeMode="contain" />
    <View style={s.separadorSidebar} />
    {pestanas.map((p: any) => {
      const activa = estaActiva(p.ruta);
      return (
        <TouchableOpacity key={p.ruta} style={[s.itemSidebar, activa && s.itemSidebarActivo]}
          onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
          <Image source={activa ? p.iconoRojo : p.iconoGris} style={s.iconoSidebar} resizeMode="contain" />
        </TouchableOpacity>
      );
    })}
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
//  Barra Inferior (Móvil)
// ─────────────────────────────────────────────────────────────────────────────
const BarraInferior = React.memo(({ pestanas, estaActiva, navegarPestana }: any) => (
  <View style={s.envolturaBarra}>
    <View style={s.barraPestanas}>
      {pestanas.map((p: any) => {
        const activa = estaActiva(p.ruta);
        return (
          <TouchableOpacity key={p.ruta} style={s.itemPestana} activeOpacity={1}
            onPress={() => navegarPestana(p.ruta)}>
            <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
            <Text style={[s.etiquetaPestana, activa && s.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
//  Layout base
// ─────────────────────────────────────────────────────────────────────────────
const Layout = React.memo(({ children, titulo, atras, esPC, estaActiva, navegarPestana }: any) => (
  <View style={s.contenedor}>
    <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
    <Image source={require('../../assets/images/mapa.png')} style={s.imagenMapa} resizeMode="contain" />
    {!esPC && <Image source={require('../../assets/images/logo.png')} style={s.logoFijo} resizeMode="contain" />}

    {esPC ? (
      <View style={s.layoutPC}>
        <Sidebar pestanas={PESTANAS} estaActiva={estaActiva} navegarPestana={navegarPestana} />
        <SafeAreaView style={s.areaSeguraPC}>
          {titulo && (
            <View style={s.encabezado}>
              {atras
                ? <TouchableOpacity onPress={atras} style={s.botonAtras}><Text style={s.textoAtras}>‹</Text></TouchableOpacity>
                : <View style={{ width: 38 }} />}
              <Text style={s.tituloEncabezado}>{titulo}</Text>
              <View style={{ width: 38 }} />
            </View>
          )}
          {children}
        </SafeAreaView>
      </View>
    ) : (
      <View style={s.layoutMovil}>
        <SafeAreaView style={s.areaSegura}>
          {titulo && (
            <View style={s.encabezado}>
              {atras
                ? <TouchableOpacity onPress={atras} style={s.botonAtras}><Text style={s.textoAtras}>‹</Text></TouchableOpacity>
                : <View style={{ width: 38 }} />}
              <Text style={s.tituloEncabezado}>{titulo}</Text>
              <View style={{ width: 38 }} />
            </View>
          )}
          {children}
        </SafeAreaView>
        <BarraInferior pestanas={PESTANAS} estaActiva={estaActiva} navegarPestana={navegarPestana} />
      </View>
    )}
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
//  Chip de estadística
// ─────────────────────────────────────────────────────────────────────────────
const StatChip = ({ emoji, label }: { emoji: string; label: string }) => (
  <View style={s.statChip}>
    <Text style={s.statEmoji}>{emoji}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function RutasScreen() {
  const rutaActual = usePathname();
  const { width }  = useWindowDimensions();
  const esPC       = width >= 768;

  const [usuarioId,        setUsuarioId]        = useState<string | null>(null);
  const [itinerarios,      setItinerarios]       = useState<Itinerario[]>([]);
  const [rutasSugeridas,   setRutasSugeridas]    = useState<any[]>([]);
  const [cargando,         setCargando]          = useState(true);
  const [itinerarioActivo, setItinerarioActivo]  = useState<Itinerario | null>(null);
  const [modalNuevoVisible,setModalNuevoVisible] = useState(false);
  const [nuevoNombre,      setNuevoNombre]       = useState('');

  const [rutaDetalle,       setRutaDetalle]       = useState<any | null>(null);
  const [modalRutaVisible,  setModalRutaVisible]  = useState(false);
  const [modalItiVisible,   setModalItiVisible]   = useState(false);
  const [nuevoNombreIti,    setNuevoNombreIti]    = useState('');
  const [claveParaAgregar,  setClaveParaAgregar]  = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('visible');
    NavigationBar.setButtonStyleAsync('dark');
  }, []);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) {
        Alert.alert('Sesión requerida', 'Inicia sesión para gestionar tus rutas',
          [{ text: 'Ir', onPress: () => router.replace('/login' as Href) }]);
        return;
      }
      setUsuarioId(usuario.id);
      const [itis, sg] = await Promise.all([
        obtenerItinerarios(usuario.id),
        obtenerRutasSugeridas(),
      ]);
      setItinerarios(itis);
      setRutasSugeridas(
        sg.length > 0
          ? sg
          : SUGERENCIAS_RUTAS.map(s => ({ ...s, activo: 1 }))
      );
      setCargando(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    };
    cargar();
  }, []));

  const navegarPestana = useCallback((ruta: string) => router.replace(ruta as Href), []);
  const estaActiva     = useCallback((ruta: string) =>
    !!rutaActual && rutaActual.endsWith(ruta.replace('/(tabs)', '')), [rutaActual]);

  const imagenDeEstado = useCallback((estado: string): ImageSourcePropType =>
    TODOS_LOS_ESTADOS.find(e => e.nombre === estado)?.imagen ?? require('../../assets/images/mapa.png'), []);

  const handleCrearItinerario = async () => {
    if (!usuarioId || !nuevoNombre.trim()) return;
    const res = await crearItinerario(usuarioId, nuevoNombre.trim());
    setItinerarios(res);
    setNuevoNombre('');
    setModalNuevoVisible(false);
  };

  const abrirDetalleSugerida = (item: any) => {
    setRutaDetalle(item);
    setModalRutaVisible(true);
  };

  const iniciarAgregarSugerida = (item: any) => {
    const clave = `${item.estado}|${item.nivel}`;
    setClaveParaAgregar(clave);
    setModalRutaVisible(false);
    setModalItiVisible(true);
  };

  const agregarSugeridaAItinerario = async (itiId: number) => {
    if (!usuarioId || !claveParaAgregar) return;
    const res = await alternarDestinoItinerario(usuarioId, itiId, claveParaAgregar);
    setItinerarios(res);
    setModalItiVisible(false);
    setClaveParaAgregar(null);
    Alert.alert('✅ Agregado', 'El destino fue añadido a tu itinerario.');
  };

  const crearItiYAgregar = async () => {
    if (!usuarioId || !claveParaAgregar || !nuevoNombreIti.trim()) return;
    const nuevos = await crearItinerario(usuarioId, nuevoNombreIti.trim());
    setItinerarios(nuevos);
    if (nuevos.length > 0) {
      const res = await alternarDestinoItinerario(usuarioId, nuevos[0].id, claveParaAgregar);
      setItinerarios(res);
    }
    setNuevoNombreIti('');
    setModalItiVisible(false);
    setClaveParaAgregar(null);
    Alert.alert('✅ Listo', 'Se creó el itinerario y se agregó el destino.');
  };

  const handleEliminarItinerario = (id: number) => {
    Alert.alert('🗑 Eliminar Viaje', '¿Quieres borrar este itinerario por completo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
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

  const calcularTotales = (items: any[]) => {
    let costoTotal = 0, diasTotales = 0;
    items.forEach(({ estado, nivel }) => {
      const paqL = PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO['default'];
      const paq  = paqL.find(p => p.nivel === nivel) ?? paqL[0];
      if (paq) {
        costoTotal  += parseInt(paq.precioTotal.replace(/[^0-9]/g, ''), 10) || 0;
        diasTotales += paq.diasRecomendados;
      }
    });
    return { costoTotal, diasTotales };
  };

  const compartirItinerario = async (items: any[], nombre: string) => {
    const { costoTotal, diasTotales } = calcularTotales(items);
    let msg = `🗺️ *Mi Itinerario: ${nombre}*\n\n`;
    items.forEach((it, i) => { msg += `${i + 1}. ${it.titulo} (${ETIQUETA_NIVEL[it.nivel as Nivel] ?? it.nivel})\n`; });
    msg += `\n⌛ Duración: ~${diasTotales} días\n💰 Costo aprox: $${costoTotal.toLocaleString()} MXN\n\n¡Planeado con Mexcursion!`;
    try { await Share.share({ message: msg, title: `Itinerario ${nombre}` }); } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  🗓 VISTA DETALLE ITINERARIO
  // ─────────────────────────────────────────────────────────────────────────
  if (itinerarioActivo) {
    const items = (itinerarioActivo.items ?? []).map(clave => {
      const sg = rutasSugeridas.find(s => String(s.id) === clave);
      if (sg) return { clave, titulo: sg.titulo, estado: sg.estado, nivel: sg.nivel };
      const p   = parsearClaveRuta(clave);
      return { clave, titulo: p.estado, estado: p.estado, nivel: p.nivel };
    });
    const { costoTotal, diasTotales } = calcularTotales(items);
    const nivelMasUsado = items.reduce<Record<string,number>>((acc, it) => {
      acc[it.nivel] = (acc[it.nivel] ?? 0) + 1; return acc;
    }, {});
    const nivelTop = Object.entries(nivelMasUsado).sort((a,b) => b[1]-a[1])[0]?.[0] ?? 'medio';

    return (
      <Layout titulo={itinerarioActivo.nombre} atras={() => setItinerarioActivo(null)}
        esPC={esPC} estaActiva={estaActiva} navegarPestana={navegarPestana}>
        <View style={{ flex: 1 }}>

          {items.length > 0 && (
            <View style={s.statsBanner}>
              <StatChip emoji="📍" label={`${items.length} destinos`} />
              <View style={s.statDivisor} />
              <StatChip emoji="⌛" label={`~${diasTotales} días`} />
              <View style={s.statDivisor} />
              <StatChip emoji="💰" label={`$${costoTotal.toLocaleString()} MXN`} />
              <View style={s.statDivisor} />
              <StatChip emoji="✨" label={ETIQUETA_NIVEL[nivelTop as Nivel] ?? nivelTop} />
            </View>
          )}

          <View style={s.accionesBarra}>
            <TouchableOpacity style={s.accionBtn}
              onPress={() => compartirItinerario(items, itinerarioActivo.nombre)}>
              <Text style={s.accionBtnTxt}>📤 Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.accionBtn, s.accionBtnDanger]}
              onPress={() => handleEliminarItinerario(itinerarioActivo.id)}>
              <Text style={[s.accionBtnTxt, { color: Tema.acento }]}>🗑 Borrar viaje</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.textoVacioEmoji}>✈️</Text>
              <Text style={s.tituloVacio}>Viaje vacío</Text>
              <Text style={s.subtituloVacio}>
                Explora destinos en la app y agrégalos a este viaje con el botón "Mi Ruta".
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.clave}
              contentContainerStyle={s.listaItems}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              renderItem={({ item, index }) => (
                <View style={s.tarjetaItem}>
                  {index < items.length - 1 && <View style={s.lineaTimeline} />}

                  <View style={[s.burbujaPaso, { borderColor: colorNivel(item.nivel) }]}>
                    <Text style={[s.textoBurbuja, { color: colorNivel(item.nivel) }]}>{index + 1}</Text>
                  </View>

                  <View style={s.cuerpoItem}>
                    <Image source={imagenDeEstado(item.estado)} style={s.imgItem} resizeMode="cover" />
                    <View style={s.infoItem}>
                      <Text style={s.tituloItem} numberOfLines={1}>{item.titulo}</Text>
                      <Text style={s.estadoItem}>{item.estado}</Text>
                      <View style={[s.chipNivel, { backgroundColor: colorNivel(item.nivel, 0.15) }]}>
                        <Text style={[s.chipNivelTxt, { color: colorNivel(item.nivel) }]}>
                          {ETIQUETA_NIVEL[item.nivel as Nivel] ?? item.nivel}
                        </Text>
                      </View>
                    </View>

                    <View style={s.controlesItem}>
                      {index > 0 && (
                        <Pressable style={s.btnMover} onPress={() => moverItem(index, -1)}>
                          <Text style={s.btnMoverTxt}>↑</Text>
                        </Pressable>
                      )}
                      {index < items.length - 1 && (
                        <Pressable style={s.btnMover} onPress={() => moverItem(index, 1)}>
                          <Text style={s.btnMoverTxt}>↓</Text>
                        </Pressable>
                      )}
                      <Pressable style={s.btnEliminar} onPress={() => handleQuitarItem(item.clave)}>
                        <Text style={s.btnEliminarTxt}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Layout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  🏠 VISTA PRINCIPAL: Mis Itinerarios + Sugerencias
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout esPC={esPC} estaActiva={estaActiva} navegarPestana={navegarPestana}>
      <ScrollView contentContainerStyle={s.contenedorScroll} showsVerticalScrollIndicator={false}>

        <View style={s.heroBox}>
          <Text style={s.heroTitulo}>Mis Viajes ✈️</Text>
          <Text style={s.heroSub}>Organiza, planea y comparte tus aventuras por México</Text>
          <TouchableOpacity style={s.heroBtnNuevo} onPress={() => setModalNuevoVisible(true)} activeOpacity={0.85}>
            <Text style={s.heroBtnTxt}>+ Crear nuevo viaje</Text>
          </TouchableOpacity>
        </View>

        {itinerarios.length === 0 ? (
          <View style={s.vacioPrincipal}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🗺️</Text>
            <Text style={s.tituloVacioP}>Sin itinerarios aún</Text>
            <Text style={s.subVacioP}>
              Crea tu primer viaje y empieza a agregar destinos desde el catálogo.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.seccionHead}>
              <Text style={s.seccionTitulo}>Mis Itinerarios</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.scrollHorizontal}>
              {itinerarios.map((iti, idx) => {
                const count  = (iti.items ?? []).length;
                const colores = ['#3AB7A5','#e9c46a','#DD331D','#4B7BEC','#8A2BE2'];
                const accent  = colores[idx % colores.length];
                return (
                  <TouchableOpacity
                    key={iti.id}
                    style={[s.itiCard, { borderTopColor: accent }]}
                    onPress={() => setItinerarioActivo(iti)}
                    activeOpacity={0.82}>
                    <View style={[s.itiStrip, { backgroundColor: accent }]} />
                    <View style={s.itiCardBody}>
                      <Text style={s.itiNombre} numberOfLines={2}>{iti.nombre}</Text>
                      <Text style={s.itiCount}>{count} {count === 1 ? 'destino' : 'destinos'}</Text>
                      <View style={s.itiImgsRow}>
                        {(iti.items ?? []).slice(0, 3).map((clave, i) => {
                          const { estado } = parsearClaveRuta(clave);
                          return (
                            <Image key={i} source={imagenDeEstado(estado)}
                              style={[s.itiMiniImg, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}
                              resizeMode="cover" />
                          );
                        })}
                        {count === 0 && <Text style={s.itiVacioTxt}>Vacío</Text>}
                      </View>
                      <View style={[s.itiChevron, { backgroundColor: accent + '22' }]}>
                        <Text style={[s.itiChevronTxt, { color: accent }]}>Ver →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {rutasSugeridas.filter(r => r.activo !== 0).length > 0 && (
          <>
            <View style={s.divisor} />
            <View style={s.seccionHead}>
              <Text style={s.seccionTitulo}>Rutas Sugeridas</Text>
              <Text style={s.seccionSub}>Inspiración para tu próximo viaje</Text>
            </View>

            <View style={s.gridSugeridas}>
              {rutasSugeridas.filter(r => r.activo !== 0).map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={s.tarjetaSug}
                  onPress={() => abrirDetalleSugerida(item)}
                  activeOpacity={0.85}>
                  <Image source={imagenDeEstado(item.estado)} style={s.imgSug} resizeMode="cover" />
                  <View style={s.gradienteSug} />
                  <View style={[s.badgeNivel, { backgroundColor: colorNivel(item.nivel) }]}>
                    <Text style={s.badgeNivelTxt}>{ETIQUETA_NIVEL[item.nivel as Nivel] ?? item.nivel}</Text>
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

      <Modal visible={modalNuevoVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setModalNuevoVisible(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitulo}>✈️ Nuevo Itinerario</Text>
            <Text style={s.modalSub}>¿Cómo se llama tu próxima aventura?</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Ej. Vacaciones en la playa 🏖️"
              placeholderTextColor="#bbb"
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              onSubmitEditing={handleCrearItinerario}
              returnKeyType="done"
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalBtnCancelar} onPress={() => setModalNuevoVisible(false)}>
                <Text style={s.modalBtnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnCrear, !nuevoNombre.trim() && { opacity: 0.4 }]}
                onPress={handleCrearItinerario}
                disabled={!nuevoNombre.trim()}>
                <Text style={s.modalBtnCrearTxt}>Crear Viaje</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalRutaVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setModalRutaVisible(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            {rutaDetalle && (
              <>
                <Image source={imagenDeEstado(rutaDetalle.estado)} style={s.modalImgHeader} resizeMode="cover" />
                <View style={[s.modalNivelBadge, { backgroundColor: colorNivel(rutaDetalle.nivel) }]}>
                  <Text style={s.modalNivelTxt}>{ETIQUETA_NIVEL[rutaDetalle.nivel as Nivel] ?? rutaDetalle.nivel}</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  <Text style={s.modalTitulo}>{rutaDetalle.titulo}</Text>
                  <Text style={s.modalEstado}>📍 {rutaDetalle.estado}</Text>

                  {rutaDetalle.estilo && (
                    <View style={s.modalTagRow}>
                      {(rutaDetalle.estilo as string).split(',').map((t: string, i: number) => (
                        <View key={i} style={s.modalTag}><Text style={s.modalTagTxt}>{t.trim()}</Text></View>
                      ))}
                    </View>
                  )}

                  <View style={s.modalSeccion}>
                    <Text style={s.modalSeccionTitulo}>🏨 Hotel</Text>
                    <Text style={s.modalSeccionVal}>{rutaDetalle.hotel}</Text>
                    <Text style={s.modalSeccionSub}>{rutaDetalle.precioHotel}</Text>
                  </View>

                  <View style={s.modalSeccion}>
                    <Text style={s.modalSeccionTitulo}>🍽️ Restaurante</Text>
                    <Text style={s.modalSeccionVal}>{rutaDetalle.restaurante}</Text>
                    <Text style={s.modalSeccionSub}>{rutaDetalle.precioRestaurante}</Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={s.modalBtnAgregar}
                  onPress={() => iniciarAgregarSugerida(rutaDetalle)}>
                  <Text style={s.modalBtnAgregarTxt}>➕ Agregar a un itinerario</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalItiVisible} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => { setModalItiVisible(false); setNuevoNombreIti(''); }}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitulo}>¿A qué viaje lo agregas?</Text>
            <Text style={s.modalSub}>Elige un itinerario o crea uno nuevo</Text>

            {itinerarios.length > 0 && (
              <ScrollView style={{ maxHeight: 200, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
                {itinerarios.map(iti => (
                  <TouchableOpacity key={iti.id} style={s.itiOpcion} onPress={() => agregarSugeridaAItinerario(iti.id)}>
                    <Text style={s.itiOpcionNombre}>{iti.nombre}</Text>
                    <Text style={s.itiOpcionCount}>{(iti.items ?? []).length} destinos</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={s.oCrearLbl}>— o crea un nuevo viaje —</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Nombre del nuevo itinerario..."
              placeholderTextColor="#bbb"
              value={nuevoNombreIti}
              onChangeText={setNuevoNombreIti}
            />
            <TouchableOpacity
              style={[s.modalBtnCrear, !nuevoNombreIti.trim() && { opacity: 0.4 }]}
              onPress={crearItiYAgregar}
              disabled={!nuevoNombreIti.trim()}>
              <Text style={s.modalBtnCrearTxt}>Crear viaje y agregar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  contenedor:          { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:          { opacity: 0.1, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  logoFijo:            { position: 'absolute', top: 12, left: 12, width: 50, height: 50, zIndex: 10 },
  layoutPC:            { flex: 1, flexDirection: 'row' },
  layoutMovil:         { flex: 1, flexDirection: 'column' },
  areaSegura:          { flex: 1 },
  areaSeguraPC:        { flex: 1 },

  sidebar:             { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar:         { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:    { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:         { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:   { backgroundColor: '#f0faf9' },
  iconoSidebar:        { width: 28, height: 28 },

  envolturaBarra:      { width: '100%', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  barraPestanas:       { flexDirection: 'row', backgroundColor: '#fff', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana:     { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva:{ color: Tema.primario, fontWeight: '600' },

  encabezado:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, width: '100%', maxWidth: 800, alignSelf: 'center' },
  botonAtras:          { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  textoAtras:          { fontSize: 26, color: Tema.primario, lineHeight: 30 },
  tituloEncabezado:    { flex: 1, fontSize: 17, fontWeight: '800', color: '#222', textAlign: 'center' },

  heroBox: { 
    marginHorizontal: 16, 
    marginTop: 60, 
    marginBottom: 20, 
    backgroundColor: Tema.primario, 
    borderRadius: 24, 
    padding: 22, 
    ...sombra({ color: Tema.primario, opacity: 0.3, radius: 14, offsetY: 6, elevation: 6 }),
  },
  heroTitulo:          { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  heroSub:             { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginBottom: 18 },
  heroBtnNuevo:        { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  heroBtnTxt:          { color: Tema.primarioOscuro, fontSize: 15, fontWeight: '800' },

  contenedorScroll:    { paddingBottom: 30, width: '100%', maxWidth: 800, alignSelf: 'center' },

  seccionHead:         { paddingHorizontal: 16, marginBottom: 12 },
  seccionTitulo:       { fontSize: 18, fontWeight: '800', color: '#222' },
  seccionSub:          { fontSize: 12, color: '#888', marginTop: 2 },

  scrollHorizontal:    { paddingHorizontal: 16, paddingBottom: 4, gap: 14 },
  itiCard: { 
    width: 190, 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    overflow: 'hidden', 
    borderTopWidth: 4,
    ...sombra({ opacity: 0.1, radius: 8, offsetY: 3, elevation: 4 }),
  },
  itiStrip:            { height: 0 },
  itiCardBody:         { padding: 14 },
  itiNombre:           { fontSize: 15, fontWeight: '800', color: '#222', marginBottom: 4 },
  itiCount:            { fontSize: 12, color: '#888', marginBottom: 12 },
  itiImgsRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  itiMiniImg:          { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },
  itiVacioTxt:         { fontSize: 11, color: '#bbb' },
  itiChevron:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  itiChevronTxt:       { fontSize: 12, fontWeight: '700' },

  vacioPrincipal:      { marginHorizontal: 16, marginTop: 4, marginBottom: 20, padding: 26, backgroundColor: '#fff', borderRadius: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#eee', borderStyle: 'dashed' },
  tituloVacioP:        { fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 6 },
  subVacioP:           { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },

  divisor:             { height: 1, backgroundColor: '#E8E8E8', marginVertical: 22, marginHorizontal: 20 },

  gridSugeridas:       { paddingHorizontal: 16, gap: 14 },
  tarjetaSug: { 
    borderRadius: 18, 
    overflow: 'hidden', 
    height: 200, 
    backgroundColor: '#ddd', 
    ...sombra({ opacity: 0.1, radius: 8, offsetY: 4, elevation: 4 }),
  },
  imgSug:              { width: '100%', height: '100%', position: 'absolute' },
  gradienteSug:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.45)' },
  badgeNivel:          { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeNivelTxt:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  infoSug:             { position: 'absolute', bottom: 14, left: 14 },
  tituloSug:           { fontSize: 20, fontWeight: '900', color: '#fff' },
  estadoSug:           { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  statsBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 10, 
    marginBottom: 10, 
    borderRadius: 14, 
    paddingVertical: 12, 
    paddingHorizontal: 10, 
    alignItems: 'center', 
    justifyContent: 'space-evenly',
    ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }),
  },
  statChip:            { alignItems: 'center', flex: 1 },
  statEmoji:           { fontSize: 18, marginBottom: 2 },
  statLabel:           { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center' },
  statDivisor:         { width: 1, height: 32, backgroundColor: '#eee' },

  accionesBarra:       { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 14 },
  accionBtn:           { flex: 1, backgroundColor: '#EEF8F7', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  accionBtnDanger:     { backgroundColor: '#FEF0EE' },
  accionBtnTxt:        { fontSize: 13, fontWeight: '700', color: Tema.primarioOscuro },

  listaItems:          { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  tarjetaItem:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, position: 'relative' },
  lineaTimeline:       { position: 'absolute', left: 18, top: 38, width: 2, height: 40, backgroundColor: '#E0E0E0', zIndex: 0 },
  burbujaPaso: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#fff', 
    borderWidth: 2, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12, 
    zIndex: 1,
    ...sombra({ opacity: 0.1, radius: 4, offsetY: 2, elevation: 2 }),
  },
  textoBurbuja:        { fontSize: 13, fontWeight: '900' },
  cuerpoItem: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    overflow: 'hidden',
    ...sombra({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 3 }),
  },
  imgItem:             { width: 72, height: 80 },
  infoItem:            { flex: 1, padding: 10, justifyContent: 'center' },
  tituloItem:          { fontSize: 14, fontWeight: '800', color: '#222', marginBottom: 2 },
  estadoItem:          { fontSize: 11, color: '#888', marginBottom: 6 },
  chipNivel:           { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  chipNivelTxt:        { fontSize: 10, fontWeight: '800' },
  controlesItem:       { padding: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnMover:            { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  btnMoverTxt:         { fontSize: 16, color: '#555', lineHeight: 22 },
  btnEliminar:         { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF0EE', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  btnEliminarTxt:      { fontSize: 12, color: Tema.acento, fontWeight: '900' },

  vacio:               { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  textoVacioEmoji:     { fontSize: 56, marginBottom: 14 },
  tituloVacio:         { fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 8 },
  subtituloVacio:      { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },

  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox:            { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalHandle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20 },
  modalTitulo:         { fontSize: 22, fontWeight: '900', color: '#222', marginBottom: 4 },
  modalSub:            { fontSize: 14, color: '#888', marginBottom: 20 },
  modalInput:          { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, fontSize: 16, color: '#333', borderWidth: 1.5, borderColor: '#E8E8E8', marginBottom: 20 },
  modalBtns:           { flexDirection: 'row', gap: 12 },
  modalBtnCancelar:    { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8' },
  modalBtnCancelarTxt: { fontSize: 15, fontWeight: '700', color: '#666' },
  modalBtnCrear:       { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Tema.primarioOscuro },
  modalBtnCrearTxt:    { fontSize: 15, fontWeight: '800', color: '#fff' },

  modalImgHeader:      { width: '100%', height: 150, borderRadius: 16, marginBottom: 12 },
  modalNivelBadge:     { position: 'absolute', top: 44, right: 24, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalNivelTxt:       { color: '#fff', fontSize: 11, fontWeight: '800' },
  modalEstado:         { fontSize: 13, color: '#888', marginBottom: 10 },
  modalTagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  modalTag:            { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modalTagTxt:         { fontSize: 11, color: '#555', fontWeight: '600' },
  modalSeccion:        { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 12, marginBottom: 10 },
  modalSeccionTitulo:  { fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 4 },
  modalSeccionVal:     { fontSize: 15, fontWeight: '800', color: '#222', marginBottom: 2 },
  modalSeccionSub:     { fontSize: 12, color: Tema.primarioOscuro, fontWeight: '600' },
  modalBtnAgregar:     { backgroundColor: Tema.primarioOscuro, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  modalBtnAgregarTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },

  itiOpcion:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itiOpcionNombre:     { fontSize: 15, fontWeight: '700', color: '#222' },
  itiOpcionCount:      { fontSize: 12, color: '#888' },
  oCrearLbl:           { textAlign: 'center', fontSize: 12, color: '#aaa', marginVertical: 10 },

  tapHint:             { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  tapHintTxt:          { color: '#fff', fontSize: 11, fontWeight: '700' },
});