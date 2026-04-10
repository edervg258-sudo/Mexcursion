// ============================================================
//  components/SistemaFeedback.tsx  —  Sistema de feedback y reseñas
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  StyleSheet, ScrollView, Modal
} from 'react-native';
import { Estrellas } from './Estrellas';
import { useTemaContext } from '../lib/TemaContext';
import { useIdioma } from '../lib/IdiomaContext';
import { logEvent } from '../lib/analytics';

interface SistemaFeedbackProps {
  destinoId: number;
  destinoNombre: string;
  reservaId?: string;
  onFeedbackEnviado?: () => void;
  modo?: 'modal' | 'inline';
}

export function SistemaFeedback({
  destinoId,
  destinoNombre,
  reservaId,
  onFeedbackEnviado,
  modo = 'modal'
}: SistemaFeedbackProps) {
  const { tema } = useTemaContext();
  const { t } = useIdioma();
  const [modalVisible, setModalVisible] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [aspectos, setAspectos] = useState({
    transporte: 0,
    hotel: 0,
    actividades: 0,
    atencion: 0,
    precio: 0
  });
  const [enviando, setEnviando] = useState(false);

  const enviarFeedback = async () => {
    if (calificacion === 0) {
      Alert.alert(t('feedback_error'), t('feedback_calificacion_requerida'));
      return;
    }

    setEnviando(true);
    try {
      // Aquí iría la lógica para guardar el feedback
      const _feedbackData = {
        destinoId,
        reservaId,
        calificacion,
        comentario: comentario.trim(),
        aspectos,
        timestamp: new Date().toISOString(),
      };

      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      logEvent('feedback_enviado', {
        destino_id: destinoId,
        calificacion,
        tiene_comentario: comentario.length > 0
      });

      Alert.alert(t('feedback_gracias'), t('feedback_recibido'));
      setModalVisible(false);
      onFeedbackEnviado?.();

      // Reset form
      setCalificacion(0);
      setComentario('');
      setAspectos({
        transporte: 0,
        hotel: 0,
        actividades: 0,
        atencion: 0,
        precio: 0
      });

    } catch {
      Alert.alert(t('error'), t('feedback_error_envio'));
    } finally {
      setEnviando(false);
    }
  };

  const AspectoRating = ({ nombre, valor, onChange }: {
    nombre: string;
    valor: number;
    onChange: (rating: number) => void;
  }) => (
    <View style={estilos.aspectoContainer}>
      <Text style={[estilos.aspectoLabel, { color: tema.texto }]}>{nombre}</Text>
      <Estrellas
        calificacion={valor}
        onCalificar={onChange}
        tamano={20}
        editable
      />
    </View>
  );

  const ContenidoFeedback = () => (
    <ScrollView style={estilos.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[estilos.titulo, { color: tema.texto }]}>
        {t('feedback_titulo')} {destinoNombre}
      </Text>

      <Text style={[estilos.subtitulo, { color: tema.textoMuted }]}>
        {t('feedback_subtitulo')}
      </Text>

      {/* Calificación general */}
      <View style={estilos.seccion}>
        <Text style={[estilos.labelSeccion, { color: tema.texto }]}>
          {t('feedback_calificacion_general')}
        </Text>
        <Estrellas
          calificacion={calificacion}
          onCalificar={setCalificacion}
          tamano={30}
          editable
        />
      </View>

      {/* Aspectos específicos */}
      <View style={estilos.seccion}>
        <Text style={[estilos.labelSeccion, { color: tema.texto }]}>
          {t('feedback_aspectos')}
        </Text>

        <AspectoRating
          nombre={t('feedback_transporte')}
          valor={aspectos.transporte}
          onChange={(rating) => setAspectos(prev => ({ ...prev, transporte: rating }))}
        />

        <AspectoRating
          nombre={t('feedback_hotel')}
          valor={aspectos.hotel}
          onChange={(rating) => setAspectos(prev => ({ ...prev, hotel: rating }))}
        />

        <AspectoRating
          nombre={t('feedback_actividades')}
          valor={aspectos.actividades}
          onChange={(rating) => setAspectos(prev => ({ ...prev, actividades: rating }))}
        />

        <AspectoRating
          nombre={t('feedback_atencion')}
          valor={aspectos.atencion}
          onChange={(rating) => setAspectos(prev => ({ ...prev, atencion: rating }))}
        />

        <AspectoRating
          nombre={t('feedback_precio')}
          valor={aspectos.precio}
          onChange={(rating) => setAspectos(prev => ({ ...prev, precio: rating }))}
        />
      </View>

      {/* Comentario */}
      <View style={estilos.seccion}>
        <Text style={[estilos.labelSeccion, { color: tema.texto }]}>
          {t('feedback_comentario')} ({t('opcional')})
        </Text>
        <TextInput
          style={[estilos.inputComentario, {
            borderColor: tema.borde,
            backgroundColor: tema.superficieBlanca,
            color: tema.texto
          }]}
          placeholder={t('feedback_placeholder_comentario')}
          placeholderTextColor={tema.textoMuted}
          value={comentario}
          onChangeText={setComentario}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={[estilos.contadorCaracteres, { color: tema.textoMuted }]}>
          {comentario.length}/500
        </Text>
      </View>

      {/* Botones */}
      <View style={estilos.botonesContainer}>
        <TouchableOpacity
          style={[estilos.boton, estilos.botonCancelar, { borderColor: tema.borde }]}
          onPress={() => setModalVisible(false)}
          disabled={enviando}
        >
          <Text style={[estilos.textoBoton, { color: tema.texto }]}>
            {t('cancelar')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.boton, estilos.botonEnviar, {
            backgroundColor: tema.primario,
            opacity: enviando ? 0.6 : 1
          }]}
          onPress={enviarFeedback}
          disabled={enviando || calificacion === 0}
        >
          <Text style={[estilos.textoBoton, { color: '#fff' }]}>
            {enviando ? t('enviando') : t('feedback_enviar')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (modo === 'inline') {
    return <ContenidoFeedback />;
  }

  return (
    <>
      <TouchableOpacity
        style={[estilos.botonFeedback, { backgroundColor: tema.primario }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={estilos.textoBotonFeedback}>
          {t('feedback_dejar_resena')}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={estilos.overlay}>
          <View style={[estilos.modalContent, { backgroundColor: tema.superficieBlanca }]}>
            <ContenidoFeedback />
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  // Botón principal
  botonFeedback: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    marginVertical: 10,
  },
  textoBotonFeedback: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },

  // Contenido
  scroll: {
    flex: 1,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Secciones
  seccion: {
    marginBottom: 24,
  },
  labelSeccion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Aspectos
  aspectoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  aspectoLabel: {
    fontSize: 14,
    flex: 1,
  },

  // Input comentario
  inputComentario: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contadorCaracteres: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  // Botones
  botonesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  boton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  botonCancelar: {
    borderWidth: 1,
  },
  botonEnviar: {
    // Color definido en style prop
  },
  textoBoton: {
    fontSize: 16,
    fontWeight: '600',
  },
});