import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { s } from '../../lib/estilos_rutas';
import { useTemaContext } from '../../lib/TemaContext';
import { TraduccionClave } from '../../lib/traducciones';

interface Props {
  visible: boolean;
  onClose: () => void;
  nuevoNombre: string;
  setNuevoNombre: (nombre: string) => void;
  handleCrearItinerario: () => void;
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
}

export function ModalNuevoItinerario({
  visible,
  onClose,
  nuevoNombre,
  setNuevoNombre,
  handleCrearItinerario,
  t,
}: Props) {
  const { tema } = useTemaContext();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['45%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="fillParent"
      keyboardBlurBehavior="restore"
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: tema.superficieBlanca }}
      handleIndicatorStyle={{ backgroundColor: tema.borde }}
    >
      <BottomSheetView style={{ flex: 1, padding: 20 }}>
        <Text style={[s.modalTitulo, { color: tema.texto }]}>{t('rut_nuevo_iti_titulo')}</Text>
        <Text style={[s.modalSub, { color: tema.textoMuted }]}>{t('rut_nuevo_iti_sub')}</Text>

        <TextInput
          style={[s.modalInput, { marginTop: 20, marginBottom: 20, backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
          placeholder={t('rut_ph_nombre_iti')}
          placeholderTextColor="#bbb"
          value={nuevoNombre}
          onChangeText={setNuevoNombre}
          autoFocus
          maxLength={50}
        />

        <View style={s.modalBtns}>
          <TouchableOpacity
            style={[s.modalBtnCancelar, { borderColor: tema.borde }]}
            onPress={() => bottomSheetRef.current?.dismiss()}
          >
            <Text style={[s.modalBtnCancelarTxt, { color: tema.textoSecundario }]}>{t('rut_cancelar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.modalBtnCrear, !nuevoNombre.trim() && { opacity: 0.5 }]} 
            onPress={() => { bottomSheetRef.current?.dismiss(); handleCrearItinerario(); }}
            disabled={!nuevoNombre.trim()}
          >
            <Text style={s.modalBtnCrearTxt}>{t('rut_crear_viaje')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
