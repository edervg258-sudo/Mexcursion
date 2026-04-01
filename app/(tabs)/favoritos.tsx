import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList, Image, Platform, StatusBar,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { alternarFavorito, cargarFavoritos, obtenerTodosLosDestinos, obtenerUsuarioActivo } from '../../lib/supabase-db';

export default function FavoritosScreen() {
  const rutaActual       = usePathname();
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  const [estadosFavoritos, setEstadosFavoritos] = useState<any[]>([]);
  const [usuarioId, setUsuarioId]       = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { router.replace('/login'); return; }
      setUsuarioId(usuario.id);
      
      const [idsFav, destinosDB] = await Promise.all([
        cargarFavoritos(usuario.id),
        obtenerTodosLosDestinos()
      ]);
      
      const mapeados = destinosDB
        .filter((d: any) => idsFav.includes(d.id))
        .map((d: any) => {
          const original = TODOS_LOS_ESTADOS.find(e => e.id === d.id);
          return {
            id: d.id, nombre: d.nombre, categoria: d.categoria,
            precio: d.precio, imagen: original ? original.imagen : TODOS_LOS_ESTADOS[0].imagen
          };
        });
      setEstadosFavoritos(mapeados);
      setCargando(false);
    };
    cargar();
  }, []));

  const quitarFavorito = async (id: number) => {
    if (!usuarioId) return;
    // Optimistic update
    setEstadosFavoritos(ant => ant.filter(f => f.id !== id));
    await alternarFavorito(usuarioId, id);
  };

  const navegarPestana   = (ruta: string) => router.replace(ruta as any);
  const estaActiva       = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  // ── Sidebar PC ─────────────────────────────────────────────────────────
  const Sidebar = () => (
    <View style={s.sidebar}>
      <Image source={require('../../assets/images/logo.png')} style={s.logoSidebar} resizeMode="contain" />
      <View style={s.separadorSidebar} />
      {PESTANAS.map(p => {
        const activa = estaActiva(p.ruta);
        return (
          <TouchableOpacity key={p.ruta} style={[s.itemSidebar, activa && s.itemSidebarActivo]} onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
            <Image source={activa ? p.iconoRojo : p.iconoGris} style={s.iconoSidebar} resizeMode="contain" />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Contenido ──────────────────────────────────────────────────────────
  const Contenido = () => (
    <View style={{ flex: 1 }}>
      <View style={s.encabezado}>
        {!esPC && <Image source={require('../../assets/images/logo.png')} style={s.logoFijo} resizeMode="contain" />}
        <Text style={[s.tituloEncabezado, { paddingLeft: esPC ? 0 : 60 }]}>Mis favoritos</Text>
        <View style={s.iconosEncabezado}>
          <TouchableOpacity style={s.botonIcono} onPress={() => router.push('/(tabs)/notificaciones' as any)}>
            <Image source={require('../../assets/images/notificaciones.png')} style={s.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={s.botonIcono} onPress={() => navegarPestana('/(tabs)/perfil')}>
            <Image source={require('../../assets/images/cuenta.png')} style={s.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.contenedorCentrado}>
        {cargando ? (
          <View style={s.vacio}>
            <Text style={s.tituloVacio}>Cargando favoritos...</Text>
          </View>
        ) : estadosFavoritos.length === 0 ? (
          <View style={s.vacio}>
            <Text style={s.textoVacio}>❤️</Text>
            <Text style={s.tituloVacio}>Sin favoritos aún</Text>
            <Text style={s.subtituloVacio}>Agrega destinos desde el menú principal</Text>
            <TouchableOpacity style={s.botonIr} onPress={() => navegarPestana('/(tabs)/menu')}>
              <Text style={s.textoBotonIr}>Explorar destinos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={estadosFavoritos}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <View style={s.tarjetaContenedor}>
                <TouchableOpacity
                  style={s.tarjeta}
                  activeOpacity={0.88}
                  onPress={() => router.push({
                    pathname: '/(tabs)/detalle' as any,
                    params: { nombre: item.nombre, categoria: item.categoria },
                  })}
                >
                  <Image source={item.imagen} style={s.imagenTarjeta} resizeMode="cover" />
                  <View style={s.sombra} />
                  <Text style={s.nombreTarjeta}>{item.nombre}</Text>
                  <Text style={s.precioTarjeta}>Desde ${item.precio.toLocaleString()} MXN</Text>
                </TouchableOpacity>
                {/* Botón quitar favorito FUERA del TouchableOpacity — evita conflicto en web */}
                <TouchableOpacity style={s.botonFavorito} onPress={() => quitarFavorito(item.id)} activeOpacity={0.7}>
                  <Image source={require('../../assets/images/favoritos_rojo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={s.contenidoLista}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={s.raiz}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={s.imagenMapa} resizeMode="contain" />

      {esPC ? (
        <View style={s.layoutPC}>
          <Sidebar />
          <SafeAreaView style={s.areaSeguraPC}><Contenido /></SafeAreaView>
        </View>
      ) : (
        <View style={s.layoutMovil}>
          <SafeAreaView style={s.areaSeguraMovil}><Contenido /></SafeAreaView>
          <View style={s.envolturaBarra}>
            <View style={s.barraPestanas}>
              {PESTANAS.map(p => {
                const activa = estaActiva(p.ruta);
                return (
                  <TouchableOpacity key={p.ruta} style={s.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                    <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    <Text style={[s.etiquetaPestana, activa && s.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
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

const s = StyleSheet.create({
  raiz:                  { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:            { opacity: 0.15, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  layoutPC:              { flex: 1, flexDirection: 'row' },
  layoutMovil:           { flex: 1, flexDirection: 'column' },
  areaSeguraPC:          { flex: 1 },
  areaSeguraMovil:       { flex: 1 },
  sidebar:               { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar:           { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:      { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:           { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:     { backgroundColor: '#f0faf9' },
  iconoSidebar:          { width: 28, height: 28 },
  encabezado:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 8, width: '100%', maxWidth: 900, alignSelf: 'center', minHeight: 70 },
  logoFijo:              { width: 46, height: 46 },
  tituloEncabezado:      { flex: 1, fontSize: 18, fontWeight: '800', color: '#333', textAlign: 'center' },
  iconosEncabezado:      { flexDirection: 'row', gap: 6 },
  botonIcono:            { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FAF7F0', borderWidth: 1.5, borderColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  iconoEncabezado:       { width: 28, height: 28 },
  contenedorCentrado:    { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  contenidoLista:        { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  tarjetaContenedor:     { position: 'relative' },
  tarjeta:               { borderRadius: 16, overflow: 'hidden', height: 180, backgroundColor: '#ddd', elevation: 4, borderWidth: 2, borderColor: '#3AB7A5' },
  imagenTarjeta:         { width: '100%', height: '100%', position: 'absolute' },
  sombra:                { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.35)' },
  nombreTarjeta:         { position: 'absolute', bottom: 28, left: 14, fontSize: 22, fontWeight: '700', color: '#fff' },
  precioTarjeta:         { position: 'absolute', bottom: 10, left: 14, fontSize: 13, color: '#ffffffcc', fontWeight: '500' },
  botonFavorito:         { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  vacio:                 { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  textoVacio:            { fontSize: 48 },
  tituloVacio:           { fontSize: 20, fontWeight: '700', color: '#333' },
  subtituloVacio:        { fontSize: 14, color: '#888' },
  botonIr:               { marginTop: 10, backgroundColor: '#DD331D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, elevation: 4 },
  textoBotonIr:          { color: '#fff', fontWeight: '600', fontSize: 15 },
  envolturaBarra:        { width: '100%', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  barraPestanas:         { flexDirection: 'row', backgroundColor: '#fff', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana:       { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva: { color: '#DD331D', fontWeight: '600' },
});