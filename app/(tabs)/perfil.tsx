import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, Image, Modal, Platform, ScrollView,
    StyleSheet, Switch, Text, TextInput,
    TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { configurarBarraAndroid } from '../../lib/android-ui';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import {
    actualizarPerfil, actualizarPreferencias,
    cambiarContrasena,
    cerrarSesion,
    obtenerUsuarioActivo,
} from '../../lib/supabase-db';
import { SkeletonPerfil } from './skeletonloader';

type TipoModal = null | 'editarPerfil' | 'cambiarPassword' | 'notificaciones' | 'idioma' | 'tema' | 'ayuda' | 'acerca';

type SesionUsuario = {
  id: string;
  nombre: string | null;
  nombre_usuario?: string | null;
  correo?: string | null;
  telefono?: string | null;
  tipo?: string | null;
  activo?: number;
  notificaciones?: number;
  idioma?: string;
  foto_url?: string | null;
};

export default function PerfilScreen() {
  const { width }  = useWindowDimensions();
  const esPC       = width >= 768;
  const { t, idioma, cambiarIdioma } = useIdioma();
  const { isDark, toggleTema, tema } = useTemaContext();

  useEffect(() => {
    configurarBarraAndroid();
  }, []);

  const [modalActivo, setModalActivo]       = useState<TipoModal>(null);
  const [sesion, setSesion]                 = useState<SesionUsuario | null>(null);
  const [cargando, setCargando]             = useState(true);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const avatarAnim  = useRef(new Animated.Value(0.6)).current;
  const animsRow    = useRef<Map<string, Animated.Value>>(new Map()).current;
  const cerrarAnim  = useRef(new Animated.Value(1)).current;
  const adminAnim   = useRef(new Animated.Value(1)).current;

  const getRowAnim = (key: string) => {
    if (!animsRow.has(key)) { animsRow.set(key, new Animated.Value(1)); }
    return animsRow.get(key)!;
  };
  const rowPressIn  = (key: string) => Animated.spring(getRowAnim(key), { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 60, bounciness: 2 }).start();
  const rowPressOut = (key: string) => Animated.spring(getRowAnim(key), { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6 }).start();
  const [nombre, setNombre]                 = useState('');
  const [usuario, setUsuario]               = useState('');
  const [telefono, setTelefono]             = useState('');
  const [passActual, setPassActual]         = useState('');
  const [passNueva, setPassNueva]           = useState('');
  const [passConfirmar, setPassConfirmar]   = useState('');
  const [notificaciones, setNotificaciones] = useState(true);

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    avatarAnim.setValue(0.6);
    const cargar = async () => {
      setCargando(true);
      
      const u = await obtenerUsuarioActivo();
      if (!u) { setTimeout(() => router.replace('/login'), 0); return; }
      setSesion(u);
      setNombre(u.nombre ?? '');
      setUsuario(u.nombre_usuario ?? '');
      setTelefono(u.telefono ?? '');
      setNotificaciones(u.notificaciones === 1);
      const lang = (u.idioma ?? 'es') as 'es' | 'en';
      await cambiarIdioma(lang);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(avatarAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 60, friction: 9 }),
      ]).start();
      setCargando(false);
    };
    cargar();
  }, [avatarAnim, cambiarIdioma, fadeAnim]));

  const cerrarModal    = () => setModalActivo(null);
  const mensaje        = (txt: string) => Alert.alert('', txt);

  const handleCerrarSesion = async () => {
    // Alert.alert no funciona con callbacks en web; usar confirm del navegador
    const confirmar = Platform.OS === 'web'
      ? window.confirm(t('prf_cerrar_confirm'))
      : await new Promise<boolean>(resolve =>
          Alert.alert(t('prf_cerrar_sesion_titulo'), t('prf_cerrar_confirm'), [
            { text: t('prf_cancelar'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('prf_cerrar_sesion'), style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmar) { return; }
    await cerrarSesion();
    setTimeout(() => router.replace('/login' as never), 0);
  };

  const handleGuardarPerfil = async () => {
    if (!nombre.trim() || !usuario.trim()) { return mensaje(t('prf_err_nombre')); }
    if (!sesion?.id) { return; }
    const r = await actualizarPerfil(sesion.id, { nombre: nombre.trim(), nombre_usuario: usuario.trim(), telefono: telefono.trim() });
    if (!r.exito) { return mensaje(r.error ?? 'Error al actualizar'); }
    setSesion((ant) => ant ? ({ ...ant, nombre: nombre.trim(), nombre_usuario: usuario.trim(), telefono: telefono.trim() }) : null);
    mensaje(t('prf_perfil_ok'));
    cerrarModal();
  };

  const handleCambiarPassword = async () => {
    if (!passActual.trim())          { return mensaje(t('prf_err_pass_actual')); }
    if (passNueva.length < 6)        { return mensaje(t('prf_err_pass_corta')); }
    if (passNueva !== passConfirmar) { return mensaje(t('prf_err_pass_match')); }
    if (!sesion?.id) { return; }
    const r = await cambiarContrasena(sesion.id, passActual, passNueva);
    if (!r.exito) { return mensaje(r.error ?? 'Error al cambiar contraseña'); }
    mensaje(t('prf_pass_ok'));
    setPassActual(''); setPassNueva(''); setPassConfirmar('');
    cerrarModal();
  };

  const handleNotificaciones = async (valor: boolean) => {
    setNotificaciones(valor);
    if (sesion?.id) {
      await actualizarPreferencias(sesion.id, { notificaciones: valor ? 1 : 0 });
    }
  };

  const handleIdioma = async (valor: string) => {
    const lang = valor as 'es' | 'en';
    await cambiarIdioma(lang);
    if (sesion?.id) {
      await actualizarPreferencias(sesion.id, { idioma: lang });
    }
  };

  const ACCESOS_RAPIDOS = [
    { etiqueta: t('prf_mis_reservas'), onPress: () => setTimeout(() => router.push('/(tabs)/mis_reservas' as never), 0) },
    { etiqueta: t('prf_historial'),    onPress: () => setTimeout(() => router.push('/(tabs)/historial' as never), 0) },
  ];

  const SECCIONES = [
    { titulo: t('prf_cuenta'),       items: [{ etiqueta: t('prf_editar_perfil'), modal: 'editarPerfil'    as TipoModal }, { etiqueta: t('prf_cambiar_pass'),   modal: 'cambiarPassword' as TipoModal }] },
    { titulo: t('prf_preferencias'), items: [{ etiqueta: t('prf_notificaciones'), modal: 'notificaciones' as TipoModal }, { etiqueta: t('prf_idioma'),         modal: 'idioma'          as TipoModal }, { etiqueta: t('prf_tema'),           modal: 'tema'            as TipoModal }] },
    { titulo: t('prf_ayuda'),        items: [{ etiqueta: t('prf_centro_ayuda'),  modal: 'ayuda'           as TipoModal }, { etiqueta: t('prf_acerca'),         modal: 'acerca'          as TipoModal }] },
  ];

  const renderContenidoModal = () => {
    switch (modalActivo) {
      case 'editarPerfil': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_editar_titulo')}</Text>
          <Text style={estilos.modalEtiqueta}>{t('prf_nombre_completo')}</Text>
          <TextInput style={estilos.modalInput} value={nombre} onChangeText={setNombre} placeholder={t('prf_ph_nombre')} placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>{t('prf_usuario')}</Text>
          <TextInput style={estilos.modalInput} value={usuario} onChangeText={setUsuario} placeholder={t('prf_ph_usuario')} placeholderTextColor="#aaa" autoCapitalize="none" />
          <Text style={estilos.modalEtiqueta}>{t('prf_telefono')}</Text>
          <TextInput style={estilos.modalInput} value={telefono} onChangeText={setTelefono} placeholder={t('prf_ph_telefono')} placeholderTextColor="#aaa" keyboardType="phone-pad" />
          <TouchableOpacity style={estilos.modalBoton} onPress={handleGuardarPerfil}>
            <Text style={estilos.modalBotonTexto}>{t('prf_guardar')}</Text>
          </TouchableOpacity>
        </View>
      );
      case 'cambiarPassword': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_pass_titulo')}</Text>
          <Text style={estilos.modalEtiqueta}>{t('prf_pass_actual')}</Text>
          <TextInput style={estilos.modalInput} value={passActual} onChangeText={setPassActual} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>{t('prf_pass_nueva')}</Text>
          <TextInput style={estilos.modalInput} value={passNueva} onChangeText={setPassNueva} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>{t('prf_pass_confirmar')}</Text>
          <TextInput style={estilos.modalInput} value={passConfirmar} onChangeText={setPassConfirmar} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <TouchableOpacity style={estilos.modalBoton} onPress={handleCambiarPassword}>
            <Text style={estilos.modalBotonTexto}>{t('prf_btn_pass')}</Text>
          </TouchableOpacity>
        </View>
      );
      case 'notificaciones': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_notificaciones')}</Text>
          <View style={estilos.filaSwitch}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.switchEtiqueta}>{t('prf_notif_push')}</Text>
              <Text style={estilos.switchDescripcion}>{t('prf_notif_desc')}</Text>
            </View>
            <Switch value={notificaciones} onValueChange={handleNotificaciones} trackColor={{ false: '#ccc', true: '#3AB7A5' }} thumbColor="#fff" />
          </View>
          <Text style={estilos.notifEstado}>{t('prf_notif_estado')} {notificaciones ? t('prf_notif_on') : t('prf_notif_off')}</Text>
        </View>
      );
      case 'idioma': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_idioma_titulo')}</Text>
          {[{ clave: 'es', etiqueta: t('prf_idioma_es') }, { clave: 'en', etiqueta: t('prf_idioma_en') }].map(op => (
            <TouchableOpacity key={op.clave} style={[estilos.filaIdioma, idioma === op.clave && estilos.filaIdiomaActiva]} onPress={() => handleIdioma(op.clave)}>
              <Text style={[estilos.idiomaTexto, idioma === op.clave && estilos.idiomaTextoActivo]}>{op.etiqueta}</Text>
              {idioma === op.clave && <Text style={{ color: '#3AB7A5', fontSize: 16 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      );
      case 'tema': return (
        <View style={estilos.modalContenido}>
          <Text style={[estilos.modalTitulo, { color: tema.texto }]}>{t('prf_tema_titulo')}</Text>
          <View style={estilos.filaSwitch}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.switchEtiqueta, { color: tema.texto }]}>{t('prf_tema_oscuro')}</Text>
              <Text style={[estilos.switchDescripcion, { color: tema.textoMuted }]}>{t('prf_tema_desc')}</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTema} trackColor={{ false: '#ccc', true: '#3AB7A5' }} thumbColor="#fff" />
          </View>
          <Text style={[estilos.notifEstado, { color: tema.textoSecundario }]}>{t('prf_tema_estado')} {isDark ? t('prf_tema_on') : t('prf_tema_off')}</Text>
        </View>
      );
      case 'ayuda': return (
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_ayuda_titulo')}</Text>
          {[
            { p: t('prf_ayuda_p1'), r: t('prf_ayuda_r1') },
            { p: t('prf_ayuda_p2'), r: t('prf_ayuda_r2') },
            { p: t('prf_ayuda_p3'), r: t('prf_ayuda_r3') },
            { p: t('prf_ayuda_p4'), r: t('prf_ayuda_r4') },
            { p: t('prf_ayuda_p5'), r: t('prf_ayuda_r5') },
          ].map((item, i) => (
            <View key={i} style={estilos.itemAyuda}>
              <Text style={estilos.preguntaAyuda}>{item.p}</Text>
              <Text style={estilos.respuestaAyuda}>{item.r}</Text>
            </View>
          ))}
        </ScrollView>
      );
      case 'acerca': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>{t('prf_acerca_titulo')}</Text>
          <Image source={require('../../assets/images/logo.png')} style={estilos.logoAcerca} resizeMode="contain" />
          <Text style={estilos.acercaVersion}>{t('prf_acerca_version')}</Text>
          <Text style={estilos.acercaDescripcion}>{t('prf_acerca_desc')}</Text>
          <View style={estilos.acercaDivider} />
          <Text style={estilos.acercaInfo}>{t('prf_acerca_copy')}</Text>
        </View>
      );
      default: return null;
    }
  };

  // ── Contenido principal ─────────────────────────────────────────────────
  const renderContenidoPerfil = () => {
    if (cargando) { return <SkeletonPerfil />; }
    return (
      <Animated.View style={[estilos.contenedorCentrado, { opacity: fadeAnim, flex: 1 }]}>
        <TopActionHeader
          title={t('prf_titulo')}
          showInlineLogo={!esPC}
          onNotificationsPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0)}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
          {sesion && (
            <View style={[estilos.infoUsuario, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
              <Animated.View style={[estilos.avatarUsuario, { transform: [{ scale: avatarAnim }] }]}>
                <Text style={estilos.inicialUsuario}>{sesion.nombre?.charAt(0).toUpperCase()}</Text>
              </Animated.View>
              <View>
                <Text style={[estilos.nombreUsuario, { color: tema.texto }]}>{sesion.nombre}</Text>
                {!!sesion.nombre_usuario && (
                  <Text style={estilos.usernameUsuario}>@{sesion.nombre_usuario}</Text>
                )}
                <Text style={[estilos.correoUsuario, { color: tema.textoMuted }]}>{sesion.correo}</Text>
              </View>
            </View>
          )}
          {/* Accesos rápidos */}
          <View style={estilos.seccion}>
            <Text style={[estilos.tituloSeccion, { color: tema.textoMuted }]}>{t('prf_accesos')}</Text>
            <View style={[estilos.tarjetaOpciones, { backgroundColor: tema.superficieBlanca }]}>
              {ACCESOS_RAPIDOS.map((item, index) => (
                <TouchableOpacity
                  key={item.etiqueta}
                  style={[estilos.filaOpcion, index < ACCESOS_RAPIDOS.length - 1 && [estilos.filaOpcionBorde, { borderBottomColor: tema.borde }]]}
                  onPressIn={() => rowPressIn('acceso_' + index)}
                  onPressOut={() => rowPressOut('acceso_' + index)}
                  onPress={item.onPress}
                  activeOpacity={1}
                >
                  <Animated.View style={[{ flexDirection: 'row', flex: 1, alignItems: 'center', justifyContent: 'space-between' }, { transform: [{ scale: getRowAnim('acceso_' + index) }] }]}>
                    <Text style={[estilos.textoOpcion, { color: tema.texto }]}>{item.etiqueta}</Text>
                    <Text style={[estilos.chevron, { color: tema.textoMuted }]}>{'>'}</Text>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {SECCIONES.map(grupo => (
            <View key={grupo.titulo} style={estilos.seccion}>
              <Text style={[estilos.tituloSeccion, { color: tema.textoMuted }]}>{grupo.titulo}</Text>
              <View style={[estilos.tarjetaOpciones, { backgroundColor: tema.superficieBlanca }]}>
                {grupo.items.map((item, index) => {
                  const rowKey = grupo.titulo + '_' + index;
                  return (
                    <TouchableOpacity
                      key={item.etiqueta}
                      style={[estilos.filaOpcion, index < grupo.items.length - 1 && [estilos.filaOpcionBorde, { borderBottomColor: tema.borde }]]}
                      onPressIn={() => rowPressIn(rowKey)}
                      onPressOut={() => rowPressOut(rowKey)}
                      onPress={() => setModalActivo(item.modal)}
                      activeOpacity={1}
                    >
                      <Animated.View style={[{ flexDirection: 'row', flex: 1, alignItems: 'center', justifyContent: 'space-between' }, { transform: [{ scale: getRowAnim(rowKey) }] }]}>
                        <Text style={[estilos.textoOpcion, { color: tema.texto }]}>{item.etiqueta}</Text>
                        <Text style={[estilos.chevron, { color: tema.textoMuted }]}>{'>'}</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {sesion?.tipo === 'admin' && (
            <TouchableOpacity
              style={estilos.botonAdmin}
              onPressIn={() => Animated.spring(adminAnim, { toValue: 0.94, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 2 }).start()}
              onPressOut={() => Animated.spring(adminAnim, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 6 }).start()}
              onPress={() => setTimeout(() => router.push('/(tabs)/admin' as never), 0)}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: adminAnim }] }}>
                <Text style={estilos.textoBotonAdmin}>{t('prf_admin')}</Text>
              </Animated.View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={estilos.botonCerrarSesion}
            onPressIn={() => Animated.spring(cerrarAnim, { toValue: 0.93, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 2 }).start()}
            onPressOut={() => Animated.spring(cerrarAnim, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 6 }).start()}
            onPress={handleCerrarSesion}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: cerrarAnim }] }}>
              <Text style={estilos.textoCerrarSesion}>{t('prf_cerrar_sesion')}</Text>
            </Animated.View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TabChrome esPC={esPC} maxWidth={900} showLogoWhenNoTitle={false}>
      {renderContenidoPerfil()}

      <Modal visible={modalActivo !== null} transparent animationType="slide" onRequestClose={cerrarModal}>
        <View style={estilos.modalOverlay}>
          <View style={[estilos.modalContenedor, { backgroundColor: tema.superficieBlanca }]}>
            <TouchableOpacity style={estilos.modalCerrar} onPress={cerrarModal}>
              <Text style={[estilos.modalCerrarTexto, { color: tema.textoMuted }]}>✕</Text>
            </TouchableOpacity>
            {renderContenidoModal()}
          </View>
        </View>
      </Modal>
    </TabChrome>
  );
}

const estilos = StyleSheet.create({
  encabezado:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 8, width: '100%', maxWidth: 900, alignSelf: 'center' },
  tituloEncabezado:      { flex: 1, fontSize: 18, fontWeight: '800', color: '#333', textAlign: 'center' },
  iconosEncabezado:      { flexDirection: 'row', gap: 6 },
  botonIcono:            { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FAF7F0', borderWidth: 1.5, borderColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  iconoEncabezado:       { width: 28, height: 28 },
  infoUsuario:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, width: '100%', maxWidth: 900, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E7ECEB', marginBottom: 10 },
  avatarUsuario:         { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },
  inicialUsuario:        { fontSize: 22, fontWeight: '700', color: '#fff' },
  nombreUsuario:         { fontSize: 16, fontWeight: '700', color: '#333' },
  usernameUsuario:       { fontSize: 13, color: '#3AB7A5', fontWeight: '600', marginTop: 1 },
  correoUsuario:         { fontSize: 13, color: '#888' },
  contenedorCentrado:    { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  scroll:                { paddingHorizontal: 16, paddingBottom: 20 },
  seccion:               { marginBottom: 16 },
  tituloSeccion:         { fontSize: 13, color: '#888', fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  tarjetaOpciones:       { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#3AB7A5', overflow: 'hidden' },
  filaOpcion:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  filaOpcionBorde:       { borderBottomWidth: 1, borderBottomColor: '#eee' },
  textoOpcion:           { fontSize: 15, color: '#333' },
  chevron:               { fontSize: 16, color: '#aaa', fontWeight: '600' },
  botonAdmin:            { backgroundColor: '#1D3557', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 10, elevation: 4, alignSelf: 'center', width: 240 },
  textoBotonAdmin:       { color: '#fff', fontSize: 15, fontWeight: '600' },
  botonCerrarSesion:     { backgroundColor: '#DD331D', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 10, marginBottom: 10, elevation: 4, alignSelf: 'center', width: 200 },
  textoCerrarSesion:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenedor:       { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '85%' },
  modalCerrar:           { alignSelf: 'flex-end', padding: 16 },
  modalCerrarTexto:      { fontSize: 18, color: '#888', fontWeight: '700' },
  modalContenido:        { paddingHorizontal: 24, paddingBottom: 10 },
  modalTitulo:           { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  modalEtiqueta:         { fontSize: 13, color: '#888', marginBottom: 6, marginTop: 12 },
  modalInput:            { height: 48, borderWidth: 1.5, borderColor: '#3AB7A5', borderRadius: 25, paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 14, color: '#333' },
  modalBoton:            { backgroundColor: '#DD331D', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 24, elevation: 4 },
  modalBotonTexto:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  filaSwitch:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  switchEtiqueta:        { fontSize: 15, fontWeight: '600', color: '#333' },
  switchDescripcion:     { fontSize: 12, color: '#888', marginTop: 2 },
  notifEstado:           { textAlign: 'center', fontSize: 14, color: '#555', marginTop: 16 },
  filaIdioma:            { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderWidth: 1.5, borderColor: '#eee' },
  filaIdiomaActiva:      { borderColor: '#3AB7A5', backgroundColor: '#f0faf9' },
  textoIdioma:           { fontSize: 16, color: '#555' },
  textoIdiomaActivo:     { color: '#3AB7A5', fontWeight: '700' },
  idiomaTexto:           { fontSize: 16, color: '#555' },
  idiomaTextoActivo:     { color: '#3AB7A5', fontWeight: '700' as const },
  checkIdioma:           { fontSize: 16, color: '#3AB7A5', fontWeight: '700' },
  itemAyuda:             { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 16 },
  preguntaAyuda:         { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  respuestaAyuda:        { fontSize: 13, color: '#666', lineHeight: 20 },
  logoAcerca:            { width: 80, height: 80, alignSelf: 'center', marginBottom: 10 },
  acercaVersion:         { textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 16 },
  acercaDescripcion:     { fontSize: 14, color: '#555', lineHeight: 22, textAlign: 'center', marginBottom: 16 },
  acercaDivider:         { height: 1, backgroundColor: '#eee', marginBottom: 12 },
  acercaInfo:            { textAlign: 'center', fontSize: 12, color: '#aaa', marginBottom: 4 },
});
