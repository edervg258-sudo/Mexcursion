import { useFocusEffect } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image,
  StatusBar,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS } from '../../lib/constantes';
import {
  cargarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas as marcarTodasLeidasBD,
  obtenerUsuarioActivo,
} from '../../lib/supabase-db';

type Notif = {
  id: number; tipo: string;
  titulo: string; mensaje: string; creado_en: string; leida: number;
};

const EMOJI: Record<string, string> = {
  reserva: '📋', oferta: '🏷️', sistema: '⚙️', resena: '⭐',
};

const COLOR: Record<string, string> = {
  reserva: '#3AB7A5', oferta: '#DD331D', sistema: '#888', resena: '#e9c46a',
};

function formatearFecha(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'Ayer';
    if (dias < 7)   return `Hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export default function NotificacionesScreen() {
  const rutaActual            = usePathname();
  const { width }             = useWindowDimensions();
  const esPC                  = width >= 768;
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [filtro, setFiltro]     = useState<'todas' | 'no_leidas'>('todas');

  const navegarPestana = (ruta: string) => router.replace(ruta as any);
  const estaActiva = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { router.replace('/login'); return; }
      setUsuarioId(usuario.id);
      setNotifs(await cargarNotificaciones(usuario.id));
      setCargando(false);
    };
    cargar();
  }, []));

  const noLeidas = notifs.filter(n => !n.leida).length;
  const visibles = filtro === 'no_leidas' ? notifs.filter(n => !n.leida) : notifs;

  const marcarLeida = async (id: number) => {
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: 1 } : x));
    await marcarNotificacionLeida(id);
  };

  const marcarTodas = async () => {
    setNotifs(n => n.map(x => ({ ...x, leida: 1 })));
    if (usuarioId) await marcarTodasLeidasBD(usuarioId);
  };

  const renderItem = ({ item }: { item: Notif }) => (
    <TouchableOpacity
      style={[s.item, !item.leida && s.itemNoLeida]}
      onPress={() => marcarLeida(item.id)}
      activeOpacity={0.8}
    >
      <View style={[s.iconoCirculo, { backgroundColor: (COLOR[item.tipo] ?? '#888') + '22' }]}>
        <Text style={s.iconoEmoji}>{EMOJI[item.tipo] ?? '🔔'}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.itemHeader}>
          <Text style={[s.itemTitulo, !item.leida && { color: '#333' }]}>{item.titulo}</Text>
          {!item.leida && <View style={[s.puntito, { backgroundColor: COLOR[item.tipo] ?? '#888' }]} />}
        </View>
        <Text style={s.itemMensaje} numberOfLines={2}>{item.mensaje}</Text>
        <Text style={s.itemFecha}>{formatearFecha(item.creado_en)}</Text>
      </View>
    </TouchableOpacity>
  );

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

  const contenido = (
    <>
      <View style={s.header}>
        <TouchableOpacity style={s.btnAtras} onPress={() => router.back()}>
          <Text style={s.txtAtras}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Notificaciones</Text>
          {noLeidas > 0 && <Text style={s.subtitulo}>{noLeidas} sin leer</Text>}
        </View>
        {noLeidas > 0 && (
          <TouchableOpacity onPress={marcarTodas} style={s.btnMarcar}>
            <Text style={s.txtMarcar}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={s.filtros}>
        {(['todas', 'no_leidas'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.chipFiltro, filtro === f && s.chipFiltroActivo]} onPress={() => setFiltro(f)}>
            <Text style={[s.txtChip, filtro === f && s.txtChipActivo]}>
              {f === 'todas' ? 'Todas' : `Sin leer${noLeidas > 0 ? ` (${noLeidas})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {cargando ? (
        <View style={s.vacio}><ActivityIndicator size="large" color="#3AB7A5" /></View>
      ) : visibles.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioemoji}>🔔</Text>
          <Text style={s.vacioTitulo}>Sin notificaciones</Text>
          <Text style={s.vacioSub}>{filtro === 'no_leidas' ? 'Todas están leídas' : 'No tienes notificaciones aún'}</Text>
        </View>
      ) : (
        <FlatList data={visibles} keyExtractor={n => String(n.id)} renderItem={renderItem} contentContainerStyle={s.lista} showsVerticalScrollIndicator={false} ItemSeparatorComponent={() => <View style={s.separador} />} />
      )}
    </>
  );

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      {esPC ? (
        <View style={s.layoutPC}>
          <Sidebar />
          <SafeAreaView style={s.seguraPC}>{contenido}</SafeAreaView>
        </View>
      ) : (
        <SafeAreaView style={s.segura}>{contenido}</SafeAreaView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  contenedor:      { flex: 1, backgroundColor: '#FAF7F0' },
  layoutPC:        { flex: 1, flexDirection: 'row' },
  segura:          { flex: 1 },
  seguraPC:        { flex: 1 },
  sidebar:         { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar:     { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:{ width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:     { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:{ backgroundColor: '#f0faf9' },
  iconoSidebar:    { width: 28, height: 28 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', gap: 12 },
  btnAtras:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  txtAtras:        { fontSize: 20, color: '#333' },
  titulo:          { fontSize: 17, fontWeight: '700', color: '#333' },
  subtitulo:       { fontSize: 12, color: '#3AB7A5', fontWeight: '600' },
  btnMarcar:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#3AB7A5' },
  txtMarcar:       { fontSize: 12, color: '#3AB7A5', fontWeight: '600' },
  filtros:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  chipFiltro:      { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  chipFiltroActivo:{ backgroundColor: '#3AB7A5', borderColor: '#3AB7A5' },
  txtChip:         { fontSize: 13, color: '#666', fontWeight: '500' },
  txtChipActivo:   { color: '#fff', fontWeight: '700' },
  lista:           { paddingHorizontal: 16, paddingVertical: 8 },
  separador:       { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  item:            { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 4, backgroundColor: '#FAF7F0' },
  itemNoLeida:     { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -4 },
  iconoCirculo:    { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  iconoEmoji:      { fontSize: 22 },
  itemHeader:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitulo:      { fontSize: 14, fontWeight: '600', color: '#555', flex: 1 },
  puntito:         { width: 8, height: 8, borderRadius: 4 },
  itemMensaje:     { fontSize: 13, color: '#888', lineHeight: 18 },
  itemFecha:       { fontSize: 11, color: '#bbb' },
  vacio:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  vacioemoji:      { fontSize: 52 },
  vacioTitulo:     { fontSize: 18, fontWeight: '700', color: '#333' },
  vacioSub:        { fontSize: 13, color: '#888' },
});