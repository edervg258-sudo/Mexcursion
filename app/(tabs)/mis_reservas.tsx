import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl,
    StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { useIdioma } from '../../lib/IdiomaContext';
import { actualizarEstadoReserva, cargarReservas, obtenerTodosLosDestinos, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { SkeletonFilas } from './skeletonloader';

type Reserva = {
  id: number; usuario_id: string; folio: string; destino: string;
  paquete: string; fecha: string; personas: number; total: number;
  metodo: string; estado: string; creado_en: string; notas?: string;
};
type Filtro = 'todas' | 'confirmada' | 'pendiente' | 'completada' | 'cancelada';

const COLOR_ESTADO_BASE: Record<string, { fondo: string; texto: string }> = {
  confirmada: { fondo: '#e8f8f5', texto: '#3AB7A5' },
  pendiente:  { fondo: '#fff8e1', texto: '#b8860b' },
  completada: { fondo: '#f0f0f0', texto: '#888'    },
  cancelada:  { fondo: '#fef0f0', texto: '#DD331D' },
};

function formatearFecha(fecha: string): string {
  if (!fecha) { return '—'; }
  // YYYY-MM-DD o YYYY-MM-DDTHH:... → DD/MM/AAAA
  const solo = fecha.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(solo)) { return solo.split('-').reverse().join('/'); }
  return fecha;
}

export default function MisReservasScreen() {
  const { width }               = useWindowDimensions();
  const esPC                    = width >= 768;
  const { t } = useIdioma();
  const queryClient = useQueryClient();

  const COLOR_ESTADO: Record<string, { fondo: string; texto: string; etiqueta: string }> = {
    confirmada: { ...COLOR_ESTADO_BASE.confirmada, etiqueta: t('res_estado_confirmada') },
    pendiente:  { ...COLOR_ESTADO_BASE.pendiente,  etiqueta: t('res_estado_pendiente')  },
    completada: { ...COLOR_ESTADO_BASE.completada, etiqueta: t('res_estado_completada') },
    cancelada:  { ...COLOR_ESTADO_BASE.cancelada,  etiqueta: t('res_estado_cancelada')  },
  };

  const FILTROS: { clave: Filtro; label: string }[] = [
    { clave: 'todas',      label: t('res_todas')      },
    { clave: 'confirmada', label: t('res_confirmadas') },
    { clave: 'pendiente',  label: t('res_pendientes')  },
    { clave: 'completada', label: t('res_completadas') },
    { clave: 'cancelada',  label: t('res_canceladas')  },
  ];

  const [filtro, setFiltro]     = useState<Filtro>('todas');
  const [cancelando, setCancelando]       = useState<number | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);

  useEffect(() => {
    configurarBarraAndroid();
  }, []);

  // Query para obtener el usuario actual
  const { data: usuario } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: obtenerUsuarioActivo,
    retry: 1,
  });

  const LIMITE = 20;
  // Query paginada para obtener reservas
  const {
    data: reservasPages,
    isLoading: cargando,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: _refetchReservas,
  } = useInfiniteQuery({
    queryKey: ['reservas-usuario', usuario?.id],
    queryFn: ({ pageParam = 0 }) =>
      usuario ? cargarReservas(usuario.id, LIMITE, pageParam as number) : Promise.resolve([]),
    getNextPageParam: (lastPage: Reserva[], allPages: Reserva[][]) =>
      lastPage.length === LIMITE ? allPages.reduce((n, p) => n + p.length, 0) : undefined,
    initialPageParam: 0,
    enabled: !!usuario,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
  const reservas: Reserva[] = (reservasPages?.pages ?? []).flat() as Reserva[];

  // Query para obtener destinos
  const { data: destinosDB = [] } = useQuery({
    queryKey: ['destinos-todos'],
    queryFn: obtenerTodosLosDestinos,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });

  // Mutación para actualizar estado de reserva
  const actualizarEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => 
      actualizarEstadoReserva(id, estado),
    onSuccess: () => {
      // Invalidar query para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['reservas-usuario'] });
    },
  });

  const onRefresh = useCallback(async () => {
    await queryClient.resetQueries({ queryKey: ['reservas-usuario', usuario?.id] });
  }, [queryClient, usuario?.id]);

  const reservasFiltradas = filtro === 'todas'
    ? (reservas as Reserva[])
    : (reservas as Reserva[]).filter((r: Reserva) => r.estado === filtro);

  const conteo = (clave: Filtro) =>
    clave === 'todas' ? (reservas as Reserva[]).length : (reservas as Reserva[]).filter((r: Reserva) => r.estado === clave).length;

  const irADetalle = (item: Reserva) => {
    const estado = destinosDB.find(e => e.nombre === item.destino)
      || TODOS_LOS_ESTADOS.find(e => e.nombre === item.destino);
    setTimeout(() => router.push({
      pathname: '/(tabs)/detalle' as never,
      params: { nombre: item.destino, categoria: estado?.categoria ?? 'Cultura' },
    }), 0);
  };

  const confirmarCancelacion = async (item: Reserva) => {
    setCancelando(item.id);
    setConfirmandoId(null);
    await actualizarEstadoMutation.mutateAsync({ id: item.id, estado: 'cancelada' });
    setCancelando(null);
  };

  const volverAReservar = (item: Reserva) => {
    setTimeout(() => router.push({
      pathname: '/(tabs)/reserva' as never,
      params: {
        nombre: item.destino,
        paquete: item.paquete,
        precio: String(Math.round(item.total / (item.personas || 1))),
      },
    }), 0);
  };

  const renderReserva = ({ item }: { item: Reserva }) => {
    const est            = COLOR_ESTADO[item.estado] ?? { fondo: '#f5f5f5', texto: '#888', etiqueta: item.estado };
    const cancelable     = item.estado === 'confirmada' || item.estado === 'pendiente';
    const esCancelando   = cancelando === item.id;
    const pidioConfirmar = confirmandoId === item.id;

    return (
      <View style={es.tarjeta}>
        {/* Encabezado */}
        <View style={es.headerTarjeta}>
          <View style={{ flex: 1 }}>
            <Text style={es.destino}>{item.destino}</Text>
            <Text style={es.paquete}>{t('res_paquete', { n: item.paquete })}</Text>
          </View>
          <View style={[es.badgeEstado, { backgroundColor: est.fondo }]}>
            <Text style={[es.textoEstado, { color: est.texto }]}>{est.etiqueta}</Text>
          </View>
        </View>

        <View style={es.separador} />

        {/* Datos */}
        <View style={es.filaDetalle}>
          <View style={es.dato}>
            <Text style={es.datoLabel}>{t('res_folio')}</Text>
            <Text style={es.datoValor}>{item.folio}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>{t('res_fecha')}</Text>
            <Text style={es.datoValor}>{formatearFecha(item.fecha)}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>{t('res_personas')}</Text>
            <Text style={es.datoValor}>{item.personas}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>{t('res_total')}</Text>
            <Text style={[es.datoValor, { color: '#3AB7A5' }]}>
              ${item.total.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Notas del viajero */}
        {!!item.notas && (
          <View style={es.cajaNota}>
            <Text style={es.notaLabel}>📝 {t('res_notas')}</Text>
            <Text style={es.notaTexto}>{item.notas}</Text>
          </View>
        )}

        {/* Confirmación inline de cancelación */}
        {pidioConfirmar && (
          <View style={es.cajaConfirmar}>
            <Text style={es.textoConfirmar}>{t('res_cancelar_msg', { folio: item.folio })}</Text>
            <View style={es.filaConfirmar}>
              <TouchableOpacity style={es.btnMantener} onPress={() => setConfirmandoId(null)} activeOpacity={0.8}>
                <Text style={es.textoBtnMantener}>{t('res_cancelar_no')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={es.btnConfirmarCancelar} onPress={() => confirmarCancelacion(item)} activeOpacity={0.8}>
                <Text style={es.textoBtnConfirmarCancelar}>{t('res_cancelar_si')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={es.filaAcciones}>
          <TouchableOpacity
            style={es.btnVerDetalle}
            onPress={() => irADetalle(item)}
            activeOpacity={0.8}
          >
            <Text style={es.textoBtnDetalle}>{t('res_ver_destino')}</Text>
          </TouchableOpacity>

          {cancelable && (
            <TouchableOpacity
              style={[es.btnCancelar, (esCancelando || pidioConfirmar) && { opacity: 0.5 }]}
              onPress={() => setConfirmandoId(item.id)}
              activeOpacity={0.8}
              disabled={esCancelando || pidioConfirmar}
            >
              {esCancelando
                ? <ActivityIndicator size="small" color="#DD331D" />
                : <Text style={es.textoBtnCancelar}>{t('res_btn_cancelar')}</Text>
              }
            </TouchableOpacity>
          )}

          {item.estado === 'cancelada' && (
            <TouchableOpacity
              style={es.btnReservarOtra}
              onPress={() => volverAReservar(item)}
              activeOpacity={0.8}
            >
              <Text style={es.textoBtnReservarOtra}>{t('res_btn_reservar')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const chips = (
    <FlatList
      horizontal
      data={FILTROS}
      keyExtractor={f => f.clave}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={es.listaFiltros}
      renderItem={({ item: f }) => {
        const activo = filtro === f.clave;
        const n = conteo(f.clave);
        return (
          <TouchableOpacity
            style={[es.chipFiltro, activo && es.chipFiltroActivo]}
            onPress={() => setFiltro(f.clave)}
            activeOpacity={0.75}
          >
            <Text style={[es.textoChip, activo && es.textoChipActivo]}>
              {f.label}
              {n > 0 ? ` (${n})` : ''}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  const footer = hasNextPage && filtro === 'todas' ? (
    <TouchableOpacity style={es.btnCargarMas} onPress={() => fetchNextPage()} disabled={isFetchingNextPage} activeOpacity={0.8}>
      {isFetchingNextPage
        ? <ActivityIndicator size="small" color="#3AB7A5" />
        : <Text style={es.txtCargarMas}>{t('res_cargar_mas')}</Text>}
    </TouchableOpacity>
  ) : null;

  const cuerpo = cargando ? (
    <SkeletonFilas cantidad={5} />
  ) : reservasFiltradas.length === 0 ? (
    <View style={es.vacio}>
      <Text style={es.subtituloVacio}>{t('res_vacio')}</Text>
    </View>
  ) : (
    <FlatList
      data={reservasFiltradas}
      keyExtractor={item => String(item.id)}
      renderItem={renderReserva}
      contentContainerStyle={es.lista}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={footer}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={onRefresh} colors={['#3AB7A5']} tintColor="#3AB7A5" />}
    />
  );

  return (
    <TabChrome
      esPC={esPC}
      title={t('res_titulo')}
      onBack={() => router.back()}
      headerRight={<View style={es.headerSpacer} />}
      maxWidth={700}
    >
      <View style={es.subheader}>
        <Text style={es.subtitulo}>{(reservas as Reserva[]).length} {(reservas as Reserva[]).length !== 1 ? t('res_total_plural') : t('res_total_singular')}</Text>
      </View>
      {chips}
      {cuerpo}
    </TabChrome>
  );
}

const es = StyleSheet.create({
  headerSpacer:         { width: 38, height: 38 },
  subheader:            { paddingHorizontal: 16, paddingBottom: 6, width: '100%', maxWidth: 700, alignSelf: 'center' },
  subtitulo:            { fontSize: 12, color: '#888', marginTop: 2 },

  listaFiltros:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chipFiltro:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
  chipFiltroActivo:     { backgroundColor: '#3AB7A5' },
  textoChip:            { fontSize: 13, color: '#666', fontWeight: '500' },
  textoChipActivo:      { color: '#fff', fontWeight: '700' },

  lista:                { padding: 16, gap: 14, paddingBottom: 20, maxWidth: 700, alignSelf: 'center', width: '100%' },
  tarjeta:              { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#eee' },

  headerTarjeta:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  destino:              { fontSize: 17, fontWeight: '800', color: '#333' },
  paquete:              { fontSize: 12, color: '#888', marginTop: 2 },
  badgeEstado:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  textoEstado:          { fontSize: 12, fontWeight: '700' },
  separador:            { height: 1, backgroundColor: '#f5f5f5', marginVertical: 12 },

  filaDetalle:          { flexDirection: 'row', justifyContent: 'space-between' },
  dato:                 { alignItems: 'center' },
  datoLabel:            { fontSize: 11, color: '#aaa', marginBottom: 3 },
  datoValor:            { fontSize: 13, fontWeight: '600', color: '#333' },

  cajaConfirmar:          { backgroundColor: '#fff8f8', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#f5c0c0' },
  textoConfirmar:         { fontSize: 13, color: '#555', marginBottom: 10, lineHeight: 18 },
  filaConfirmar:          { flexDirection: 'row', gap: 8 },
  btnMantener:            { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#ccc' },
  textoBtnMantener:       { color: '#666', fontWeight: '600', fontSize: 13 },
  btnConfirmarCancelar:   { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20, backgroundColor: '#DD331D' },
  textoBtnConfirmarCancelar: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filaAcciones:           { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  btnVerDetalle:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#3AB7A5' },
  textoBtnDetalle:      { color: '#3AB7A5', fontWeight: '700', fontSize: 13 },
  btnCancelar:          { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 20, backgroundColor: '#fef0f0', borderWidth: 1.5, borderColor: '#DD331D' },
  textoBtnCancelar:     { color: '#DD331D', fontWeight: '700', fontSize: 13 },
  btnReservarOtra:      { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 20, backgroundColor: '#3AB7A5' },
  textoBtnReservarOtra: { color: '#fff', fontWeight: '700', fontSize: 13 },

  cajaNota:             { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#3AB7A5' },
  notaLabel:            { fontSize: 11, fontWeight: '700', color: '#3AB7A5', marginBottom: 3 },
  notaTexto:            { fontSize: 13, color: '#555', lineHeight: 18 },
  btnCargarMas:         { marginHorizontal: 16, marginTop: 4, marginBottom: 20, paddingVertical: 12, alignItems: 'center', borderRadius: 25, borderWidth: 1.5, borderColor: '#3AB7A5' },
  txtCargarMas:         { fontSize: 14, color: '#3AB7A5', fontWeight: '600' },
  vacio:                { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  tituloVacio:          { fontSize: 18, fontWeight: '700', color: '#333' },
  subtituloVacio:       { fontSize: 13, color: '#888' },
});
