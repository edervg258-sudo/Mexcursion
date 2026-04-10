import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetContrasena } from '../lib/supabase-db';
import { sombraBotonPrimario, sombraTarjeta, subtituloAuth, Tema, tituloAuth } from '../lib/tema';

export default function NuevaContrasenaScreen() {
  const { correo } = useLocalSearchParams<{ correo: string }>();

  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [errorNueva, setErrorNueva] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const validar = (): boolean => {
    let valido = true;
    if (nueva.length < 6) {
      setErrorNueva('La contraseña debe tener al menos 6 caracteres');
      valido = false;
    } else { setErrorNueva(''); }

    if (nueva !== confirmar) {
      setErrorConfirmar('Las contraseñas no coinciden');
      valido = false;
    } else { setErrorConfirmar(''); }

    return valido;
  };

  const handleReset = async () => {
    if (!validar()) { return; }
    setCargando(true);
    const resultado = await resetContrasena(correo ?? '', nueva);
    setCargando(false);

    if (!resultado.exito) {
      setErrorNueva(resultado.error ?? 'Error al restablecer contraseña');
      return;
    }
    setExito(true);
  };

  if (exito) {
    return (
      <View style={estilos.contenedor}>
        <Image source={require('../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />
        <SafeAreaView style={estilos.areaSegura}>
          <View style={estilos.centrado}>
            <View style={estilos.tarjeta}>
              <Text style={estilos.emoji}>✅</Text>
              <Text style={estilos.titulo}>Contraseña actualizada</Text>
              <Text style={estilos.subtitulo}>Ya puedes iniciar sesión con tu nueva contraseña</Text>
              <TouchableOpacity style={estilos.boton} onPress={() => router.replace('/login')}>
                <Text style={estilos.textoBoton}>Ir al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Image source={require('../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />
      <SafeAreaView style={estilos.areaSegura}>
        <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={estilos.centrado}>
            <Image source={require('../assets/images/logo.png')} style={estilos.logo} resizeMode="contain" />
            <View style={estilos.tarjeta}>
              <Text style={estilos.titulo}>Nueva contraseña</Text>
              <Text style={estilos.subtitulo}>Crea una contraseña segura para {correo}</Text>

              <View style={estilos.grupoCampo}>
                <View style={[estilos.campoContenedor, errorNueva ? estilos.campoError : null]}>
                  <TextInput
                    placeholder="Nueva contraseña"
                    placeholderTextColor={Tema.textoMuted}
                    style={estilos.campoInterno}
                    secureTextEntry={!verNueva}
                    value={nueva}
                    onChangeText={t => { setNueva(t); if (errorNueva) { setErrorNueva(''); } }}
                  />
                  <TouchableOpacity onPress={() => setVerNueva(v => !v)} style={estilos.botonOjo}>
                    <Text style={estilos.textoOjo}>{verNueva ? '◎' : '◉'}</Text>
                  </TouchableOpacity>
                </View>
                {errorNueva ? <Text style={estilos.textoError}>⚠ {errorNueva}</Text> : null}
              </View>

              <View style={estilos.grupoCampo}>
                <View style={[estilos.campoContenedor, errorConfirmar ? estilos.campoError : null]}>
                  <TextInput
                    placeholder="Confirmar contraseña"
                    placeholderTextColor={Tema.textoMuted}
                    style={estilos.campoInterno}
                    secureTextEntry={!verConfirmar}
                    value={confirmar}
                    onChangeText={t => { setConfirmar(t); if (errorConfirmar) { setErrorConfirmar(''); } }}
                  />
                  <TouchableOpacity onPress={() => setVerConfirmar(v => !v)} style={estilos.botonOjo}>
                    <Text style={estilos.textoOjo}>{verConfirmar ? '◎' : '◉'}</Text>
                  </TouchableOpacity>
                </View>
                {errorConfirmar ? <Text style={estilos.textoError}>⚠ {errorConfirmar}</Text> : null}
              </View>

              <TouchableOpacity
                style={[estilos.boton, cargando && estilos.botonDesactivado]}
                onPress={handleReset}
                disabled={cargando}
              >
                <Text style={estilos.textoBoton}>{cargando ? 'Guardando...' : 'Guardar contraseña'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={estilos.enlace} onPress={() => router.back()}>
                <Text style={estilos.textoEnlace}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor:       { flex: 1, backgroundColor: Tema.fondo },
  imagenMapa:       { opacity: Tema.mapaOverlay, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  areaSegura:       { flex: 1 },
  scroll:           { flexGrow: 1 },
  centrado:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 24 },
  logo:             { width: 104, height: 104, marginBottom: 22 },
  tarjeta:          {
    width: '100%',
    maxWidth: 392,
    backgroundColor: Tema.superficie,
    borderRadius: 22,
    padding: 26,
    borderWidth: 1,
    borderColor: Tema.borde,
    ...sombraTarjeta,
  },
  emoji:            { fontSize: 52, textAlign: 'center', marginBottom: 14 },
  titulo:           { ...tituloAuth, textAlign: 'center', marginBottom: 8 },
  subtitulo:        { ...subtituloAuth, textAlign: 'center', marginBottom: 22 },
  grupoCampo:       { marginBottom: 15 },
  campoContenedor:  {
    height: 50,
    borderWidth: 1.5,
    borderColor: Tema.bordeInput,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: Tema.inputFondo,
    flexDirection: 'row',
    alignItems: 'center',
  },
  campoInterno:     { flex: 1, fontSize: 15, color: Tema.texto },
  campoError:       { borderColor: Tema.error },
  textoError:       { fontSize: 12, color: Tema.error, marginTop: 5, marginLeft: 4 },
  boton:            {
    backgroundColor: Tema.acento,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    ...sombraBotonPrimario,
  },
  botonDesactivado: { opacity: 0.55 },
  textoBoton:       { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  enlace:           { marginTop: 18, alignItems: 'center' },
  textoEnlace:      { fontSize: 13, color: Tema.primario, fontWeight: '700' },
  botonOjo:         { paddingHorizontal: 10, height: 50, justifyContent: 'center' },
  textoOjo:         { fontSize: 18 },
});
