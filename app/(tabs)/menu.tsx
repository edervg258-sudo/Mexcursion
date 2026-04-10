import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { sombra } from '../../lib/estilos';
import { useIdioma } from '../../lib/IdiomaContext';
import {
    alternarFavorito as alternarFavoritoBD,
    cargarFavoritos,
    obtenerTodosLosDestinos,
    obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { Tema } from '../../lib/tema';
import { SkeletonLista } from './skeletonloader';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

type Estado = typeof TODOS_LOS_ESTADOS[0] & { favorito: boolean };
type TipoOrden = 'mas_caro' | 'mas_barato' | 'az';

export default function MenuScreen() {
  const { width } = useWindowDimensions();
  const esPC = width >= 768;
  const { t } = useIdioma();

  const CATEGORIAS: { clave: string; etiqueta: string }[] = [
    { clave: 'Todos',        etiqueta: t('menu_cat_todos')   },
    { clave: 'Playa',        etiqueta: t('menu_cat_playa')   },
    { clave: 'Cultura',      etiqueta: t('menu_cat_cultura') },
    { clave: 'Aventura',     etiqueta: t('menu_cat_aventura')},
    { clave: 'Gastronomía',  etiqueta: t('menu_cat_gastro')  },
    { clave: 'Ciudad',       etiqueta: t('menu_cat_ciudad')  },
  ];

  const OPCIONES_ORDEN: { clave: TipoOrden; etiqueta: string }[] = [
    { clave: 'az',         etiqueta: t('menu_orden_az')       },
    { clave: 'mas_barato', etiqueta: t('menu_menor_precio')   },
    { clave: 'mas_caro',   etiqueta: t('menu_mayor_precio')   },
  ];

  const HEADER_HEIGHT = 72;

  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<TipoOrden>('az');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const fadeAnim       = useRef(new Animated.Value(0)).current;
  const resultAnim     = useRef(new Animated.Value(1)).current;
  const resultSlide    = useRef(new Animated.Value(0)).current;
  const montadoRef     = useRef(false);
  const animsFav       = useRef<Map<number, Animated.Value>>(new Map()).current;
  const animsChip      = useRef<Map<string, Animated.Value>>(new Map()).current;
  const animsCard      = useRef<Map<number, Animated.Value>>(new Map()).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const dropdownFade   = useRef(new Animated.Value(0)).current;
  const dropdownSlide  = useRef(new Animated.Value(-8)).current;

  const obtenerAnimFav = (id: number) => {
    if (!animsFav.has(id)) { animsFav.set(id, new Animated.Value(1)); }
    return animsFav.get(id)!;
  };

  const obtenerAnimChip = (key: string) => {
    if (!animsChip.has(key)) { animsChip.set(key, new Animated.Value(1)); }
    return animsChip.get(key)!;
  };

  const obtenerAnimCard = (id: number) => {
    if (!animsCard.has(id)) { animsCard.set(id, new Animated.Value(1)); }
    return animsCard.get(id)!;
  };

  const animarChip = (key: string) => {
    const a = obtenerAnimChip(key);
    Animated.sequence([
      Animated.spring(a, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 2 }),
      Animated.spring(a, { toValue: 1,    useNativeDriver: true, speed: 25, bounciness: 8 }),
    ]).start();
  };

  const cardPressIn = (id: number) => {
  Animated.spring(obtenerAnimCard(id), {
    toValue: 0.96,
    useNativeDriver: true,
    speed: 50,
    bounciness: 2,
  }).start();
};

const cardPressOut = (id: number) => {
  Animated.spring(obtenerAnimCard(id), {
    toValue: 1,
    useNativeDriver: true,
    speed: 25,
    bounciness: 6,
  }).start();
};
  useEffect(() => {
    configurarBarraAndroid();
  }, []);

  const { data: usuario, isLoading: loadingUsr } = useQuery({
    queryKey: ['usuarioActivo'],
    queryFn: obtenerUsuarioActivo,
    staleTime: 1000 * 60 * 60,
  });

  const usuarioId = usuario?.id ?? null;
  const nombreUsuario = usuario?.nombre?.split(' ')[0] ?? '';

  const { data: favoritosIds = [], isLoading: loadingFavs } = useQuery({
    queryKey: ['favoritos', usuarioId],
    queryFn: () => cargarFavoritos(usuarioId!),
    enabled: !!usuarioId,
  });

  const { data: destinosBD = [], isLoading: loadingDest } = useQuery({
    queryKey: ['destinosBD'],
    queryFn: obtenerTodosLosDestinos,
    staleTime: 1000 * 60 * 30,
  });

  const cargando = loadingUsr || loadingFavs || loadingDest;

  useEffect(() => {
    if (loadingUsr) { return; }
    // usuario === null → sin sesión confirmada; undefined → aún no cargó
    if (usuario === null) {
      setTimeout(() => router.replace('/login'), 0);
    } else if (usuario) {
      setVerificandoSesion(false);
    }
  }, [usuario, loadingUsr]);

  const estados = useMemo(() => {
    const idsActivos: Set<number> = destinosBD.length > 0
      ? new Set(destinosBD.filter((d: any) => d.activo !== 0).map((d: any) => Number(d.id)))
      : new Set(TODOS_LOS_ESTADOS.map(e => e.id));

    return TODOS_LOS_ESTADOS
      .filter(e => idsActivos.has(e.id))
      .map(e => ({ ...e, favorito: favoritosIds.map(Number).includes(e.id) }));
  }, [destinosBD, favoritosIds]);

  useEffect(() => {
    if (!cargando) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [cargando, fadeAnim]);

  const mutarFavorito = useMutation({
    mutationFn: async (idDestino: number) => alternarFavoritoBD(usuarioId!, idDestino),
    onMutate: async (idDestino) => {
      await queryClient.cancelQueries({ queryKey: ['favoritos', usuarioId] });
      const prev = queryClient.getQueryData<number[]>(['favoritos', usuarioId]) || [];
      queryClient.setQueryData<number[]>(['favoritos', usuarioId], (old = []) => {
        if (old.includes(idDestino)) { return old.filter((id) => id !== idDestino); }
        return [...old, idDestino];
      });
      return { prev };
    },
    onError: (err, idDestino, context) => {
      queryClient.setQueryData(['favoritos', usuarioId], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favoritos', usuarioId] });
    }
  });

  const manejarFavorito = (id: number) => {
    if (!usuarioId) { return; }

    const anim = obtenerAnimFav(id);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    mutarFavorito.mutate(id);
  };

  useEffect(() => {
    if (!montadoRef.current) { montadoRef.current = true; return; }
    resultAnim.setValue(0);
    resultSlide.setValue(14);
    Animated.parallel([
      Animated.timing(resultAnim,  { toValue: 1, duration: 230, useNativeDriver: false }),
      Animated.spring(resultSlide, { toValue: 0, useNativeDriver: false, tension: 65, friction: 11 }),
    ]).start();
  }, [busqueda, categoriaActiva, orden, resultAnim, resultSlide]);

  const estadosFiltrados = useMemo(() => (
    [...estados]
      .filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .filter((e) => categoriaActiva === 'Todos' || (e.categoria as string) === categoriaActiva)
      .sort((a, b) => {
        if (orden === 'mas_caro') { return b.precio - a.precio; }
        if (orden === 'mas_barato') { return a.precio - b.precio; }
        return a.nombre.localeCompare(b.nombre);
      })
  ), [estados, busqueda, categoriaActiva, orden]);

  const etiquetaOrdenActual = OPCIONES_ORDEN.find((o) => o.clave === orden)?.etiqueta ?? t('menu_orden_az');

  const renderizarEstado = ({ item }: { item: Estado; index: number }) => {
  const anim = obtenerAnimCard(item.id);

  return (
    <Animated.View
      style={[
        estilos.tarjetaContenedor,
        {
          transform: [{ scale: anim }],
          opacity: anim,
        },
      ]}
    >
      <Pressable
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={({ pressed }) => [
          estilos.tarjeta,
          pressed && Platform.OS !== 'android' && { opacity: 0.85 },
        ]}
        onPressIn={() => cardPressIn(item.id)}
        onPressOut={() => cardPressOut(item.id)}
        onPress={() =>
          setTimeout(() => router.push({
            pathname: '/(tabs)/detalle',
            params: { nombre: item.nombre, categoria: item.categoria },
          } as any), 0)
        }
        accessibilityLabel={`${item.nombre}, ${item.categoria}, desde ${item.precio.toLocaleString()} MXN`}
        accessibilityHint="Toca para ver detalles y reservar"
        accessibilityRole="button"
      >
        <Image source={item.imagen} style={estilos.imagenTarjeta} contentFit="cover" transition={200} placeholder="#f0f0f0" />
        <View style={estilos.sombraOverlay} />

        <View style={estilos.badgeCategoria}>
          <Text style={estilos.textoBadge}>{item.categoria}</Text>
        </View>

        <Text style={estilos.nombreTarjeta}>{item.nombre}</Text>
        <Text style={estilos.precioTarjeta}>
          {t('menu_precio_desde', { precio: item.precio.toLocaleString() })}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => manejarFavorito(item.id)}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
        style={estilos.botonFavorito}
        accessibilityLabel={item.favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
        accessibilityHint="Toca para alternar favorito"
        accessibilityRole="button"
      >
        <Animated.View
          style={{
            transform: [{ scale: obtenerAnimFav(item.id) }],
          }}
        >
          <Image
            source={
              item.favorito
                ? require('../../assets/images/favoritos_rojo.png')
                : require('../../assets/images/favoritos_gris.png')
            }
            style={{ width: 20, height: 20 }}
            contentFit="contain"
            transition={150}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

  const renderContenido = () => {
    if (verificandoSesion) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Verificando sesión...</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={{ minHeight: HEADER_HEIGHT, justifyContent: 'center' }}>
          <TopActionHeader
            title={t('menu_subtitulo')}
            subtitle={nombreUsuario ? t('menu_saludo', { nombre: nombreUsuario }) : undefined}
            showInlineLogo={!esPC}
            onNotificationsPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as any), 0)}
          />
        </View>

        <View style={estilos.contenedorCentrado}>
          <View style={[estilos.filaBusqueda, { zIndex: 20 }]}>
              <Animated.View style={[estilos.cajaBusqueda, {
                borderColor: searchFocusAnim.interpolate({
                  inputRange: [0, 1], outputRange: [Tema.borde, Tema.primario],
                }),
                borderWidth: searchFocusAnim.interpolate({
                  inputRange: [0, 1], outputRange: [1, 2],
                }) as any,
              }]}>
                <Image source={require('../../assets/images/busqueda.png')} style={estilos.iconoBusquedaImg} contentFit="contain" />
                <TextInput
                  style={estilos.inputBusqueda}
                  placeholder={t('menu_buscar')}
                  placeholderTextColor={Tema.textoMuted}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  onFocus={() => Animated.spring(searchFocusAnim, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 2 }).start()}
                  onBlur={() => Animated.spring(searchFocusAnim, { toValue: 0, useNativeDriver: false, speed: 30, bounciness: 2 }).start()}
                  accessibilityLabel="Buscar destinos"
                  accessibilityHint="Escribe para filtrar destinos por nombre"
                />
                {busqueda.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setBusqueda('')}
                    accessibilityLabel="Limpiar búsqueda"
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 16, color: Tema.textoMuted, paddingHorizontal: 4 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>

            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={[estilos.botonFiltro, dropdownAbierto && estilos.botonFiltroActivo]}
                onPress={() => {
                  Animated.sequence([
                    Animated.spring(obtenerAnimChip('__filtro__'), { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 2 }),
                    Animated.spring(obtenerAnimChip('__filtro__'), { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 8 }),
                  ]).start();
                  const abriendo = !dropdownAbierto;
                  setDropdownAbierto(abriendo);
                  if (abriendo) {
                    dropdownFade.setValue(0);
                    dropdownSlide.setValue(-8);
                    Animated.parallel([
                      Animated.timing(dropdownFade,  { toValue: 1, duration: 180, useNativeDriver: true }),
                      Animated.spring(dropdownSlide, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
                    ]).start();
                  } else {
                    Animated.timing(dropdownFade, { toValue: 0, duration: 120, useNativeDriver: true }).start();
                  }
                }}
                activeOpacity={1}
                accessibilityLabel={`Ordenar por: ${etiquetaOrdenActual}`}
                accessibilityHint="Toca para cambiar el orden de los resultados"
                accessibilityRole="button"
              >
                <Image source={require('../../assets/images/filtro.png')} style={estilos.iconoFiltroImg} contentFit="contain" />
                <Text style={[estilos.textoFiltro, dropdownAbierto && { color: '#fff' }]} numberOfLines={1}>
                  {etiquetaOrdenActual}
                </Text>
                <Text style={[estilos.chevron, dropdownAbierto && { color: '#fff' }]}>{dropdownAbierto ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {dropdownAbierto && (
                <Animated.View style={[estilos.dropdown, { top: 48, right: 0, zIndex: 999 }, {
                  opacity: dropdownFade,
                  transform: [{ translateY: dropdownSlide }],
                }]}>
                  {OPCIONES_ORDEN.map((op, i) => (
                    <TouchableOpacity
                      key={op.clave}
                      style={[
                        estilos.filaDropdown,
                        orden === op.clave && estilos.filaDropdownActiva,
                        i < OPCIONES_ORDEN.length - 1 && estilos.filaDropdownBorde,
                      ]}
                      onPress={() => {
                        Animated.timing(dropdownFade, { toValue: 0, duration: 100, useNativeDriver: true })
                          .start(() => { setOrden(op.clave); setDropdownAbierto(false); });
                      }}
                    >
                      <Text style={[estilos.textoDropdown, orden === op.clave && estilos.textoDropdownActivo]}>
                        {op.etiqueta}
                      </Text>
                      {orden === op.clave && <Text style={{ color: Tema.primario, fontSize: 14 }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
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
                  key={cat.clave}
                  onPress={() => { animarChip(cat.clave); setCategoriaActiva(cat.clave); }}
                  activeOpacity={1}
                >
                  <Animated.View style={[
                    estilos.chipCategoria,
                    categoriaActiva === cat.clave && estilos.chipCategoriaActivo,
                    { transform: [{ scale: obtenerAnimChip(cat.clave) }] },
                  ]}>
                    <Text style={[estilos.textoChip, categoriaActiva === cat.clave && estilos.textoChipActivo]}>{cat.etiqueta}</Text>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={estilos.contadorResultados}>
            {estadosFiltrados.length} {estadosFiltrados.length !== 1 ? t('menu_destino_plural') : t('menu_destino_singular')}
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
            <SkeletonLista cantidad={4} />
          ) : estadosFiltrados.length === 0 ? (
            <View style={estilos.vacio}>
              <Text style={estilos.tituloVacio}>{t('menu_sin_resultados')}</Text>
              <Text style={estilos.subtituloVacio}>{t('menu_sin_resultados2')}</Text>
              <TouchableOpacity onPress={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}>
                <Text style={estilos.limpiarFiltros}>{t('menu_limpiar')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              <Animated.View style={{ flex: 1, opacity: resultAnim, transform: [{ translateY: resultSlide }] }}>
                <AnimatedFlashList
                  data={estadosFiltrados}
                  estimatedItemSize={200}
                  keyExtractor={(item: any) => String(item.id)}
                  renderItem={renderizarEstado as any}
                  contentContainerStyle={estilos.contenidoLista}
                  showsVerticalScrollIndicator={false}
                />
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </View>
    );
  };

  return (
    <TabChrome esPC={esPC} maxWidth={900} showLogoWhenNoTitle={false}>
      {renderContenido()}
    </TabChrome>
  );
}

const estilos = StyleSheet.create({
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
});
