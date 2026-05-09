import React from 'react';
import {
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapaRutas from '../MapaRutas';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import { Estado } from '../../lib/tipos';
import { ItinerarioResumen } from '../../hooks/useItinerarios';

interface Props {
  itinerario: ItinerarioResumen;
  expandido: boolean;
  tabActivo: 'destinos' | 'mapa';
  estaEditando: boolean;
  nombreEditado: string;
  favoritos: number[];
  isDark: boolean;
  onToggleExpand: () => void;
  onCambiarTab: (tab: 'destinos' | 'mapa') => void;
  onIniciarEdicion: () => void;
  onConfirmarEdicion: () => void;
  onCancelarEdicion: () => void;
  onChangeNombreEditado: (v: string) => void;
  onBorrar: () => void;
  onQuitarDestino: (clave: string) => void;
  onAbrirDetalle: (clave: string) => void;
  onAgregarDestino: () => void;
  obtenerEtiquetaNivel: (nivel: string) => string;
  toggleFavorito: (id: number) => void;
}

export const ItinerarioCard = React.memo(function ItinerarioCard({
  itinerario,
  expandido,
  tabActivo,
  estaEditando,
  nombreEditado,
  favoritos,
  isDark,
  onToggleExpand,
  onCambiarTab,
  onIniciarEdicion,
  onConfirmarEdicion,
  onCancelarEdicion,
  onChangeNombreEditado,
  onBorrar,
  onQuitarDestino,
  onAbrirDetalle,
  onAgregarDestino,
  obtenerEtiquetaNivel,
  toggleFavorito,
}: Props) {
  const { t } = useIdioma();
  const { tema } = useTemaContext();

  const polylineCoords = itinerario.destinos
    .filter(d => d.latitude && d.longitude)
    .map(d => ({ latitude: d.latitude!, longitude: d.longitude! }));

  return (
    <View style={[es.card, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
      {/* Header */}
      <View style={es.header}>
        <View style={{ flex: 1 }}>
          {estaEditando ? (
            <View style={es.edicionInline}>
              <TextInput
                value={nombreEditado}
                onChangeText={onChangeNombreEditado}
                autoFocus
                style={[es.edicionInput, { backgroundColor: tema.superficie, borderColor: tema.primario, color: tema.texto }]}
                onSubmitEditing={onConfirmarEdicion}
                returnKeyType="done"
              />
              <View style={es.edicionBtns}>
                <TouchableOpacity
                  style={[es.edicionBtnGuardar, { backgroundColor: tema.primario }, !nombreEditado.trim() && es.btnDisabled]}
                  onPress={onConfirmarEdicion}
                  disabled={!nombreEditado.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={es.edicionBtnGuardarTxt}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[es.edicionBtnCancelar, { borderColor: tema.borde }]}
                  onPress={onCancelarEdicion}
                  activeOpacity={0.85}
                >
                  <Text style={[es.edicionBtnCancelarTxt, { color: tema.textoMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={onIniciarEdicion} activeOpacity={0.7}>
              <View style={es.nombreFila}>
                <Text style={[es.nombre, { color: tema.texto }]}>{itinerario.nombre}</Text>
                <Text style={[es.iconoEditar, { color: tema.textoMuted }]}>✏️</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={[es.meta, { color: tema.textoMuted }]}>
            {itinerario.totalDestinos} {t(itinerario.totalDestinos === 1 ? 'rut_destino' : 'rut_destinos')} · {itinerario.diasEstimados} {t(itinerario.diasEstimados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
          </Text>
        </View>
        <View style={[es.total, { backgroundColor: tema.primarioSuave }]}>
          <Text style={[es.totalLabel, { color: tema.primario }]}>{t('rut_presupuesto')}</Text>
          <Text style={[es.totalValor, { color: tema.texto }]}>${itinerario.totalEstimado.toLocaleString('es-MX')} MXN</Text>
        </View>
      </View>

      {/* Preview chips */}
      <View style={es.destinosPreview}>
        {itinerario.destinos.slice(0, 3).map(destino => (
          <View
            key={destino.clave}
            style={[es.chip, { backgroundColor: `${destino.color}18`, borderColor: `${destino.color}55` }]}
          >
            <Text style={[es.chipTxt, { color: destino.color }]}>{destino.estado}</Text>
          </View>
        ))}
        {itinerario.totalDestinos > 3 && (
          <View style={[es.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            <Text style={[es.chipTxt, { color: tema.textoMuted }]}>+{itinerario.totalDestinos - 3}</Text>
          </View>
        )}
        {itinerario.totalDestinos === 0 && (
          <View style={[es.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            <Text style={[es.chipTxt, { color: tema.textoMuted }]}>{t('rut_sin_destinos_aun')}</Text>
          </View>
        )}
      </View>

      {/* Acciones */}
      <View style={es.acciones}>
        <TouchableOpacity
          style={[es.btnSecundario, { borderColor: tema.borde }]}
          onPress={onToggleExpand}
          activeOpacity={0.85}
        >
          <Text style={[es.btnSecundarioTxt, { color: tema.texto }]}>
            {expandido ? t('rut_cancelar') : t('rut_ver_itinerario')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={es.btnEliminar} onPress={onBorrar} activeOpacity={0.85}>
          <Text style={es.btnEliminarTxt}>{t('rut_eliminar')}</Text>
        </TouchableOpacity>
      </View>

      {/* Detalle expandido */}
      {expandido && (
        <View style={[es.detalle, { borderTopColor: tema.borde }]}>
          {/* Tabs */}
          <View style={[es.tabs, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            {(['destinos', 'mapa'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[es.tabBtn, tabActivo === tab && { backgroundColor: tema.primario }]}
                onPress={() => onCambiarTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[es.tabBtnTxt, { color: tabActivo === tab ? '#fff' : tema.textoMuted }]}>
                  {tab === 'destinos' ? `📍 ${t('rut_destinos_tab') || 'Destinos'}` : `🗺️ ${t('rut_mapa_tab') || 'Mapa'}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tabActivo === 'destinos' ? (
            <View style={{ gap: 10 }}>
              {itinerario.destinos.length === 0 ? (
                <View style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[es.destinoTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                    <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                  </View>
                </View>
              ) : (
                itinerario.destinos.map((destino, index) => (
                  <View key={destino.clave} style={[es.destinoFila, { backgroundColor: tema.superficie }]}>
                    <View style={[es.destinoIndice, { backgroundColor: destino.color }]}>
                      <Text style={es.destinoIndiceTxt}>{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => onAbrirDetalle(destino.clave)}
                      activeOpacity={0.85}
                    >
                      <Text style={[es.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                      <Text style={[es.destinoDescripcion, { color: tema.textoSecundario }]}>
                        {destino.estado} · {obtenerEtiquetaNivel(destino.nivel)} · {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                      </Text>
                      <Text style={[es.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={es.destinoQuitar}
                      onPress={() => onQuitarDestino(destino.clave)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Text style={es.destinoQuitarTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={[es.btnAgregarDestino, { borderColor: tema.primario }]}
                onPress={onAgregarDestino}
                activeOpacity={0.85}
              >
                <Text style={[es.btnAgregarDestinoTxt, { color: tema.primario }]}>
                  + {t('rut_agregar_destino') || 'Agregar destino'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[es.mapaContenedor, { borderColor: tema.borde }]}>
              {itinerario.destinos.length === 0 ? (
                <View style={[es.mapaVacio, { backgroundColor: tema.superficie }]}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🗺️</Text>
                  <Text style={[es.estadoVacioTitulo, { color: tema.texto, fontSize: 14 }]}>
                    {t('rut_mapa_vacio_titulo') || 'Sin destinos'}
                  </Text>
                  <Text style={[es.estadoVacioTexto, { color: tema.textoSecundario, fontSize: 12 }]}>
                    {t('rut_mapa_vacio_msg') || 'Agrega destinos para ver tu ruta en el mapa.'}
                  </Text>
                </View>
              ) : (
                <View style={{ height: 360 }}>
                  <MapaRutas
                    rutaColor="#3AB7A5"
                    rutaNombre={itinerario.nombre}
                    estadosRuta={itinerario.destinos
                      .map(d => d.estadoCompleto)
                      .filter((e): e is Estado => !!e)}
                    polylineCoords={polylineCoords}
                    favoritos={favoritos}
                    isDark={isDark}
                    tema={tema as unknown as Record<string, string>}
                    onToggleFav={toggleFavorito}
                    onIrADetalle={() => {}}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const es = StyleSheet.create({
  card:            { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  header:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  nombre:          { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  meta:            { fontSize: 12, fontWeight: '600' },
  total:           { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120 },
  totalLabel:      { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  totalValor:      { fontSize: 13, fontWeight: '800' },
  nombreFila:      { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  iconoEditar:     { fontSize: 13 },
  edicionInline:   { gap: 8, marginBottom: 4 },
  edicionInput:    { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '800' },
  edicionBtns:     { flexDirection: 'row', gap: 8 },
  edicionBtnGuardar:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edicionBtnGuardarTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  edicionBtnCancelar:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  edicionBtnCancelarTxt:{ fontSize: 14, fontWeight: '800' },
  btnDisabled:     { opacity: 0.4 },
  destinosPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:            { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipTxt:         { fontSize: 12, fontWeight: '700' },
  acciones:        { flexDirection: 'row', gap: 10 },
  btnSecundario:   { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnSecundarioTxt:{ fontSize: 13, fontWeight: '800' },
  btnEliminar:     { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFECEB' },
  btnEliminarTxt:  { fontSize: 13, fontWeight: '800', color: '#DD331D' },
  detalle:         { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },
  tabs:            { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tabBtn:          { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tabBtnTxt:       { fontSize: 13, fontWeight: '800' },
  destinoFila:     { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 12, alignItems: 'center' },
  destinoIndice:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoIndiceTxt:{ color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:   { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  destinoDescripcion: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  destinoPrecio:   { fontSize: 12, fontWeight: '800' },
  destinoQuitar:   { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFECEB', alignItems: 'center', justifyContent: 'center' },
  destinoQuitarTxt:{ color: '#DD331D', fontSize: 14, fontWeight: '800' },
  btnAgregarDestino:    { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAgregarDestinoTxt: { fontSize: 13, fontWeight: '800' },
  mapaContenedor:  { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:       { padding: 28, alignItems: 'center', justifyContent: 'center' },
  estadoVacioTitulo:{ fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  estadoVacioTexto: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
