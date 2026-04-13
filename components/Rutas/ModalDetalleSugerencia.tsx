import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
    BottomSheetView,
} from '@gorhom/bottom-sheet';

import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ImageSourcePropType,
    Image as RNImage,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Paquete, PAQUETES_POR_ESTADO, Sugerencia } from '../../lib/constantes';
import { s } from '../../lib/estilos_rutas';
import { useTemaContext } from '../../lib/TemaContext';
import { TraduccionClave } from '../../lib/traducciones';

interface Props {
  visible: boolean;
  onClose: () => void;
  rutaDetalle: Sugerencia | null;
  idioma: 'es' | 'en';
  t: (clave: TraduccionClave, vars?: Record<string, string | number> | undefined) => string;
  colorNivel: (nivel: string, opacity?: number) => string;
  imagenDeEstado: (estado: string) => ImageSourcePropType;
  iniciarAgregarSugerida: (ruta: Sugerencia) => void;
}

export function ModalDetalleSugerencia({
  visible,
  onClose,
  rutaDetalle,
  idioma: _idioma,
  t,
  colorNivel,
  imagenDeEstado,
  iniciarAgregarSugerida,
}: Props) {
  const { tema } = useTemaContext();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%', '95%'], []);

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

  // CACHE + SEGURIDAD + DEPENDENCIAS CORRECTAS
  const { paquete, imagenes } = useMemo(() => {
    if (!rutaDetalle) { return { paquete: null, imagenes: [] }; }

    const paqList =
      PAQUETES_POR_ESTADO[rutaDetalle.estado] ??
      PAQUETES_POR_ESTADO.default ??
      [];

    const paqueteEncontrado =
      paqList.find((p: Paquete) => p.nivel === rutaDetalle.nivel) ??
      paqList[0] ??
      null;

    let imgs: string[] = [];

    // Usar la imagen del rutaDetalle (URL de Unsplash) como imagen principal
    if (rutaDetalle.imagen) {
      if (typeof rutaDetalle.imagen === 'string') {
        imgs = [rutaDetalle.imagen];
      } else {
        // Si es un require(), intentar obtener el URI
        const asset = RNImage.resolveAssetSource(rutaDetalle.imagen);
        if (asset?.uri) {
          imgs = [asset.uri];
        }
      }
    } else if (paqueteEncontrado?.imagenesHotel?.length) {
      // Fallback a imágenes del paquete si no hay imagen en rutaDetalle
      imgs = paqueteEncontrado.imagenesHotel;
    } else {
      // Último fallback: imagen del estado
      const asset = RNImage.resolveAssetSource(
        imagenDeEstado(rutaDetalle.estado)
      );
      if (asset?.uri) {
        imgs = [asset.uri];
      }
    }

    return {
      paquete: paqueteEncontrado,
      imagenes: imgs,
    };
  }, [rutaDetalle, imagenDeEstado]);

  if (!rutaDetalle) { return null; }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: tema.superficieBlanca }}
      handleIndicatorStyle={{ backgroundColor: tema.borde }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        
        {/* Carousel optimizado */}
        <BottomSheetScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={s.modalCarousel}
        >
          {imagenes.map((img: string, idx: number) => (
            <ExpoImage
              key={`${rutaDetalle.estado}-${rutaDetalle.nivel}-${idx}`}
              source={{ uri: img }}
              style={s.modalImgHeader}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"        // cache real
              recyclingKey={`${idx}`}          // evita bugs en scroll
            />
          ))}
        </BottomSheetScrollView>

        {/* Nivel */}
        <View
          style={[
            s.modalNivelBadge,
            { backgroundColor: colorNivel(rutaDetalle.nivel) },
          ]}
        >
          <Text style={s.modalNivelTxt}>{rutaDetalle.nivel}</Text>
        </View>

        {/* Contenido */}
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 420, paddingHorizontal: 20, paddingTop: 10 }}
        >
          <Text style={[s.modalTitulo, { color: tema.texto }]}>{rutaDetalle.titulo}</Text>
          <Text style={[s.modalEstado, { color: tema.textoMuted }]}> {rutaDetalle.estado}</Text>

          {/* Tags */}
          {rutaDetalle.estilo && (
            <View style={s.modalTagRow}>
              {(rutaDetalle.estilo as string)
                .split(',')
                .map((tag: string, i: number) => (
                  <View key={i} style={[s.modalTag, { backgroundColor: tema.superficie }]}>
                    <Text style={[s.modalTagTxt, { color: tema.textoSecundario }]}>{tag.trim()}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Resumen */}
          <View style={s.modalResumenFila}>
            <View style={[s.modalResumenCard, { backgroundColor: tema.superficie }]}>
              <Text style={[s.modalResumenEyebrow, { color: tema.textoMuted }]}>
                {t('rut_costo_persona')}
              </Text>
              <Text style={[s.modalResumenValor, { color: tema.texto }]}>
                {paquete?.precioTotal ?? '-'}
              </Text>
            </View>

            <View style={[s.modalResumenCard, { backgroundColor: tema.superficie }]}>
              <Text style={[s.modalResumenEyebrow, { color: tema.textoMuted }]}>Duración</Text>
              <Text style={[s.modalResumenValor, { color: tema.texto }]}>
                {paquete?.diasRecomendados ?? 0}{' '}
                {t(
                  (paquete?.diasRecomendados ?? 0) === 1
                    ? 'rut_dia_singular'
                    : 'rut_dia_plural'
                )}
              </Text>
            </View>
          </View>

          {/* Alojamiento */}
          <View style={[s.modalSeccion, { backgroundColor: tema.superficie }]}>
            <Text style={[s.modalSeccionTitulo, { color: tema.textoMuted }]}>
               {t('rut_alojamiento')}
            </Text>
            <Text style={[s.modalSeccionVal, { color: tema.texto }]}>
              {paquete?.hotel ?? rutaDetalle.hotel}
            </Text>
          </View>
        </BottomSheetScrollView>

        {/* Botón */}
        <TouchableOpacity
          style={[s.modalBtnAgregar, { marginHorizontal: 20, marginBottom: 10 }]}
          onPress={() => {
            bottomSheetRef.current?.dismiss();
            iniciarAgregarSugerida(rutaDetalle);
          }}
        >
          <Text style={s.modalBtnAgregarTxt}>
             Agregar a un itinerario
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}