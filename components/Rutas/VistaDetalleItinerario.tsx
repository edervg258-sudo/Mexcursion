import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
    FlatList,
    ImageSourcePropType,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { s } from '../../lib/estilos_rutas';
import { Itinerario } from '../../lib/supabase-db';
import { Tema } from '../../lib/tema';
import { TraduccionClave } from '../../lib/traducciones';
import { TabChrome } from '../TabChrome';

type ItinerarioItem = { clave: string; titulo: string; estado: string; nivel: string };

// ─────────────────────────────────────────────────────────────
// Chip de estadística
// ─────────────────────────────────────────────────────────────
const StatChip = ({ emoji, label }: { emoji: string; label: string }) => (
  <View style={s.statChip}>
    <Text style={s.statEmoji}>{emoji}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

interface Props {
  esPC: boolean;
  itinerarioActivo: Itinerario;
  setItinerarioActivo: (iti: Itinerario | null) => void;
  items: ItinerarioItem[];
  costoTotal: number;
  diasTotales: number;
  nivelTop: string;
  compartirItinerario: (items: ItinerarioItem[], nombre: string) => void;
  handleEliminarItinerario: (id: number) => void;
  handleQuitarItem: (clave: string) => void;
  moverItem: (idx: number, dir: -1 | 1) => void;
  colorNivel: (nivel: string, opacity?: number) => string;
  imagenDeEstado: (estado: string) => ImageSourcePropType;
  t: (clave: TraduccionClave, vars?: Record<string, string | number>) => string;
}

export function VistaDetalleItinerario({
  esPC,
  itinerarioActivo,
  setItinerarioActivo,
  items,
  costoTotal,
  diasTotales,
  nivelTop,
  compartirItinerario,
  handleEliminarItinerario,
  handleQuitarItem,
  moverItem,
  colorNivel,
  imagenDeEstado,
  t,
}: Props) {

  // 🔹 Botón notificaciones
  const botonNotificaciones = (
    <TouchableOpacity
      style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FAF7F0',
        borderWidth: 1.5,
        borderColor: '#3AB7A5',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
      }}
      onPress={() => setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0)}
    >
      <ExpoImage
        source={require('../../assets/images/notificaciones.png')}
        style={{ width: 28, height: 28 }}
        contentFit="contain"
      />
    </TouchableOpacity>
  );

  // 🔥 renderItem optimizado
  const renderItem = useCallback(
    ({ item, index }: { item: ItinerarioItem; index: number }) => (
      <View style={s.tarjetaItem}>
        {index < items.length - 1 && <View style={s.lineaTimeline} />}

        <View style={[s.burbujaPaso, { borderColor: colorNivel(item.nivel) }]}>
          <Text style={[s.textoBurbuja, { color: colorNivel(item.nivel) }]}>
            {index + 1}
          </Text>
        </View>

        <View style={s.cuerpoItem}>
          <ExpoImage
            source={imagenDeEstado(item.estado)}
            style={s.imgItem}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={item.clave}
          />

          <View style={s.infoItem}>
            <Text style={s.tituloItem} numberOfLines={1}>
              {item.titulo}
            </Text>
            <Text style={s.estadoItem}>{item.estado}</Text>

            <View
              style={[
                s.chipNivel,
                { backgroundColor: colorNivel(item.nivel, 0.15) },
              ]}
            >
              <Text
                style={[s.chipNivelTxt, { color: colorNivel(item.nivel) }]}
              >
                {item.nivel}
              </Text>
            </View>
          </View>

          <View style={s.controlesItem}>
            {index > 0 && (
              <Pressable onPress={() => moverItem(index, -1)} style={s.btnMover}>
                <Text style={s.btnMoverTxt}>↑</Text>
              </Pressable>
            )}

            {index < items.length - 1 && (
              <Pressable onPress={() => moverItem(index, 1)} style={s.btnMover}>
                <Text style={s.btnMoverTxt}>↓</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => handleQuitarItem(item.clave)}
              style={s.btnEliminar}
            >
              <Text style={s.btnEliminarTxt}>✕</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [items.length, colorNivel, moverItem, handleQuitarItem, imagenDeEstado]
  );

  return (
    <TabChrome
      esPC={esPC}
      title={itinerarioActivo.nombre}
      onBack={() => setItinerarioActivo(null)}
      headerRight={botonNotificaciones}
    >
      <View style={{ flex: 1 }}>

        {/* 📊 Stats */}
        {items.length > 0 && (
          <View style={s.statsBanner}>
            <StatChip
              emoji="📍"
              label={`${items.length} ${
                items.length === 1 ? t('rut_destino') : t('rut_destinos')
              }`}
            />
            <View style={s.statDivisor} />
            <StatChip emoji="⌛" label={`~${diasTotales} días`} />
            <View style={s.statDivisor} />
            <StatChip emoji="💰" label={`$${costoTotal.toLocaleString()} MXN`} />
            <View style={s.statDivisor} />
            <StatChip emoji="✨" label={nivelTop} />
          </View>
        )}

        {/* 🧾 Acciones */}
        <View style={s.accionesBarra}>
          <TouchableOpacity
            style={s.accionBtn}
            onPress={() =>
              compartirItinerario(items, itinerarioActivo.nombre)
            }
          >
            <Text style={s.accionBtnTxt}>{t('rut_compartir_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.accionBtn, s.accionBtnDanger]}
            onPress={() =>
              handleEliminarItinerario(itinerarioActivo.id)
            }
          >
            <Text style={[s.accionBtnTxt, { color: Tema.acento }]}>
              {t('rut_borrar_viaje_btn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 📭 Vacío */}
        {items.length === 0 ? (
          <View style={s.vacio}>
            <Text style={s.textoVacioEmoji}>✈️</Text>
            <Text style={s.tituloVacio}>{t('rut_viaje_vacio')}</Text>
            <Text style={s.subtituloVacio}>
              {t('rut_viaje_vacio_msg')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.clave}
            renderItem={renderItem}
            contentContainerStyle={s.listaItems}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}

            // 🔥 OPTIMIZACIONES CLAVE
            removeClippedSubviews
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        )}
      </View>
    </TabChrome>
  );
}