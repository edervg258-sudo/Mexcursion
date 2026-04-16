import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform, ScrollView, Share,
    StatusBar, StyleSheet, Text,
    TextInput,
    TouchableOpacity, UIManager, View, useWindowDimensions
} from 'react-native';
// FIX 1: Importar SafeAreaView de react-native en lugar de react-native-safe-area-context
// para el contenedor principal, y usar solo useSafeAreaInsets para medidas puntuales.
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Estrellas } from '../../components/Estrellas';
import { TopActionHeader } from '../../components/TopActionHeader';
import { MapaInteractivo } from '../../components/MapView';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { PAQUETES_POR_ESTADO, PESTANAS, Paquete, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import { TraduccionClave } from '../../lib/traducciones';
import { crearItinerarioYAgregarDestino } from '../../lib/itinerarios';
import { Itinerario, alternarDestinoItinerario, obtenerItinerarios, obtenerUsuarioActivo } from '../../lib/supabase-db';

const { width: W } = Dimensions.get('window');
const CARD_W = Math.min(W, 800);

if (Platform.OS === 'android' && !(globalThis as Record<string, unknown>).nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// ARROW_STYLE movido dentro del componente CarruselImagenes (usa CAROUSEL_H)

const CAROUSEL_H = 260;
const ARROW_TOP  = CAROUSEL_H / 2 - 16;

const CarruselImagenes = ({ imagenes, color }: { imagenes: string[]; color: string }) => {
  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const ancho = Math.min(W - 28 * 2, CARD_W - 28);
  const dotAnims = useRef(imagenes.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const sincronizarPunto = useCallback((i: number) => {
    Animated.parallel(
      dotAnims.map((anim, idx) =>
        Animated.spring(anim, { toValue: idx === i ? 1 : 0, useNativeDriver: false, tension: 70, friction: 12 })
      )
    ).start();
    setIndice(i);
  }, [dotAnims]);

  const irA = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ x: ancho * i, animated: true });
    sincronizarPunto(i);
  }, [ancho, sincronizarPunto]);

  const arrowStyle = {
    position: 'absolute' as const,
    top: ARROW_TOP,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    zIndex: 10, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18, shadowRadius: 4,
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => sincronizarPunto(Math.round(e.nativeEvent.contentOffset.x / ancho))}
          style={{ borderRadius: 14 }}
        >
          {imagenes.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={{ width: ancho, height: CAROUSEL_H, borderRadius: 14 }}
              contentFit="cover"
              transition={250}
            />
          ))}
        </ScrollView>

        {/* Indicador de posición sobre la imagen */}
        {imagenes.length > 1 && (
          <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{indice + 1}/{imagenes.length}</Text>
          </View>
        )}

        {imagenes.length > 1 && indice > 0 && (
          <TouchableOpacity activeOpacity={0.75} onPress={() => irA(indice - 1)} style={{ ...arrowStyle, left: 10 }}>
            <Text style={{ fontSize: 22, color: '#333', fontWeight: '700', lineHeight: 28 }}>‹</Text>
          </TouchableOpacity>
        )}
        {imagenes.length > 1 && indice < imagenes.length - 1 && (
          <TouchableOpacity activeOpacity={0.75} onPress={() => irA(indice + 1)} style={{ ...arrowStyle, right: 10 }}>
            <Text style={{ fontSize: 22, color: '#333', fontWeight: '700', lineHeight: 28 }}>›</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {imagenes.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => irA(i)}>
            <Animated.View style={{
              width: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 22] }),
              height: 8, borderRadius: 4,
              backgroundColor: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['#ddd', color] }),
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const extraerPrecio = (precioTotal: string) => {
  const match = precioTotal.replace(/,/g,'').match(/\d+/);
  return match ? match[0] : '3500';
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar (PC) — fuera del componente para evitar remount en cada render
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = React.memo(({ estaActiva, navegarPestana }: {
  estaActiva: (ruta: string) => boolean;
  navegarPestana: (ruta: string) => void;
}) => {
  const { tema } = useTemaContext();
  return (
    <View style={[estilos.sidebar, { backgroundColor: tema.superficieBlanca, borderRightColor: tema.borde }]}>
      <Image source={require('../../assets/images/logo.png')} style={estilos.logoSidebar} contentFit="contain" transition={200} />
      <View style={[estilos.separadorSidebar, { backgroundColor: tema.borde }]} />
      {PESTANAS.map(p => {
        const activa = estaActiva(p.ruta);
        return (
          <TouchableOpacity key={p.ruta} style={[estilos.itemSidebar, activa && estilos.itemSidebarActivo, activa && { backgroundColor: tema.primarioSuave }]} onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
            <Image source={activa ? p.iconoRojo : p.iconoGris} style={estilos.iconoSidebar} contentFit="contain" transition={150} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
});
Sidebar.displayName = 'Sidebar';

export default function DetalleScreen() {
  const { nombre, categoria } = useLocalSearchParams<{ nombre:string; categoria:string }>();
  const rutaActual = usePathname();
  const { width }  = useWindowDimensions();
  const esPC       = width >= 768;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { t, idioma } = useIdioma();
  const { tema, isDark } = useTemaContext();

  // Obtener datos del estado
  const estado = TODOS_LOS_ESTADOS.find(e => e.nombre === nombre);

  useEffect(() => {
    configurarBarraAndroid();
  }, []);

  const [paqueteExpandido, setPaqueteExpandido] = useState<string | null>('economico');
  const [itinerarios, setItinerarios]           = useState<Itinerario[]>([]);
  const [usuarioId, setUsuarioId]               = useState<string | null>(null);

  // Modal selector
  const [modalVisible, setModalVisible]         = useState(false);
  const [nuevoNombre, setNuevoNombre]           = useState('');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { return; }
      setUsuarioId(usuario.id);
      setItinerarios(await obtenerItinerarios(usuario.id));
    };
    cargar();
  }, []));

  const paquetes      = PAQUETES_POR_ESTADO[nombre ?? ''] ?? PAQUETES_POR_ESTADO['default'];
  const paqueteAnims  = useRef(paquetes.map(() => new Animated.Value(0))).current;
  const cabAnims      = useRef(paquetes.map(() => new Animated.Value(1))).current;
  const rutaAnims     = useRef(paquetes.map(() => new Animated.Value(1))).current;
  const reservarAnims = useRef(paquetes.map(() => new Animated.Value(1))).current;
  const resenasAnim   = useRef(new Animated.Value(1)).current;
  // Anims de altura para expand/collapse de paquetes — compatibles con web y Android
  const expandAnims   = useRef(paquetes.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const EXPAND_DUR    = 280;
  // Rastrea qué paquetes se han expandido alguna vez (para no desmontar el contenido animado)
  const [paquetesVistos, setPaquetesVistos] = useState<Set<string>>(new Set(['economico']));

  const spring = (anim: Animated.Value, to: number) =>
    Animated.spring(anim, { toValue: to, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: to < 1 ? 2 : 7 }).start();

  useEffect(() => {
    Animated.stagger(90, paqueteAnims.map(anim =>
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
      ])
    )).start();
  }, [paqueteAnims]);

  const claveRuta  = (nivel: string) => `${nombre}|${nivel}`;
  const navegarPestana = useCallback((ruta: string) => setTimeout(() => router.replace(ruta as never), 0), []);
  const estaActiva = useCallback((ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', '')), [rutaActual]);

  const estaEnRuta = (nivel: string) => {
    const clave = claveRuta(nivel);
    return itinerarios.some(iti => iti.items?.includes(clave));
  };

  const abrirSeleccionRuta = (nivel: string) => {
    if (!usuarioId) {
      Alert.alert(t('det_inicia_sesion'), t('det_inicia_sesion2'));
      return;
    }
    setPaqueteSeleccionado(claveRuta(nivel));
    setModalVisible(true);
  };

  const agregarAItinerario = async (id_itinerario: number) => {
    if (!usuarioId || !paqueteSeleccionado) { return; }
    setItinerarios(await alternarDestinoItinerario(usuarioId, id_itinerario, paqueteSeleccionado));
    setModalVisible(false);
  };

  const crearYNuevoItinerario = async () => {
    if (!usuarioId || !paqueteSeleccionado || !nuevoNombre.trim()) { return; }
    const nombreNuevo = nuevoNombre.trim();
    setItinerarios(await crearItinerarioYAgregarDestino({
      usuarioId,
      nombreNuevo,
      claveDestino: paqueteSeleccionado,
      itinerariosActuales: itinerarios,
    }));
    setModalVisible(false);
    setNuevoNombre('');
  };

  const compartir = async () => {
    try {
      await Share.share({
        title: `${nombre ?? ''} — Mexcursión`,
        message: `Descubre ${nombre ?? ''} con Mexcursión.\n${estado?.descripcion ?? ''}\n\nDescarga la app y reserva tu próxima aventura.`,
      });
    } catch {
      // El usuario canceló o el sistema no soporta Share — no se requiere acción
    }
  };

  const irAReserva = (paquete: Paquete) => {
    setTimeout(() => router.push({ pathname:'/(tabs)/reserva' as never, params:{ nombre, precio:extraerPrecio(paquete.precioTotal), paquete:t(('rut_' + paquete.nivel) as TraduccionClave) } }), 0);
  };

  const irAResenas = () => {
    setTimeout(() => router.push({ pathname:'/(tabs)/resenas' as never, params:{ nombre } }), 0);
  };

  // ── Contenido ──────────────────────────────────────────────────────────
  const contenidoJSX = (
    <View style={{ flex:1 }}>
      <TopActionHeader
        title={String(nombre ?? '')}
        subtitle={String(categoria ?? '')}
        showInlineLogo={!esPC}
        onBackPress={() => router.back()}
        onNotificationsPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0)}
        maxWidth={800}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
        <View style={estilos.contenedorCentrado}>
          <View style={estilos.filaHero}>
            <View style={estilos.heroBadge}>
              <Text style={estilos.heroBadgeTexto}>{categoria}</Text>
            </View>
            <TouchableOpacity
              style={estilos.btnResenas}
              onPressIn={() => spring(resenasAnim, 0.92)}
              onPressOut={() => spring(resenasAnim, 1)}
              onPress={irAResenas}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: resenasAnim }] }}>
                <Text style={estilos.txtBtnResenas}>{t('det_ver_resenas')}</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={estilos.btnCompartir}
              onPress={compartir}
              activeOpacity={0.8}
              accessibilityLabel="Compartir destino"
              accessibilityHint="Comparte este destino con amigos"
            >
              <Text style={estilos.txtBtnCompartir}>Compartir</Text>
            </TouchableOpacity>
          </View>

          <Text style={[estilos.subtitulo, { color: tema.texto }]}>{t('det_elige_paquete')}</Text>

          {paquetes.map((paquete, idx) => {
            const expandido = paqueteExpandido === paquete.nivel;
            const enRuta    = estaEnRuta(paquete.nivel);
            const anim      = paqueteAnims[idx] ?? new Animated.Value(1);
            return (
              <Animated.View key={paquete.nivel} style={{
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
              }}>
              <View style={[estilos.tarjetaPaquete, { borderColor:paquete.color, backgroundColor: tema.superficieBlanca }]}>
                <TouchableOpacity
                  style={[estilos.cabeceraPaquete, { backgroundColor:paquete.color }]}
                  onPressIn={() => spring(cabAnims[idx], 0.97)}
                  onPressOut={() => spring(cabAnims[idx], 1)}
                  onPress={() => {
                    const abriendo = !expandido;
                    setPaqueteExpandido(abriendo ? paquete.nivel : null);
                    if (abriendo) {
                      setPaquetesVistos(v => { const s = new Set(v); s.add(paquete.nivel); return s; });
                      Animated.timing(expandAnims[idx], { toValue: 1, duration: EXPAND_DUR, useNativeDriver: false }).start();
                    } else {
                      Animated.timing(expandAnims[idx], { toValue: 0, duration: EXPAND_DUR, useNativeDriver: false }).start(() => {
                        setPaquetesVistos(v => { const s = new Set(v); s.delete(paquete.nivel); return s; });
                      });
                    }
                  }}
                  activeOpacity={1}
                >
                  <Animated.View style={[{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', flex:1 }, { transform:[{ scale: cabAnims[idx] }] }]}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={estilos.emojiPaquete}>{paquete.emoji}</Text>
                      <View>
                        <Text style={estilos.etiquetaPaquete}>{t(('rut_' + paquete.nivel) as TraduccionClave)}</Text>
                        <Text style={estilos.precioPaquete}>{paquete.precioTotal}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={estilos.diasPaquete}>{paquete.diasRecomendados} {t(paquete.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}</Text>
                      <Text style={estilos.chevron}>{expandido ? '▲' : '▼'}</Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {(expandido || paquetesVistos.has(paquete.nivel)) && (
                  <Animated.View style={[estilos.cuerpoPaquete, {
                    maxHeight: expandAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0, 2400] }),
                    opacity:   expandAnims[idx].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] }),
                    overflow: 'hidden',
                  }]}>
                    <CarruselImagenes imagenes={paquete.imagenesHotel} color={paquete.color} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={[estilos.tituloSeccion, { color: tema.texto }]}>{t('det_hotel')}</Text></View>
                      <Text style={[estilos.nombreHotel, { color: tema.texto }]}>{paquete.hotel}</Text>
                      <Estrellas valor={paquete.estrellas} tamaño={12} />
                      <Text style={[estilos.textoInfo, { color: tema.textoSecundario }]}>{paquete.descripcionHotel[idioma]}</Text>
                      <Text style={estilos.precioLinea}>{paquete.precioHotel}</Text>
                      <View style={estilos.listaIncluye}>
                        {paquete.incluye[idioma].map(inc => (
                          <View key={inc} style={estilos.chipIncluye}>
                            <Text style={estilos.textoChipIncluye}>✓ {inc}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={[estilos.divisor, { backgroundColor: tema.borde }]} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={[estilos.tituloSeccion, { color: tema.texto }]}>{t('det_restaurante')}</Text></View>
                      <Text style={[estilos.nombreHotel, { color: tema.texto }]}>{paquete.restaurante}</Text>
                      <Text style={estilos.tipoCocina}>{paquete.tipoCocina[idioma]}</Text>
                      <Text style={[estilos.textoInfo, { color: tema.textoSecundario }]}>{t('det_platillo', { p: paquete.platillo[idioma] })}</Text>
                      <Text style={estilos.precioLinea}>{paquete.precioRestaurante}</Text>
                    </View>

                    <View style={[estilos.divisor, { backgroundColor: tema.borde }]} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={[estilos.tituloSeccion, { color: tema.texto }]}>{t('det_transporte')}</Text></View>
                      <Text style={[estilos.textoInfo, { color: tema.textoSecundario }]}>{paquete.transporte[idioma]}</Text>
                      <Text style={estilos.precioLinea}>{paquete.precioTransporte}</Text>
                    </View>

                    <View style={[estilos.divisor, { backgroundColor: tema.borde }]} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={[estilos.tituloSeccion, { color: tema.texto }]}>{t('det_actividades')}</Text></View>
                      {paquete.actividades[idioma].map((act, i) => (
                        <View key={i} style={estilos.filaActividad}>
                          <View style={[estilos.puntoActividad, { backgroundColor:paquete.color }]} />
                          <Text style={[estilos.textoActividad, { color: tema.textoSecundario }]}>{act}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={estilos.filaBotones}>
                      <TouchableOpacity
                        style={[estilos.botonRuta, enRuta && estilos.botonRutaActivo]}
                        onPressIn={() => spring(rutaAnims[idx], 0.93)}
                        onPressOut={() => spring(rutaAnims[idx], 1)}
                        onPress={() => abrirSeleccionRuta(paquete.nivel)}
                        activeOpacity={1}
                      >
                        <Animated.View style={{ transform: [{ scale: rutaAnims[idx] }] }}>
                          <Text style={estilos.textoBotonRuta}>{enRuta ? t('det_en_ruta') : t('det_add_ruta')}</Text>
                        </Animated.View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID="reserve-package-button"
                        style={[estilos.botonReservar, { backgroundColor:paquete.color }]}
                        onPressIn={() => spring(reservarAnims[idx], 0.93)}
                        onPressOut={() => spring(reservarAnims[idx], 1)}
                        onPress={() => irAReserva(paquete)}
                        activeOpacity={1}
                      >
                        <Animated.View style={{ transform: [{ scale: reservarAnims[idx] }] }}>
                          <Text style={estilos.textoBotonReservar}>{t('det_reservar')}</Text>
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}
              </View>
              </Animated.View>
            );
          })}
          <View style={{ height:20 }} />

          {/* Mapa interactivo */}
          {estado && (
            <View style={estilos.seccionMapa}>
              <Text style={[estilos.tituloMapa, { color: tema.texto }]}>{t('det_ubicacion')}</Text>
              <MapaInteractivo
                latitude={estado.latitude}
                longitude={estado.longitude}
                title={estado.nombre}
                description={estado.descripcion}
                zoom={8}
                style={estilos.mapa}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    // FIX 4: StatusBar con translucent={true} en Android evita que el sistema
    // reserve/libere espacio al cambiar barStyle, lo que causaba re-layouts.
    // Con translucent, la StatusBar flota sobre el contenido y su altura
    // ya viene incluida en los insets de SafeAreaView → sin saltos.
    <View style={[estilos.contenedor, { backgroundColor: tema.fondo }]} testID="detail-screen">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={tema.fondo}
        translucent={true}
      />
      <Image source={require('../../assets/images/mapa.png')} style={estilos.imagenMapa} contentFit="contain" transition={300} />

      {esPC ? (
        <View style={estilos.layoutPC}>
          <Sidebar estaActiva={estaActiva} navegarPestana={navegarPestana} />
          <SafeAreaView style={estilos.areaSeguraPC}>
            {contenidoJSX}
          </SafeAreaView>
        </View>
      ) : (
        // FIX 6: SafeAreaView con edges explícitos. Al no especificarlos,
        // react-native-safe-area-context aplica TODOS los insets (top, bottom,
        // left, right) y los recalcula cuando el teclado o la nav bar cambian.
        // Especificando solo ['top'] y manejando el bottom manualmente con
        // paddingBottom fijo, se elimina el re-layout al abrir el modal.
        <SafeAreaView style={estilos.layoutMovil} edges={['top', 'left', 'right']}>
          <View style={{ flex: 1 }}>
            {contenidoJSX}
          </View>
          <View style={[estilos.envolturaBarra, { paddingBottom: Math.max(bottomInset, 8), backgroundColor: tema.superficieBlanca, borderTopColor: tema.borde }]}>
            <View style={[estilos.barraPestanas, { backgroundColor: tema.superficieBlanca }]}>
              {PESTANAS.map(p => {
                const activa = estaActiva(p.ruta);
                return (
                  <TouchableOpacity key={p.ruta} style={estilos.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                    <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width:28, height:28 }} contentFit="contain" transition={100} />
                    <Text style={[estilos.etiquetaPestana, { color: tema.textoMuted }, activa && estilos.etiquetaPestanaActiva]}>{t(('tab_' + p.ruta.replace('/(tabs)/', '')) as TraduccionClave)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* FIX 7: Modal con KeyboardAvoidingView interno para que el teclado
          solo desplace el contenido del modal y NO el layout principal.
          Sin esto, Android empuja TODO el árbol de vistas hacia arriba
          al aparecer el teclado dentro del Modal. */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        // FIX 8: statusBarTranslucent evita que el Modal recalcule su altura
        // en función de la StatusBar al abrirse, eliminando el salto visual.
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={estilos.modalOverlay}>
            <View style={[estilos.modalContent, { backgroundColor: tema.superficieBlanca }]}>
              <Text style={[estilos.modalTitle, { color: tema.texto }]}>{t('det_add_itinerario')}</Text>
              
              <ScrollView
                style={{ maxHeight: 200, width: '100%', marginBottom: 15 }}
                keyboardShouldPersistTaps="handled"
              >
                {itinerarios.map(iti => {
                  const yaEsta = iti.items?.includes(paqueteSeleccionado ?? '');
                  return (
                    <TouchableOpacity
                      key={iti.id}
                      style={[estilos.modalItiCard, { backgroundColor: tema.superficie, borderColor: tema.borde }, yaEsta && estilos.modalItiCardActivo]}
                      onPress={() => agregarAItinerario(iti.id)}
                    >
                      <Text style={[estilos.modalItiText, { color: tema.textoSecundario }, yaEsta && estilos.modalItiTextActivo]}>
                        {iti.nombre}{yaEsta ? ` ${t('det_quitar')}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {itinerarios.length === 0 && (
                  <Text style={[estilos.textoInfo, { color: tema.textoSecundario }]}>{t('det_sin_itinerarios')}</Text>
                )}
              </ScrollView>

              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={[estilos.modalLabel, { color: tema.textoMuted }]}>{t('det_nuevo_itinerario')}</Text>
                <TextInput
                  style={[estilos.modalInput, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
                  placeholder={t('det_ej_itinerario')}
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                  placeholderTextColor={tema.textoMuted}
                />
                <TouchableOpacity
                  style={[estilos.modalBtnCrear, !nuevoNombre.trim() && { opacity: 0.5 }]}
                  disabled={!nuevoNombre.trim()}
                  onPress={crearYNuevoItinerario}
                >
                  <Text style={estilos.modalBtnCrearTxt}>{t('det_crear_agregar')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={estilos.modalBtnCerrar} onPress={() => { setModalVisible(false); setNuevoNombre(''); }}>
                <Text style={[estilos.modalBtnCerrarTxt, { color: tema.textoMuted }]}>{t('det_cancelar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor:            { flex:1, backgroundColor:'#FAF7F0' },
  imagenMapa:            { opacity:0.15, position:'absolute', width:'90%', height:'100%', alignSelf:'center' },
  layoutPC:              { flex:1, flexDirection:'row' },
  // FIX 10: layoutMovil como flex:1 sin paddingBottom — el bottom lo maneja
  // la barra de pestañas con su propio paddingBottom, eliminando dependencia
  // de insets dinámicos en el contenedor raíz.
  layoutMovil:           { flex:1, flexDirection:'column' },
  areaSegura:            { flex: 1 },
  areaSeguraPC:          { flex:1 },
  sidebar:               { width:64, backgroundColor:'#fff', borderRightWidth:1, borderRightColor:'#e8e8e8', alignItems:'center', paddingTop:16, paddingBottom:20, gap:4 },
  logoSidebar:           { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:      { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:           { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:     { backgroundColor: '#f0faf9' },
  iconoSidebar:          { width: 28, height: 28 },
  scroll:                { paddingBottom:10 },
  contenedorCentrado:    { width:'100%', maxWidth:800, alignSelf:'center', paddingHorizontal:14 },
  filaHero:              { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  heroBadge:             { backgroundColor:'#3AB7A5', paddingHorizontal:12, paddingVertical:4, borderRadius:20 },
  heroBadgeTexto:        { color:'#fff', fontWeight:'700', fontSize:12 },
  btnResenas:            { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#e9c46a', backgroundColor:'#fef9e7' },
  btnCompartir:          { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#3AB7A5', backgroundColor:'#f0faf9', marginLeft: 8 },
  txtBtnResenas:         { fontSize:13, fontWeight:'700', color:'#c8a000' },
  txtBtnCompartir:       { fontSize:13, fontWeight:'700', color:'#3AB7A5' },
  subtitulo:             { fontSize:18, fontWeight:'800', color:'#333', marginBottom:14 },
  tarjetaPaquete:        { borderRadius:18, borderWidth:2, marginBottom:16, overflow:'hidden', backgroundColor:'#fff' },
  cabeceraPaquete:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14 },
  emojiPaquete:          { fontSize:20, color:'#fff', fontWeight:'800' },
  etiquetaPaquete:       { fontSize:16, fontWeight:'800', color:'#fff' },
  precioPaquete:         { fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2 },
  diasPaquete:           { fontSize:12, color:'#fff', fontWeight:'600', backgroundColor:'rgba(0,0,0,0.2)', paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  chevron:               { fontSize:12, color:'#fff', fontWeight:'700' },
  cuerpoPaquete:         { padding:16 },
  seccionInfo:           { marginBottom:4 },
  filaSeccion:           { flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 },
  iconoSeccion:          { fontSize:16 },
  tituloSeccion:         { fontSize:14, fontWeight:'700', color:'#333' },
  nombreHotel:           { fontSize:15, fontWeight:'700', color:'#222', marginBottom:4 },
  tipoCocina:            { fontSize:12, color:'#3AB7A5', fontWeight:'600', marginBottom:4 },
  textoInfo:             { fontSize:13, color:'#666', lineHeight:19, marginBottom:4 },
  precioLinea:           { fontSize:13, fontWeight:'700', color:'#DD331D', marginTop:2 },
  listaIncluye:          { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 },
  chipIncluye:           { backgroundColor:'#f0faf9', borderRadius:10, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'#3AB7A5' },
  textoChipIncluye:      { fontSize:11, color:'#3AB7A5', fontWeight:'600' },
  divisor:               { height:1, backgroundColor:'#eee', marginVertical:14 },
  filaActividad:         { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  puntoActividad:        { width:8, height:8, borderRadius:4 },
  textoActividad:        { fontSize:13, color:'#444', flex:1 },
  filaBotones:           { flexDirection:'row', gap:10, marginTop:16 },
  botonRuta:             { flex:1, backgroundColor:'#3AB7A5', paddingVertical:13, borderRadius:25, alignItems:'center', elevation:3 },
  botonRutaActivo:       { backgroundColor:'#aaa' },
  textoBotonRuta:        { color:'#fff', fontWeight:'700', fontSize:14 },
  botonReservar:         { flex:1, paddingVertical:13, borderRadius:25, alignItems:'center', elevation:3 },
  textoBotonReservar:    { color:'#fff', fontWeight:'700', fontSize:14 },
  envolturaBarra:        { width:'100%', backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#e0e0e0' },
  barraPestanas:         { flexDirection:'row', backgroundColor:'#fff', width:'100%', maxWidth:800, alignSelf:'center' },
  itemPestana:           { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:8, height:56 },
  etiquetaPestana:       { fontSize:10, color:'#999', marginTop:2 },
  etiquetaPestanaActiva: { color:'#DD331D', fontWeight:'600' },
  textoVacio:            { fontSize:14, color:'#888', textAlign:'center', marginTop:10 },
  
  // ── Modal Itinerarios ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  modalItiCard: {
    padding: 14, backgroundColor: '#f9f9f9', borderRadius: 10,
    borderWidth: 1, borderColor: '#eee', marginBottom: 8, alignItems: 'center'
  },
  modalItiCardActivo: { backgroundColor: '#FFECEB', borderColor: '#DD331D' },
  modalItiText: { fontSize: 15, fontWeight: '600', color: '#444' },
  modalItiTextActivo: { color: '#DD331D' },
  modalLabel: { fontSize: 13, color: '#666', marginBottom: 6, alignSelf: 'flex-start' },
  modalInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#e0e0e0', color: '#333', marginBottom: 10
  },
  modalBtnCrear: { backgroundColor: '#333', borderRadius: 10, padding: 12, alignItems: 'center' },
  modalBtnCrearTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBtnCerrar: { marginTop: 10, padding: 10 },
  modalBtnCerrarTxt: { color: '#888', fontSize: 14, fontWeight: '600' },

  // ── Mapa ──
  seccionMapa: { marginTop: 20, marginBottom: 20 },
  tituloMapa: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12, textAlign: 'center' },
  mapa: { height: 250, borderRadius: 12, overflow: 'hidden' }
});
