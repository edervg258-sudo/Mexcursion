import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { Estrellas } from '../../components/Estrellas';
import { TabChrome } from '../../components/TabChrome';
import { useToast } from '../../components/Toast';
import { useIdioma } from '../../lib/IdiomaContext';
import {
  borrarResena,
  cargarResenasPaginadas,
  editarResena,
  guardarResena,
  obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { SkeletonFilas } from './skeletonloader';

const LIMITE = 10;

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
  const { showToast } = useToast();

  // ── Animación fade al cargar contenido ───────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // ─────────────────────────────────────────────────────────────────────────

  const [resenas, setResenas]         = useState<ResenaDB[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [errorCarga, setErrorCarga]   = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [totalResenas, setTotalResenas] = useState(0);
  const [usuarioId, setUsuarioId]     = useState<string | null>(null);
  const [miEstrellas, setMiEstrellas] = useState(0);
  const [miTexto, setMiTexto]         = useState('');
  const [enviando, setEnviando]       = useState(false);
  const [enviado, setEnviado]         = useState(false);
  const [editandoId, setEditandoId]   = useState<number | null>(null);
  const [borrandoId, setBorrandoId]   = useState<number | null>(null);

  const cargarPagina = useCallback(async (offset: number, append = false) => {
    if (!nombre) {return;}
    try {
      const result = await cargarResenasPaginadas(nombre, LIMITE, offset);
      if (append) {
        setResenas(prev => [...prev, ...result.resenas]);
      } else {
        setResenas(result.resenas);
        setErrorCarga(false);
      }
      setTotalResenas(result.total);
    } catch (error) {
      if (__DEV__) {console.error('Error cargando reseñas:', error);}
      if (!append) {setErrorCarga(true);}
      else {showToast('No se pudieron cargar más reseñas', 'error');}
    }
  }, [nombre, showToast]);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      setCargando(true);
      const usuario = await obtenerUsuarioActivo();
      if (usuario) { setUsuarioId(usuario.id); }
      await cargarPagina(0, false);
      setCargando(false);
      // Fade-in del contenido al reemplazar el skeleton
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== 'web' }).start();
    };
    cargar();
  }, [cargarPagina, fadeAnim]));

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarPagina(0, false);
    setRefreshing(false);
  };

  const cargarMas = async () => {
    if (cargandoMas || resenas.length >= totalResenas) {return;}
    setCargandoMas(true);
    await cargarPagina(resenas.length, true);
    setCargandoMas(false);
  };

  const promedio = resenas.length > 0
    ? (resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length).toFixed(1)
    : '0.0';

  const enviarResena = async () => {
    if (miEstrellas === 0 || !miTexto.trim() || !usuarioId || !nombre) { return; }
    setEnviando(true);
    try {
      const resultado = editandoId
        ? await editarResena(editandoId, usuarioId, miEstrellas, miTexto.trim())
        : await guardarResena(usuarioId, nombre, miEstrellas, miTexto.trim());
      if (resultado.exito) {
        const fueEdicion = !!editandoId;
        setEnviado(true);
        setMiEstrellas(0);
        setMiTexto('');
        setEditandoId(null);
        showToast(
          fueEdicion ? 'Reseña actualizada' : (t('res_enviada') || '¡Reseña publicada!'),
          'success'
        );
        await cargarPagina(0, false);
        setTimeout(() => setEnviado(false), 2500);
      } else {
        showToast(t('res_error_enviar') || 'No se pudo publicar la reseña', 'error');
      }
    } catch (error) {
      if (__DEV__) {console.error('Error enviando reseña:', error);}
      showToast(t('res_error_enviar') || 'Error al enviar la reseña', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const iniciarEdicion = (item: ResenaDB) => {
    setEditandoId(item.id);
    setMiEstrellas(item.calificacion);
    setMiTexto(item.comentario);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setMiEstrellas(0);
    setMiTexto('');
  };

  const eliminarResena = async (item: ResenaDB) => {
    if (!usuarioId) { return; }
    const confirmar = Platform.OS === 'web'
      ? window.confirm('¿Borrar tu reseña?')
      : await new Promise<boolean>(resolve =>
          Alert.alert('Borrar reseña', '¿Seguro que quieres borrarla?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Borrar',   style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmar) { return; }
    setBorrandoId(item.id);
    try {
      const r = await borrarResena(item.id, usuarioId);
      if (r.exito) {
        showToast('Reseña borrada', 'success');
        if (editandoId === item.id) { cancelarEdicion(); }
        await cargarPagina(0, false);
      } else {
        showToast('No se pudo borrar la reseña', 'error');
      }
    } finally {
      setBorrandoId(null);
    }
  };

  const renderResena = ({ item }: { item: ResenaDB }) => {
    const esMia = usuarioId !== null && String(item.usuario_id) === String(usuarioId);
    const estaBorrando = borrandoId === item.id;
    return (
      <View style={[es.tarjeta, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <View style={es.headerResena}>
          <View style={es.avatarCirculo}>
            <Text style={es.avatarLetra}>{(item.nombre ?? 'V')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[es.usuario, { color: tema.texto }]}>
              {item.nombre ?? 'Viajero'}{esMia ? ' · Tú' : ''}
            </Text>
            <Text style={[es.fecha, { color: tema.textoMuted }]}>{formatearMes(item.creado_en)}</Text>
          </View>
          <Estrellas valor={item.calificacion} tamaño={14} />
        </View>
        <Text style={[es.textoResena, { color: tema.textoSecundario }]}>{item.comentario}</Text>
        {esMia && (
          <View style={es.accionesResena}>
            <TouchableOpacity
              style={[es.btnAccionResena, { borderColor: tema.borde }]}
              onPress={() => iniciarEdicion(item)}
              disabled={estaBorrando}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={13} color={tema.textoSecundario} />
              <Text style={[es.txtAccionResena, { color: tema.textoSecundario }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[es.btnAccionResena, { borderColor: '#DD331D33' }, estaBorrando && { opacity: 0.5 }]}
              onPress={() => eliminarResena(item)}
              disabled={estaBorrando}
              activeOpacity={0.8}
            >
              {estaBorrando
                ? <ActivityIndicator size="small" color="#DD331D" />
                : <>
                    <Ionicons name="trash-outline" size={13} color="#DD331D" />
                    <Text style={[es.txtAccionResena, { color: '#DD331D' }]}>Borrar</Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const EmptyComponent = () => (
    <EmptyState
      icono="star-outline"
      titulo="Sin reseñas aún"
      subtitulo={`Sé el primero en compartir tu experiencia en ${nombre ?? 'este destino'}.`}
    />
  );

  // Footer: "cargar más" o spinner
  const FooterComponent = () => {
    if (cargandoMas) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ActivityIndicator size="small" color="#3AB7A5" />
        </View>
      );
    }
    if (resenas.length > 0 && resenas.length < totalResenas) {
      return (
        <TouchableOpacity style={[es.btnCargarMas, { borderColor: tema.borde }]} onPress={cargarMas} activeOpacity={0.8}>
          <Text style={[es.txtCargarMas, { color: '#3AB7A5' }]}>Cargar más reseñas</Text>
        </TouchableOpacity>
      );
    }
    if (resenas.length > 0 && resenas.length >= totalResenas && totalResenas > LIMITE) {
      return (
        <Text style={[es.sinMas, { color: tema.textoMuted }]}>— Todas las reseñas —</Text>
      );
    }
    return null;
  };

  const ListHeader = () => (
    <>
      {/* Resumen de calificaciones */}
      <View style={[es.resumen, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <Text style={[es.promedioNum, { color: tema.texto }]}>{promedio}</Text>
        <Estrellas valor={Math.round(parseFloat(promedio))} tamaño={24} />
        <Text style={[es.totalResenas, { color: tema.textoMuted }]}>
          {totalResenas} {totalResenas !== 1 ? t('rsn_verificada_plural') : t('rsn_verificada_singular')}
        </Text>
        {[5,4,3,2,1].map(n => {
          const count = resenas.filter(r => r.calificacion === n).length;
          const pct   = resenas.length > 0 ? (count / resenas.length) * 100 : 0;
          return (
            <View key={n} style={es.filaBarra}>
              <View style={es.numBarraCont}>
                <Text style={[es.numBarra, { color: tema.textoMuted }]}>{n}</Text>
                <Ionicons name="star" size={10} color="#f5a623" />
              </View>
              <View style={[es.barraFondo, { backgroundColor: tema.borde }]}>
                <View style={[es.barraRelleno, { width: `${pct}%` as `${number}%` }]} />
              </View>
              <Text style={[es.contBarra, { color: tema.textoMuted }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Formulario */}
      <View style={[es.formulario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <Text style={[es.formTitulo, { color: tema.texto }]}>
          {editandoId ? 'Editar tu reseña' : t('rsn_deja_resena')}
        </Text>
        <Estrellas valor={miEstrellas} tamaño={32} seleccionable onSelect={setMiEstrellas} />
        <TextInput
          style={[es.inputResena, { borderColor: tema.borde, color: tema.texto, backgroundColor: tema.superficie }]}
          value={miTexto}
          onChangeText={setMiTexto}
          placeholder={t('rsn_placeholder')}
          placeholderTextColor={tema.textoMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {enviado ? (
          <View style={es.enviado}><Text style={es.textoEnviado}>{t('rsn_gracias')}</Text></View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {editandoId && (
              <TouchableOpacity
                style={[es.btnCancelarEd, { borderColor: tema.borde }]}
                onPress={cancelarEdicion}
                disabled={enviando}
              >
                <Text style={[es.textoCancelarEd, { color: tema.textoMuted }]}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[es.btnEnviar, { flex: 1 }, (miEstrellas === 0 || !miTexto.trim() || enviando) && { opacity: 0.5 }]}
              onPress={enviarResena}
              disabled={miEstrellas === 0 || !miTexto.trim() || enviando}
            >
              <Text style={es.textoEnviar}>
                {enviando
                  ? t('rsn_publicando')
                  : editandoId
                    ? 'Guardar cambios'
                    : t('rsn_publicar')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[es.seccion, { color: tema.texto }]}>{t('rsn_de_viajeros')}</Text>
    </>
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
      ) : errorCarga ? (
        <EmptyState
          icono="cloud-offline-outline"
          titulo="Error al cargar reseñas"
          subtitulo="Revisa tu conexión e intenta de nuevo."
          colorIcono="#DD331D"
          btnLabel="Reintentar"
          onBtnPress={() => cargarPagina(0, false)}
        />
      ) : (
        <FlatList
          data={resenas}
          keyExtractor={r => String(r.id)}
          renderItem={renderResena}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={es.lista}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyComponent />}
          ListFooterComponent={<FooterComponent />}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3AB7A5']}
              tintColor="#3AB7A5"
            />
          }
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
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {contenidoInterno}
      </Animated.View>
    </TabChrome>
  );
}

const es = StyleSheet.create({
  headerSpacer:        { width: 38, height: 38 },
  subheader:           { paddingHorizontal: 16, paddingBottom: 10, width: '100%' },
  subtitulo:           { fontSize: 12 },
  lista:               { padding: 16, gap: 12, maxWidth: 700, alignSelf: 'center', width: '100%', paddingBottom: 20 },

  // Resumen
  resumen:             { borderRadius: 16, padding: 18, alignItems: 'center', gap: 6, marginBottom: 16, elevation: 2, borderWidth: 1 },
  promedioNum:         { fontSize: 52, fontWeight: '800', lineHeight: 60 },
  totalResenas:        { fontSize: 12, marginBottom: 8 },
  filaBarra:           { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  numBarraCont:        { flexDirection: 'row', alignItems: 'center', gap: 2, width: 28 },
  numBarra:            { fontSize: 12 },
  barraFondo:          { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barraRelleno:        { height: '100%', backgroundColor: '#f5a623', borderRadius: 3 },
  contBarra:           { fontSize: 12, width: 16, textAlign: 'right' },

  // Formulario
  formulario:          { borderRadius: 16, padding: 16, gap: 12, marginBottom: 16, elevation: 2, borderWidth: 1 },
  formTitulo:          { fontSize: 15, fontWeight: '700' },
  inputResena:         { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80 },
  btnEnviar:           { backgroundColor: '#3AB7A5', borderRadius: 25, paddingVertical: 12, alignItems: 'center' },
  textoEnviar:         { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnCancelarEd:       { borderWidth: 1.5, borderRadius: 25, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  textoCancelarEd:     { fontWeight: '700', fontSize: 13 },
  enviado:             { backgroundColor: '#e8f8f5', borderRadius: 10, padding: 12, alignItems: 'center' },
  textoEnviado:        { color: '#3AB7A5', fontWeight: '700' },

  accionesResena:      { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  btnAccionResena:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  txtAccionResena:     { fontSize: 12, fontWeight: '600' },

  seccion:             { fontSize: 15, fontWeight: '700', marginBottom: 4 },

  // Tarjeta reseña
  tarjeta:             { borderRadius: 14, padding: 14, elevation: 2, borderWidth: 1, gap: 8 },
  headerResena:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCirculo:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },
  avatarLetra:         { fontSize: 16, fontWeight: '700', color: '#fff' },
  usuario:             { fontSize: 14, fontWeight: '700' },
  fecha:               { fontSize: 11 },
  textoResena:         { fontSize: 13, lineHeight: 20 },


  // Paginación
  btnCargarMas:        { marginHorizontal: 16, marginTop: 8, marginBottom: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 25, borderWidth: 1.5 },
  txtCargarMas:        { fontSize: 14, fontWeight: '600' },
  sinMas:              { textAlign: 'center', fontSize: 12, paddingVertical: 16 },
});
