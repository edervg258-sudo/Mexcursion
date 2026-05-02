import { router } from 'expo-router';
import React from 'react';
import {
  Animated, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { AgregarDestinoModal } from '../../components/Rutas/AgregarDestinoModal';
import { ItinerarioCard } from '../../components/Rutas/ItinerarioCard';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useIdioma } from '../../lib/IdiomaContext';
import { Nivel } from '../../lib/tipos';
import { useTemaContext } from '../../lib/TemaContext';
import { useItinerarios } from '../../hooks/use-itinerarios';
import { SkeletonFilas } from './skeletonloader';

export default function RutasScreen() {
  const { width }        = useWindowDimensions();
  const esPC             = width >= 768;
  const { t }            = useIdioma();
  const { tema, isDark } = useTemaContext();

  const {
    usuarioId,
    favoritos,
    itinerariosResumen,
    itinerarioExpandidoId,
    setItinerarioExpandidoId,
    tabPorItinerario,
    modalAgregarDestino,
    setModalAgregarDestino,
    creandoNuevo,
    setCreandoNuevo,
    nuevoNombre,
    setNuevoNombre,
    editandoId,
    nombreEditado,
    setNombreEditado,
    cargando,
    fadeAnim,
    itinerarioActivoParaAgregar,
    toggleFavorito,
    irADetalle,
    crearNuevoItinerario,
    iniciarEdicion,
    confirmarEdicion,
    cancelarEdicion,
    borrarItinerario,
    quitarDestinoDeItinerario,
    agregarDestinoAItinerario,
    abrirDetalleDesdeClave,
    obtenerEtiquetaNivel,
    cambiarTabItinerario,
  } = useItinerarios();

  if (cargando) {
    return (
      <TabChrome esPC={esPC}>
        <SkeletonFilas cantidad={6} />
      </TabChrome>
    );
  }

  return (
    <TabChrome esPC={esPC} testID="rutas-screen" showLogoWhenNoTitle={false}>
      <View style={{ flex: 1 }}>
        <TopActionHeader
          title={t('tab_rutas')}
          showInlineLogo={false}
          onNotificationsPress={() => setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES), 0)}
        />

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={es.scroll}
          >
            {/* Hero "Mis viajes" */}
            <View style={[es.hero, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
              <Text style={[es.heroTitulo, { color: tema.texto }]}>{t('rut_mis_viajes_hero')}</Text>
              <Text style={[es.heroSub, { color: tema.textoSecundario }]}>
                {t('rut_mis_viajes_hero_sub')}
              </Text>

              {usuarioId ? (
                creandoNuevo ? (
                  <View style={es.creacionInline}>
                    <TextInput
                      value={nuevoNombre}
                      onChangeText={setNuevoNombre}
                      placeholder={t('rut_ph_nuevo_iti')}
                      placeholderTextColor={tema.textoMuted}
                      autoFocus
                      style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
                    />
                    <View style={es.creacionBtns}>
                      <TouchableOpacity
                        style={[es.btnCancelar, { borderColor: tema.borde }]}
                        onPress={() => { setCreandoNuevo(false); setNuevoNombre(''); }}
                        activeOpacity={0.85}
                      >
                        <Text style={[es.btnCancelarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[es.btnCrear, { backgroundColor: tema.primario }, !nuevoNombre.trim() && es.btnDisabled]}
                        onPress={crearNuevoItinerario}
                        disabled={!nuevoNombre.trim()}
                        activeOpacity={0.85}
                      >
                        <Text style={es.btnCrearTxt}>{t('rut_crear_viaje')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[es.btnNuevo, { backgroundColor: tema.primario }]}
                    testID="create-itinerary-button"
                    onPress={() => setCreandoNuevo(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={es.btnNuevoTxt}>+ {t('rut_nuevo_viaje_btn')}</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={[es.btnNuevo, { backgroundColor: tema.primario }]}
                  onPress={() => router.push(RUTAS_APP.PERFIL)}
                  activeOpacity={0.85}
                >
                  <Text style={es.btnNuevoTxt}>{t('rut_ir')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Estados vacíos */}
            {!usuarioId ? (
              <View style={[es.vacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.vacioTitulo, { color: tema.texto }]}>{t('rut_sesion_requerida')}</Text>
                <Text style={[es.vacioTexto, { color: tema.textoSecundario }]}>{t('rut_sesion_msg')}</Text>
              </View>
            ) : itinerariosResumen.length === 0 ? (
              <View style={[es.vacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.vacioTitulo, { color: tema.texto }]}>{t('rut_sin_itis_aun')}</Text>
                <Text style={[es.vacioTexto, { color: tema.textoSecundario }]}>{t('rut_sin_itis_msg')}</Text>
                <TouchableOpacity
                  style={[es.btnExplorar, { borderColor: tema.primario }]}
                  onPress={() => router.push('/(tabs)/menu')}
                  activeOpacity={0.85}
                >
                  <Text style={[es.btnExplorarTxt, { color: tema.primario }]}>{t('rut_explorar')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              itinerariosResumen.map(itinerario => (
                <ItinerarioCard
                  key={itinerario.id}
                  itinerario={itinerario}
                  expandido={itinerarioExpandidoId === itinerario.id}
                  tabActivo={tabPorItinerario[itinerario.id] ?? 'destinos'}
                  editandoId={editandoId}
                  nombreEditado={nombreEditado}
                  favoritos={favoritos}
                  isDark={isDark}
                  tema={tema as unknown as Record<string, string>}
                  t={t}
                  obtenerEtiquetaNivel={obtenerEtiquetaNivel}
                  onToggleExpansion={() => setItinerarioExpandidoId(
                    itinerarioExpandidoId === itinerario.id ? null : itinerario.id
                  )}
                  onIniciarEdicion={() => iniciarEdicion(itinerario)}
                  onConfirmarEdicion={() => confirmarEdicion(itinerario.id)}
                  onCancelarEdicion={cancelarEdicion}
                  onNombreEditadoChange={setNombreEditado}
                  onBorrar={() => borrarItinerario(itinerario)}
                  onCambiarTab={(tab) => cambiarTabItinerario(itinerario.id, tab)}
                  onAbrirDetalleDesdeClave={abrirDetalleDesdeClave}
                  onQuitarDestino={(clave) => quitarDestinoDeItinerario(itinerario.id, clave)}
                  onAbrirModalAgregar={() => setModalAgregarDestino({ itinerarioId: itinerario.id })}
                  onToggleFav={toggleFavorito}
                  onIrADetalle={irADetalle}
                />
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
      </View>

      <AgregarDestinoModal
        visible={!!modalAgregarDestino}
        onClose={() => setModalAgregarDestino(null)}
        itinerarioActivo={itinerarioActivoParaAgregar}
        onAgregarDestino={(estadoNombre, nivel) =>
          modalAgregarDestino && agregarDestinoAItinerario(modalAgregarDestino.itinerarioId, estadoNombre, nivel as Nivel)
        }
        obtenerEtiquetaNivel={obtenerEtiquetaNivel}
        tema={tema as unknown as Record<string, string>}
        t={t}
      />
    </TabChrome>
  );
}

const es = StyleSheet.create({
  scroll:        { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 10, gap: 12 },

  hero:          { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  heroTitulo:    { fontSize: 21, fontWeight: '900', marginBottom: 6 },
  heroSub:       { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  btnNuevo:      { borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnNuevoTxt:   { color: '#fff', fontSize: 14, fontWeight: '800' },

  creacionInline: { gap: 10 },
  inputInline:    { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  creacionBtns:   { flexDirection: 'row', gap: 10 },
  btnCancelar:    { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnCancelarTxt: { fontSize: 13, fontWeight: '800' },
  btnCrear:       { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnCrearTxt:    { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled:    { opacity: 0.45 },

  vacio:          { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center' },
  vacioTitulo:    { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  vacioTexto:     { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  btnExplorar:    { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11 },
  btnExplorarTxt: { fontSize: 13, fontWeight: '800' },
});
