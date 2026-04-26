/**
 * DetalleReservaModal — modal completo de una reserva con:
 *  • Cabecera estado + folio
 *  • Datos del viaje
 *  • Política de cancelación dinámica
 *  • Botón compartir (Share API)
 *  • Botón agregar al calendario (.ics vía Share)
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTemaContext } from '../lib/TemaContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type ReservaDetalle = {
  id: number;
  folio: string;
  destino: string;
  paquete: string;
  fecha: string;       // ISO o DD/MM/YYYY
  personas: number;
  total: number;
  metodo: string;
  estado: string;
  notas?: string;
};

interface Props {
  reserva: ReservaDetalle | null;
  visible: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseFecha(fecha: string): Date | null {
  if (!fecha) return null;
  // ISO → Date
  if (fecha.includes('T') || fecha.includes('-')) {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY
  const [dd, mm, yyyy] = fecha.split('/');
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return isNaN(d.getTime()) ? null : d;
}

function formatearFechaLarga(fecha: string): string {
  const d = parseFecha(fecha);
  if (!d) return fecha;
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function diasHastaViaje(fecha: string): number {
  const d = parseFecha(fecha);
  if (!d) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ms = d.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function politicaCancelacion(dias: number): {
  titulo: string;
  descripcion: string;
  color: string;
  icono: 'checkmark-circle' | 'alert-circle' | 'close-circle' | 'information-circle';
} {
  if (dias > 30) return {
    titulo: 'Cancelación gratuita',
    descripcion: 'Puedes cancelar sin costo hasta 30 días antes de tu viaje.',
    color: '#3AB7A5',
    icono: 'checkmark-circle',
  };
  if (dias > 14) return {
    titulo: 'Cancelación con 25% de cargo',
    descripcion: 'Entre 15 y 30 días antes del viaje aplica un cargo del 25% del total.',
    color: '#f5a623',
    icono: 'alert-circle',
  };
  if (dias > 7) return {
    titulo: 'Cancelación con 50% de cargo',
    descripcion: 'Entre 8 y 14 días antes aplica un cargo del 50% del total.',
    color: '#f5a623',
    icono: 'alert-circle',
  };
  if (dias >= 0) return {
    titulo: 'Sin reembolso',
    descripcion: 'A menos de 7 días del viaje no aplican reembolsos.',
    color: '#DD331D',
    icono: 'close-circle',
  };
  return {
    titulo: 'Viaje ya realizado',
    descripcion: 'Este viaje ya ocurrió. Gracias por viajar con Mexcursión.',
    color: '#888',
    icono: 'information-circle',
  };
}

function generarICS(r: ReservaDetalle): string {
  const d = parseFecha(r.fecha);
  const ymd = d
    ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    : '20251231';
  const dNext = d ? new Date(d.getTime() + 86_400_000) : null;
  const ymdNext = dNext
    ? `${dNext.getFullYear()}${String(dNext.getMonth() + 1).padStart(2, '0')}${String(dNext.getDate()).padStart(2, '0')}`
    : '20260101';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mexcursión//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${ymd}`,
    `DTEND;VALUE=DATE:${ymdNext}`,
    `SUMMARY:✈️ Viaje a ${r.destino}`,
    `DESCRIPTION:Folio: ${r.folio}\\nPaquete: ${r.paquete}\\nPersonas: ${r.personas}\\nTotal: $${r.total.toLocaleString()} MXN`,
    `LOCATION:${r.destino}\\, México`,
    'STATUS:CONFIRMED',
    `UID:${r.folio}@mexcursion.app`,
    'PRIORITY:5',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const METODO_LABEL: Record<string, string> = {
  tarjeta: '💳 Tarjeta',
  spei:    '🏦 SPEI',
  oxxo:    '🏪 OXXO Pay',
};

const COLOR_ESTADO: Record<string, { fondo: string; texto: string; etiqueta: string }> = {
  confirmada: { fondo: '#e8f8f5', texto: '#3AB7A5', etiqueta: '✓ Confirmada'   },
  pendiente:  { fondo: '#fff8e1', texto: '#b8860b', etiqueta: '⏳ Pendiente'    },
  completada: { fondo: '#f0f0f0', texto: '#888',    etiqueta: '✔ Completada'   },
  cancelada:  { fondo: '#fef0f0', texto: '#DD331D', etiqueta: '✕ Cancelada'    },
};

// ── Componente ────────────────────────────────────────────────────────────────
export function DetalleReservaModal({ reserva, visible, onClose }: Props) {
  const { tema, isDark } = useTemaContext();
  const { bottom } = useSafeAreaInsets();

  const dias = useMemo(() => reserva ? diasHastaViaje(reserva.fecha) : 0, [reserva]);
  const politica = useMemo(() => politicaCancelacion(dias), [dias]);
  const est = reserva ? (COLOR_ESTADO[reserva.estado] ?? { fondo: '#f5f5f5', texto: '#888', etiqueta: reserva.estado }) : null;

  const compartirReserva = async () => {
    if (!reserva) return;
    try {
      await Share.share({
        title: `Reserva ${reserva.folio} — Mexcursión`,
        message:
          `🌮 *Mi reserva en Mexcursión*\n\n` +
          `📍 Destino: ${reserva.destino}\n` +
          `📋 Folio: ${reserva.folio}\n` +
          `📅 Fecha: ${formatearFechaLarga(reserva.fecha)}\n` +
          `👥 Personas: ${reserva.personas}\n` +
          `💰 Total: $${reserva.total.toLocaleString()} MXN\n\n` +
          `¡Descubre México con Mexcursión! 🇲🇽`,
      });
    } catch { /* silencioso */ }
  };

  const agregarAlCalendario = async () => {
    if (!reserva) return;
    const ics = generarICS(reserva);
    try {
      await Share.share({
        title: `Viaje a ${reserva.destino} — Mexcursión`,
        message: ics,
        // En iOS, `url` con data: URI sería ideal, pero Share.share con message funciona
        // en la mayoría de apps que aceptan texto plano .ics
      });
    } catch { /* silencioso */ }
  };

  const copiarFolio = () => {
    if (!reserva) return;
    Alert.alert(
      'Folio copiado',
      reserva.folio,
      [{ text: 'OK' }]
    );
  };

  if (!reserva) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <TouchableOpacity
        style={es.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Panel */}
      <View style={[es.panel, { backgroundColor: tema.superficieBlanca, paddingBottom: Math.max(bottom, 20) }]}>
        {/* Handle */}
        <View style={[es.handle, { backgroundColor: tema.borde }]} />

        {/* Header */}
        <View style={es.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[es.titDestino, { color: tema.texto }]} numberOfLines={1}>
              {reserva.destino}
            </Text>
            <Text style={[es.subPaquete, { color: tema.textoMuted }]}>
              Paquete {reserva.paquete}
            </Text>
          </View>
          {est && (
            <View style={[es.badge, { backgroundColor: est.fondo }]}>
              <Text style={[es.badgeTxt, { color: est.texto }]}>{est.etiqueta}</Text>
            </View>
          )}
          <TouchableOpacity style={es.btnCerrar} onPress={onClose}>
            <Ionicons name="close" size={20} color={tema.textoMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={es.scroll}>

          {/* Folio */}
          <View style={[es.folioBox, { backgroundColor: isDark ? '#1e3a38' : '#e8f8f5', borderColor: '#3AB7A5' }]}>
            <Text style={[es.folioLabel, { color: '#3AB7A5' }]}>FOLIO DE RESERVA</Text>
            <Text style={[es.folio, { color: tema.texto }]} selectable>{reserva.folio}</Text>
            <TouchableOpacity style={es.btnCopiar} onPress={copiarFolio} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={14} color="#3AB7A5" />
              <Text style={es.txtCopiar}>Ver folio</Text>
            </TouchableOpacity>
          </View>

          {/* Datos del viaje */}
          <View style={[es.seccion, { borderColor: tema.borde }]}>
            <Text style={[es.seccionTitulo, { color: tema.texto }]}>📋 Datos del viaje</Text>
            <View style={es.cuadricula}>
              <DatoItem label="Fecha" valor={formatearFechaLarga(reserva.fecha)} tema={tema} />
              <DatoItem label="Personas" valor={String(reserva.personas)} tema={tema} />
              <DatoItem label="Total" valor={`$${reserva.total.toLocaleString()} MXN`} colorValor="#3AB7A5" tema={tema} />
              <DatoItem label="Método" valor={METODO_LABEL[reserva.metodo] ?? reserva.metodo} tema={tema} />
            </View>
            {!!reserva.notas && (
              <View style={[es.notaBox, { backgroundColor: tema.superficie, borderLeftColor: '#3AB7A5' }]}>
                <Text style={[es.notaLabel, { color: '#3AB7A5' }]}>📝 Notas del viajero</Text>
                <Text style={[es.notaTxt, { color: tema.textoSecundario }]}>{reserva.notas}</Text>
              </View>
            )}
          </View>

          {/* Política de cancelación */}
          {reserva.estado !== 'cancelada' && reserva.estado !== 'completada' && (
            <View style={[es.seccion, { borderColor: tema.borde }]}>
              <Text style={[es.seccionTitulo, { color: tema.texto }]}>📜 Política de cancelación</Text>
              <View style={[es.politicaBox, { backgroundColor: isDark ? '#1a1a1a' : '#fafafa', borderColor: politica.color + '44' }]}>
                <View style={es.politicaHeader}>
                  <Ionicons name={politica.icono} size={20} color={politica.color} />
                  <Text style={[es.politicaTitulo, { color: politica.color }]}>{politica.titulo}</Text>
                </View>
                <Text style={[es.politicaDesc, { color: tema.textoSecundario }]}>{politica.descripcion}</Text>
                {dias > 0 && (
                  <Text style={[es.politicaDias, { color: tema.textoMuted }]}>
                    Faltan {dias} día{dias !== 1 ? 's' : ''} para tu viaje
                  </Text>
                )}
              </View>
              <View style={es.politicaReglas}>
                {[
                  { rango: '> 30 días',   cargo: 'Sin cargo',   activo: dias > 30  },
                  { rango: '15–30 días',  cargo: '25%',         activo: dias > 14 && dias <= 30 },
                  { rango: '8–14 días',   cargo: '50%',         activo: dias > 7  && dias <= 14 },
                  { rango: '< 7 días',    cargo: 'Sin reembolso', activo: dias >= 0 && dias <= 7 },
                ].map(({ rango, cargo, activo }) => (
                  <View key={rango} style={[es.reglaFila, activo && { backgroundColor: isDark ? '#2a3f3f' : '#f0faf9' }]}>
                    <Text style={[es.reglaRango, { color: tema.textoMuted }, activo && { color: '#3AB7A5', fontWeight: '700' }]}>{rango}</Text>
                    <Text style={[es.reglaCargo, { color: tema.textoSecundario }, activo && { color: politica.color, fontWeight: '700' }]}>{cargo}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Acciones */}
          <View style={es.acciones}>
            <TouchableOpacity style={[es.btnAccion, { borderColor: '#3AB7A5' }]} onPress={compartirReserva} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={18} color="#3AB7A5" />
              <Text style={[es.btnAccionTxt, { color: '#3AB7A5' }]}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[es.btnAccion, { borderColor: tema.borde }]} onPress={agregarAlCalendario} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={18} color={tema.textoSecundario} />
              <Text style={[es.btnAccionTxt, { color: tema.textoSecundario }]}>Calendario</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Sub-componente DatoItem ───────────────────────────────────────────────────
function DatoItem({ label, valor, colorValor, tema }: { label: string; valor: string; colorValor?: string; tema: any }) {
  return (
    <View style={es.datoItem}>
      <Text style={[es.datoLabel, { color: tema.textoMuted }]}>{label}</Text>
      <Text style={[es.datoValor, { color: colorValor ?? tema.texto }]}>{valor}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const es = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 20 },
      default: { elevation: 24 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  titDestino: { fontSize: 18, fontWeight: '800' },
  subPaquete: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  btnCerrar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },

  folioBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  folioLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  folio: { fontSize: 24, fontWeight: '800', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  btnCopiar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  txtCopiar: { fontSize: 12, color: '#3AB7A5', fontWeight: '600' },

  seccion: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  seccionTitulo: { fontSize: 14, fontWeight: '700' },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  datoItem: { minWidth: '44%', flex: 1 },
  datoLabel: { fontSize: 11, marginBottom: 2 },
  datoValor: { fontSize: 14, fontWeight: '700' },

  notaBox: { borderRadius: 10, padding: 10, borderLeftWidth: 3 },
  notaLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  notaTxt: { fontSize: 13, lineHeight: 18 },

  politicaBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  politicaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  politicaTitulo: { fontSize: 14, fontWeight: '700' },
  politicaDesc: { fontSize: 13, lineHeight: 18 },
  politicaDias: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  politicaReglas: { borderRadius: 10, overflow: 'hidden', gap: 1 },
  reglaFila: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  reglaRango: { fontSize: 12 },
  reglaCargo: { fontSize: 12 },

  acciones: { flexDirection: 'row', gap: 12 },
  btnAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  btnAccionTxt: { fontSize: 14, fontWeight: '600' },
});
