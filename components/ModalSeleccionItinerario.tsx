// ============================================================
//  components/ModalSeleccionItinerario.tsx
// ============================================================

import React from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Itinerario } from '../lib/supabase-db';
import { useTemaContext } from '../lib/TemaContext';

interface Props {
  visible: boolean;
  itinerarios: Itinerario[];
  paqueteSeleccionado: string | null;
  nuevoNombre: string;
  tituloModal: string;
  labelNuevo: string;
  placeholderNuevo: string;
  labelCrearAgregar: string;
  labelCancelar: string;
  labelQuitar: string;
  onCerrar: () => void;
  onAgregarAItinerario: (id: number) => void;
  onCrearYAgregar: () => void;
  onNuevoNombreChange: (v: string) => void;
  sinItinerariosMsg: string;
}

export const ModalSeleccionItinerario = React.memo(function ModalSeleccionItinerario({
  visible, itinerarios, paqueteSeleccionado, nuevoNombre,
  tituloModal, labelNuevo, placeholderNuevo, labelCrearAgregar,
  labelCancelar, labelQuitar,
  onCerrar, onAgregarAItinerario, onCrearYAgregar,
  onNuevoNombreChange, sinItinerariosMsg,
}: Props) {
  const { tema } = useTemaContext();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.overlay}>
          <View style={[s.content, { backgroundColor: tema.superficieBlanca }]}>
            <Text style={[s.titulo, { color: tema.texto }]}>{tituloModal}</Text>

            <ScrollView
              style={{ maxHeight: 200, width: '100%', marginBottom: 15 }}
              keyboardShouldPersistTaps="handled"
            >
              {itinerarios.map(iti => {
                const yaEsta = iti.items?.includes(paqueteSeleccionado ?? '');
                return (
                  <TouchableOpacity
                    key={iti.id}
                    style={[s.itiCard, { backgroundColor: tema.superficie, borderColor: tema.borde }, yaEsta && s.itiCardActivo]}
                    onPress={() => onAgregarAItinerario(iti.id)}
                  >
                    <Text style={[s.itiText, { color: tema.textoSecundario }, yaEsta && s.itiTextActivo]}>
                      {iti.nombre}{yaEsta ? ` ${labelQuitar}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {itinerarios.length === 0 && (
                <Text style={[s.sinIti, { color: tema.textoSecundario }]}>{sinItinerariosMsg}</Text>
              )}
            </ScrollView>

            <View style={{ width: '100%', marginBottom: 15 }}>
              <Text style={[s.label, { color: tema.textoMuted }]}>{labelNuevo}</Text>
              <TextInput
                style={[s.input, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
                placeholder={placeholderNuevo}
                value={nuevoNombre}
                onChangeText={onNuevoNombreChange}
                placeholderTextColor={tema.textoMuted}
              />
              <TouchableOpacity
                style={[s.btnCrear, !nuevoNombre.trim() && { opacity: 0.5 }]}
                disabled={!nuevoNombre.trim()}
                onPress={onCrearYAgregar}
              >
                <Text style={s.btnCrearTxt}>{labelCrearAgregar}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.btnCerrar} onPress={onCerrar}>
              <Text style={[s.btnCerrarTxt, { color: tema.textoMuted }]}>{labelCancelar}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 },
  content:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, alignItems: 'center' },
  titulo:       { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  itiCard:      { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  itiCardActivo:{ backgroundColor: '#FFECEB', borderColor: '#DD331D' },
  itiText:      { fontSize: 15, fontWeight: '600' },
  itiTextActivo:{ color: '#DD331D' },
  sinIti:       { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  label:        { fontSize: 13, marginBottom: 6, alignSelf: 'flex-start' },
  input:        { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, marginBottom: 10, width: '100%' },
  btnCrear:     { backgroundColor: '#333', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnCrearTxt:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnCerrar:    { marginTop: 10, padding: 10 },
  btnCerrarTxt: { fontSize: 14, fontWeight: '600' },
});
