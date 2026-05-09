import React from 'react';
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { TODOS_LOS_ESTADOS, generarClaveRuta } from '../../lib/constantes';
import { useIdioma } from '../../lib/IdiomaContext';
import { useTemaContext } from '../../lib/TemaContext';
import { ItinerarioResumen, NIVEL_COLOR } from '../../hooks/useItinerarios';

interface Props {
  visible: boolean;
  itinerarioActivo: ItinerarioResumen | null;
  onAgregar: (itinerarioId: number, estadoNombre: string, nivel: 'economico' | 'medio' | 'premium') => void;
  onCerrar: () => void;
  obtenerEtiquetaNivel: (nivel: string) => string;
}

export function ModalAgregarDestino({
  visible,
  itinerarioActivo,
  onAgregar,
  onCerrar,
  obtenerEtiquetaNivel,
}: Props) {
  const { t } = useIdioma();
  const { tema } = useTemaContext();

  const clavesYaIncluidas = new Set(itinerarioActivo?.destinos.map(d => d.clave) ?? []);
  const niveles: ('economico' | 'medio' | 'premium')[] = ['economico', 'medio', 'premium'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <View style={es.overlay}>
        <View style={[es.card, { backgroundColor: tema.superficieBlanca, maxHeight: '85%' }]}>
          <Text style={[es.titulo, { color: tema.texto }]}>
            {t('rut_agregar_destino_titulo') || 'Agregar destino'}
          </Text>
          <Text style={[es.subtitulo, { color: tema.textoSecundario }]}>
            {t('rut_agregar_destino_sub') || 'Elige un estado y un nivel de paquete.'}
          </Text>

          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {TODOS_LOS_ESTADOS.map(estado => {
              const nivelesDisponibles = niveles.filter(
                n => !clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n))
              );
              if (nivelesDisponibles.length === 0) { return null; }
              return (
                <View
                  key={estado.id}
                  style={[es.estadoFila, { backgroundColor: tema.superficie, borderColor: tema.borde }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[es.estadoNombre, { color: tema.texto }]}>{estado.nombre}</Text>
                    <Text style={[es.estadoCategoria, { color: tema.textoMuted }]}>{estado.categoria}</Text>
                  </View>
                  <View style={es.nivelesRow}>
                    {nivelesDisponibles.map(nivel => (
                      <TouchableOpacity
                        key={nivel}
                        style={[
                          es.nivelBtn,
                          { backgroundColor: NIVEL_COLOR[nivel] + '22', borderColor: NIVEL_COLOR[nivel] },
                        ]}
                        onPress={() => itinerarioActivo && onAgregar(itinerarioActivo.id, estado.nombre, nivel)}
                        activeOpacity={0.85}
                      >
                        <Text style={[es.nivelBtnTxt, { color: NIVEL_COLOR[nivel] }]}>
                          {obtenerEtiquetaNivel(nivel)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={es.btnCerrar} onPress={onCerrar} activeOpacity={0.85}>
            <Text style={[es.btnCerrarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const es = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card:          { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  titulo:        { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtitulo:     { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  estadoFila:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  estadoNombre:  { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  estadoCategoria:{ fontSize: 11, fontWeight: '600' },
  nivelesRow:    { flexDirection: 'row', gap: 6 },
  nivelBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  nivelBtnTxt:   { fontSize: 11, fontWeight: '800' },
  btnCerrar:     { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnCerrarTxt:  { fontSize: 13, fontWeight: '700' },
});
