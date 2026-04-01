import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS } from '../../lib/constantes';
import { cargarResenas, guardarResena, obtenerUsuarioActivo } from '../../lib/supabase-db';

type ResenaDB = {
  id: number; usuario_id: number; destino: string;
  calificacion: number; comentario: string; creado_en: string; nombre: string;
};

function formatearMes(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function ResenasScreen() {
  const { nombre }        = useLocalSearchParams<{ nombre?: string }>();
  const rutaActual        = usePathname();
  const { width }         = useWindowDimensions();
  const esPC              = width >= 768;

  const [resenas, setResenas]         = useState<ResenaDB[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [usuarioId, setUsuarioId]     = useState<string | null>(null);
  const [miEstrellas, setMiEstrellas] = useState(0);
  const [miTexto, setMiTexto]         = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [enviado, setEnviado]         = useState(false);

  const navegarPestana = (ruta: string) => router.replace(ruta as any);
  const estaActiva = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (usuario) setUsuarioId(usuario.id);
      if (nombre) setResenas(await cargarResenas(nombre));
      setCargando(false);
    };
    cargar();
  }, [nombre]));

  const promedio = resenas.length > 0
    ? (resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length).toFixed(1)
    : '0.0';

  const enviarResena = async () => {
    if (miEstrellas === 0 || !miTexto.trim() || !usuarioId || !nombre) return;
    setEnviando(true);
    const resultado = await guardarResena(usuarioId, nombre, miEstrellas, miTexto.trim());
    setEnviando(false);
    if (resultado.exito) {
      setEnviado(true);
      setMiEstrellas(0);
      setMiTexto('');
      // Recargar lista
      setResenas(await cargarResenas(nombre));
      setTimeout(() => setEnviado(false), 2500);
    }
  };

  const Estrellas = ({ valor, tamaño = 18, seleccionable = false, onSelect }: {
    valor: number; tamaño?: number; seleccionable?: boolean; onSelect?: (n: number) => void;
  }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} disabled={!seleccionable} onPress={() => onSelect?.(n)} activeOpacity={0.7}>
          <Text style={{ fontSize: tamaño, color: n <= valor ? '#f5a623' : '#ddd' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderResena = ({ item }: { item: ResenaDB }) => (
    <View style={es.tarjeta}>
      <View style={es.headerResena}>
        <View style={es.avatarCirculo}>
          <Text style={es.avatarLetra}>{(item.nombre ?? 'V')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={es.usuario}>{item.nombre ?? 'Viajero'}</Text>
          <Text style={es.fecha}>{formatearMes(item.creado_en)}</Text>
        </View>
        <Estrellas valor={item.calificacion} tamaño={14} />
      </View>
      <Text style={es.textoResena}>{item.comentario}</Text>
    </View>
  );

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

  const contenidoInterno = (
    <>
      <View style={es.header}>
        <TouchableOpacity onPress={() => router.back()} style={es.btnVolver}>
          <Text style={es.chevron}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={es.titulo}>Reseñas</Text>
          {nombre ? <Text style={es.subtitulo}>{nombre}</Text> : null}
        </View>
      </View>
      {cargando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color="#3AB7A5" />
        </View>
      ) : (
        <FlatList
          data={resenas}
          keyExtractor={r => String(r.id)}
          renderItem={renderResena}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={es.lista}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#aaa', marginTop: 12 }}>Aún no hay reseñas. ¡Sé el primero!</Text>}
          ListHeaderComponent={() => (
            <>
              <View style={es.resumen}>
                <Text style={es.promedioNum}>{promedio}</Text>
                <Estrellas valor={Math.round(parseFloat(promedio))} tamaño={24} />
                <Text style={es.totalResenas}>{resenas.length} reseña{resenas.length !== 1 ? 's' : ''} verificada{resenas.length !== 1 ? 's' : ''}</Text>
                {[5,4,3,2,1].map(n => {
                  const count = resenas.filter(r => r.calificacion === n).length;
                  const pct = resenas.length > 0 ? (count / resenas.length) * 100 : 0;
                  return (
                    <View key={n} style={es.filaBarra}>
                      <Text style={es.numBarra}>{n}★</Text>
                      <View style={es.barraFondo}><View style={[es.barraRelleno, { width: `${pct}%` as any }]} /></View>
                      <Text style={es.contBarra}>{count}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={es.formulario}>
                <Text style={es.formTitulo}>Deja tu reseña</Text>
                <Estrellas valor={miEstrellas} tamaño={32} seleccionable onSelect={setMiEstrellas} />
                <TextInput style={es.inputResena} value={miTexto} onChangeText={setMiTexto} placeholder="Cuéntanos tu experiencia..." placeholderTextColor="#bbb" multiline numberOfLines={3} textAlignVertical="top" />
                {enviado ? (
                  <View style={es.enviado}><Text style={es.textoEnviado}>✓ ¡Gracias por tu reseña!</Text></View>
                ) : (
                  <TouchableOpacity style={[es.btnEnviar, (miEstrellas === 0 || !miTexto.trim() || enviando) && { opacity: 0.5 }]} onPress={enviarResena} disabled={miEstrellas === 0 || !miTexto.trim() || enviando}>
                    <Text style={es.textoEnviar}>{enviando ? 'Publicando...' : 'Publicar reseña'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={es.seccion}>Reseñas de viajeros</Text>
            </>
          )}
        />
      )}
    </>
  );

  return (
    <View style={es.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      {esPC ? (
        <View style={es.layoutPC}>
          <Sidebar />
          <SafeAreaView style={es.areaPC}>{contenidoInterno}</SafeAreaView>
        </View>
      ) : (
        <View style={es.layoutMovil}>
          <SafeAreaView style={es.area}>{contenidoInterno}</SafeAreaView>
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
  header:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  btnVolver:           { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  chevron:             { fontSize: 32, color: '#3AB7A5', lineHeight: 36 },
  titulo:              { fontSize: 17, fontWeight: '700', color: '#333' },
  subtitulo:           { fontSize: 12, color: '#888' },
  lista:               { padding: 16, gap: 12, maxWidth: 700, alignSelf: 'center', width: '100%', paddingBottom: 20 },
  resumen:             { backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', gap: 6, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  promedioNum:         { fontSize: 52, fontWeight: '800', color: '#333', lineHeight: 60 },
  totalResenas:        { fontSize: 12, color: '#888', marginBottom: 8 },
  filaBarra:           { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  numBarra:            { fontSize: 12, color: '#888', width: 24 },
  barraFondo:          { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  barraRelleno:        { height: '100%', backgroundColor: '#f5a623', borderRadius: 3 },
  contBarra:           { fontSize: 12, color: '#888', width: 16, textAlign: 'right' },
  formulario:          { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  formTitulo:          { fontSize: 15, fontWeight: '700', color: '#333' },
  inputResena:         { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', minHeight: 80 },
  btnEnviar:           { backgroundColor: '#3AB7A5', borderRadius: 25, paddingVertical: 12, alignItems: 'center' },
  textoEnviar:         { color: '#fff', fontWeight: '700', fontSize: 14 },
  enviado:             { backgroundColor: '#e8f8f5', borderRadius: 10, padding: 12, alignItems: 'center' },
  textoEnviado:        { color: '#3AB7A5', fontWeight: '700' },
  seccion:             { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 4 },
  tarjeta:             { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, borderWidth: 1, borderColor: '#eee', gap: 8 },
  headerResena:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCirculo:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },
  avatarLetra:         { fontSize: 16, fontWeight: '700', color: '#fff' },
  usuario:             { fontSize: 14, fontWeight: '700', color: '#333' },
  fecha:               { fontSize: 11, color: '#aaa' },
  textoResena:         { fontSize: 13, color: '#555', lineHeight: 20 },
  envolturaBarra:      { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  barraPestanas:       { flexDirection: 'row', maxWidth: 800, alignSelf: 'center', width: '100%' },
  itemPestana:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana:     { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva: { color: '#DD331D', fontWeight: '600' },
});