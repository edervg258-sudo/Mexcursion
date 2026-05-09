import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useIdioma } from '../../lib/IdiomaContext';
import { RUTAS_APP } from '../../lib/constantes/navegacion';
import { useTemaContext } from '../../lib/TemaContext';

interface Props {
  usuarioId: string | null;
  creandoNuevo: boolean;
  nuevoNombre: string;
  onSetCreandoNuevo: (v: boolean) => void;
  onSetNuevoNombre: (v: string) => void;
  onCrear: () => void;
}

export function HeroItinerarios({
  usuarioId,
  creandoNuevo,
  nuevoNombre,
  onSetCreandoNuevo,
  onSetNuevoNombre,
  onCrear,
}: Props) {
  const { t } = useIdioma();
  const { tema } = useTemaContext();

  return (
    <View style={[es.hero, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
      <Text style={[es.titulo, { color: tema.texto }]}>{t('rut_mis_viajes_hero')}</Text>
      <Text style={[es.subtitulo, { color: tema.textoSecundario }]}>
        {t('rut_mis_viajes_hero_sub')}
      </Text>

      {usuarioId ? (
        creandoNuevo ? (
          <View style={es.creacionInline}>
            <TextInput
              value={nuevoNombre}
              onChangeText={onSetNuevoNombre}
              placeholder={t('rut_ph_nuevo_iti')}
              placeholderTextColor={tema.textoMuted}
              autoFocus
              style={[es.inputInline, { backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
            />
            <View style={es.creacionInlineBtns}>
              <TouchableOpacity
                style={[es.btnCancelar, { borderColor: tema.borde }]}
                onPress={() => { onSetCreandoNuevo(false); onSetNuevoNombre(''); }}
                activeOpacity={0.85}
              >
                <Text style={[es.btnCancelarTxt, { color: tema.textoMuted }]}>{t('rut_cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[es.btnCrear, { backgroundColor: tema.primario }, !nuevoNombre.trim() && es.btnDisabled]}
                onPress={onCrear}
                disabled={!nuevoNombre.trim()}
                activeOpacity={0.85}
              >
                <Text style={es.btnCrearTxt}>{t('rut_crear_viaje')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[es.btnPrimario, { backgroundColor: tema.primario }]}
            testID="create-itinerary-button"
            onPress={() => onSetCreandoNuevo(true)}
            activeOpacity={0.85}
          >
            <Text style={es.btnPrimarioTxt}>+ {t('rut_nuevo_viaje_btn')}</Text>
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={[es.btnPrimario, { backgroundColor: tema.primario }]}
          onPress={() => router.push(RUTAS_APP.PERFIL as never)}
          activeOpacity={0.85}
        >
          <Text style={es.btnPrimarioTxt}>{t('rut_ir')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const es = StyleSheet.create({
  hero:             { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  titulo:           { fontSize: 21, fontWeight: '900', marginBottom: 6 },
  subtitulo:        { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  btnPrimario:      { borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnPrimarioTxt:   { color: '#fff', fontSize: 14, fontWeight: '800' },
  creacionInline:   { gap: 10 },
  inputInline:      { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  creacionInlineBtns:{ flexDirection: 'row', gap: 10 },
  btnCancelar:      { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnCancelarTxt:   { fontSize: 13, fontWeight: '800' },
  btnCrear:         { flex: 1, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  btnCrearTxt:      { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled:      { opacity: 0.45 },
});
