import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SkeletonFilas } from './skeletonloader';
import { TabChrome } from '../../components/TabChrome';
import { useIdioma } from '../../lib/IdiomaContext';
import { limpiarBadge } from '../../lib/push-notifications';
import { type TraduccionClave } from '../../lib/traducciones';
import {
  cargarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas as marcarTodasLeidasBD,
  obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';

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

function formatearFecha(
  iso: string,
  t: (k: TraduccionClave, v?: Record<string, string | number>) => string
): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  { return t('notif_ahora'); }
    if (mins < 60) { return t('notif_hace_min', { n: mins }); }
    const horas = Math.floor(mins / 60);
    if (horas < 24) { return horas === 1 ? t('notif_hace_h_s', { n: horas }) : t('notif_hace_h_p', { n: horas }); }
    const dias = Math.floor(horas / 24);
    if (dias === 1) { return t('notif_ayer'); }
    if (dias < 7)   { return t('notif_hace_d', { n: dias }); }
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const LIMITE = 20;

export default function NotificacionesScreen() {
  const { width }             = useWindowDimensions();
  const esPC                  = width >= 768;
  const { t }                 = useIdioma();
  const { tema }              = useTemaContext();
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas]     = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [filtro, setFiltro]     = useState<'todas' | 'no_leidas'>('todas');

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      limpiarBadge();
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { setTimeout(() => router.replace('/login'), 0); return; }
      setUsuarioId(usuario.id);
      const nuevas = await cargarNotificaciones(usuario.id, LIMITE, 0);
      setNotifs(nuevas);
      setHayMas(nuevas.length === LIMITE);
      setCargando(false);
    };
    cargar();
  }, []));

  const cargarMas = async () => {
    if (!usuarioId || cargandoMas) { return; }
    setCargandoMas(true);
    const mas = await cargarNotificaciones(usuarioId, LIMITE, notifs.length);
    setNotifs(prev => [...prev, ...mas]);
    setHayMas(mas.length === LIMITE);
    setCargandoMas(false);
  };

  const noLeidas = notifs.filter(n => !n.leida).length;
  const visibles = filtro === 'no_leidas' ? notifs.filter(n => !n.leida) : notifs;

  const marcarLeida = async (id: number) => {
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: 1 } : x));
    await marcarNotificacionLeida(id);
  };

  const marcarTodas = async () => {
    setNotifs(n => n.map(x => ({ ...x, leida: 1 })));
    if (usuarioId) { await marcarTodasLeidasBD(usuarioId); }
  };

  const renderItem = ({ item }: { item: Notif }) => (
    <TouchableOpacity
      style={[s.item, { backgroundColor: tema.fondo }, !item.leida && { backgroundColor: tema.superficieBlanca, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -4 }]}
      onPress={() => marcarLeida(item.id)}
      activeOpacity={0.8}
    >
      <View style={[s.iconoCirculo, { backgroundColor: (COLOR[item.tipo] ?? '#888') + '22' }]}>
        <Text style={s.iconoEmoji}>{EMOJI[item.tipo] ?? '🔔'}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.itemHeader}>
          <Text style={[s.itemTitulo, { color: tema.textoSecundario }, !item.leida && { color: tema.texto }]}>{item.titulo}</Text>
          {!item.leida && <View style={[s.puntito, { backgroundColor: COLOR[item.tipo] ?? '#888' }]} />}
        </View>
        <Text style={[s.itemMensaje, { color: tema.textoMuted }]} numberOfLines={2}>{item.mensaje}</Text>
        <Text style={[s.itemFecha, { color: tema.textoMuted }]}>{formatearFecha(item.creado_en, t)}</Text>
      </View>
    </TouchableOpacity>
  );

  const contenido = (
    <>
      <View style={s.subheader}>
        {noLeidas > 0 && <Text style={s.subtitulo}>{t('notif_sin_leer', { n: noLeidas })}</Text>}
      </View>
      <View style={s.filtros}>
        {(['todas', 'no_leidas'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.chipFiltro, { backgroundColor: tema.superficie, borderColor: tema.borde }, filtro === f && s.chipFiltroActivo]} onPress={() => setFiltro(f)}>
            <Text style={[s.txtChip, { color: tema.textoSecundario }, filtro === f && s.txtChipActivo]}>
              {f === 'todas' ? t('notif_todas') : `${t('notif_no_leidas')}${noLeidas > 0 ? ` (${noLeidas})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {cargando ? (
        <SkeletonFilas cantidad={6} />
      ) : visibles.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioemoji}>🔔</Text>
          <Text style={[s.vacioTitulo, { color: tema.texto }]}>{t('notif_vacio')}</Text>
          <Text style={[s.vacioSub, { color: tema.textoMuted }]}>{filtro === 'no_leidas' ? t('notif_leidas_sub') : t('notif_vacio_sub')}</Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={n => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[s.separador, { backgroundColor: tema.borde }]} />}
          ListFooterComponent={hayMas && filtro === 'todas' ? (
            <TouchableOpacity style={s.btnCargarMas} onPress={cargarMas} disabled={cargandoMas} activeOpacity={0.8}>
              {cargandoMas
                ? <ActivityIndicator size="small" color="#3AB7A5" />
                : <Text style={s.txtCargarMas}>{t('notif_cargar_mas')}</Text>}
            </TouchableOpacity>
          ) : null}
        />
      )}
    </>
  );

  return (
    <TabChrome
      esPC={esPC}
      title={t('notif_titulo')}
      onBack={() => router.back()}
      maxWidth={720}
      headerRight={
        noLeidas > 0 ? (
          <TouchableOpacity onPress={marcarTodas} style={s.btnMarcar}>
            <Text style={s.txtMarcar}>{t('notif_marcar_todas')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.headerSpacer} />
        )
      }
    >
      {contenido}
    </TabChrome>
  );
}

const s = StyleSheet.create({
  headerSpacer:    { width: 38, height: 38 },
  subheader:       { paddingHorizontal: 16, paddingBottom: 8, width: '100%', maxWidth: 720, alignSelf: 'center' },
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
  btnCargarMas:    { marginHorizontal: 16, marginTop: 8, marginBottom: 20, paddingVertical: 12, alignItems: 'center', borderRadius: 25, borderWidth: 1.5, borderColor: '#3AB7A5' },
  txtCargarMas:    { fontSize: 14, color: '#3AB7A5', fontWeight: '600' },
  vacio:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  vacioemoji:      { fontSize: 52 },
  vacioTitulo:     { fontSize: 18, fontWeight: '700', color: '#333' },
  vacioSub:        { fontSize: 13, color: '#888' },
});
