// ============================================================
//  components/Admin/SeccionSalud.tsx  —  Dashboard de salud del sistema
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTemaContext } from '../../lib/TemaContext';
import {
  AlertasSalud,
  fetchLogsRecientes,
  fetchMetricasReservas,
  fetchSaludSistema,
  LogEntry,
  MetricasReservas,
  pingSupabase,
  UMBRALES_ALERTA,
} from '../../lib/observability';

// ─── Tipos locales ─────────────────────────────────────────

interface LogRow extends LogEntry {
  id: number;
  created_at: string;
}

interface EstadoConexion {
  db: number | null;   // latencia ms, null = error
  auth: boolean;
}

// ─── Helpers visuales ──────────────────────────────────────

const colorNivel: Record<string, string> = {
  error:   '#DD331D',
  warning: '#e9c46a',
  info:    '#3AB7A5',
  debug:   '#94a3b8',
};

const etiquetaNivel: Record<string, string> = {
  error:   'ERROR',
  warning: 'WARN',
  info:    'INFO',
  debug:   'DEBUG',
};

const formatMs = (ms: number | null | undefined): string => {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

const formatHora = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
};

// ─── Sub-componentes ───────────────────────────────────────

function TarjetaMetrica({
  label, valor, unidad, alerta, tema,
}: { label: string; valor: string | number; unidad?: string; alerta?: boolean; tema: ReturnType<typeof useTemaContext>['tema'] }) {
  return (
    <View style={[
      s.tarjeta,
      {
        backgroundColor: alerta
          ? (tema.fondo === '#fff' ? '#FEF0EE' : '#2A1210')
          : tema.superficieBlanca,
        borderColor: alerta ? '#DD331D44' : tema.borde,
      },
    ]}>
      <Text style={[s.tarjetaLabel, { color: tema.textoMuted }]}>{label}</Text>
      <Text style={[s.tarjetaValor, { color: alerta ? '#DD331D' : tema.texto }]}>
        {valor}{unidad ? <Text style={{ fontSize: 12, color: tema.textoMuted }}> {unidad}</Text> : null}
      </Text>
    </View>
  );
}

function BadgeEstado({ ok, labelOk, labelFail }: { ok: boolean; labelOk: string; labelFail: string }) {
  return (
    <View style={[
      s.badge,
      { backgroundColor: ok ? '#E8F5F2' : '#FEF0EE', borderColor: ok ? '#3AB7A5' : '#DD331D' },
    ]}>
      <View style={[s.badgeDot, { backgroundColor: ok ? '#3AB7A5' : '#DD331D' }]} />
      <Text style={[s.badgeTxt, { color: ok ? '#3AB7A5' : '#DD331D' }]}>
        {ok ? labelOk : labelFail}
      </Text>
    </View>
  );
}

// ─── Componente principal ──────────────────────────────────

export function SeccionSalud() {
  const { tema, isDark } = useTemaContext();

  const [cargando, setCargando]   = useState(true);
  const [refresco, setRefresco]   = useState(false);

  const [salud, setSalud]         = useState<AlertasSalud | null>(null);
  const [metricas, setMetricas]   = useState<MetricasReservas | null>(null);
  const [logs, setLogs]           = useState<LogRow[]>([]);
  const [conexion, setConexion]   = useState<EstadoConexion>({ db: null, auth: false });

  const cargar = useCallback(async () => {
    const [saludData, metricasData, logsData, pingMs] = await Promise.all([
      fetchSaludSistema(),
      fetchMetricasReservas(),
      fetchLogsRecientes(30),
      pingSupabase(),
    ]);
    setSalud(saludData);
    setMetricas(metricasData);
    setLogs(logsData as LogRow[]);
    setConexion({ db: pingMs, auth: pingMs !== null });
  }, []);

  useEffect(() => {
    setCargando(true);
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  const onRefresh = async () => {
    setRefresco(true);
    await cargar();
    setRefresco(false);
  };

  const alertaErrores1h    = (salud?.errores_1h    ?? 0) > UMBRALES_ALERTA.errores_1h;
  const alertaErrores24h   = (salud?.errores_24h   ?? 0) > UMBRALES_ALERTA.errores_24h;
  const alertaBookingLento = (metricas?.duracion_p95_ms ?? 0) > UMBRALES_ALERTA.booking_lento_ms;

  const hayAlertas = alertaErrores1h || alertaErrores24h || alertaBookingLento;

  if (cargando) {
    return (
      <View style={[s.centrado, { backgroundColor: tema.fondo }]}>
        <ActivityIndicator size="large" color={tema.primario} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { backgroundColor: tema.fondo }]}
      refreshControl={<RefreshControl refreshing={refresco} onRefresh={onRefresh} tintColor={tema.primario} />}
    >
      {/* ── Banner de alertas activas ── */}
      {hayAlertas && (
        <View style={[s.bannerAlerta, { backgroundColor: isDark ? '#2A1210' : '#FEF0EE', borderColor: '#DD331D44' }]}>
          <Text style={s.bannerAlertaIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerAlertaTitulo, { color: '#DD331D' }]}>Alertas activas</Text>
            {alertaErrores1h  && <Text style={[s.bannerAlertaMsg, { color: '#DD331D' }]}>• Más de {UMBRALES_ALERTA.errores_1h} errores en la última hora ({salud?.errores_1h})</Text>}
            {alertaErrores24h && <Text style={[s.bannerAlertaMsg, { color: '#DD331D' }]}>• Más de {UMBRALES_ALERTA.errores_24h} errores en 24h ({salud?.errores_24h})</Text>}
            {alertaBookingLento && <Text style={[s.bannerAlertaMsg, { color: '#DD331D' }]}>• P95 de reservas supera {UMBRALES_ALERTA.booking_lento_ms / 1000}s ({formatMs(metricas?.duracion_p95_ms)})</Text>}
          </View>
        </View>
      )}

      {/* ── Estado de conexiones ── */}
      <Text style={[s.seccionTitulo, { color: tema.texto }]}>Conexiones</Text>
      <View style={s.fila}>
        <BadgeEstado ok={conexion.auth} labelOk="Supabase OK" labelFail="Supabase ✗" />
        <BadgeEstado ok={conexion.db !== null} labelOk={`DB ${formatMs(conexion.db)}`} labelFail="DB ✗" />
      </View>

      {/* ── Métricas de errores ── */}
      <Text style={[s.seccionTitulo, { color: tema.texto, marginTop: 20 }]}>Errores</Text>
      <View style={s.grid}>
        <TarjetaMetrica label="Última hora"  valor={salud?.errores_1h    ?? '—'} alerta={alertaErrores1h}  tema={tema} />
        <TarjetaMetrica label="Últimas 24h"  valor={salud?.errores_24h   ?? '—'} alerta={alertaErrores24h} tema={tema} />
        <TarjetaMetrica label="Advertencias" valor={salud?.advertencias_24h ?? '—'} tema={tema} />
        <TarjetaMetrica
          label="Feature crítica"
          valor={salud?.feature_mas_errores ?? 'Ninguna'}
          alerta={!!salud?.feature_mas_errores}
          tema={tema}
        />
      </View>

      {/* ── Tracing de reservas ── */}
      <Text style={[s.seccionTitulo, { color: tema.texto, marginTop: 20 }]}>Tracing — Reservas</Text>
      {metricas && metricas.total_mediciones > 0 ? (
        <View style={s.grid}>
          <TarjetaMetrica label="Duración media" valor={formatMs(metricas.duracion_media_ms)} tema={tema} />
          <TarjetaMetrica label="P95"             valor={formatMs(metricas.duracion_p95_ms)}  alerta={alertaBookingLento} tema={tema} />
          <TarjetaMetrica label="Máximo"          valor={formatMs(metricas.duracion_max_ms)}  tema={tema} />
          <TarjetaMetrica label="Mediciones (24h)" valor={metricas.mediciones_24h} tema={tema} />
        </View>
      ) : (
        <Text style={[s.sinDatos, { color: tema.textoMuted }]}>
          Sin datos aún — se registran automáticamente al crear reservas.
        </Text>
      )}

      {/* ── Logs recientes ── */}
      <View style={[s.logsHeader, { marginTop: 20 }]}>
        <Text style={[s.seccionTitulo, { color: tema.texto }]}>Logs recientes</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={[s.btnActualizar, { color: tema.primario }]}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <Text style={[s.sinDatos, { color: tema.textoMuted }]}>
          Sin logs — aparecerán warnings y errores en producción.
        </Text>
      ) : (
        <View style={[s.logsContenedor, { backgroundColor: isDark ? '#0D1412' : '#0f172a', borderColor: tema.borde }]}>
          {logs.map(log => (
            <View key={log.id} style={[s.logFila, { borderBottomColor: '#1e293b' }]}>
              <View style={[s.logNivelBadge, { backgroundColor: colorNivel[log.level] + '22', borderColor: colorNivel[log.level] + '55' }]}>
                <Text style={[s.logNivelTxt, { color: colorNivel[log.level] }]}>
                  {etiquetaNivel[log.level]}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.logMensaje} numberOfLines={2}>{log.message}</Text>
                <Text style={s.logMeta}>
                  {log.feature ? `[${log.feature}] ` : ''}{formatHora(log.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ─── Estilos ───────────────────────────────────────────────

const s = StyleSheet.create({
  scroll:           { padding: 16, gap: 4 },
  centrado:         { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bannerAlerta:     { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' },
  bannerAlertaIcon: { fontSize: 20 },
  bannerAlertaTitulo:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bannerAlertaMsg:  { fontSize: 12, fontWeight: '500', lineHeight: 18 },

  seccionTitulo:    { fontSize: 15, fontWeight: '700', marginBottom: 10 },

  fila:             { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  badge:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  badgeDot:         { width: 7, height: 7, borderRadius: 4 },
  badgeTxt:         { fontSize: 12, fontWeight: '600' },

  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  tarjeta:          { width: '47%', borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  tarjetaLabel:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tarjetaValor:     { fontSize: 22, fontWeight: '800' },

  sinDatos:         { fontSize: 13, fontStyle: 'italic', marginBottom: 4 },

  logsHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  btnActualizar:    { fontSize: 13, fontWeight: '600' },

  logsContenedor:   { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  logFila:          { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderBottomWidth: 1 },
  logNivelBadge:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  logNivelTxt:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  logMensaje:       { color: '#e2e8f0', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  logMeta:          { color: '#64748b', fontSize: 10, marginTop: 2 },
});
