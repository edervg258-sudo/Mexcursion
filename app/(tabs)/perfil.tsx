import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Image, Modal, Platform, ScrollView,
  StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS } from '../../lib/constantes';
import {
  actualizarPerfil, actualizarPreferencias,
  cambiarContrasena,
  cerrarSesion,
  obtenerUsuarioActivo,
} from '../../lib/supabase-db';

type TipoModal = null | 'editarPerfil' | 'cambiarPassword' | 'notificaciones' | 'idioma' | 'ayuda' | 'acerca';

export default function PerfilScreen() {
  const rutaActual = usePathname();
  const { width }  = useWindowDimensions();
  const esPC       = width >= 768;

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  const [modalActivo, setModalActivo]       = useState<TipoModal>(null);
  const [sesion, setSesion]                 = useState<any>(null);
  const [nombre, setNombre]                 = useState('');
  const [usuario, setUsuario]               = useState('');
  const [telefono, setTelefono]             = useState('');
  const [passActual, setPassActual]         = useState('');
  const [passNueva, setPassNueva]           = useState('');
  const [passConfirmar, setPassConfirmar]   = useState('');
  const [notificaciones, setNotificaciones] = useState(true);
  const [idioma, setIdioma]                 = useState('es');
  const [tapAdmin, setTapAdmin]             = useState(0);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const u = await obtenerUsuarioActivo();
      if (!u) { router.replace('/login'); return; }
      setSesion(u);
      setNombre(u.nombre ?? '');
      setUsuario(u.nombre_usuario ?? '');
      setTelefono(u.telefono ?? '');
      setNotificaciones(u.notificaciones === 1);
      setIdioma(u.idioma ?? 'es');
    };
    cargar();
  }, []));

  const cerrarModal    = () => setModalActivo(null);
  const mensaje        = (txt: string) => Alert.alert('', txt);
  const navegarPestana = (ruta: string) => router.replace(ruta as any);
  const estaActiva     = (ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', ''));

  const handleCerrarSesion = async () => {
    // Alert.alert no funciona con callbacks en web; usar confirm del navegador
    const confirmar = Platform.OS === 'web'
      ? window.confirm('¿Deseas cerrar sesión?')
      : await new Promise<boolean>(resolve =>
          Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Cerrar sesión', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmar) return;
    await cerrarSesion();
    router.replace('/login' as any);
  };

  const handleGuardarPerfil = async () => {
    if (!nombre.trim() || !usuario.trim()) return mensaje('Nombre y usuario son obligatorios');
    if (!sesion?.id) return;
    const r = await actualizarPerfil(sesion.id, { nombre: nombre.trim(), nombre_usuario: usuario.trim(), telefono: telefono.trim() });
    if (!r.exito) return mensaje(r.error ?? 'Error al actualizar');
    setSesion((ant: any) => ({ ...ant, nombre: nombre.trim(), nombre_usuario: usuario.trim(), telefono: telefono.trim() }));
    mensaje('Perfil actualizado correctamente');
    cerrarModal();
  };

  const handleCambiarPassword = async () => {
    if (!passActual.trim())          return mensaje('Ingresa tu contraseña actual');
    if (passNueva.length < 6)        return mensaje('La nueva contraseña debe tener al menos 6 caracteres');
    if (passNueva !== passConfirmar) return mensaje('Las contraseñas no coinciden');
    if (!sesion?.id) return;
    const r = await cambiarContrasena(sesion.id, passActual, passNueva);
    if (!r.exito) return mensaje(r.error ?? 'Error al cambiar contraseña');
    mensaje('Contraseña actualizada correctamente');
    setPassActual(''); setPassNueva(''); setPassConfirmar('');
    cerrarModal();
  };

  const handleNotificaciones = async (valor: boolean) => {
    setNotificaciones(valor);
    if (sesion?.id) await actualizarPreferencias(sesion.id, { notificaciones: valor ? 1 : 0 });
  };

  const handleIdioma = async (valor: string) => {
    setIdioma(valor);
    if (sesion?.id) await actualizarPreferencias(sesion.id, { idioma: valor });
  };

  const ACCESOS_RAPIDOS = [
    { etiqueta: '📋 Mis reservas', onPress: () => router.push('/(tabs)/mis_reservas' as any) },
    { etiqueta: '📜 Historial',    onPress: () => router.push('/(tabs)/historial' as any) },
  ];

  const SECCIONES = [
    { titulo: 'Cuenta',       items: [{ etiqueta: 'Editar perfil',       modal: 'editarPerfil'    as TipoModal }, { etiqueta: 'Cambiar contraseña',    modal: 'cambiarPassword' as TipoModal }] },
    { titulo: 'Preferencias', items: [{ etiqueta: 'Notificaciones',      modal: 'notificaciones'  as TipoModal }, { etiqueta: 'Idioma',                modal: 'idioma'          as TipoModal }] },
    { titulo: 'Más ayuda',    items: [{ etiqueta: 'Centro de ayuda',     modal: 'ayuda'           as TipoModal }, { etiqueta: 'Acerca de Mexcursión',  modal: 'acerca'          as TipoModal }] },
  ];

  const renderContenidoModal = () => {
    switch (modalActivo) {
      case 'editarPerfil': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>Editar perfil</Text>
          <Text style={estilos.modalEtiqueta}>Nombre completo</Text>
          <TextInput style={estilos.modalInput} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>Usuario</Text>
          <TextInput style={estilos.modalInput} value={usuario} onChangeText={setUsuario} placeholder="Tu usuario" placeholderTextColor="#aaa" autoCapitalize="none" />
          <Text style={estilos.modalEtiqueta}>Teléfono</Text>
          <TextInput style={estilos.modalInput} value={telefono} onChangeText={setTelefono} placeholder="10 dígitos" placeholderTextColor="#aaa" keyboardType="phone-pad" />
          <TouchableOpacity style={estilos.modalBoton} onPress={handleGuardarPerfil}>
            <Text style={estilos.modalBotonTexto}>Guardar cambios</Text>
          </TouchableOpacity>
        </View>
      );
      case 'cambiarPassword': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>Cambiar contraseña</Text>
          <Text style={estilos.modalEtiqueta}>Contraseña actual</Text>
          <TextInput style={estilos.modalInput} value={passActual} onChangeText={setPassActual} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>Nueva contraseña</Text>
          <TextInput style={estilos.modalInput} value={passNueva} onChangeText={setPassNueva} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <Text style={estilos.modalEtiqueta}>Confirmar nueva contraseña</Text>
          <TextInput style={estilos.modalInput} value={passConfirmar} onChangeText={setPassConfirmar} secureTextEntry placeholder="••••••" placeholderTextColor="#aaa" />
          <TouchableOpacity style={estilos.modalBoton} onPress={handleCambiarPassword}>
            <Text style={estilos.modalBotonTexto}>Actualizar contraseña</Text>
          </TouchableOpacity>
        </View>
      );
      case 'notificaciones': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>Notificaciones</Text>
          <View style={estilos.filaSwitch}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.switchEtiqueta}>Notificaciones push</Text>
              <Text style={estilos.switchDescripcion}>Recibir alertas de nuevos destinos y ofertas</Text>
            </View>
            <Switch value={notificaciones} onValueChange={handleNotificaciones} trackColor={{ false: '#ccc', true: '#3AB7A5' }} thumbColor="#fff" />
          </View>
          <Text style={estilos.notifEstado}>Notificaciones: {notificaciones ? '✅ Activadas' : '🔕 Desactivadas'}</Text>
        </View>
      );
      case 'idioma': return (
        <View style={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>Idioma</Text>
          {[{ clave: 'es', etiqueta: '🇲🇽  Español' }, { clave: 'en', etiqueta: '🇺🇸  English' }].map(op => (
            <TouchableOpacity key={op.clave} style={[estilos.filaIdioma, idioma === op.clave && estilos.filaIdiomaActiva]} onPress={() => handleIdioma(op.clave)}>
              <Text style={[estilos.textoIdioma, idioma === op.clave && estilos.textoIdiomaActivo]}>{op.etiqueta}</Text>
              {idioma === op.clave && <Text style={estilos.checkIdioma}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      );
      case 'ayuda': return (
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={estilos.modalContenido}>
          <Text style={estilos.modalTitulo}>Centro de ayuda</Text>
          {[
            { p: '¿Cómo agrego un destino a favoritos?', r: 'Presiona el ícono de corazón en cualquier tarjeta de destino desde la pantalla de inicio.' },
            { p: '¿Cómo creo una ruta?',                 r: 'Ve a la sección Rutas, presiona "+" en los destinos que quieras y luego accede a "Mi ruta".' },
            { p: '¿Puedo cambiar mi información?',        r: 'Sí, ve a Configuración → Editar perfil para actualizar tu nombre, usuario y teléfono.' },
            { p: '¿Cómo cambio mi contraseña?',           r: 'Ve a Configuración → Cambiar contraseña e ingresa tu contraseña actual y la nueva.' },
            { p: '¿Los datos se guardan?',                r: 'Sí, tu cuenta, favoritos y rutas se guardan localmente en tu dispositivo con SQLite.' },
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
          <Text style={estilos.modalTitulo}>Acerca de Mexcursión</Text>
          <Image source={require('../../assets/images/logo.png')} style={estilos.logoAcerca} resizeMode="contain" />
          <TouchableOpacity activeOpacity={1} onPress={() => {
            const nuevoTap = tapAdmin + 1;
            setTapAdmin(nuevoTap);
            if (nuevoTap >= 5) {
              setTapAdmin(0);
              if (sesion?.tipo !== 'admin') {
                Alert.alert('Acceso denegado', 'No tienes permisos de administrador.');
                return;
              }
              cerrarModal();
              router.push('/(tabs)/admin' as any);
            }
          }}>
            <Text style={estilos.acercaVersion}>Versión 1.0.0</Text>
          </TouchableOpacity>
          <Text style={estilos.acercaDescripcion}>Mexcursión es tu guía de viaje para descubrir los mejores destinos de México. Desde playas paradisíacas hasta zonas arqueológicas, te ayudamos a planear tu aventura perfecta.</Text>
          <View style={estilos.acercaDivider} />
          <Text style={estilos.acercaInfo}>© 2025 Mexcursión · Todos los derechos reservados</Text>
        </View>
      );
      default: return null;
    }
  };

  // ── Sidebar PC ──────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <View style={estilos.sidebar}>
      <Image source={require('../../assets/images/logo.png')} style={estilos.logoSidebar} resizeMode="contain" />
      <View style={estilos.separadorSidebar} />
      {PESTANAS.map(p => {
        const activa = estaActiva(p.ruta);
        return (
          <TouchableOpacity key={p.ruta} style={[estilos.itemSidebar, activa && estilos.itemSidebarActivo]} onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
            <Image source={activa ? p.iconoRojo : p.iconoGris} style={estilos.iconoSidebar} resizeMode="contain" />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Contenido principal ─────────────────────────────────────────────────
  const renderContenidoPerfil = () => (
    <View style={{ flex: 1 }}>
      <View style={estilos.encabezado}>
        {!esPC && <Image source={require('../../assets/images/logo.png')} style={estilos.logoFijo} resizeMode="contain" />}
        <Text style={[estilos.tituloEncabezado, { paddingLeft: esPC ? 0 : 60 }]}>Configuración</Text>
        <View style={estilos.iconosEncabezado}>
          <TouchableOpacity style={estilos.botonIcono} onPress={() => setModalActivo('notificaciones')}>
            <Image source={require('../../assets/images/notificaciones.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonIcono} onPress={() => setModalActivo('editarPerfil')}>
            <Image source={require('../../assets/images/cuenta.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {sesion && (
        <View style={estilos.infoUsuario}>
          <View style={estilos.avatarUsuario}>
            <Text style={estilos.inicialUsuario}>{sesion.nombre?.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={estilos.nombreUsuario}>{sesion.nombre}</Text>
            <Text style={estilos.correoUsuario}>{sesion.correo}</Text>
          </View>
        </View>
      )}

      <View style={estilos.contenedorCentrado}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
          {/* Accesos rápidos */}
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Accesos rápidos</Text>
            <View style={estilos.tarjetaOpciones}>
              {ACCESOS_RAPIDOS.map((item, index) => (
                <TouchableOpacity
                  key={item.etiqueta}
                  style={[estilos.filaOpcion, index < ACCESOS_RAPIDOS.length - 1 && estilos.filaOpcionBorde]}
                  onPress={item.onPress}
                >
                  <Text style={estilos.textoOpcion}>{item.etiqueta}</Text>
                  <Text style={estilos.chevron}>{'>'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {SECCIONES.map(grupo => (
            <View key={grupo.titulo} style={estilos.seccion}>
              <Text style={estilos.tituloSeccion}>{grupo.titulo}</Text>
              <View style={estilos.tarjetaOpciones}>
                {grupo.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.etiqueta}
                    style={[estilos.filaOpcion, index < grupo.items.length - 1 && estilos.filaOpcionBorde]}
                    onPress={() => setModalActivo(item.modal)}
                  >
                    <Text style={estilos.textoOpcion}>{item.etiqueta}</Text>
                    <Text style={estilos.chevron}>{'>'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={estilos.botonCerrarSesion} onPress={handleCerrarSesion}>
            <Text style={estilos.textoCerrarSesion}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={estilos.raiz}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />

      {esPC ? (
        <View style={estilos.layoutPC}>
          {renderSidebar()}
          <SafeAreaView style={estilos.areaSeguraPC}>
            {renderContenidoPerfil()}
          </SafeAreaView>
        </View>
      ) : (
        <View style={estilos.layoutMovil}>
          <SafeAreaView style={estilos.areaSeguraMovil}>
            {renderContenidoPerfil()}
          </SafeAreaView>
          <View style={estilos.envolturaBarra}>
            <View style={estilos.barraPestanas}>
              {PESTANAS.map(p => {
                const activa = estaActiva(p.ruta);
                return (
                  <TouchableOpacity key={p.ruta} style={estilos.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                    <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    <Text style={[estilos.etiquetaPestana, activa && estilos.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      <Modal visible={modalActivo !== null} transparent animationType="slide" onRequestClose={cerrarModal}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContenedor}>
            <TouchableOpacity style={estilos.modalCerrar} onPress={cerrarModal}>
              <Text style={estilos.modalCerrarTexto}>✕</Text>
            </TouchableOpacity>
            {renderContenidoModal()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz:                  { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:            { opacity: 0.15, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  layoutPC:              { flex: 1, flexDirection: 'row' },
  layoutMovil:           { flex: 1, flexDirection: 'column' },
  areaSeguraPC:          { flex: 1 },
  areaSeguraMovil:       { flex: 1 },
  sidebar:               { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar: { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar: { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo: { backgroundColor: '#f0faf9' },
  iconoSidebar: { width: 28, height: 28 },
  logoFijo:              { width: 46, height: 46 },
  encabezado:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 8, width: '100%', maxWidth: 900, alignSelf: 'center' },
  tituloEncabezado:      { flex: 1, fontSize: 18, fontWeight: '800', color: '#333', textAlign: 'center' },
  iconosEncabezado:      { flexDirection: 'row', gap: 6 },
  botonIcono:            { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FAF7F0', borderWidth: 1.5, borderColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  iconoEncabezado:       { width: 28, height: 28 },
  infoUsuario:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, width: '100%', maxWidth: 900, alignSelf: 'center' },
  avatarUsuario:         { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center' },
  inicialUsuario:        { fontSize: 22, fontWeight: '700', color: '#fff' },
  nombreUsuario:         { fontSize: 16, fontWeight: '700', color: '#333' },
  correoUsuario:         { fontSize: 13, color: '#888' },
  contenedorCentrado:    { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' },
  scroll:                { paddingHorizontal: 16, paddingBottom: 20 },
  seccion:               { marginBottom: 16 },
  tituloSeccion:         { fontSize: 13, color: '#888', fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  tarjetaOpciones:       { backgroundColor: '#FAF7F0', borderRadius: 16, borderWidth: 1.5, borderColor: '#3AB7A5', overflow: 'hidden' },
  filaOpcion:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  filaOpcionBorde:       { borderBottomWidth: 1, borderBottomColor: '#eee' },
  textoOpcion:           { fontSize: 15, color: '#333' },
  chevron:               { fontSize: 16, color: '#aaa', fontWeight: '600' },
  botonCerrarSesion:     { backgroundColor: '#DD331D', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 10, marginBottom: 10, elevation: 4, alignSelf: 'center', width: 200 },
  textoCerrarSesion:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  envolturaBarra:        { width: '100%', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  barraPestanas:         { flexDirection: 'row', backgroundColor: '#fff', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  etiquetaPestana:       { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva: { color: '#DD331D', fontWeight: '600' },
  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenedor:       { backgroundColor: '#FAF7F0', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '85%' },
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