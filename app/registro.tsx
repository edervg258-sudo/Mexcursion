import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { obtenerUsuarioActivo, registrarUsuario } from '../lib/supabase-db';

type FormType = {
  nombre: string; nombre_usuario: string;
  correo: string; telefono: string; contrasena: string;
};
type ErroresType = Partial<Record<keyof FormType, string>>;

export default function RegistroScreen() {
  const [form, setForm]                       = useState<FormType>({ nombre: '', nombre_usuario: '', correo: '', telefono: '', contrasena: '' });
  const [errores, setErrores]                 = useState<ErroresType>({});
  const [errorGeneral, setErrorGeneral]       = useState('');
  const [mensajeExito, setMensajeExito]       = useState('');
  const [cargando, setCargando]               = useState(false);
  const [verContrasena, setVerContrasena]     = useState(false);
  const [aceptoTerminos, setAceptoTerminos]   = useState(false);
  const [verTerminos, setVerTerminos]         = useState(false);

  useEffect(() => {
    obtenerUsuarioActivo().then(u => { if (u) {router.replace('/(tabs)/menu');} });
  }, []);

  const actualizar = (clave: keyof FormType, valor: string) => {
    setForm(prev => ({ ...prev, [clave]: valor }));
    if (errores[clave]) {setErrores(prev => ({ ...prev, [clave]: undefined }));}
  };

  const validar = (): boolean => {
    const nuevos: ErroresType = {};
    if (!form.nombre.trim())
      {nuevos.nombre = 'Ingresa tu nombre completo';}
    if (!form.nombre_usuario.trim())
      {nuevos.nombre_usuario = 'Ingresa un nombre de usuario';}
    else if (form.nombre_usuario.length < 3)
      {nuevos.nombre_usuario = 'El usuario debe tener al menos 3 caracteres';}
    else if (!/^[a-zA-Z0-9_]+$/.test(form.nombre_usuario))
      {nuevos.nombre_usuario = 'Solo letras, números y guión bajo';}
    if (!form.correo.trim())
      {nuevos.correo = 'Ingresa tu correo electrónico';}
    else if (!/\S+@\S+\.\S+/.test(form.correo))
      {nuevos.correo = 'Ingresa un correo válido';}
    if (!form.telefono.trim())
      {nuevos.telefono = 'Ingresa tu número de teléfono';}
    else if (form.telefono.replace(/\D/g, '').length < 10)
      {nuevos.telefono = 'El teléfono debe tener al menos 10 dígitos';}
    if (!form.contrasena.trim())
      {nuevos.contrasena = 'Ingresa una contraseña';}
    else if (form.contrasena.length < 6)
      {nuevos.contrasena = 'La contraseña debe tener al menos 6 caracteres';}
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleRegistro = async () => {
    if (!validar()) { return; }
    if (!aceptoTerminos) { setErrorGeneral('Debes aceptar los términos y condiciones para continuar.'); return; }
    setErrorGeneral('');
    setMensajeExito('');
    setCargando(true);
    const resultado = await registrarUsuario(form.nombre, form.nombre_usuario, form.correo, form.contrasena, form.telefono);
    setCargando(false);
    if (!resultado.exito) {
      if (resultado.error?.includes('correo')) {
        setErrores({ correo: resultado.error });
      } else if (resultado.error?.includes('usuario')) {
        setErrores({ nombre_usuario: resultado.error });
      } else {
        setErrorGeneral(resultado.error ?? 'Error al registrar');
      }
      return;
    }
    if (resultado.confirmar) {
      setMensajeExito('Te enviamos un enlace de verificación. Revisa tu correo y confirma tu cuenta para ingresar.');
      return;
    }
    router.replace('/(tabs)/menu');
  };

  return (
    <View style={estilos.contenedor}>
      {/* Modal Términos y Condiciones */}
      <Modal visible={verTerminos} animationType="slide" transparent onRequestClose={() => setVerTerminos(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContenido}>
            <Text style={estilos.modalTitulo}>Términos y Condiciones</Text>
            <ScrollView style={estilos.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={estilos.modalSeccion}>1. Uso de la aplicación</Text>
              <Text style={estilos.modalTexto}>
                Al registrarte en esta aplicación, aceptas utilizarla únicamente para fines lícitos y de acuerdo con estos términos. Queda prohibido el uso de la plataforma para actividades ilegales, fraudulentas o que perjudiquen a otros usuarios.
              </Text>
              <Text style={estilos.modalSeccion}>2. Datos personales</Text>
              <Text style={estilos.modalTexto}>
                Recopilamos nombre, correo electrónico y número de teléfono con el fin de gestionar tu cuenta y mejorar la experiencia de uso. Tus datos serán tratados conforme a nuestra Política de Privacidad y no serán compartidos con terceros sin tu consentimiento, salvo obligación legal.
              </Text>
              <Text style={estilos.modalSeccion}>3. Reservas y pagos</Text>
              <Text style={estilos.modalTexto}>
                Las reservas realizadas a través de la aplicación están sujetas a disponibilidad. El usuario es responsable de verificar los detalles de cada reserva antes de confirmarla. Los reembolsos se tramitarán conforme a la política de cancelación de cada servicio.
              </Text>
              <Text style={estilos.modalSeccion}>4. Responsabilidad</Text>
              <Text style={estilos.modalTexto}>
                La aplicación actúa como intermediaria entre el usuario y los prestadores de servicios turísticos. No nos hacemos responsables por incidentes, daños o pérdidas ocurridos durante la prestación de los servicios contratados.
              </Text>
              <Text style={estilos.modalSeccion}>5. Modificaciones</Text>
              <Text style={estilos.modalTexto}>
                Nos reservamos el derecho de actualizar estos términos en cualquier momento. Te notificaremos ante cambios relevantes. El uso continuado de la aplicación tras la actualización implica la aceptación de los nuevos términos.
              </Text>
              <Text style={estilos.modalSeccion}>6. Contacto</Text>
              <Text style={estilos.modalTexto}>
                Para cualquier duda sobre estos términos, escríbenos a soporte@miprimerapp.com.
              </Text>
            </ScrollView>
            <TouchableOpacity style={estilos.modalBoton} onPress={() => { setAceptoTerminos(true); setVerTerminos(false); }}>
              <Text style={estilos.modalBotonTexto}>Aceptar y cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVerTerminos(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Image source={require('../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />
      <SafeAreaView style={estilos.areaSegura}>
        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={estilos.centrado}>
            <Image source={require('../assets/images/logo.png')} style={estilos.logo} resizeMode="contain" />
            <View style={estilos.tarjeta}>
              <Text style={estilos.titulo}>Registro</Text>
              <Text style={estilos.subtitulo}>Completa los datos para crear tu cuenta</Text>

              {/* Nombre */}
              <View style={estilos.grupoCampo}>
                <TextInput
                  placeholder="Nombre completo"
                  placeholderTextColor="#aaa"
                  style={[estilos.campo, errores.nombre ? estilos.campoError : null]}
                  value={form.nombre}
                  onChangeText={t => actualizar('nombre', t)}
                  autoCapitalize="words"
                />
                {errores.nombre ? <Text style={estilos.textoError}>⚠ {errores.nombre}</Text> : null}
              </View>

              {/* Usuario */}
              <View style={estilos.grupoCampo}>
                <TextInput
                  placeholder="Nombre de usuario"
                  placeholderTextColor="#aaa"
                  style={[estilos.campo, errores.nombre_usuario ? estilos.campoError : null]}
                  value={form.nombre_usuario}
                  onChangeText={t => actualizar('nombre_usuario', t)}
                  autoCapitalize="none"
                />
                {errores.nombre_usuario ? <Text style={estilos.textoError}>⚠ {errores.nombre_usuario}</Text> : null}
              </View>

              {/* Correo */}
              <View style={estilos.grupoCampo}>
                <TextInput
                  placeholder="Correo electrónico"
                  placeholderTextColor="#aaa"
                  style={[estilos.campo, errores.correo ? estilos.campoError : null]}
                  value={form.correo}
                  onChangeText={t => actualizar('correo', t)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errores.correo ? <Text style={estilos.textoError}>⚠ {errores.correo}</Text> : null}
              </View>

              {/* Teléfono */}
              <View style={estilos.grupoCampo}>
                <TextInput
                  placeholder="Teléfono (10 dígitos)"
                  placeholderTextColor="#aaa"
                  style={[estilos.campo, errores.telefono ? estilos.campoError : null]}
                  value={form.telefono}
                  onChangeText={t => actualizar('telefono', t)}
                  keyboardType="phone-pad"
                />
                {errores.telefono ? <Text style={estilos.textoError}>⚠ {errores.telefono}</Text> : null}
              </View>

              {/* Contraseña con ojo */}
              <View style={estilos.grupoCampo}>
                <View style={[estilos.campoFila, errores.contrasena ? estilos.campoError : null]}>
                  <TextInput
                    placeholder="Contraseña (mín. 6 caracteres)"
                    placeholderTextColor="#aaa"
                    style={estilos.inputOjo}
                    value={form.contrasena}
                    onChangeText={t => actualizar('contrasena', t)}
                    secureTextEntry={!verContrasena}
                  />
                  <TouchableOpacity onPress={() => setVerContrasena(v => !v)} style={estilos.botonOjo}>
                    <Ionicons name={verContrasena ? 'eye-off' : 'eye'} size={22} color="#888" />
                  </TouchableOpacity>
                </View>
                {errores.contrasena ? <Text style={estilos.textoError}>⚠ {errores.contrasena}</Text> : null}
              </View>

              {errorGeneral ? (
                <View style={estilos.bannerError}>
                  <Text style={estilos.bannerErrorTexto}>⚠ {errorGeneral}</Text>
                </View>
              ) : null}

              {mensajeExito ? (
                <View style={estilos.bannerExito}>
                  <Text style={estilos.bannerExitoTexto}>✓ {mensajeExito}</Text>
                  <TouchableOpacity onPress={() => router.replace('/login')} style={{ marginTop: 10 }}>
                    <Text style={[estilos.textoEnlaceColor, { textAlign: 'center', fontWeight: '700' }]}>Ir a iniciar sesión</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {!mensajeExito && (
                <>
                  <TouchableOpacity style={estilos.checkboxFila} onPress={() => setAceptoTerminos(v => !v)} activeOpacity={0.7}>
                    <View style={[estilos.checkbox, aceptoTerminos && estilos.checkboxActivo]}>
                      {aceptoTerminos && <Text style={estilos.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={estilos.checkboxTexto}>
                      Acepto los{' '}
                      <Text style={estilos.checkboxEnlace} onPress={() => setVerTerminos(true)}>
                        Términos y Condiciones
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[estilos.boton, cargando && estilos.botonDesactivado]}
                    onPress={handleRegistro}
                    disabled={cargando}
                  >
                    <Text style={estilos.textoBoton}>{cargando ? 'Registrando...' : 'Continuar'}</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={estilos.enlace} onPress={() => router.push('/login')}>
                <Text style={estilos.textoEnlace}>¿Ya tienes cuenta? <Text style={estilos.textoEnlaceColor}>Inicia sesión</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  campoFila:        { flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1.5, borderColor: '#3AB7A5', borderRadius: 25, backgroundColor: '#f9f9f9' },
  campoError:       { borderColor: '#DD331D' },
  textoError:       { fontSize: 12, color: '#DD331D', marginTop: 4, marginLeft: 12 },
  inputOjo:         { flex: 1, fontSize: 14, color: '#333', paddingHorizontal: 16, height: 48 },
  botonOjo:         { paddingHorizontal: 12, height: 48, justifyContent: 'center' },
  boton:            { backgroundColor: '#DD331D', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 6, elevation: 6 },
  botonDesactivado: { opacity: 0.6 },
  textoBoton:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  enlace:           { marginTop: 16, alignItems: 'center' },
  textoEnlace:      { fontSize: 13, color: '#666' },
  textoEnlaceColor: { color: '#3AB7A5', fontWeight: '600' },
  bannerError:      { backgroundColor: '#fdecea', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#DD331D' },
  bannerErrorTexto: { color: '#DD331D', fontSize: 13, fontWeight: '600' },
  bannerExito:      { backgroundColor: '#e8f7f5', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#3AB7A5' },
  bannerExitoTexto: { color: '#2a8a7e', fontSize: 13, lineHeight: 20 },

  checkboxFila:     { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3AB7A5', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#fff' },
  checkboxActivo:   { backgroundColor: '#3AB7A5' },
  checkboxCheck:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkboxTexto:    { fontSize: 13, color: '#555', flex: 1, flexWrap: 'wrap' },
  checkboxEnlace:   { color: '#3AB7A5', fontWeight: '700', textDecorationLine: 'underline' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitulo:      { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 16, textAlign: 'center' },
  modalScroll:      { marginBottom: 16 },
  modalSeccion:     { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 14, marginBottom: 4 },
  modalTexto:       { fontSize: 13, color: '#555', lineHeight: 20 },
  modalBoton:       { backgroundColor: '#DD331D', paddingVertical: 13, borderRadius: 25, alignItems: 'center' },
  modalBotonTexto:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});