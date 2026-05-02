import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TODOS_LOS_ESTADOS, generarClaveRuta } from '../../lib/constantes';
import { COLORES_NIVEL, Nivel } from '../../lib/tipos';
import { TraduccionClave } from '../../lib/traducciones';
import { ItinerarioResumen } from '../../hooks/use-itinerarios';

interface Props {
  visible: boolean;
  onClose: () => void;
  itinerarioActivo: ItinerarioResumen | null;
  onAgregarDestino: (estadoNombre: string, nivel: Nivel) => void;
  obtenerEtiquetaNivel: (nivel: string) => string;
  tema: Record<string, string>;
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
}

const NIVELES: Nivel[] = ['economico', 'medio', 'premium'];

export function AgregarDestinoModal({
  visible, onClose, itinerarioActivo,
  onAgregarDestino, obtenerEtiquetaNivel, tema, t,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: tema.superficieBlanca }]}>
          <Text style={[s.titulo, { color: tema.texto }]}>
            {t('rut_agregar_destino_titulo') || 'Agregar destino'}
          </Text>
          <Text style={[s.subtitulo, { color: tema.textoSecundario }]}>
            {t('rut_agregar_destino_sub') || 'Elige un estado y un nivel de paquete.'}
          </Text>

          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {TODOS_LOS_ESTADOS.map(estado => {
              const clavesYaIncluidas = new Set(
                itinerarioActivo?.destinos.map(d => d.clave) ?? []
              );
              const nivelesDisponibles = NIVELES.filter(
                n => !clavesYaIncluidas.has(generarClaveRuta(estado.nombre, n))
              );
              if (nivelesDisponibles.length === 0) { return null; }

              return (
                <View
                  key={estado.id}
                  style={[s.fila, { backgroundColor: tema.superficie, borderColor: tema.borde }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.estadoNombre, { color: tema.texto }]}>{estado.nombre}</Text>
                    <Text style={[s.estadoCategoria, { color: tema.textoMuted }]}>{estado.categoria}</Text>
                  </View>
                  <View style={s.niveles}>
                    {nivelesDisponibles.map(nivel => (
                      <TouchableOpacity
                        key={nivel}
                        style={[
                          s.nivelBtn,
                          { backgroundColor: COLORES_NIVEL[nivel] + '22', borderColor: COLORES_NIVEL[nivel] },
                        ]}
                        onPress={() => onAgregarDestino(estado.nombre, nivel)}
                        activeOpacity={0.85}
                      >
                        <Text style={[s.nivelTxt, { color: COLORES_NIVEL[nivel] }]}>
                          {obtenerEtiquetaNivel(nivel)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={s.btnCerrar} onPress={onClose} activeOpacity={0.85}>
            <Text style={[s.btnCerrarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card:         { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, maxHeight: '85%' },
  titulo:       { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtitulo:    { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  fila:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  estadoNombre: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  estadoCategoria: { fontSize: 11, fontWeight: '600' },
  niveles:      { flexDirection: 'row', gap: 6 },
  nivelBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  nivelTxt:     { fontSize: 11, fontWeight: '800' },
  btnCerrar:    { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnCerrarTxt: { fontSize: 13, fontWeight: '700' },
});
