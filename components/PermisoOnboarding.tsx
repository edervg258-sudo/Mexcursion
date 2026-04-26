/**
 * PermisoOnboarding — modal "pre-permiso" que explica para qué se usa
 * una capacidad del dispositivo ANTES de que el SO muestre el diálogo nativo.
 *
 * Uso:
 *   <PermisoOnboarding
 *     visible={mostrar}
 *     tipo="notificaciones"
 *     onAceptar={() => { setMostrar(false); registrarParaPush(uid); }}
 *     onRechazar={() => setMostrar(false)}
 *   />
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTemaContext } from '../lib/TemaContext';

export type TipoPermiso = 'notificaciones' | 'ubicacion';

interface Props {
  visible: boolean;
  tipo: TipoPermiso;
  onAceptar: () => void;
  onRechazar: () => void;
}

type ConfigPermiso = {
  emoji: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  descripcion: string;
  beneficios: string[];
  btnAceptar: string;
};

const CONFIG: Record<TipoPermiso, ConfigPermiso> = {
  notificaciones: {
    emoji: '🔔',
    icono: 'notifications-outline',
    titulo: 'Activa las notificaciones',
    descripcion: 'Mantente al tanto de tu próximo viaje y no te pierdas nada importante.',
    beneficios: [
      'Confirmación de reserva al instante',
      'Recordatorios de tu fecha de viaje',
      'Alertas de cambios o actualizaciones',
    ],
    btnAceptar: 'Activar notificaciones',
  },
  ubicacion: {
    emoji: '📍',
    icono: 'location-outline',
    titulo: 'Usa tu ubicación',
    descripcion: 'Encontramos los destinos más cercanos a ti y estimamos tiempos de traslado.',
    beneficios: [
      'Destinos populares cerca de ti',
      'Tiempo estimado de viaje',
      'Rutas personalizadas a tu ubicación',
    ],
    btnAceptar: 'Permitir ubicación',
  },
};

export function PermisoOnboarding({ visible, tipo, onAceptar, onRechazar }: Props) {
  const { tema, isDark } = useTemaContext();
  const { bottom } = useSafeAreaInsets();
  const cfg = CONFIG[tipo];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRechazar}
      statusBarTranslucent
    >
      {/* Overlay oscuro */}
      <TouchableOpacity style={es.overlay} activeOpacity={1} onPress={onRechazar} />

      {/* Panel */}
      <View
        style={[
          es.panel,
          { backgroundColor: tema.superficieBlanca, paddingBottom: Math.max(bottom, 24) },
        ]}
      >
        {/* Handle */}
        <View style={[es.handle, { backgroundColor: tema.borde }]} />

        {/* Ícono grande */}
        <View style={[es.iconoCirculo, { backgroundColor: isDark ? '#1e3a38' : '#e8f8f5' }]}>
          <Text style={es.emoji}>{cfg.emoji}</Text>
        </View>

        {/* Textos */}
        <Text style={[es.titulo, { color: tema.texto }]}>{cfg.titulo}</Text>
        <Text style={[es.descripcion, { color: tema.textoMuted }]}>{cfg.descripcion}</Text>

        {/* Beneficios */}
        <View style={[es.listaBeneficios, { backgroundColor: isDark ? '#1a1a1a' : '#f8fffe', borderColor: isDark ? '#2a4a48' : '#d1ede9' }]}>
          {cfg.beneficios.map((b, i) => (
            <View key={i} style={es.filaBeneficio}>
              <Ionicons name="checkmark-circle" size={16} color="#3AB7A5" />
              <Text style={[es.textoBeneficio, { color: tema.textoSecundario }]}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Privacidad */}
        <Text style={[es.privacidad, { color: tema.textoMuted }]}>
          🔒 Tus datos nunca se comparten con terceros.
        </Text>

        {/* Botones */}
        <TouchableOpacity style={es.btnAceptar} onPress={onAceptar} activeOpacity={0.85}>
          <Ionicons name={cfg.icono} size={18} color="#fff" />
          <Text style={es.txtAceptar}>{cfg.btnAceptar}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={es.btnRechazar} onPress={onRechazar} activeOpacity={0.7}>
          <Text style={[es.txtRechazar, { color: tema.textoMuted }]}>Ahora no</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const es = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 },
      default: { elevation: 24 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  iconoCirculo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 36 },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  descripcion: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  listaBeneficios: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  filaBeneficio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textoBeneficio: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  privacidad: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  btnAceptar: {
    width: '100%',
    backgroundColor: '#3AB7A5',
    borderRadius: 25,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    ...Platform.select({
      ios:     { shadowColor: '#3AB7A5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      default: { elevation: 4 },
    }),
  },
  txtAceptar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnRechazar: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  txtRechazar: {
    fontSize: 14,
    fontWeight: '600',
  },
});
