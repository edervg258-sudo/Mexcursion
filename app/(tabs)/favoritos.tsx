import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated, FlatList, Image, ImageSourcePropType, LayoutAnimation, Platform,
    RefreshControl, StyleSheet, Text,
    TouchableOpacity, UIManager, View, useWindowDimensions,
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useIdioma } from '../../lib/IdiomaContext';
import { alternarFavorito, cargarFavoritos, obtenerTodosLosDestinos, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { TraduccionClave } from '../../lib/traducciones';
import { useTemaContext } from '../../lib/TemaContext';
import { SkeletonLista } from './skeletonloader';

type FavoritoItem = { id: number; nombre: string; categoria: string; precio: number; imagen: ImageSourcePropType };

if (Platform.OS === 'android' && !(globalThis as Record<string, unknown>).nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FavCard — igual que las tarjetas de menu.tsx ─────────────────────────────
const FavCard = ({ item, idx, t, onPress, onRemove }: {
  item: FavoritoItem; idx: number; t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
  onPress: (item: FavoritoItem) => void;
  onRemove: (id: number) => void;
}) => {
  const entradaAnim = useRef(new Animated.Value(0)).current;
  const escalaCard  = useRef(new Animated.Value(1)).current;
  const escalaFav   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Animated.spring as any)(entradaAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 55, friction: 10, delay: idx * 65 }).start();
  }, [entradaAnim, idx]);

  const pressIn  = () => Animated.spring(escalaCard, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 2 }).start();
  const pressOut = () => Animated.spring(escalaCard, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 6 }).start();

  const handleRemove = () => {
    Animated.sequence([
      Animated.spring(escalaFav, { toValue: 1.38, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }),
      Animated.spring(escalaFav, { toValue: 0,    useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 0 }),
    ]).start(() => onRemove(item.id));
  };

  return (
    <Animated.View style={[s.tarjetaContenedor, {
      opacity: entradaAnim,
      transform: [
        { scale: escalaCard },
        { translateY: entradaAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
      ],
    }]}>
      <TouchableOpacity
        style={s.tarjeta}
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => onPress(item)}
      >
        <Image source={item.imagen} style={s.imagenTarjeta} resizeMode="cover" />
        <View style={s.sombra} />
        <View style={s.badgeCategoria}>
          <Text style={s.badgeCategoriaTxt}>{item.categoria}</Text>
        </View>
        <Text style={s.nombreTarjeta}>{item.nombre}</Text>
        <Text style={s.precioTarjeta}>{t('fav_precio_desde', { precio: item.precio.toLocaleString() })}</Text>
      </TouchableOpacity>
      {/* Botón quitar favorito */}
      <TouchableOpacity style={s.botonFavorito} onPress={handleRemove} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: escalaFav }] }}>
          <Image source={require('../../assets/images/favoritos_rojo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function FavoritosScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t } = useIdioma();
  const { tema } = useTemaContext();

  useEffect(() => {
    configurarBarraAndroid();
  }, []);

  const [estadosFavoritos, setEstadosFavoritos] = useState<FavoritoItem[]>([]);
  const [usuarioId, setUsuarioId]       = useState<string | null>(null);
  const [cargando, setCargando]   = useState(true);
  const [recargando, setRecargando] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalCategorias = useMemo(
    () => new Set(estadosFavoritos.map(item => item.categoria)).size,
    [estadosFavoritos]
  );
  const previewFavoritos = useMemo(
    () => estadosFavoritos.slice(0, 3).map(item => item.nombre).join(' · '),
    [estadosFavoritos]
  );

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { setTimeout(() => router.replace('/login'), 0); return; }
      setUsuarioId(usuario.id);

      const [idsFav, destinosDB] = await Promise.all([
        cargarFavoritos(usuario.id),
        obtenerTodosLosDestinos()
      ]);

      const mapeados = destinosDB
        .filter((d: Record<string, unknown>) => idsFav.includes(d.id as number))
        .map((d: Record<string, unknown>) => {
          const original = TODOS_LOS_ESTADOS.find(e => e.id === d.id);
          return {
            id: d.id as number, nombre: d.nombre as string, categoria: d.categoria as string,
            precio: d.precio as number, imagen: original ? original.imagen : TODOS_LOS_ESTADOS[0].imagen
          };
        });
      setEstadosFavoritos(mapeados);
      setCargando(false);
      Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 45, friction: 9 }).start();
    };
    cargar();
  }, [fadeAnim]));

  const onRefresh = useCallback(async () => {
    if (!usuarioId) { return; }
    setRecargando(true);
    const [idsFav, destinosDB] = await Promise.all([cargarFavoritos(usuarioId), obtenerTodosLosDestinos()]);
    const mapeados = destinosDB
      .filter((d: Record<string, unknown>) => idsFav.includes(d.id as number))
      .map((d: Record<string, unknown>) => {
        const original = TODOS_LOS_ESTADOS.find(e => e.id === d.id);
        return { id: d.id as number, nombre: d.nombre as string, categoria: d.categoria as string, precio: d.precio as number, imagen: original ? original.imagen : TODOS_LOS_ESTADOS[0].imagen };
      });
    setEstadosFavoritos(mapeados);
    setRecargando(false);
  }, [usuarioId]);

  const quitarFavorito = async (id: number) => {
    if (!usuarioId) { return; }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEstadosFavoritos(ant => ant.filter(f => f.id !== id));
    await alternarFavorito(usuarioId, id);
  };

  // ── Contenido ──────────────────────────────────────────────────────────
  const Contenido = () => (
    <View style={{ flex: 1 }}>
      <TopActionHeader title={t('fav_titulo')} showInlineLogo={!esPC} onNotificationsPress={() => setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES as never), 0)} />

      <View style={s.contenedorCentrado}>
        {cargando ? (
          <SkeletonLista cantidad={3} />
        ) : estadosFavoritos.length === 0 ? (
          <View style={[s.vacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <Image source={require('../../assets/images/favoritos_gris.png')} style={s.vacioCoreIcon} resizeMode="contain" />
            <Text style={[s.tituloVacio, { color: tema.texto }]}>{t('fav_vacios')}</Text>
            <Text style={[s.subtituloVacio, { color: tema.textoMuted }]}>{t('fav_vacios2')}</Text>
            <TouchableOpacity style={s.botonIr} onPress={() => setTimeout(() => router.replace('/(tabs)/menu' as never), 0)}>
              <Text style={s.textoBotonIr}>{t('fav_explorar')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={estadosFavoritos}
              keyExtractor={item => String(item.id)}
              renderItem={({ item, index }) => (
                <FavCard
                  item={item}
                  idx={index}
                  t={t}
                  onPress={(it: FavoritoItem) => setTimeout(() => router.push({
                    pathname: '/(tabs)/detalle' as never,
                    params: { nombre: it.nombre, categoria: it.categoria },
                  }), 0)}
                  onRemove={quitarFavorito}
                />
              )}
              ListHeaderComponent={
                <View style={[s.resumenPanel, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                  <View style={s.resumenTop}>
                    <View>
                      <Text style={[s.resumenEyebrow, { color: tema.textoMuted }]}>{t('fav_titulo')}</Text>
                      <Text style={[s.resumenNumero, { color: tema.texto }]}>{estadosFavoritos.length}</Text>
                    </View>
                    <View style={s.resumenBadges}>
                      {/* Favoritos count con PNG */}
                      <View style={[s.resumenBadge, { backgroundColor: tema.superficie }]}>
                        <Image source={require('../../assets/images/favoritos_rojo.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                        <Text style={[s.resumenBadgeTxt, { color: tema.texto }]}>{estadosFavoritos.length}</Text>
                      </View>
                      {/* Categorías con PNG de rutas */}
                      <View style={[s.resumenBadge, { backgroundColor: tema.superficie }]}>
                        <Image source={require('../../assets/images/rutas_gris.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                        <Text style={[s.resumenBadgeTxt, { color: tema.texto }]}>{totalCategorias}</Text>
                      </View>
                    </View>
                  </View>
                  {previewFavoritos ? (
                    <Text style={[s.resumenSub, { color: tema.textoSecundario }]} numberOfLines={2}>
                      {previewFavoritos}
                    </Text>
                  ) : null}
                </View>
              }
              contentContainerStyle={s.contenidoLista}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={recargando} onRefresh={onRefresh} colors={['#3AB7A5']} tintColor="#3AB7A5" />}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );

  return (
    <TabChrome esPC={esPC} maxWidth={900} showLogoWhenNoTitle={false} testID="favoritos-screen">
      <Contenido />
    </TabChrome>
  );
}

const s = StyleSheet.create({
  contenedorCentrado:    { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  contenidoLista:        { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },

  // Panel de resumen
  resumenPanel:          { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, elevation: 2 },
  resumenTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  resumenEyebrow:        { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, fontWeight: '700' },
  resumenNumero:         { fontSize: 38, lineHeight: 42, fontWeight: '900' },
  resumenBadges:         { alignItems: 'flex-end', gap: 8 },
  resumenBadge:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  resumenBadgeTxt:       { fontSize: 12, fontWeight: '700' },
  resumenSub:            { marginTop: 12, fontSize: 13, lineHeight: 19 },

  // Tarjeta — igual que menu.tsx
  tarjetaContenedor:     { position: 'relative' },
  tarjeta:               { borderRadius: 16, overflow: 'hidden', height: 190, backgroundColor: '#ddd', elevation: 4 },
  imagenTarjeta:         { width: '100%', height: '100%', position: 'absolute' },
  sombra:                { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: 'rgba(0,0,0,0.38)' },
  badgeCategoria:        { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeCategoriaTxt:     { fontSize: 11, color: '#214740', fontWeight: '700' },
  nombreTarjeta:         { position: 'absolute', bottom: 28, left: 14, fontSize: 22, fontWeight: '700', color: '#fff' },
  precioTarjeta:         { position: 'absolute', bottom: 10, left: 14, fontSize: 13, color: '#ffffffcc', fontWeight: '500' },
  botonFavorito:         { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center', elevation: 3 },

  // Estado vacío
  vacio:                 { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginHorizontal: 16, borderRadius: 20, padding: 32, borderWidth: 1 },
  vacioCoreIcon:         { width: 64, height: 64, opacity: 0.35 },
  tituloVacio:           { fontSize: 20, fontWeight: '700' },
  subtituloVacio:        { fontSize: 14, textAlign: 'center' },
  botonIr:               { marginTop: 6, backgroundColor: '#DD331D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, elevation: 4 },
  textoBotonIr:          { color: '#fff', fontWeight: '600', fontSize: 15 },
});
