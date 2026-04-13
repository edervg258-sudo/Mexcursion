import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image, Modal, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buscarUsuarioPorCorreo, iniciarSesion, obtenerUsuarioActivo } from '../lib/supabase-db';

export default function LoginScreen() {
  const router = useRouter();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [correoRecup, setCorreoRecup] = useState('');
  const [cargando, setCargando] = useState(false);

  // Errores por campo
  const [errorCorreo, setErrorCorreo] = useState('');
  const [errorContrasena, setErrorContrasena] = useState('');
  // FIX #1: Estado de error separado para el modal de recuperación
  const [errorCorreoRecup, setErrorCorreoRecup] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);

  useEffect(() => {
    obtenerUsuarioActivo().then(u => {
      if (u) {router.replace('/(tabs)/menu');}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validar = (): boolean => {
    let valido = true;
    if (!correo.trim()) {
      setErrorCorreo('Ingresa tu correo electrónico');
      valido = false;
    } else if (!/\S+@\S+\.\S+/.test(correo)) {
      setErrorCorreo('Ingresa un correo válido');
      valido = false;
    } else { setErrorCorreo(''); }

    if (!contrasena.trim()) {
      setErrorContrasena('Ingresa tu contraseña');
      valido = false;
    } else if (contrasena.length < 6) {
      setErrorContrasena('La contraseña debe tener al menos 6 caracteres');
      valido = false;
    } else { setErrorContrasena(''); }

    return valido;
  };

  const handleLogin = async () => {
    if (!validar()) { return; }

    setCargando(true);
    const resultado = await iniciarSesion(correo.trim(), contrasena);
    setCargando(false);

    if (!resultado.exito) {
      const msg = resultado.error ?? 'Error al iniciar sesión';
      if (msg.toLowerCase().includes('contraseña')) {
        setErrorContrasena(msg);
      } else {
        setErrorCorreo(msg);
      }
      return;
    }
    router.replace('/(tabs)/menu');
  };

  const handleRecuperar = async () => {
    // FIX #2: Validar formato del correo en el modal
    if (!correoRecup.trim()) {
      setErrorCorreoRecup('Ingresa tu correo');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(correoRecup.trim())) {
      setErrorCorreoRecup('Ingresa un correo válido');
      return;
    }

    const usuario = await buscarUsuarioPorCorreo(correoRecup.trim());

    if (!usuario) {
      setErrorCorreoRecup('No existe una cuenta con ese correo');
      return;
    }

    // FIX #3: Limpiar estado del modal al cerrar
    setModalRecuperar(false);
    setErrorCorreoRecup('');

    // FIX #4: Usar params de navegación en lugar de query string en la URL
    router.push({
      pathname: '/nueva-contrasena',
      params: { correo: correoRecup.trim() },
    });
  };

  // FIX #3: Función de cierre del modal que limpia el estado
  const cerrarModal = () => {
    setModalRecuperar(false);
    setCorreoRecup('');
    setErrorCorreoRecup('');
  };

  return (
    <View style={estilos.contenedor} testID="login-screen">
      <Image source={require('../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />

      <SafeAreaView style={estilos.areaSegura}>
        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={estilos.centrado}>
            <Image source={require('../assets/images/logo.png')} style={estilos.logo} resizeMode="contain" />

            <View style={estilos.tarjeta}>
              <Text style={estilos.titulo}>Inicio de sesión</Text>
              <Text style={estilos.subtitulo}>Ingresa tus datos para acceder</Text>

              {/* Correo */}
              <View style={estilos.grupoCampo}>
                <TextInput
                  testID="login-email-input"
                  placeholder="Correo electrónico"
                  placeholderTextColor="#aaa"
                  style={[estilos.campo, errorCorreo ? estilos.campoError : null]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={correo}
                  onChangeText={t => { setCorreo(t); if (errorCorreo) {setErrorCorreo('');} }}
                />
                {errorCorreo ? <Text style={estilos.textoError}>⚠ {errorCorreo}</Text> : null}
              </View>

              {/* Contraseña */}
              <View style={estilos.grupoCampo}>
                <View style={[estilos.campoContenedor, errorContrasena ? estilos.campoError : null]}>
                  <TextInput
                    testID="login-password-input"
                    placeholder="Contraseña"
                    placeholderTextColor="#aaa"
                    style={estilos.campoInterno}
                    secureTextEntry={!verContrasena}
                    value={contrasena}
                    onChangeText={t => { setContrasena(t); if (errorContrasena) {setErrorContrasena('');} }}
                  />
                  <TouchableOpacity onPress={() => setVerContrasena(v => !v)} style={estilos.botonOjo}>
                    <Text style={estilos.textoOjo}>{verContrasena ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {errorContrasena ? <Text style={estilos.textoError}>⚠ {errorContrasena}</Text> : null}
              </View>

              <TouchableOpacity
                style={estilos.enlaceOlvide}
                onPress={() => { setErrorCorreo(''); setModalRecuperar(true); }}
              >
                <Text style={estilos.textoOlvide}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="login-continue-button"
                style={[estilos.boton, cargando && estilos.botonDesactivado]}
                onPress={handleLogin}
                disabled={cargando}
              >
                <Text style={estilos.textoBoton}>{cargando ? 'Ingresando...' : 'Continuar'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={estilos.enlace} onPress={() => router.push('/registro')}>
                <Text style={estilos.textoEnlace}>¿No tienes cuenta? <Text style={estilos.textoEnlaceColor}>Regístrate</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal recuperar contraseña */}
      <Modal visible={modalRecuperar} transparent animationType="slide" onRequestClose={cerrarModal}>
        <View style={estilos.fondoModal}>
          <View style={estilos.tarjetaModal}>
            <Text style={estilos.tituloModal}>Recuperar contraseña</Text>
            <Text style={estilos.subtituloModal}>Ingresa tu correo registrado</Text>

            {/* FIX #1: Usa errorCorreoRecup en lugar del errorCorreo del login */}
            <View style={estilos.grupoCampo}>
              <TextInput
                style={[estilos.campo, errorCorreoRecup ? estilos.campoError : null]}
                placeholder="Correo electrónico"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={correoRecup}
                onChangeText={t => { setCorreoRecup(t); if (errorCorreoRecup) {setErrorCorreoRecup('');} }}
              />
              {errorCorreoRecup ? <Text style={estilos.textoError}>⚠ {errorCorreoRecup}</Text> : null}
            </View>

            <TouchableOpacity style={estilos.boton} onPress={handleRecuperar}>
              <Text style={estilos.textoBoton}>Enviar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.enlace} onPress={cerrarModal}>
              <Text style={[estilos.textoOlvide, { textAlign: 'center' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor:       { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa:       { opacity: 0.15, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  areaSegura:       { flex: 1 },
  scroll:           { flexGrow: 1 },
  centrado:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo:             { width: 100, height: 100, marginBottom: 20 },
  tarjeta:          { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  titulo:           { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#222' },
  subtitulo:        { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 },
  grupoCampo:       { marginBottom: 14 },
  campo:            { height: 48, borderWidth: 1.5, borderColor: '#3AB7A5', borderRadius: 25, paddingHorizontal: 16, backgroundColor: '#f9f9f9', fontSize: 14, color: '#333' },
  campoContenedor:  { height: 48, borderWidth: 1.5, borderColor: '#3AB7A5', borderRadius: 25, paddingHorizontal: 16, backgroundColor: '#f9f9f9', flexDirection: 'row', alignItems: 'center' },
  campoInterno:     { flex: 1, fontSize: 14, color: '#333' },
  campoError:       { borderColor: '#DD331D' },
  textoError:       { fontSize: 12, color: '#DD331D', marginTop: 4, marginLeft: 12 },
  enlaceOlvide:     { alignItems: 'flex-end', marginBottom: 10, marginTop: -6 },
  textoOlvide:      { fontSize: 13, color: '#3AB7A5' },
  boton:            { backgroundColor: '#DD331D', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 6, elevation: 6 },
  botonDesactivado: { opacity: 0.6 },
  textoBoton:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  enlace:           { marginTop: 16, alignItems: 'center' },
  textoEnlace:      { fontSize: 13, color: '#666' },
  textoEnlaceColor: { color: '#3AB7A5', fontWeight: '600' },
  fondoModal:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  tarjetaModal:     { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 8 },
  tituloModal:      { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 6, textAlign: 'center' },
  subtituloModal:   { fontSize: 13, color: '#666', marginBottom: 16, textAlign: 'center' },
  botonOjo:         { paddingHorizontal: 12, height: 48, justifyContent: 'center' },
  textoOjo:         { fontSize: 18 },
});
