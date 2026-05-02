import React from 'react';
import {
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapaRutas from '../MapaRutas';
import { Itinerario } from '../../lib/supabase-db';
import { Estado } from '../../lib/tipos';
import { TraduccionClave } from '../../lib/traducciones';
import { ItinerarioResumen } from '../../hooks/use-itinerarios';

interface Props {
  itinerario: ItinerarioResumen;
  expandido: boolean;
  tabActivo: 'destinos' | 'mapa';
  editandoId: number | null;
  nombreEditado: string;
  favoritos: number[];
  isDark: boolean;
  tema: Record<string, string>;
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
  obtenerEtiquetaNivel: (nivel: string) => string;
  onToggleExpansion: () => void;
  onIniciarEdicion: () => void;
  onConfirmarEdicion: () => void;
  onCancelarEdicion: () => void;
  onNombreEditadoChange: (v: string) => void;
  onBorrar: () => void;
  onCambiarTab: (tab: 'destinos' | 'mapa') => void;
  onAbrirDetalleDesdeClave: (clave: string) => void;
  onQuitarDestino: (clave: string) => void;
  onAbrirModalAgregar: () => void;
  onToggleFav: (estadoId: number) => void;
  onIrADetalle: (estado: Estado) => void;
}

export function ItinerarioCard({
  itinerario, expandido, tabActivo,
  editandoId, nombreEditado,
  favoritos, isDark, tema, t,
  obtenerEtiquetaNivel,
  onToggleExpansion, onIniciarEdicion, onConfirmarEdicion,
  onCancelarEdicion, onNombreEditadoChange, onBorrar,
  onCambiarTab, onAbrirDetalleDesdeClave, onQuitarDestino,
  onAbrirModalAgregar, onToggleFav, onIrADetalle,
}: Props) {
  const estaEditando = editandoId === itinerario.id;
  const polylineCoords = itinerario.destinos
    .filter(d => d.latitude && d.longitude)
    .map(d => ({ latitude: d.latitude!, longitude: d.longitude! }));

  return (
    <View style={[s.card, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          {estaEditando ? (
            <View style={s.edicionInline}>
              <TextInput
                value={nombreEditado}
                onChangeText={onNombreEditadoChange}
                autoFocus
                style={[s.edicionInput, { backgroundColor: tema.superficie, borderColor: tema.primario, color: tema.texto }]}
                onSubmitEditing={onConfirmarEdicion}
                returnKeyType="done"
              />
              <View style={s.edicionBtns}>
                <TouchableOpacity
                  style={[s.edicionBtnGuardar, { backgroundColor: tema.primario }, !nombreEditado.trim() && s.btnDisabled]}
                  onPress={onConfirmarEdicion}
                  disabled={!nombreEditado.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={s.edicionBtnGuardarTxt}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.edicionBtnCancelar, { borderColor: tema.borde }]}
                  onPress={onCancelarEdicion}
                  activeOpacity={0.85}
                >
                  <Text style={[s.edicionBtnCancelarTxt, { color: tema.textoMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={onIniciarEdicion} activeOpacity={0.7}>
              <View style={s.nombreFila}>
                <Text style={[s.nombre, { color: tema.texto }]}>{itinerario.nombre}</Text>
                <Text style={[s.iconoEditar, { color: tema.textoMuted }]}>✏️</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={[s.meta, { color: tema.textoMuted }]}>
            {itinerario.totalDestinos} {t(itinerario.totalDestinos === 1 ? 'rut_destino' : 'rut_destinos')} · {itinerario.diasEstimados} {t(itinerario.diasEstimados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
          </Text>
        </View>
        <View style={[s.total, { backgroundColor: tema.primarioSuave }]}>
          <Text style={[s.totalLabel, { color: tema.primario }]}>{t('rut_presupuesto')}</Text>
          <Text style={[s.totalValor, { color: tema.texto }]}>${itinerario.totalEstimado.toLocaleString('es-MX')} MXN</Text>
        </View>
      </View>

      {/* Chips de destinos */}
      <View style={s.destinosPreview}>
        {itinerario.destinos.slice(0, 3).map(destino => (
          <View
            key={destino.clave}
            style={[s.chip, { backgroundColor: `${destino.color}18`, borderColor: `${destino.color}55` }]}
          >
            <Text style={[s.chipTxt, { color: destino.color }]}>{destino.estado}</Text>
          </View>
        ))}
        {itinerario.totalDestinos > 3 && (
          <View style={[s.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            <Text style={[s.chipTxt, { color: tema.textoMuted }]}>+{itinerario.totalDestinos - 3}</Text>
          </View>
        )}
        {itinerario.totalDestinos === 0 && (
          <View style={[s.chip, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            <Text style={[s.chipTxt, { color: tema.textoMuted }]}>{t('rut_sin_destinos_aun')}</Text>
          </View>
        )}
      </View>

      {/* Acciones */}
      <View style={s.acciones}>
        <TouchableOpacity
          style={[s.btnSecundario, { borderColor: tema.borde }]}
          onPress={onToggleExpansion}
          activeOpacity={0.85}
        >
          <Text style={[s.btnSecundarioTxt, { color: tema.texto }]}>
            {expandido ? t('rut_cancelar') : t('rut_ver_itinerario')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnEliminar} onPress={onBorrar} activeOpacity={0.85}>
          <Text style={s.btnEliminarTxt}>{t('rut_eliminar')}</Text>
        </TouchableOpacity>
      </View>

      {/* Detalle expandido */}
      {expandido && (
        <View style={[s.detalle, { borderTopColor: tema.borde }]}>
          {/* Tabs */}
          <View style={[s.tabs, { backgroundColor: tema.superficie, borderColor: tema.borde }]}>
            {(['destinos', 'mapa'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.tabBtn, tabActivo === tab && { backgroundColor: tema.primario }]}
                onPress={() => onCambiarTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[s.tabBtnTxt, { color: tabActivo === tab ? '#fff' : tema.textoMuted }]}>
                  {tab === 'destinos' ? `📍 ${t('rut_destinos_tab') || 'Destinos'}` : `🗺️ ${t('rut_mapa_tab') || 'Mapa'}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenido tab */}
          {tabActivo === 'destinos' ? (
            <View style={{ gap: 10 }}>
              {itinerario.destinos.length === 0 ? (
                <View style={[s.destinoFila, { backgroundColor: tema.superficie }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.destinoTitulo, { color: tema.texto }]}>{t('rut_sin_destinos_aun')}</Text>
                    <Text style={[s.destinoDesc, { color: tema.textoSecundario }]}>{t('rut_viaje_vacio_msg')}</Text>
                  </View>
                </View>
              ) : (
                itinerario.destinos.map((destino, index) => (
                  <View key={destino.clave} style={[s.destinoFila, { backgroundColor: tema.superficie }]}>
                    <View style={[s.destinoIndice, { backgroundColor: destino.color }]}>
                      <Text style={s.destinoIndiceTxt}>{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => onAbrirDetalleDesdeClave(destino.clave)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.destinoTitulo, { color: tema.texto }]}>{destino.titulo}</Text>
                      <Text style={[s.destinoDesc, { color: tema.textoSecundario }]}>
                        {destino.estado} · {obtenerEtiquetaNivel(destino.nivel)} · {destino.diasRecomendados} {t(destino.diasRecomendados === 1 ? 'rut_dia_singular' : 'rut_dia_plural')}
                      </Text>
                      <Text style={[s.destinoPrecio, { color: destino.color }]}>{destino.precioTotal}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.destinoQuitar}
                      onPress={() => onQuitarDestino(destino.clave)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Text style={s.destinoQuitarTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={[s.btnAgregarDestino, { borderColor: tema.primario }]}
                onPress={onAbrirModalAgregar}
                activeOpacity={0.85}
              >
                <Text style={[s.btnAgregarDestinoTxt, { color: tema.primario }]}>
                  + {t('rut_agregar_destino') || 'Agregar destino'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.mapaContenedor, { borderColor: tema.borde }]}>
              {itinerario.destinos.length === 0 ? (
                <View style={[s.mapaVacio, { backgroundColor: tema.superficie }]}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🗺️</Text>
                  <Text style={[s.mapaVacioTitulo, { color: tema.texto }]}>
                    {t('rut_mapa_vacio_titulo') || 'Sin destinos'}
                  </Text>
                  <Text style={[s.mapaVacioMsg, { color: tema.textoSecundario }]}>
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
                    tema={tema}
                    onToggleFav={onToggleFav}
                    onIrADetalle={onIrADetalle}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:               { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  header:             { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  nombreFila:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  nombre:             { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  iconoEditar:        { fontSize: 13 },
  meta:               { fontSize: 12, fontWeight: '600' },
  total:              { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120 },
  totalLabel:         { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  totalValor:         { fontSize: 13, fontWeight: '800' },

  edicionInline:      { gap: 8, marginBottom: 4 },
  edicionInput:       { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontWeight: '800' },
  edicionBtns:        { flexDirection: 'row', gap: 8 },
  edicionBtnGuardar:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edicionBtnGuardarTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  edicionBtnCancelar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  edicionBtnCancelarTxt: { fontSize: 14, fontWeight: '800' },
  btnDisabled:        { opacity: 0.4 },

  destinosPreview:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:               { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipTxt:            { fontSize: 12, fontWeight: '700' },

  acciones:           { flexDirection: 'row', gap: 10 },
  btnSecundario:      { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnSecundarioTxt:   { fontSize: 13, fontWeight: '800' },
  btnEliminar:        { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFECEB' },
  btnEliminarTxt:     { fontSize: 13, fontWeight: '800', color: '#DD331D' },

  detalle:            { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },
  tabs:               { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tabBtn:             { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  tabBtnTxt:          { fontSize: 13, fontWeight: '800' },

  destinoFila:        { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 12, alignItems: 'center' },
  destinoIndice:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  destinoIndiceTxt:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  destinoTitulo:      { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  destinoDesc:        { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  destinoPrecio:      { fontSize: 12, fontWeight: '800' },
  destinoQuitar:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFECEB', alignItems: 'center', justifyContent: 'center' },
  destinoQuitarTxt:   { color: '#DD331D', fontSize: 14, fontWeight: '800' },

  btnAgregarDestino:  { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnAgregarDestinoTxt: { fontSize: 13, fontWeight: '800' },

  mapaContenedor:     { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  mapaVacio:          { padding: 28, alignItems: 'center', justifyContent: 'center' },
  mapaVacioTitulo:    { fontSize: 14, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  mapaVacioMsg:       { fontSize: 12, textAlign: 'center' },
});
