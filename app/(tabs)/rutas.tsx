import { router } from 'expo-router';
import React from 'react';
import {
  Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { HeroItinerarios } from '../../components/Rutas/HeroItinerarios';
import { ItinerarioCard } from '../../components/Rutas/ItinerarioCard';
import { ModalAgregarDestino } from '../../components/Rutas/ModalAgregarDestino';
import { TabChrome } from '../../components/TabChrome';
import { TopActionHeader } from '../../components/TopActionHeader';
import { useItinerarios } from '../../hooks/useItinerarios';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
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
    cargando,
    fadeAnim,
    creandoNuevo, setCreandoNuevo,
    nuevoNombre, setNuevoNombre,
    editandoId,
    nombreEditado, setNombreEditado,
    itinerarioExpandidoId, setItinerarioExpandidoId,
    tabPorItinerario,
    modalAgregarDestino, setModalAgregarDestino,
    itinerarioActivoParaAgregar,
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
    toggleFavorito,
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
          onNotificationsPress={() => setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES as never), 0)}
        />

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={es.scroll}
          >
            <HeroItinerarios
              usuarioId={usuarioId}
              creandoNuevo={creandoNuevo}
              nuevoNombre={nuevoNombre}
              onSetCreandoNuevo={setCreandoNuevo}
              onSetNuevoNombre={setNuevoNombre}
              onCrear={crearNuevoItinerario}
            />

            {!usuarioId ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sesion_requerida')}</Text>
                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sesion_msg')}</Text>
              </View>
            ) : itinerariosResumen.length === 0 ? (
              <View style={[es.estadoVacio, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
                <Text style={[es.estadoVacioTitulo, { color: tema.texto }]}>{t('rut_sin_itis_aun')}</Text>
                <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario }]}>{t('rut_sin_itis_msg')}</Text>
                <TouchableOpacity
                  style={[es.btnExplorar, { borderColor: tema.primario }]}
                  onPress={() => router.push('/(tabs)/menu' as never)}
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
                  estaEditando={editandoId === itinerario.id}
                  nombreEditado={nombreEditado}
                  favoritos={favoritos}
                  isDark={isDark}
                  onToggleExpand={() => setItinerarioExpandidoId(
                    itinerarioExpandidoId === itinerario.id ? null : itinerario.id
                  )}
                  onCambiarTab={tab => cambiarTabItinerario(itinerario.id, tab)}
                  onIniciarEdicion={() => iniciarEdicion(itinerario)}
                  onConfirmarEdicion={() => confirmarEdicion(itinerario.id)}
                  onCancelarEdicion={cancelarEdicion}
                  onChangeNombreEditado={setNombreEditado}
                  onBorrar={() => borrarItinerario(itinerario)}
                  onQuitarDestino={clave => quitarDestinoDeItinerario(itinerario.id, clave)}
                  onAbrirDetalle={abrirDetalleDesdeClave}
                  onAgregarDestino={() => setModalAgregarDestino({ itinerarioId: itinerario.id })}
                  obtenerEtiquetaNivel={obtenerEtiquetaNivel}
                  toggleFavorito={toggleFavorito}
                />
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
      </View>

      <ModalAgregarDestino
        visible={!!modalAgregarDestino}
        itinerarioActivo={itinerarioActivoParaAgregar}
        onAgregar={agregarDestinoAItinerario}
        onCerrar={() => setModalAgregarDestino(null)}
        obtenerEtiquetaNivel={obtenerEtiquetaNivel}
      />
    </TabChrome>
  );
}

const es = StyleSheet.create({
  scroll:           { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 10, gap: 12 },
  estadoVacio:      { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center' },
  estadoVacioTitulo:{ fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  estadoVacioTexto: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  btnExplorar:      { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11 },
  btnExplorarTxt:   { fontSize: 13, fontWeight: '800' },
});
