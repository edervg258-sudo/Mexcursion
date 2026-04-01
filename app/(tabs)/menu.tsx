import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { sombra } from '../../lib/estilos';
import {
  alternarFavorito as alternarFavoritoBD,
  cargarFavoritos,
  obtenerTodosLosDestinos,
  obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { sombraBarraInferior, Tema } from '../../lib/tema';

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

  const HEADER_HEIGHT = 72;

  const [estados, setEstados] = useState<Estado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<TipoOrden>('az');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const rutaActual = usePathname();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animsFav = useRef<Map<number, Animated.Value>>(new Map()).current;

  const obtenerAnimFav = (id: number) => {
    if (!animsFav.has(id)) animsFav.set(id, new Animated.Value(1));
    return animsFav.get(id)!;
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const iniciar = async () => {
        const usuario = await obtenerUsuarioActivo();
        if (!usuario) { router.replace('/login'); return; }
        setUsuarioId(usuario.id);
        setNombreUsuario(usuario.nombre?.split(' ')[0] ?? '');
        
        const [idsFav, destinosDB] = await Promise.all([
          cargarFavoritos(usuario.id),
          obtenerTodosLosDestinos()
        ]);

        const idsActivos: Set<number> = destinosDB.length > 0
          ? new Set(destinosDB.filter((d: any) => d.activo !== 0).map((d: any) => Number(d.id)))
          : new Set(TODOS_LOS_ESTADOS.map(e => e.id));

        const destinosMapeados = TODOS_LOS_ESTADOS
          .filter(e => idsActivos.has(e.id))
          .map(e => ({ ...e, favorito: idsFav.map(Number).includes(e.id) }));

        setEstados(destinosMapeados);
        setCargando(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
      };
      iniciar();
    }, [])
  );

  const manejarFavorito = async (id: number) => {
    if (!usuarioId) return;
    const anim = obtenerAnimFav(id);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.4, useNativeDriver: true, speed: 40, bounciness: 6 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
    try {
      const idsActualizados = await alternarFavoritoBD(usuarioId, id);
      setEstados((ant) => ant.map((e) => ({ ...e, favorito: idsActualizados.includes(e.id) })));
    } catch (err) {
      // error silencioso al alternar favorito
    }
  };

  const estadosFiltrados = estados
    .filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((e) => categoriaActiva === 'Todos' || e.categoria === categoriaActiva)
    .sort((a, b) => {
      if (orden === 'mas_caro') return b.precio - a.precio;
      if (orden === 'mas_barato') return a.precio - b.precio;
      return a.nombre.localeCompare(b.nombre);
    });

  const navegarPestana = (ruta: string) => router.replace(ruta as any);

  const estaActiva = (ruta: string) => {
    const segmento = ruta.replace('/(tabs)', '');
    return rutaActual.endsWith(segmento);
  };

  const etiquetaOrdenActual = OPCIONES_ORDEN.find((o) => o.clave === orden)?.etiqueta ?? 'Ordenar';

  const renderizarEstado = ({ item }: { item: Estado }) => (
    <View style={estilos.tarjetaContenedor}>
        <TouchableOpacity
          style={estilos.tarjeta}
          activeOpacity={0.88}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/detalle',
              params: { nombre: item.nombre, categoria: item.categoria },
            } as any)
          }
        >
          <Image source={item.imagen} style={estilos.imagenTarjeta} resizeMode="cover" />
          <View style={estilos.sombraOverlay} />
          <View style={estilos.badgeCategoria}>
            <Text style={estilos.textoBadge}>{item.categoria}</Text>
          </View>
          <Text style={estilos.nombreTarjeta}>{item.nombre}</Text>
          <Text style={estilos.precioTarjeta}>Desde ${item.precio.toLocaleString()} MXN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.botonFavorito}
          onPress={() => manejarFavorito(item.id)}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: obtenerAnimFav(item.id) }] }}>
            <Image
              source={
                item.favorito
                  ? require('../../assets/images/favoritos_rojo.png')
                  : require('../../assets/images/favoritos_gris.png')
              }
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
  );

  const renderSidebar = () => (
    <View style={estilos.sidebar}>
      <Image source={require('../../assets/images/logo.png')} style={estilos.logoSidebar} resizeMode="contain" />
      <View style={estilos.separadorSidebar} />
      {Array.isArray(PESTANAS) &&
        PESTANAS.map((p) => {
          const activa = estaActiva(p.ruta);
          return (
            <TouchableOpacity
              key={p.ruta}
              style={[estilos.itemSidebar, activa && estilos.itemSidebarActivo]}
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

  const renderContenido = () => (
    <View style={{ flex: 1 }}>
      <View style={[estilos.encabezado, { height: HEADER_HEIGHT }]}>
        {!esPC && (
          <Image source={require('../../assets/images/logo.png')} style={estilos.logoFijo} resizeMode="contain" />
        )}
        <View style={{ flex: 1, paddingLeft: esPC ? 0 : 60 }}>
          {nombreUsuario ? <Text style={estilos.saludo}>Hola, {nombreUsuario}</Text> : null}
          <Text style={estilos.tituloEncabezado}>Descubre México</Text>
        </View>

        <View style={estilos.iconosEncabezado}>
          <TouchableOpacity style={[estilos.botonIcono, { marginRight: 8 }]} onPress={() => router.push('/(tabs)/notificaciones' as any)}>
            <Image source={require('../../assets/images/notificaciones.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonIcono} onPress={() => router.push('/(tabs)/perfil' as any)}>
            <Image source={require('../../assets/images/mapa.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.contenedorCentrado}>
        <View style={[estilos.filaBusqueda, { zIndex: 20 }]}>
          <View style={estilos.cajaBusqueda}>
            <Image source={require('../../assets/images/busqueda.png')} style={estilos.iconoBusquedaImg} resizeMode="contain" />
            <TextInput
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
          <View style={estilos.vacio}>
            <Text style={estilos.subtituloVacio}>Cargando destinos...</Text>
          </View>
        ) : estadosFiltrados.length === 0 ? (
          <View style={estilos.vacio}>
            <Text style={estilos.tituloVacio}>Sin resultados</Text>
            <Text style={estilos.subtituloVacio}>Intenta con otra búsqueda o categoría</Text>
            <TouchableOpacity onPress={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}>
              <Text style={estilos.limpiarFiltros}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={estadosFiltrados}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderizarEstado}
              contentContainerStyle={estilos.contenidoLista}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );

  return (
    <View style={estilos.raiz}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />

      {esPC ? (
        <View style={estilos.layoutPC}>
          {renderSidebar()}
          <SafeAreaView style={estilos.areaSeguraPC}>{renderContenido()}</SafeAreaView>
        </View>
      ) : (
        <View style={estilos.layoutMovil}>
          <SafeAreaView style={estilos.areaSeguraMovil}>{renderContenido()}</SafeAreaView>

          <View style={estilos.envolturaBarra}>
            <View style={estilos.barraPestanas}>
              {Array.isArray(PESTANAS) &&
                PESTANAS.map((p) => {
                  const activa = estaActiva(p.ruta);
                  return (
                    <TouchableOpacity key={p.ruta} style={estilos.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                      <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      <Text style={[estilos.etiquetaPestana, activa && estilos.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
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

  layoutPC: { flex: 1, flexDirection: 'row' },
  layoutMovil: { flex: 1, flexDirection: 'column' },
  areaSeguraPC: { flex: 1 },
  areaSeguraMovil: { flex: 1 },

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
  saludo: { fontSize: 12, color: Tema.textoMuted, fontWeight: '600' },
  tituloEncabezado: { fontSize: 20, fontWeight: '800', color: Tema.texto, letterSpacing: -0.4 },
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
    ...sombra({ color: '#1A3D38', opacity: 0.06, radius: 6, offsetY: 2, elevation: 3 }),
  },
  iconoEncabezado: { width: 26, height: 26 },

  contenedorCentrado: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },

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
    ...sombra({ opacity: 0.05, radius: 8, offsetY: 2, elevation: 2 }),
  },
  iconoBusquedaImg: { width: 18, height: 18, marginRight: 6 },
  inputBusqueda: { flex: 1, fontSize: 15, color: Tema.texto },

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
    ...sombra({ color: Tema.primarioOscuro, opacity: 0.12, radius: 6, offsetY: 2, elevation: 3 }),
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
    ...sombra({ opacity: 0.14, radius: 16, offsetY: 8, elevation: 20 }),
  },
  filaDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  filaDropdownActiva: { backgroundColor: Tema.primarioSuave },
  filaDropdownBorde: { borderBottomWidth: 1, borderBottomColor: Tema.borde },
  textoDropdown: { fontSize: 14, color: Tema.textoSecundario },
  textoDropdownActivo: { color: Tema.primarioOscuro, fontWeight: '700' },

  listaCategoriasContainer: {
    marginVertical: 4,
    height: 56,
    justifyContent: 'center',
  },
  listaCategorias: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
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
    ...sombra({ opacity: 0.05, radius: 4, offsetY: 1, elevation: 2 }),
  },
  chipCategoriaActivo: { backgroundColor: Tema.primario, borderColor: Tema.primario },
  textoChip: { fontSize: 14, fontWeight: '600', color: Tema.textoSecundario, lineHeight: 18 },
  textoChipActivo: { color: '#fff', fontWeight: '700' },
  contadorResultados: { fontSize: 13, color: Tema.textoMuted, marginHorizontal: 16, marginBottom: 8, marginTop: 4, fontWeight: '500' },

  contenidoLista: { paddingHorizontal: 14, paddingBottom: 20, flexGrow: 1 },
  tarjetaContenedor: { position: 'relative', marginBottom: 14 },
  tarjeta: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: Tema.primario,
    ...sombra({ opacity: 0.1, radius: 8, offsetY: 4, elevation: 4 }),
  },
  imagenTarjeta: { width: '100%', height: '100%', position: 'absolute' },
  sombraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.35)' },
  badgeCategoria: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(46,154,138,0.92)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoBadge: { color: '#fff', fontSize: 11, fontWeight: '700' },
  nombreTarjeta: { position: 'absolute', bottom: 28, left: 14, fontSize: 20, fontWeight: '700', color: '#fff' },
  precioTarjeta: { position: 'absolute', bottom: 10, left: 14, fontSize: 12, color: '#ffffffcc' },
  botonFavorito: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...sombra({ opacity: 0.15, radius: 4, offsetY: 2, elevation: 3 }),
  },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  tituloVacio: { fontSize: 18, fontWeight: '700', color: Tema.texto },
  subtituloVacio: { fontSize: 13, color: Tema.textoMuted },
  limpiarFiltros: { marginTop: 10, color: Tema.acento, fontWeight: '700', fontSize: 14 },

  envolturaBarra: {
    width: '100%',
    backgroundColor: Tema.superficieBlanca,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 16 : 10,
    ...sombraBarraInferior,
  },
  barraPestanas: { flexDirection: 'row', backgroundColor: 'transparent', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana: { fontSize: 10, color: Tema.textoMuted, marginTop: 2, fontWeight: '500' },
  etiquetaPestanaActiva: { color: Tema.acento, fontWeight: '700' },
});