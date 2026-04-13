import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Estrellas } from '../../components/Estrellas';
import { TabChrome } from '../../components/TabChrome';
import { useIdioma } from '../../lib/IdiomaContext';
import { cargarResenas, guardarResena, obtenerUsuarioActivo } from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { SkeletonFilas } from './skeletonloader';

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
  const { width }         = useWindowDimensions();
  const esPC              = width >= 768;
  const { t } = useIdioma();
  const { tema } = useTemaContext();

  const [resenas, setResenas]         = useState<ResenaDB[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [usuarioId, setUsuarioId]     = useState<string | null>(null);
  const [miEstrellas, setMiEstrellas] = useState(0);
  const [miTexto, setMiTexto]         = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [enviado, setEnviado]         = useState(false);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (usuario) { setUsuarioId(usuario.id); }
      if (nombre) { setResenas(await cargarResenas(nombre)); }
      setCargando(false);
    };
    cargar();
  }, [nombre]));

  const promedio = resenas.length > 0
    ? (resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length).toFixed(1)
    : '0.0';

  const enviarResena = async () => {
    if (miEstrellas === 0 || !miTexto.trim() || !usuarioId || !nombre) { return; }
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

  const renderResena = ({ item }: { item: ResenaDB }) => (
    <View style={[es.tarjeta, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
      <View style={es.headerResena}>
        <View style={es.avatarCirculo}>
          <Text style={es.avatarLetra}>{(item.nombre ?? 'V')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[es.usuario, { color: tema.texto }]}>{item.nombre ?? 'Viajero'}</Text>
          <Text style={[es.fecha, { color: tema.textoMuted }]}>{formatearMes(item.creado_en)}</Text>
        </View>
        <Estrellas valor={item.calificacion} tamaño={14} />
      </View>
      <Text style={[es.textoResena, { color: tema.textoSecundario }]}>{item.comentario}</Text>
    </View>
  );

  const contenidoInterno = (
    <>
      {nombre ? (
        <View style={es.subheader}>
          <Text style={[es.subtitulo, { color: tema.textoMuted }]}>{nombre}</Text>
        </View>
      ) : null}
      {cargando ? (
        <SkeletonFilas cantidad={4} />
      ) : (
        <FlatList
          data={resenas}
          keyExtractor={r => String(r.id)}
          renderItem={renderResena}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={es.lista}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: tema.textoMuted, marginTop: 12 }}>{t('rsn_sin_resenas')}</Text>}
          ListHeaderComponent={() => (
            <>
              <View style={[es.resumen, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.promedioNum, { color: tema.texto }]}>{promedio}</Text>
                <Estrellas valor={Math.round(parseFloat(promedio))} tamaño={24} />
                <Text style={[es.totalResenas, { color: tema.textoMuted }]}>{resenas.length} {resenas.length !== 1 ? t('rsn_verificada_plural') : t('rsn_verificada_singular')}</Text>
                {[5,4,3,2,1].map(n => {
                  const count = resenas.filter(r => r.calificacion === n).length;
                  const pct = resenas.length > 0 ? (count / resenas.length) * 100 : 0;
                  return (
                    <View key={n} style={es.filaBarra}>
                      <Text style={[es.numBarra, { color: tema.textoMuted }]}>{n}★</Text>
                      <View style={[es.barraFondo, { backgroundColor: tema.borde }]}><View style={[es.barraRelleno, { width: `${pct}%` as `${number}%` }]} /></View>
                      <Text style={[es.contBarra, { color: tema.textoMuted }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={[es.formulario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.formTitulo, { color: tema.texto }]}>{t('rsn_deja_resena')}</Text>
                <Estrellas valor={miEstrellas} tamaño={32} seleccionable onSelect={setMiEstrellas} />
                <TextInput style={[es.inputResena, { borderColor: tema.borde, color: tema.texto, backgroundColor: tema.superficie }]} value={miTexto} onChangeText={setMiTexto} placeholder={t('rsn_placeholder')} placeholderTextColor={tema.textoMuted} multiline numberOfLines={3} textAlignVertical="top" />
                {enviado ? (
                  <View style={es.enviado}><Text style={es.textoEnviado}>{t('rsn_gracias')}</Text></View>
                ) : (
                  <TouchableOpacity style={[es.btnEnviar, (miEstrellas === 0 || !miTexto.trim() || enviando) && { opacity: 0.5 }]} onPress={enviarResena} disabled={miEstrellas === 0 || !miTexto.trim() || enviando}>
                    <Text style={es.textoEnviar}>{enviando ? t('rsn_publicando') : t('rsn_publicar')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[es.seccion, { color: tema.texto }]}>{t('rsn_de_viajeros')}</Text>
            </>
          )}
        />
      )}
    </>
  );

  return (
    <TabChrome
      esPC={esPC}
      title={t('rsn_titulo')}
      onBack={() => router.replace('/(tabs)/perfil' as never)}
      headerRight={<View style={es.headerSpacer} />}
      maxWidth={700}
    >
      {contenidoInterno}
    </TabChrome>
  );

}

const es = StyleSheet.create({
  headerSpacer:        { width: 38, height: 38 },
  subheader:           { paddingHorizontal: 16, paddingBottom: 10, width: '100%' },
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
});
