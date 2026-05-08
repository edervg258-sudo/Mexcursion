import { useRouter } from 'expo-router';
import { EyeIcon } from '../components/EyeIcon';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image, Modal, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { iniciarSesion, obtenerUsuarioActivo, solicitarRecuperacionContrasena } from '../lib/supabase-db';
import { useForm } from '../hooks/use-form';

export default function LoginScreen() {
  const router = useRouter();
  const { values, errores, cargando, setCargando, setField, setError, setErrors } = useForm({ correo: '', contrasena: '' });
  const recup = useForm({ correoRecup: '' });
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);

  useEffect(() => {
    obtenerUsuarioActivo().then(u => {
      if (u) { router.replace('/(tabs)/menu'); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validar = (): boolean => {
    const nuevos: Partial<Record<'correo' | 'contrasena', string>> = {};
    if (!values.correo.trim()) nuevos.correo = 'Ingresa tu correo electrónico';
    else if (!/\S+@\S+\.\S+/.test(values.correo)) nuevos.correo = 'Ingresa un correo válido';
    if (!values.contrasena.trim()) nuevos.contrasena = 'Ingresa tu contraseña';
    else if (values.contrasena.length < 6) nuevos.contrasena = 'La contraseña debe tener al menos 6 caracteres';
    setErrors(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleLogin = async () => {
    if (!validar()) { return; }
    setCargando(true);
    const resultado = await iniciarSesion(values.correo.trim(), values.contrasena);
    setCargando(false);
    if (!resultado.exito) {
      const msg = resultado.error ?? 'Error al iniciar sesión';
      if (msg.toLowerCase().includes('contraseña')) {
        setError('contrasena', msg);
      } else {
        setError('correo', msg);
      }
      return;
    }
    router.replace('/(tabs)/menu');
  };

  const handleRecuperar = async () => {
    if (!recup.values.correoRecup.trim()) {
      recup.setError('correoRecup', 'Ingresa tu correo');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(recup.values.correoRecup.trim())) {
      recup.setError('correoRecup', 'Ingresa un correo válido');
      return;
    }
    recup.setCargando(true);
    const resultado = await solicitarRecuperacionContrasena(recup.values.correoRecup.trim());
    recup.setCargando(false);
    if (!resultado.exito) {
      recup.setError('correoRecup', resultado.error ?? 'No se pudo enviar el correo de recuperación');
      return;
    }
    cerrarModal();
    Alert.alert(
      'Revisa tu correo',
      'Si existe una cuenta con ese correo, te enviamos instrucciones para restablecer tu contraseña.'
    );
  };

  const cerrarModal = () => {
    setModalRecuperar(false);
    recup.reset();
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
                  style={[estilos.campo, errores.correo ? estilos.campoError : null]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={values.correo}
                  onChangeText={t => setField('correo', t)}
                />
                {errores.correo ? <Text style={estilos.textoError}>⚠ {errores.correo}</Text> : null}
              </View>

              {/* Contraseña */}
              <View style={estilos.grupoCampo}>
                <View style={[estilos.campoContenedor, errores.contrasena ? estilos.campoError : null]}>
                  <TextInput
                    testID="login-password-input"
                    placeholder="Contraseña"
                    placeholderTextColor="#aaa"
                    style={estilos.campoInterno}
                    secureTextEntry={!verContrasena}
                    value={values.contrasena}
                    onChangeText={t => setField('contrasena', t)}
                  />
                  <TouchableOpacity onPress={() => setVerContrasena(v => !v)} style={estilos.botonOjo}>
                    <EyeIcon visible={verContrasena} size={22} color="#888" />
                  </TouchableOpacity>
                </View>
                {errores.contrasena ? <Text style={estilos.textoError}>⚠ {errores.contrasena}</Text> : null}
              </View>

              <TouchableOpacity
                style={estilos.enlaceOlvide}
                onPress={() => { setErrors({}); setModalRecuperar(true); }}
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

            <View style={estilos.grupoCampo}>
              <TextInput
                style={[estilos.campo, recup.errores.correoRecup ? estilos.campoError : null]}
                placeholder="Correo electrónico"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={recup.values.correoRecup}
                onChangeText={t => recup.setField('correoRecup', t)}
              />
              {recup.errores.correoRecup ? <Text style={estilos.textoError}>⚠ {recup.errores.correoRecup}</Text> : null}
            </View>

            <TouchableOpacity style={estilos.boton} onPress={handleRecuperar} disabled={recup.cargando}>
              <Text style={estilos.textoBoton}>{recup.cargando ? 'Enviando...' : 'Enviar'}</Text>
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
});
