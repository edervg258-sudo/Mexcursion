import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View,
    useWindowDimensions,
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { cargarReservasGuia, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';

type ReservaGuia = {
  id: number;
  folio: string;
  destino: string;
  paquete: string;
  fecha: string;
  personas: number;
  total: number;
  metodo: string;
  estado: string;
  nombre_usuario: string;
  notas?: string;
};

function formatearFecha(fecha: string): string {
  const solo = (fecha ?? '').split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(solo)) { return solo.split('-').reverse().join('/'); }
  return fecha ?? '—';
}

const ESTADO_COLOR: Record<string, { fondo: string; texto: string }> = {
  confirmada: { fondo: '#e8f8f5', texto: '#3AB7A5' },
  pendiente:  { fondo: '#fff8e1', texto: '#b8860b' },
};

export default function GuiaScreen() {
  const { width } = useWindowDimensions();
  const esPC = width >= 768;
  const { tema } = useTemaContext();

  useEffect(() => { configurarBarraAndroid(); }, []);

  const { data: usuario, isLoading: cargandoUsuario } = useQuery({
    queryKey: ['usuario-actual'],
    queryFn: obtenerUsuarioActivo,
    retry: 1,
  });

  // Redirigir si no es guía
  useEffect(() => {
    if (!cargandoUsuario && usuario && usuario.tipo !== 'guide') {
      setTimeout(() => router.replace('/(tabs)/menu' as never), 0);
    }
    if (!cargandoUsuario && !usuario) {
      setTimeout(() => router.replace('/login' as never), 0);
    }
  }, [usuario, cargandoUsuario]);

  const { data: reservas = [], isLoading: cargandoReservas, refetch } = useQuery({
    queryKey: ['reservas-guia'],
    queryFn: cargarReservasGuia,
    enabled: usuario?.tipo === 'guide',
    staleTime: 1000 * 60 * 2,
  });

  const renderTarjeta = ({ item }: { item: ReservaGuia }) => {
    const est = ESTADO_COLOR[item.estado] ?? { fondo: '#f0f0f0', texto: '#888' };
    return (
      <View style={[es.tarjeta, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <View style={es.filaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[es.destino, { color: tema.texto }]}>{item.destino}</Text>
            <Text style={[es.paquete, { color: tema.textoMuted }]}>{item.paquete}</Text>
          </View>
          <View style={[es.badge, { backgroundColor: est.fondo }]}>
            <Text style={[es.badgeTexto, { color: est.texto }]}>{item.estado}</Text>
          </View>
        </View>

        <View style={[es.separador, { backgroundColor: tema.borde }]} />

        <View style={es.filaDatos}>
          <View style={es.dato}>
            <Ionicons name="person-outline" size={13} color={tema.textoMuted} />
            <Text style={[es.datoTexto, { color: tema.textoSecundario }]}>{item.nombre_usuario}</Text>
          </View>
          <View style={es.dato}>
            <Ionicons name="calendar-outline" size={13} color={tema.textoMuted} />
            <Text style={[es.datoTexto, { color: tema.textoSecundario }]}>{formatearFecha(item.fecha)}</Text>
          </View>
          <View style={es.dato}>
            <Ionicons name="people-outline" size={13} color={tema.textoMuted} />
            <Text style={[es.datoTexto, { color: tema.textoSecundario }]}>{item.personas} pax</Text>
          </View>
        </View>

        <View style={es.filaFooter}>
          <Text style={[es.folio, { color: tema.textoMuted }]}>#{item.folio}</Text>
          <Text style={[es.total, { color: '#3AB7A5' }]}>${item.total.toLocaleString()} MXN</Text>
        </View>

        {!!item.notas && (
          <View style={[es.cajaNota, { backgroundColor: tema.superficie }]}>
            <Ionicons name="document-text-outline" size={12} color="#3AB7A5" />
            <Text style={[es.notaTexto, { color: tema.textoSecundario }]}>{item.notas}</Text>
          </View>
        )}
      </View>
    );
  };

  const cargando = cargandoUsuario || cargandoReservas;

  return (
    <TabChrome
      esPC={esPC}
      title="Panel de Guía"
      onBack={() => setTimeout(() => router.replace('/(tabs)/perfil' as never), 0)}
      headerRight={
        <TouchableOpacity onPress={() => refetch()} style={es.btnRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={tema.textoSecundario} />
        </TouchableOpacity>
      }
      maxWidth={700}
    >
      {/* Resumen */}
      <View style={[es.resumen, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <View style={es.resumenItem}>
          <Text style={[es.resumenNum, { color: '#3AB7A5' }]}>{reservas.length}</Text>
          <Text style={[es.resumenLabel, { color: tema.textoMuted }]}>Tours próximos</Text>
        </View>
        <View style={[es.resumenDiv, { backgroundColor: tema.borde }]} />
        <View style={es.resumenItem}>
          <Text style={[es.resumenNum, { color: '#3AB7A5' }]}>
            {reservas.reduce((s, r) => s + (r.personas ?? 0), 0)}
          </Text>
          <Text style={[es.resumenLabel, { color: tema.textoMuted }]}>Pasajeros totales</Text>
        </View>
        <View style={[es.resumenDiv, { backgroundColor: tema.borde }]} />
        <View style={es.resumenItem}>
          <Text style={[es.resumenNum, { color: '#b8860b' }]}>
            {reservas.filter(r => r.estado === 'pendiente').length}
          </Text>
          <Text style={[es.resumenLabel, { color: tema.textoMuted }]}>Pendientes</Text>
        </View>
      </View>

      {cargando ? (
        <View style={es.centrado}>
          <ActivityIndicator size="large" color="#3AB7A5" />
        </View>
      ) : reservas.length === 0 ? (
        <View style={es.vacio}>
          <Text style={es.vacioEmoji}>🗺️</Text>
          <Text style={[es.vacioTitulo, { color: tema.texto }]}>Sin tours próximos</Text>
          <Text style={[es.vacioSub, { color: tema.textoMuted }]}>
            No hay reservas confirmadas o pendientes a partir de hoy.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservas as ReservaGuia[]}
          keyExtractor={item => String(item.id)}
          renderItem={renderTarjeta}
          contentContainerStyle={es.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </TabChrome>
  );
}

const es = StyleSheet.create({
  btnRefresh:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  resumen:       { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, borderWidth: 1, padding: 14 },
  resumenItem:   { flex: 1, alignItems: 'center', gap: 2 },
  resumenNum:    { fontSize: 22, fontWeight: '800' },
  resumenLabel:  { fontSize: 11, textAlign: 'center' },
  resumenDiv:    { width: 1, marginHorizontal: 8 },

  lista:         { padding: 16, gap: 12, paddingBottom: 24 },
  tarjeta:       { borderRadius: 14, padding: 14, borderWidth: 1, elevation: 2 },

  filaHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  destino:       { fontSize: 16, fontWeight: '800' },
  paquete:       { fontSize: 12, marginTop: 2 },
  badge:         { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  badgeTexto:    { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  separador:     { height: 1, marginVertical: 10 },

  filaDatos:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  dato:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datoTexto:     { fontSize: 13 },

  filaFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folio:         { fontSize: 12 },
  total:         { fontSize: 14, fontWeight: '700' },

  cajaNota:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, borderRadius: 8, padding: 8 },
  notaTexto:     { fontSize: 12, flex: 1, lineHeight: 16 },

  centrado:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  vacio:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60, gap: 8 },
  vacioEmoji:    { fontSize: 48 },
  vacioTitulo:   { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  vacioSub:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
