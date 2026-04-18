import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DestinoCard } from '../../components/DestinoCard';
import { SkeletonLista } from './skeletonloader';
import {
    Animated,
    FlatList,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PESTANAS, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { LIST_PERF_PRESET } from '../../lib/performance';
import {
    alternarFavorito as alternarFavoritoBD,
    cargarFavoritos,
    obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { sombraBarraInferior, sombraBarraInferiorOscura, Tema } from '../../lib/tema';
import { useTemaContext } from '../../lib/TemaContext';

type Estado = typeof TODOS_LOS_ESTADOS[0] & { favorito: boolean };
type TipoOrden = 'mas_caro' | 'mas_barato' | 'az';

const CATEGORIAS = ['Todos', 'Playa', 'Cultura', 'Aventura', 'Gastronomía', 'Ciudad'];

const OPCIONES_ORDEN: { clave: TipoOrden; etiqueta: string }[] = [
  { clave: 'az', etiqueta: 'Orden A-Z' },
  { clave: 'mas_barato', etiqueta: 'Menor precio' },
  { clave: 'mas_caro', etiqueta: 'Mayor precio' },
];

export default function MenuScreen() {
  const { width } = useWindowDimensions();
  const esPC = width >= 768;
  const { tema, isDark } = useTemaContext();
  const { bottom: bottomInset } = useSafeAreaInsets();

  // Ajusta este valor si tu header tiene otra altura real
  const HEADER_HEIGHT = 72;

  const [estados, setEstados] = useState(() =>
    TODOS_LOS_ESTADOS.map((e) => ({ ...e, favorito: false }))
  );
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<TipoOrden>('az');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const rutaActual = usePathname();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animsFav = useRef<Map<number, Animated.Value>>(new Map()).current;

  const obtenerAnimFav = (id: number) => {
    if (!animsFav.has(id)) {animsFav.set(id, new Animated.Value(1));}
    return animsFav.get(id)!;
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      NavigationBar.setBackgroundColorAsync(isDark ? '#1A1A1A' : '#FFFFFF');
    }
  }, [isDark]);

  useFocusEffect(
    useCallback(() => {
      const iniciar = async () => {
        setCargando(true);
        const usuario = await obtenerUsuarioActivo();
        if (usuario) {
          setUsuarioId(usuario.id);
          setNombreUsuario(usuario.nombre?.split(' ')[0] ?? '');
          const idsFav = await cargarFavoritos(usuario.id);
          setEstados((ant) => ant.map((e) => ({ ...e, favorito: idsFav.includes(e.id) })));
        }
        setCargando(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
      };
      iniciar();
    }, [fadeAnim])
  );

  const manejarFavorito = async (id: number) => {
    if (!usuarioId) {return;}
    // Animación spring: crece y vuelve
    const anim = obtenerAnimFav(id);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.4, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 6 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 20, bounciness: 4 }),
    ]).start();
    try {
      const idsActualizados = await alternarFavoritoBD(usuarioId, id);
      setEstados((ant) => ant.map((e) => ({ ...e, favorito: idsActualizados.includes(e.id) })));
    } catch {
      // silencioso — el estado local no se actualiza y el usuario puede reintentar
    }
  };

  const estadosFiltrados = estados
    .filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((e) => categoriaActiva === 'Todos' || e.categoria === categoriaActiva)
    .sort((a, b) => {
      if (orden === 'mas_caro') {return b.precio - a.precio;}
      if (orden === 'mas_barato') {return a.precio - b.precio;}
      return a.nombre.localeCompare(b.nombre);
    });

  const navegarPestana = (ruta: string) => router.replace(ruta as any);

  const estaActiva = (ruta: string) => {
    const segmento = ruta.replace('/(tabs)', '');
    return rutaActual.endsWith(segmento);
  };

  const etiquetaOrdenActual = OPCIONES_ORDEN.find((o) => o.clave === orden)?.etiqueta ?? 'Ordenar';

  const renderizarEstado = ({ item }: { item: Estado }) => (
    <DestinoCard
      item={item}
      fadeAnim={fadeAnim}
      animFav={obtenerAnimFav(item.id)}
      onToggleFavorito={manejarFavorito}
    />
  );

  // Sidebar (PC)
  const renderSidebar = () => (
    <View style={[estilos.sidebar, { backgroundColor: tema.superficieBlanca, borderRightColor: tema.borde }]}>
      <Image source={require('../../assets/images/logo.png')} style={estilos.logoSidebar} resizeMode="contain" />
      <View style={[estilos.separadorSidebar, { backgroundColor: tema.borde }]} />
      {Array.isArray(PESTANAS) &&
        PESTANAS.map((p) => {
          const activa = estaActiva(p.ruta);
          return (
            <TouchableOpacity
              key={p.ruta}
              style={[estilos.itemSidebar, activa && { backgroundColor: isDark ? tema.primarioSuave : Tema.primarioSuave }]}
              onPress={() => navegarPestana(p.ruta)}
              activeOpacity={0.75}
            >
              <Image source={activa ? p.iconoRojo : p.iconoGris} style={estilos.iconoSidebar} resizeMode="contain" />
            </TouchableOpacity>
          );
        })}
      <View style={{ flex: 1 }} />
    </View>
  );

  // Contenido principal
  const renderContenido = () => (
    <View style={{ flex: 1 }}>
      {/* Encabezado */}
      <View style={[estilos.encabezado, { height: HEADER_HEIGHT, backgroundColor: tema.fondo }]}>
        {!esPC && (
          <Image source={require('../../assets/images/logo.png')} style={estilos.logoFijo} resizeMode="contain" />
        )}
        <View style={{ flex: 1, paddingLeft: esPC ? 0 : 60 }}>
          {nombreUsuario ? <Text style={[estilos.saludo, { color: tema.textoMuted }]}>¡Hola, {nombreUsuario}! 👋</Text> : null}
          <Text style={[estilos.tituloEncabezado, { color: tema.texto }]}>Descubre México</Text>
        </View>

        <View style={estilos.iconosEncabezado}>
          <TouchableOpacity
            style={[
              estilos.botonIcono,
              {
                backgroundColor: isDark ? tema.superficie : tema.superficieBlanca,
                borderColor: isDark ? tema.borde : tema.bordeInput,
              },
            ]}
            onPress={() => router.push(RUTAS_APP.NOTIFICACIONES as any)}
          >
            <Image source={require('../../assets/images/notificaciones.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.contenedorCentrado}>
        {/* Búsqueda + filtro */}
        <View style={[estilos.filaBusqueda, { zIndex: 20 }]}>
          <View style={estilos.cajaBusqueda}>
            <Image source={require('../../assets/images/busqueda.png')} style={estilos.iconoBusquedaImg} resizeMode="contain" />
            <TextInput
              testID="search-input"
              style={estilos.inputBusqueda}
              placeholder="Buscar destino..."
              placeholderTextColor={Tema.textoMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Text style={{ fontSize: 16, color: Tema.textoMuted, paddingHorizontal: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={[estilos.botonFiltro, dropdownAbierto && estilos.botonFiltroActivo]}
              onPress={() => setDropdownAbierto((v) => !v)}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/images/filtro.png')} style={estilos.iconoFiltroImg} resizeMode="contain" />
              <Text style={[estilos.textoFiltro, dropdownAbierto && { color: '#fff' }]} numberOfLines={1}>
                {etiquetaOrdenActual}
              </Text>
              <Text style={[estilos.chevron, dropdownAbierto && { color: '#fff' }]}>{dropdownAbierto ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Dropdown: posicionado relativo al botón, con zIndex alto */}
            {dropdownAbierto && (
              <View style={[estilos.dropdown, { top: 48, right: 0, zIndex: 999 }]}>
                {OPCIONES_ORDEN.map((op, i) => (
                  <TouchableOpacity
                    key={op.clave}
                    style={[
                      estilos.filaDropdown,
                      orden === op.clave && estilos.filaDropdownActiva,
                      i < OPCIONES_ORDEN.length - 1 && estilos.filaDropdownBorde,
                    ]}
                    onPress={() => {
                      setOrden(op.clave);
                      setDropdownAbierto(false);
                    }}
                  >
                    <Text style={[estilos.textoDropdown, orden === op.clave && estilos.textoDropdownActivo]}>
                      {op.etiqueta}
                    </Text>
                    {orden === op.clave && <Text style={{ color: Tema.primario, fontSize: 14 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Categorías */}
        <View style={estilos.listaCategoriasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.listaCategorias}
            bounces={false}
          >
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[estilos.chipCategoria, categoriaActiva === cat && estilos.chipCategoriaActivo]}
                onPress={() => setCategoriaActiva(cat)}
              >
                <Text style={[estilos.textoChip, categoriaActiva === cat && estilos.textoChipActivo]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={estilos.contadorResultados}>
          {estadosFiltrados.length} destino{estadosFiltrados.length !== 1 ? 's' : ''} encontrado
          {estadosFiltrados.length !== 1 ? 's' : ''}
        </Text>

        {/* Overlay para cerrar dropdown: zIndex menor que filaBusqueda (20) para no tapar el dropdown */}
        {dropdownAbierto && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
            onPress={() => setDropdownAbierto(false)}
            activeOpacity={1}
          />
        )}

        {cargando ? (
          <SkeletonLista cantidad={4} />
        ) : estadosFiltrados.length === 0 ? (
          <View style={estilos.vacio}>
            <Text style={estilos.textoVacio}>🗺️</Text>
            <Text style={estilos.tituloVacio}>Sin resultados</Text>
            <Text style={estilos.subtituloVacio}>Intenta con otra búsqueda o categoría</Text>
            <TouchableOpacity onPress={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}>
              <Text style={estilos.limpiarFiltros}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={estadosFiltrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderizarEstado}
            contentContainerStyle={estilos.contenidoLista}
            showsVerticalScrollIndicator={false}
            initialNumToRender={LIST_PERF_PRESET.initialNumToRender}
            maxToRenderPerBatch={LIST_PERF_PRESET.maxToRenderPerBatch}
            windowSize={LIST_PERF_PRESET.windowSize}
            updateCellsBatchingPeriod={LIST_PERF_PRESET.updateCellsBatchingPeriod}
            removeClippedSubviews={LIST_PERF_PRESET.removeClippedSubviews}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={[estilos.raiz, { backgroundColor: tema.fondo }]} testID="menu-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tema.fondo} />
      <Image source={require('../../assets/images/mapa.png')} style={[estilos.imagenMapa, { opacity: tema.mapaOverlay }]} resizeMode="contain" />

      {esPC ? (
        // Diseño PC: sidebar + contenido en fila
        <View style={estilos.layoutPC}>
          {renderSidebar()}
          <SafeAreaView style={estilos.areaSeguraPC}>{renderContenido()}</SafeAreaView>
        </View>
      ) : (
        // Diseño móvil: contenido + barra inferior
        <View style={estilos.layoutMovil}>
          <SafeAreaView style={estilos.areaSeguraMovil}>{renderContenido()}</SafeAreaView>

          {/* Barra inferior de pestañas */}
          <View style={[estilos.envolturaBarra, { backgroundColor: tema.superficieBlanca, borderTopColor: tema.borde, paddingBottom: Math.max(bottomInset, 10), ...(isDark ? sombraBarraInferiorOscura : sombraBarraInferior) }]}>
            <View style={[estilos.barraPestanas, { backgroundColor: tema.superficieBlanca }]}>
              {Array.isArray(PESTANAS) &&
                PESTANAS.map((p) => {
                  const activa = estaActiva(p.ruta);
                  return (
                    <TouchableOpacity key={p.ruta} testID={p.ruta.replace('/(tabs)/', '') + '-tab'} style={estilos.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                      <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      <Text style={[estilos.etiquetaPestana, { color: tema.textoMuted }, activa && estilos.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa: { opacity: 0.15, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },

  // Layouts
  layoutPC: { flex: 1, flexDirection: 'row' },
  layoutMovil: { flex: 1, flexDirection: 'column' },
  areaSeguraPC: { flex: 1 },
  areaSeguraMovil: { flex: 1 },

  // Sidebar PC
  sidebar: {
    width: 64,
    backgroundColor: Tema.superficieBlanca,
    borderRightWidth: 1,
    borderRightColor: Tema.borde,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    gap: 4,
  },
  logoSidebar: { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar: { width: 40, height: 1, backgroundColor: Tema.borde, marginVertical: 12 },
  itemSidebar: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo: { backgroundColor: Tema.primarioSuave },
  iconoSidebar: { width: 28, height: 28 },

  // Encabezado
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  logoFijo: { width: 46, height: 46, marginRight: 8 },
  saludo: { fontSize: 12, color: Platform.OS === 'android' ? Tema.primario : Tema.textoMuted, fontWeight: '600' },
  tituloEncabezado: { fontSize: 20, fontWeight: '800', color: Platform.OS === 'android' ? Tema.primario : Tema.texto, letterSpacing: -0.4 },
  iconosEncabezado: { flexDirection: 'row', alignItems: 'center' },
  botonIcono: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Tema.superficieBlanca,
    borderWidth: 1.5,
    borderColor: Tema.bordeInput,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A3D38',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      default: { elevation: 3 },
    }),
  },
  iconoEncabezado: { width: 26, height: 26 },

  contenedorCentrado: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },

  // Búsqueda
  filaBusqueda: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  cajaBusqueda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Tema.superficieBlanca,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Tema.borde,
    paddingHorizontal: 14,
    height: 46,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      default: { elevation: 2 },
    }),
  },
  iconoBusquedaImg: { width: 18, height: 18, marginRight: 6 },
  inputBusqueda: { flex: 1, fontSize: 15, color: Tema.texto },

  // Filtro dropdown
  botonFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Tema.primario,
    backgroundColor: Tema.superficieBlanca,
    minWidth: 132,
    ...Platform.select({
      ios: {
        shadowColor: Tema.primarioOscuro,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      default: { elevation: 3 },
    }),
  },
  botonFiltroActivo: { backgroundColor: Tema.primario, borderColor: Tema.primario },
  iconoFiltroImg: { width: 16, height: 16, marginRight: 8 },
  textoFiltro: { fontSize: 13, color: '#3AB7A5', fontWeight: '600', flex: 1 },
  chevron: { fontSize: 10, color: '#3AB7A5' },
  dropdown: {
    position: 'absolute',
    width: 188,
    backgroundColor: Tema.superficieBlanca,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Tema.borde,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  filaDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  filaDropdownActiva: { backgroundColor: Tema.primarioSuave },
  filaDropdownBorde: { borderBottomWidth: 1, borderBottomColor: Tema.borde },
  textoDropdown: { fontSize: 14, color: Tema.textoSecundario },
  textoDropdownActivo: { color: Tema.primarioOscuro, fontWeight: '700' },

  // Categorías
  listaCategoriasContainer: {
    marginVertical: 4,
    height: 56, // altura fija para el contenedor
    justifyContent: 'center',
  },
  listaCategorias: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56, // asegura que el scroll mantenga altura
  },
  chipCategoria: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
    backgroundColor: Tema.superficieBlanca,
    borderWidth: 1,
    borderColor: Tema.borde,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      default: { elevation: 2 },
    }),
  },
  chipCategoriaActivo: { backgroundColor: Tema.primario, borderColor: Tema.primario },
  textoChip: { fontSize: 14, fontWeight: '600', color: Tema.textoSecundario, lineHeight: 18 },
  textoChipActivo: { color: '#fff', fontWeight: '700' },
  contadorResultados: { fontSize: 13, color: Tema.textoMuted, marginHorizontal: 16, marginBottom: 8, marginTop: 4, fontWeight: '500' },

  // Tarjetas
  contenidoLista: { paddingHorizontal: 14, paddingBottom: 20, flexGrow: 1 },
  tarjetaContenedor: { position: 'relative', marginBottom: 14 },
  tarjeta: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 192,
    backgroundColor: Tema.borde,
    borderWidth: 1,
    borderColor: Tema.bordeInput,
    ...Platform.select({
      ios: {
        shadowColor: '#1A3D38',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      default: { elevation: 6 },
    }),
  },
  imagenTarjeta: { width: '100%', height: '100%', position: 'absolute' },
  sombra: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 96, backgroundColor: 'rgba(0,0,0,0.45)' },
  badgeCategoria: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(46,154,138,0.92)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14 },
  textoBadge: { color: '#fff', fontSize: 11, fontWeight: '700' },
  badgePrecio: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14 },
  textoPrecio: { color: '#fff', fontSize: 11, fontWeight: '600' },
  nombreTarjeta: { position: 'absolute', bottom: 32, left: 14, fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  descripcionTarjeta: { position: 'absolute', bottom: 12, left: 14, fontSize: 12, color: 'rgba(255,255,255,0.92)', width: '72%', lineHeight: 16 },
  botonFavorito: { position: 'absolute', top: 12, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 }, default: { elevation: 4 } }) },

  // Vacío
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  textoVacio: { fontSize: 48 },
  tituloVacio: { fontSize: 18, fontWeight: '700', color: Tema.texto },
  subtituloVacio: { fontSize: 13, color: Tema.textoMuted },
  limpiarFiltros: { marginTop: 10, color: Tema.acento, fontWeight: '700', fontSize: 14 },

  // Barra inferior móvil (la sombra oscura se aplica inline desde isDark)
  envolturaBarra: {
    width: '100%',
    backgroundColor: Tema.superficieBlanca,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 10,
  },
  barraPestanas: { flexDirection: 'row', backgroundColor: 'transparent', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana: { fontSize: 10, color: Tema.textoMuted, marginTop: 2, fontWeight: '500' },
  etiquetaPestanaActiva: { color: Tema.acento, fontWeight: '700' },
});
