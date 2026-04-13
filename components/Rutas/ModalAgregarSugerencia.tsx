import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { s } from '../../lib/estilos_rutas';
import { useTemaContext } from '../../lib/TemaContext';
import { Itinerario } from '../../lib/supabase-db';
import { TraduccionClave } from '../../lib/traducciones';

interface Props {
  visible: boolean;
  onClose: () => void;
  itinerarios: Itinerario[];
  nuevoNombreIti: string;
  setNuevoNombreIti: (nombre: string) => void;
  agregarSugeridaAItinerario: (id: number) => void;
  crearItiYAgregar: () => void;
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
}

export function ModalAgregarSugerencia({
  visible,
  onClose,
  itinerarios,
  nuevoNombreIti,
  setNuevoNombreIti,
  agregarSugeridaAItinerario,
  crearItiYAgregar,
  t,
}: Props) {
  const { tema } = useTemaContext();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    onClose();
    setNuevoNombreIti('');
  }, [onClose, setNuevoNombreIti]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
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
        <Text style={[s.modalTitulo, { color: tema.texto }]}>{t('rut_agregar_viaje_titulo')}</Text>
        <Text style={[s.modalSub, { color: tema.textoMuted }]}>{t('rut_agregar_iti_sub2')}</Text>

        {itinerarios.length > 0 && (
          <BottomSheetScrollView style={{ maxHeight: 200, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
            {itinerarios.map((iti) => (
              <TouchableOpacity
                key={iti.id}
                style={[s.itiOpcion, { borderBottomColor: tema.borde }]}
                onPress={() => { bottomSheetRef.current?.dismiss(); agregarSugeridaAItinerario(iti.id); }}
              >
                <Text style={[s.itiOpcionNombre, { color: tema.texto }]}>{iti.nombre}</Text>
                <Text style={[s.itiOpcionCount, { color: tema.textoMuted }]}>{(iti.items ?? []).length} destinos</Text>
              </TouchableOpacity>
            ))}
          </BottomSheetScrollView>
        )}

        <Text style={[s.oCrearLbl, { color: tema.textoMuted }]}>{t('rut_o_crear_sep')}</Text>
        <TextInput
          style={[s.modalInput, { marginTop: 10, marginBottom: 15, backgroundColor: tema.superficie, borderColor: tema.borde, color: tema.texto }]}
          placeholder={t('rut_ph_nuevo_iti')}
          placeholderTextColor="#bbb"
          value={nuevoNombreIti}
          onChangeText={setNuevoNombreIti}
        />
        <TouchableOpacity
          style={[s.modalBtnCrear, !nuevoNombreIti.trim() && { opacity: 0.4 }]}
          onPress={() => { bottomSheetRef.current?.dismiss(); crearItiYAgregar(); }}
          disabled={!nuevoNombreIti.trim()}
        >
          <Text style={s.modalBtnCrearTxt}>{t('rut_crear_y_agregar')}</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
