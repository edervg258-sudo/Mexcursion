import { useFocusEffect } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image,
  StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS } from '../../lib/constantes';
import { cargarHistorial, obtenerUsuarioActivo } from '../../lib/supabase-db';

type Evento = {
  id: number; usuario_id: number; tipo: string;
  titulo: string; detalle: string; creado_en: string;
};

const ICONOS: Record<string, string> = {
  reserva: '📋', login: '🔑', favorito: '❤️', resena: '⭐', perfil: '👤', sistema: '⚙️',
};

const COLORES: Record<string, string> = {
  reserva: '#3AB7A5', login: '#5B8DEF', favorito: '#DD331D', resena: '#e9c46a', perfil: '#888', sistema: '#aaa',
};

function tiempoRelativo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `Hace ${horas}h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias}d`;
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export default function HistorialScreen() {
  const rutaActual = usePathname();
  const { width } = useWindowDimensions();
  const esPC = width >= 768;
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);

  const navegarPestana = (ruta: string) => router.replace(ruta as any);
  const estaActiva = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { router.replace('/login'); return; }
      setEventos(await cargarHistorial(usuario.id));
      setCargando(false);
    };
    cargar();
  }, []));

  const renderEvento = ({ item }: { item: Evento }) => {
    const icono = ICONOS[item.tipo] ?? '📌';
    const color = COLORES[item.tipo] ?? '#888';
    return (
      <View style={s.tarjeta}>
        <View style={[s.iconoCirculo, { backgroundColor: color + '20' }]}>
          <Text style={s.iconoEmoji}>{icono}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.headerEvento}>
            <Text style={s.tituloEvento}>{item.titulo}</Text>
            <Text style={s.tiempoEvento}>{tiempoRelativo(item.creado_en)}</Text>
          </View>
          <Text style={s.detalleEvento} numberOfLines={2}>{item.detalle}</Text>
        </View>
      </View>
    );
  };

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
      <View style={{ flex: 1 }} />
    </View>
  );

  const Contenido = () => (
    <>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.btnVolver}>
          <Text style={s.chevron}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Historial</Text>
          <Text style={s.subtitulo}>{eventos.length} evento{eventos.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      {cargando ? (
        <View style={s.vacio}><ActivityIndicator size="large" color="#3AB7A5" /></View>
      ) : eventos.length === 0 ? (
        <View style={s.vacio}>
          <Text style={{ fontSize: 48 }}>📜</Text>
          <Text style={s.tituloVacio}>Sin actividad</Text>
          <Text style={s.subtituloVacio}>Tu historial aparecerá aquí</Text>
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={item => String(item.id)}
          renderItem={renderEvento}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separador} />}
        />
      )}
    </>
  );

  return (
    <View style={s.raiz}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      {esPC ? (
        <View style={s.layoutPC}>
          <Sidebar />
          <SafeAreaView style={s.areaPC}><Contenido /></SafeAreaView>
        </View>
      ) : (
        <SafeAreaView style={s.area}><Contenido /></SafeAreaView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  raiz:              { flex: 1, backgroundColor: '#FAF7F0' },
  layoutPC:          { flex: 1, flexDirection: 'row' },
  area:              { flex: 1 },
  areaPC:            { flex: 1 },
  sidebar:           { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar:       { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:  { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:       { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo: { backgroundColor: '#f0faf9' },
  iconoSidebar:      { width: 28, height: 28 },

  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', gap: 10 },
  btnVolver:         { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  chevron:           { fontSize: 26, color: '#3AB7A5', lineHeight: 30 },
  titulo:            { fontSize: 20, fontWeight: '800', color: '#333' },
  subtitulo:         { fontSize: 12, color: '#888' },

  lista:             { padding: 16, maxWidth: 700, alignSelf: 'center', width: '100%' },
  separador:         { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },

  tarjeta:           { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  iconoCirculo:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconoEmoji:        { fontSize: 20 },
  headerEvento:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tituloEvento:      { fontSize: 14, fontWeight: '700', color: '#333', flex: 1 },
  tiempoEvento:      { fontSize: 11, color: '#aaa' },
  detalleEvento:     { fontSize: 13, color: '#777', lineHeight: 18 },

  vacio:             { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 40 },
  tituloVacio:       { fontSize: 18, fontWeight: '700', color: '#333' },
  subtituloVacio:    { fontSize: 13, color: '#888' },
});
