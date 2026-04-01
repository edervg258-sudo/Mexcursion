import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TipoTab = 'inicio' | 'favoritos' | 'rutas' | 'perfil';
const PESTANAS: { clave: TipoTab; iconoGris: any; iconoRojo: any; etiqueta: string; ruta: string }[] = [
  { clave: 'inicio',    iconoGris: require('../../assets/images/inicio_gris.png'), iconoRojo: require('../../assets/images/inicio_rojo.png'),    etiqueta: 'Inicio',    ruta: '/(tabs)/menu'     },
  { clave: 'favoritos', iconoGris: require('../../assets/images/favoritos_gris.png'), iconoRojo: require('../../assets/images/favoritos_rojo.png'), etiqueta: 'Favoritos', ruta: '/(tabs)/favoritos'},
  { clave: 'rutas',     iconoGris: require('../../assets/images/rutas_gris.png'), iconoRojo: require('../../assets/images/rutas_rojo.png'),     etiqueta: 'Rutas',     ruta: '/(tabs)/rutas'   },
  { clave: 'perfil',    iconoGris: require('../../assets/images/perfil_gris.png'), iconoRojo: require('../../assets/images/perfil_rojo.png'),    etiqueta: 'Perfil',    ruta: '/(tabs)/perfil'  },
];

type Paquete = { nivel: string; etiqueta: string; color: string; emoji: string; precio: string; hotel: string; restaurante: string; actividad: string };
type EstadoMapa = { id: string; nombre: string; abr: string; px: number; py: number; categoria: string; paquetes: Paquete[] };

// (ESTADOS_MAPA and CATEGORIA_COLORES omitted here for brevity — keep your existing data)

const ESTADOS_MAPA: EstadoMapa[] = [
  // ... (mantén el contenido que ya tienes)
];

const CATEGORIA_COLORES: Record<string, string> = {
  Aventura: '#3AB7A5', Gastronomía: '#F97316', Ciudad: '#8B5CF6', Cultura: '#0EA5E9', Playa: '#DD331D',
};

const { width: W } = Dimensions.get('window');
const MAP_W = Math.min(W, 800);
const MAP_H = MAP_W * 0.62; // proporción real de México

export default function MapaInteractivoScreen() {
  const rutaActual = usePathname();
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoMapa | null>(null);

  // Barra de navegación: igual que en menu.tsx (inset-swipe)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  const navegarPestana = (p: typeof PESTANAS[number]) => { router.push(p.ruta as any); };
  const irADetalle = (e: EstadoMapa) => {
    setEstadoSeleccionado(null);
    router.push({ pathname: '/(tabs)/detalle', params: { nombre: e.nombre, imagen: '', categoria: e.categoria } } as any);
  };

  return (
    <View style={s.contenedor}>
      <Image source={require('../../assets/images/logo.png')} style={s.logoFijo} resizeMode="contain" />
      <SafeAreaView style={s.area}>

        <View style={s.enc}>
          <TouchableOpacity style={s.btnAtras} onPress={() => router.back()}>
            <Text style={s.txtAtras}>‹</Text>
          </TouchableOpacity>
          <Text style={s.titulo}>Mapa de México</Text>
          <View style={s.iconos}>
            <TouchableOpacity style={s.btnIcono}>
              <Image source={require('../../assets/images/notificaciones.png')} style={s.icoEnc} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={s.btnIcono} onPress={() => navegarPestana(PESTANAS[3])}>
              <Image source={require('../../assets/images/cuenta.png')} style={s.icoEnc} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.instruccion}>Toca un estado para ver sus paquetes</Text>

        {/* Leyenda */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.leyenda}>
          {Object.entries(CATEGORIA_COLORES).map(([cat, col]) => (
            <View key={cat} style={s.itemLey}>
              <View style={[s.punto, { backgroundColor: col }]} />
              <Text style={s.txtLey}>{cat}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Mapa con marcadores */}
        <View style={[s.mapaCont, { width: MAP_W, height: MAP_H }]}>
          <Image
            source={require('../../assets/images/mapa_estados.png')}
            style={{ width: MAP_W, height: MAP_H, position: 'absolute' }}
            resizeMode="stretch"
          />
          {ESTADOS_MAPA.map(e => {
            const color = CATEGORIA_COLORES[e.categoria] ?? '#DD331D';
            const sel   = estadoSeleccionado?.id === e.id;
            const left  = (e.px / 100) * MAP_W - (sel ? 16 : 12);
            const top   = (e.py / 100) * MAP_H - (sel ? 16 : 12);
            return (
              <TouchableOpacity
                key={e.id}
                style={[s.marcador, { left, top, width: sel ? 32 : 24, height: sel ? 32 : 24, borderRadius: sel ? 16 : 12, backgroundColor: color, borderWidth: sel ? 2.5 : 1.5 }]}
                onPress={() => setEstadoSeleccionado(e)}
                activeOpacity={0.8}
              >
                <Text style={[s.txtMarcador, { fontSize: sel ? 7 : 5.5 }]}>{e.abr}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Chips de estados */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listaEst}>
          {ESTADOS_MAPA.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[s.chipEst, { borderColor: CATEGORIA_COLORES[e.categoria] }, estadoSeleccionado?.id === e.id && { backgroundColor: CATEGORIA_COLORES[e.categoria] + '22' }]}
              onPress={() => {
                setEstadoSeleccionado(e);
                // opcional: navegar a detalle directamente
                // irADetalle(e);
              }}
            >
              <Text style={s.txtChip}>{e.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Modal / panel inferior con detalles del estado seleccionado */}
        {estadoSeleccionado && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Text style={s.panelTitulo}>{estadoSeleccionado.nombre}</Text>
              <TouchableOpacity onPress={() => irADetalle(estadoSeleccionado)} style={s.panelBtn}>
                <Text style={s.panelBtnText}>Ver paquetes</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.panelCarr}>
              {estadoSeleccionado.paquetes.map(p => (
                <View key={p.nivel} style={[s.panelCard, { borderColor: p.color }]}>
                  <Text style={s.panelEmoji}>{p.emoji}</Text>
                  <Text style={s.panelEtiqueta}>{p.etiqueta}</Text>
                  <Text style={s.panelPrecio}>{p.precio}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FAF7F0' },
  logoFijo: { position: 'absolute', top: 12, left: 12, width: 50, height: 50, zIndex: 10 },
  area: { flex: 1, alignItems: 'center' },
  enc: { width: '100%', maxWidth: 800, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  btnAtras: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  txtAtras: { fontSize: 28, color: '#333' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#333' },
  iconos: { flexDirection: 'row', gap: 6 },
  btnIcono: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FAF7F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#3AB7A5' },
  icoEnc: { width: 26, height: 26 },
  instruccion: { color: '#666', marginTop: 8, marginBottom: 8 },
  leyenda: { paddingHorizontal: 12, gap: 12, paddingBottom: 8 },
  itemLey: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  punto: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  txtLey: { fontSize: 12, color: '#555' },
  mapaCont: { alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  marcador: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderColor: '#fff' },
  txtMarcador: { color: '#fff', fontWeight: '700' },
  listaEst: { paddingHorizontal: 12, gap: 8, paddingVertical: 12 },
  chipEst: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  txtChip: { color: '#333', fontWeight: '600' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, width: '100%', maxWidth: 800, alignSelf: 'center' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  panelTitulo: { fontSize: 16, fontWeight: '800', color: '#333' },
  panelBtn: { backgroundColor: '#3AB7A5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  panelBtnText: { color: '#fff', fontWeight: '700' },
  panelCarr: { gap: 10, paddingHorizontal: 6 },
  panelCard: { width: 160, borderRadius: 12, padding: 12, backgroundColor: '#FAF7F0', borderWidth: 2 },
  panelEmoji: { fontSize: 22, marginBottom: 6 },
  panelEtiqueta: { fontWeight: '800', color: '#333' },
  panelPrecio: { color: '#DD331D', marginTop: 6, fontWeight: '700' },
});
