import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl,
    StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { useIdioma } from '../../lib/IdiomaContext';
import { cargarHistorial, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { type TraduccionClave } from '../../lib/traducciones';
import { useTemaContext } from '../../lib/TemaContext';
import { SkeletonFilas } from './skeletonloader';

type Evento = {
  id: number; usuario_id: number; tipo: string;
  titulo: string; detalle: string; creado_en: string;
};

const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  reserva: 'calendar-outline',
  pago:    'card-outline',
  login:   'log-in-outline',
  favorito:'heart-outline',
  resena:  'star-outline',
  perfil:  'person-outline',
  sistema: 'settings-outline',
};

const COLORES: Record<string, string> = {
  reserva: '#3AB7A5', pago: '#3AB7A5', login: '#5B8DEF', favorito: '#DD331D', resena: '#e9c46a', perfil: '#888', sistema: '#aaa',
};

function formatearDetalle(tipo: string, detalle: string): string {
  try {
    const obj = JSON.parse(detalle);
    if (tipo === 'pago' || tipo === 'reserva') {
      const partes: string[] = [];
      if (obj.folio)   { partes.push(`Folio: ${obj.folio}`); }
      if (obj.metodo)  { partes.push(`Método: ${String(obj.metodo).toUpperCase()}`); }
      if (obj.monto)   { partes.push(`$${Number(obj.monto).toLocaleString('es-MX')} MXN`); }
      if (obj.destino) { partes.push(obj.destino); }
      if (obj.personas){ partes.push(`${obj.personas} pers.`); }
      return partes.join(' · ') || detalle;
    }
    return detalle;
  } catch {
    return detalle;
  }
}

function tiempoRelativo(iso: string, t: (k: TraduccionClave, v?: Record<string, string | number>) => string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) { return t('hist_ahora'); }
    if (mins < 60) { return t('hist_hace_min', { n: mins }); }
    const horas = Math.floor(mins / 60);
    if (horas < 24) { return t('hist_hace_h', { n: horas }); }
    const dias = Math.floor(horas / 24);
    if (dias < 7) { return t('hist_hace_d', { n: dias }); }
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const LIMITE = 30;

export default function HistorialScreen() {
  const { width }     = useWindowDimensions();
  const esPC          = width >= 768;
  const { t } = useIdioma();
  const { tema } = useTemaContext();
  const queryClient = useQueryClient();

  // Query para obtener el usuario actual
  const { data: usuario } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: obtenerUsuarioActivo,
    retry: 1,
  });

  // Query paginada para obtener historial
  const {
    data: historialPages,
    isLoading: cargando,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: _refetchHistorial,
  } = useInfiniteQuery({
    queryKey: ['historial-usuario', usuario?.id],
    queryFn: ({ pageParam = 0 }) =>
      usuario ? cargarHistorial(usuario.id, LIMITE, pageParam as number) : Promise.resolve([]),
    getNextPageParam: (lastPage: Evento[], allPages: Evento[][]) =>
      lastPage.length === LIMITE ? allPages.reduce((n, p) => n + p.length, 0) : undefined,
    initialPageParam: 0,
    enabled: !!usuario,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
  const eventos: Evento[] = (historialPages?.pages ?? []).flat() as Evento[];

  const onRefresh = useCallback(async () => {
    await queryClient.resetQueries({ queryKey: ['historial-usuario', usuario?.id] });
  }, [queryClient, usuario?.id]);

  const renderEvento = ({ item }: { item: Evento }) => {
    const icono = ICONOS[item.tipo] ?? 'ellipse-outline';
    const color = COLORES[item.tipo] ?? '#888';
    return (
      <View style={s.tarjeta}>
        <View style={[s.iconoCirculo, { backgroundColor: color + '20' }]}>
          <Ionicons name={icono} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.headerEvento}>
            <Text style={[s.tituloEvento, { color: tema.texto }]}>{item.titulo}</Text>
            <Text style={[s.tiempoEvento, { color: tema.textoMuted }]}>{tiempoRelativo(item.creado_en, t)}</Text>
          </View>
          <Text style={[s.detalleEvento, { color: tema.textoSecundario }]} numberOfLines={2}>{formatearDetalle(item.tipo, item.detalle)}</Text>
        </View>
      </View>
    );
  };

  const footer = hasNextPage ? (
    <TouchableOpacity style={s.btnCargarMas} onPress={() => fetchNextPage()} disabled={isFetchingNextPage} activeOpacity={0.8}>
      {isFetchingNextPage
        ? <ActivityIndicator size="small" color="#3AB7A5" />
        : <Text style={s.txtCargarMas}>{t('hist_cargar_mas')}</Text>}
    </TouchableOpacity>
  ) : null;

  const cuerpo = cargando ? (
    <SkeletonFilas cantidad={5} />
  ) : eventos.length === 0 ? (
    <View style={s.vacio}>
      <Ionicons name="document-text-outline" size={52} color="#ccc" />
      <Text style={[s.tituloVacio, { color: tema.texto }]}>{t('hist_vacio')}</Text>
      <Text style={[s.subtituloVacio, { color: tema.textoMuted }]}>{t('hist_vacio2')}</Text>
    </View>
  ) : (
    <FlatList
      data={eventos}
      keyExtractor={item => String(item.id)}
      renderItem={renderEvento}
      contentContainerStyle={s.lista}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={[s.separador, { backgroundColor: tema.borde }]} />}
      refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={onRefresh} colors={['#3AB7A5']} tintColor="#3AB7A5" />}
    />
  );

  return (
    <TabChrome
      esPC={esPC}
      title={t('hist_titulo')}
      onBack={() => router.replace('/(tabs)/perfil' as never)}
      headerRight={<View style={s.headerSpacer} />}
    >
      <View style={s.subheader}>
        <Text style={[s.subtitulo, { color: tema.textoMuted }]}>{eventos.length} {eventos.length !== 1 ? t('hist_evento_plural') : t('hist_evento_singular')}</Text>
      </View>
      {cuerpo}
    </TabChrome>
  );
}

const s = StyleSheet.create({
  subheader:         { paddingHorizontal: 16, paddingBottom: 10, alignSelf: 'center', width: '100%', maxWidth: 700 },
  headerSpacer:      { width: 38, height: 38 },
  subtitulo:         { fontSize: 12, color: '#888' },

  lista:             { padding: 16, maxWidth: 700, alignSelf: 'center', width: '100%' },
  separador:         { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },

  tarjeta:           { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  iconoCirculo:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerEvento:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tituloEvento:      { fontSize: 14, fontWeight: '700', color: '#333', flex: 1 },
  tiempoEvento:      { fontSize: 11, color: '#aaa' },
  detalleEvento:     { fontSize: 13, color: '#777', lineHeight: 18 },

  btnCargarMas:      { marginHorizontal: 16, marginTop: 8, marginBottom: 20, paddingVertical: 12, alignItems: 'center', borderRadius: 25, borderWidth: 1.5, borderColor: '#3AB7A5' },
  txtCargarMas:      { fontSize: 14, color: '#3AB7A5', fontWeight: '600' },
  vacio:             { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 40 },
  tituloVacio:       { fontSize: 18, fontWeight: '700', color: '#333' },
  subtituloVacio:    { fontSize: 13, color: '#888' },
});
