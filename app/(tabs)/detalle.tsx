import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated,
    Dimensions,
    Platform, ScrollView, Share,
    StatusBar, StyleSheet, Text,
    TouchableOpacity, UIManager, View, useWindowDimensions
} from 'react-native';
import { TarjetaPaquete } from '../../components/Detalle/TarjetaPaquete';
import { ModalSeleccionItinerario } from '../../components/ModalSeleccionItinerario';
// FIX 1: Importar SafeAreaView de react-native en lugar de react-native-safe-area-context
// para el contenedor principal, y usar solo useSafeAreaInsets para medidas puntuales.
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopActionHeader } from '../../components/TopActionHeader';
import { MapaInteractivo } from '../../components/MapView';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { PAQUETES_POR_ESTADO, PESTANAS, Paquete, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import { TraduccionClave } from '../../lib/traducciones';
import { crearItinerarioYAgregarDestino } from '../../lib/itinerarios';
import { Itinerario, alternarDestinoItinerario, cargarResumenResenas, obtenerItinerarios, obtenerUsuarioActivo } from '../../lib/supabase-db';


if (Platform.OS === 'android' && !(globalThis as Record<string, unknown>).nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// CarruselImagenes extraído a components/CarruselImagenes.tsx

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
  const { data: resumenResenas = {} } = useQuery({
    queryKey: ['resumen-resenas-detalle', nombre],
    queryFn: () => cargarResumenResenas(nombre ? [nombre] : []),
    staleTime: 1000 * 60 * 10,
  });
  const resumenDestino = nombre ? resumenResenas[nombre] : undefined;
  const paqueteAnims = useRef(paquetes.map(() => new Animated.Value(0))).current;
  const resenasAnim  = useRef(new Animated.Value(1)).current;

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
        onNotificationsPress={() => setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES as never), 0)}
        maxWidth={800}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
        <View style={estilos.contenedorCentrado}>
          <View style={estilos.filaHero}>
            <View style={estilos.heroBadgesGrupo}>
              <View style={estilos.heroBadge}>
                <Text style={estilos.heroBadgeTexto}>{categoria}</Text>
              </View>
              {resumenDestino?.total ? (
                <View style={estilos.heroBadgeResenas}>
                  <Text style={estilos.heroBadgeResenasTexto}>
                    {resumenDestino.promedio.toFixed(1)} ★ · {resumenDestino.total} reseñas
                  </Text>
                </View>
              ) : null}
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

          {paquetes.map((paquete, idx) => (
            <TarjetaPaquete
              key={paquete.nivel}
              paquete={paquete}
              idx={idx}
              expandido={paqueteExpandido === paquete.nivel}
              enRuta={estaEnRuta(paquete.nivel)}
              entradaAnim={paqueteAnims[idx] ?? new Animated.Value(1)}
              onToggle={() => setPaqueteExpandido(
                paqueteExpandido === paquete.nivel ? null : paquete.nivel
              )}
              onAgregarARuta={() => abrirSeleccionRuta(paquete.nivel)}
              onReservar={() => irAReserva(paquete)}
            />
          ))}
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

      <ModalSeleccionItinerario
        visible={modalVisible}
        itinerarios={itinerarios}
        paqueteSeleccionado={paqueteSeleccionado}
        nuevoNombre={nuevoNombre}
        tituloModal={t('det_add_itinerario')}
        labelNuevo={t('det_nuevo_itinerario')}
        placeholderNuevo={t('det_ej_itinerario')}
        labelCrearAgregar={t('det_crear_agregar')}
        labelCancelar={t('det_cancelar')}
        labelQuitar={t('det_quitar')}
        sinItinerariosMsg={t('det_sin_itinerarios')}
        onCerrar={() => { setModalVisible(false); setNuevoNombre(''); }}
        onAgregarAItinerario={agregarAItinerario}
        onCrearYAgregar={crearYNuevoItinerario}
        onNuevoNombreChange={setNuevoNombre}
      />

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
  heroBadgesGrupo:       { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:8, flex:1, marginRight:8 },
  heroBadge:             { backgroundColor:'#3AB7A5', paddingHorizontal:12, paddingVertical:4, borderRadius:20 },
  heroBadgeTexto:        { color:'#fff', fontWeight:'700', fontSize:12 },
  heroBadgeResenas:      { backgroundColor:'#f0faf9', paddingHorizontal:12, paddingVertical:4, borderRadius:20, borderWidth:1, borderColor:'#3AB7A5' },
  heroBadgeResenasTexto: { color:'#27897b', fontWeight:'700', fontSize:12 },
  btnResenas:            { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#e9c46a', backgroundColor:'#fef9e7' },
  btnCompartir:          { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#3AB7A5', backgroundColor:'#f0faf9', marginLeft: 8 },
  txtBtnResenas:         { fontSize:13, fontWeight:'700', color:'#c8a000' },
  txtBtnCompartir:       { fontSize:13, fontWeight:'700', color:'#3AB7A5' },
  subtitulo:             { fontSize:18, fontWeight:'800', color:'#333', marginBottom:14 },
  envolturaBarra:        { width:'100%', backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#e0e0e0' },
  barraPestanas:         { flexDirection:'row', backgroundColor:'#fff', width:'100%', maxWidth:800, alignSelf:'center' },
  itemPestana:           { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:8, height:56 },
  etiquetaPestana:       { fontSize:10, color:'#999', marginTop:2 },
  etiquetaPestanaActiva: { color:'#DD331D', fontWeight:'600' },
  // ── Mapa ──
  seccionMapa: { marginTop: 20, marginBottom: 20 },
  tituloMapa: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12, textAlign: 'center' },
  mapa: { height: 250, borderRadius: 12, overflow: 'hidden' }
});
