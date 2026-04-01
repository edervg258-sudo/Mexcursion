import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform,
  StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS, TODOS_LOS_ESTADOS } from '../../lib/constantes';
import { cargarReservas, obtenerTodosLosDestinos, obtenerUsuarioActivo } from '../../lib/supabase-db';

type Reserva = {
  id: number; usuario_id: number; folio: string; destino: string;
  paquete: string; fecha: string; personas: number; total: number;
  metodo: string; estado: string; creado_en: string;
};
type Filtro = 'todas' | 'confirmada' | 'pendiente' | 'completada' | 'cancelada';

const COLOR_ESTADO: Record<string, { fondo: string; texto: string; etiqueta: string }> = {
  confirmada: { fondo: '#e8f8f5', texto: '#3AB7A5', etiqueta: '✓ Confirmada'  },
  pendiente:  { fondo: '#fff8e1', texto: '#b8860b', etiqueta: '⏳ Pendiente'   },
  completada: { fondo: '#f0f0f0', texto: '#888',    etiqueta: '✔ Completada'  },
  cancelada:  { fondo: '#fef0f0', texto: '#DD331D', etiqueta: '✕ Cancelada'   },
};

export default function MisReservasScreen() {
  const rutaActual        = usePathname();
  const { width }         = useWindowDimensions();
  const esPC              = width >= 768;
  const [filtro, setFiltro]       = useState<Filtro>('todas');
  const [reservas, setReservas]   = useState<Reserva[]>([]);
  const [destinosDB, setDestinosDB] = useState<any[]>([]);
  const [cargando, setCargando]   = useState(true);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) { router.replace('/login'); return; }
      const [r, d] = await Promise.all([
        cargarReservas(usuario.id),
        obtenerTodosLosDestinos()
      ]);
      setReservas(r);
      setDestinosDB(d);
      setCargando(false);
    };
    cargar();
  }, []));

  const navegarPestana = (ruta: string) => router.replace(ruta as any);
  const estaActiva = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  const reservasFiltradas = filtro === 'todas'
    ? reservas
    : reservas.filter(r => r.estado === filtro);

  const FILTROS: { clave: Filtro; label: string }[] = [
    { clave: 'todas',      label: 'Todas'      },
    { clave: 'confirmada', label: 'Confirmadas' },
    { clave: 'pendiente',  label: 'Pendientes'  },
    { clave: 'completada', label: 'Completadas' },
    { clave: 'cancelada',  label: 'Canceladas'  },
  ];

  const irADetalle = (item: Reserva) => {
    const estado = destinosDB.find(e => e.nombre === item.destino) || TODOS_LOS_ESTADOS.find(e => e.nombre === item.destino);
    router.push({
      pathname: '/(tabs)/detalle' as any,
      params: { nombre: item.destino, categoria: estado?.categoria ?? 'Cultura' },
    });
  };

  const renderReserva = ({ item }: { item: Reserva }) => {
    const est = COLOR_ESTADO[item.estado] ?? { fondo: '#f5f5f5', texto: '#888', etiqueta: item.estado };
    return (
      <View style={es.tarjeta}>
        {/* Header tarjeta */}
        <View style={es.headerTarjeta}>
          <View style={{ flex: 1 }}>
            <Text style={es.destino}>{item.destino}</Text>
            <Text style={es.paquete}>Paquete {item.paquete}</Text>
          </View>
          <View style={[es.badgeEstado, { backgroundColor: est.fondo }]}>
            <Text style={[es.textoEstado, { color: est.texto }]}>{est.etiqueta}</Text>
          </View>
        </View>

        <View style={es.separador} />

        {/* Detalles */}
        <View style={es.filaDetalle}>
          <View style={es.dato}>
            <Text style={es.datoLabel}>Folio</Text>
            <Text style={es.datoValor}>{item.folio}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>Fecha</Text>
            <Text style={es.datoValor}>{item.fecha}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>Personas</Text>
            <Text style={es.datoValor}>{item.personas}</Text>
          </View>
          <View style={es.dato}>
            <Text style={es.datoLabel}>Total</Text>
            <Text style={[es.datoValor, { color: '#3AB7A5', fontWeight: '700' }]}>
              ${item.total.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Acción */}
        <TouchableOpacity style={es.btnAccion} onPress={() => irADetalle(item)} activeOpacity={0.8}>
          <Text style={es.textoBtnAccion}>Ver detalles del viaje →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const Sidebar = () => (
    <View style={es.sidebar}>
      <Image source={require('../../assets/images/logo.png')} style={es.logoSidebar} resizeMode="contain" />
      <View style={es.separadorSidebar} />
      {PESTANAS.map(p => {
        const activa = estaActiva(p.ruta);
        return (
          <TouchableOpacity key={p.ruta} style={[es.itemSidebar, activa && es.itemSidebarActivo]} onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
            <Image source={activa ? p.iconoRojo : p.iconoGris} style={es.iconoSidebar} resizeMode="contain" />
          </TouchableOpacity>
        );
      })}
      <View style={{ flex: 1 }} />
    </View>
  );

  const Contenido = () => (
    <>
      <View style={es.header}>
        <TouchableOpacity onPress={() => router.back()} style={es.btnVolver}>
          <Text style={es.chevronVolver}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={es.titulo}>Mis reservas</Text>
          <Text style={es.subtitulo}>{reservas.length} reserva{reservas.length !== 1 ? 's' : ''} en total</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={FILTROS}
        keyExtractor={f => f.clave}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={es.listaFiltros}
        renderItem={({ item: f }) => (
          <TouchableOpacity style={[es.chipFiltro, filtro === f.clave && es.chipFiltroActivo]} onPress={() => setFiltro(f.clave)}>
            <Text style={[es.textoChip, filtro === f.clave && es.textoChipActivo]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />
      {cargando ? (
        <View style={es.vacio}><ActivityIndicator size="large" color="#3AB7A5" /></View>
      ) : reservasFiltradas.length === 0 ? (
        <View style={es.vacio}>
          <Text style={{ fontSize: 48 }}>🗓️</Text>
          <Text style={es.tituloVacio}>{reservas.length === 0 ? 'Sin reservas' : 'Sin resultados'}</Text>
          <Text style={es.subtituloVacio}>{reservas.length === 0 ? 'Aquí aparecerán tus reservas' : 'No tienes reservas en esta categoría'}</Text>
        </View>
      ) : (
        <FlatList data={reservasFiltradas} keyExtractor={item => item.folio} renderItem={renderReserva} contentContainerStyle={es.lista} showsVerticalScrollIndicator={false} />
      )}
    </>
  );

  return (
    <View style={es.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      {esPC ? (
        <View style={es.layoutPC}>
          <Sidebar />
          <SafeAreaView style={es.areaPC}><Contenido /></SafeAreaView>
        </View>
      ) : (
        <View style={es.layoutMovil}>
          <SafeAreaView style={es.area}><Contenido /></SafeAreaView>
          <View style={es.envolturaBarra}>
            <View style={es.barraPestanas}>
              {PESTANAS.map(p => {
                const activa = estaActiva(p.ruta);
                return (
                  <TouchableOpacity key={p.ruta} style={es.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                    <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    <Text style={[es.etiquetaPestana, activa && es.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
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

const es = StyleSheet.create({
  contenedor:          { flex: 1, backgroundColor: '#FAF7F0' },
  layoutPC:            { flex: 1, flexDirection: 'row' },
  layoutMovil:         { flex: 1, flexDirection: 'column' },
  area:                { flex: 1 },
  areaPC:              { flex: 1 },
  sidebar:             { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar:         { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:    { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:         { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:   { backgroundColor: '#f0faf9' },
  iconoSidebar:        { width: 28, height: 28 },
  header:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#FAF7F0' },
  btnVolver:           { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  chevronVolver:       { fontSize: 26, color: '#3AB7A5', lineHeight: 30 },
  titulo:              { fontSize: 20, fontWeight: '800', color: '#333' },
  subtitulo:           { fontSize: 12, color: '#888', marginTop: 2 },
  listaFiltros:        { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chipFiltro:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
  chipFiltroActivo:    { backgroundColor: '#3AB7A5' },
  textoChip:           { fontSize: 13, color: '#666', fontWeight: '500' },
  textoChipActivo:     { color: '#fff', fontWeight: '700' },
  lista:               { padding: 16, gap: 14, paddingBottom: 20, maxWidth: 700, alignSelf: 'center', width: '100%' },
  tarjeta:             { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#eee' },
  headerTarjeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  destino:             { fontSize: 17, fontWeight: '800', color: '#333' },
  paquete:             { fontSize: 12, color: '#888', marginTop: 2 },
  badgeEstado:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  textoEstado:         { fontSize: 12, fontWeight: '700' },
  separador:           { height: 1, backgroundColor: '#f5f5f5', marginVertical: 12 },
  filaDetalle:         { flexDirection: 'row', justifyContent: 'space-between' },
  dato:                { alignItems: 'center' },
  datoLabel:           { fontSize: 11, color: '#aaa', marginBottom: 3 },
  datoValor:           { fontSize: 13, fontWeight: '600', color: '#333' },
  btnAccion:           { marginTop: 12, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  textoBtnAccion:      { color: '#3AB7A5', fontWeight: '700', fontSize: 13 },
  vacio:               { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  tituloVacio:         { fontSize: 18, fontWeight: '700', color: '#333' },
  subtituloVacio:      { fontSize: 13, color: '#888' },
  envolturaBarra:      { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  barraPestanas:       { flexDirection: 'row', maxWidth: 800, alignSelf: 'center', width: '100%' },
  itemPestana:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana:     { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva: { color: '#DD331D', fontWeight: '600' },
});