// ============================================================
//  lib/observability.ts  —  Logs estructurados + Tracing + Métricas + Alertas
// ============================================================

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ─── Tipos ────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  feature?: string;
  action?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertasSalud {
  errores_1h: number;
  errores_24h: number;
  advertencias_24h: number;
  feature_mas_errores: string | null;
}

export interface MetricasReservas {
  duracion_media_ms: number;
  duracion_p95_ms: number;
  duracion_max_ms: number;
  total_mediciones: number;
  mediciones_24h: number;
}

// ─── Umbrales de alerta ────────────────────────────────────

export const UMBRALES_ALERTA = {
  errores_1h:         5,   // > 5 errores por hora → crítico
  booking_lento_ms: 4000,  // > 4s una reserva → warning
  errores_24h:       30,   // > 30 en 24h → crítico
};

// ─── LogDrain ─────────────────────────────────────────────
// Cola en memoria; flush a Supabase cada 10s o cuando llega a 20 entradas.
// Solo persiste 'warning' y 'error' en producción.

const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE         = 20;

let _queue: LogEntry[]         = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _appVersion = 'unknown';

export const setAppVersion = (v: string) => { _appVersion = v; };

const scheduleFlush = () => {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL_MS);
};

const flushLogs = async () => {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  try {
    const rows = batch.map(e => ({
      level:       e.level,
      message:     e.message,
      feature:     e.feature   ?? null,
      action:      e.action    ?? null,
      user_id:     e.user_id   ?? null,
      metadata:    e.metadata  ?? null,
      platform:    Platform.OS,
      app_version: _appVersion,
    }));
    await supabase.from('app_logs').insert(rows);
  } catch {
    // falla silenciosa — Sentry ya capturó el error original
  }
};

export const drainLog = (entry: LogEntry) => {
  // En producción solo persistimos warning/error
  if (!__DEV__ && (entry.level === 'debug' || entry.level === 'info')) return;
  _queue.push(entry);
  if (_queue.length >= MAX_QUEUE) {
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    flushLogs();
  } else {
    scheduleFlush();
  }
};

export const flushLogsNow = () => flushLogs();

// ─── Métricas ─────────────────────────────────────────────

export const recordMetric = async (
  metric: string,
  value: number,
  tags?: Record<string, unknown>
) => {
  try {
    await supabase.from('app_metrics').insert({ metric, value, tags: tags ?? null });
  } catch {
    // falla silenciosa
  }
};

// ─── Tracing distribuido ──────────────────────────────────
// Envuelve una operación async con una transacción Sentry + medición de tiempo.

export async function withTrace<T>(
  name: string,
  op: string,
  fn: (startSpan: (desc: string, spanOp: string) => SentrySpanHandle) => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({ name, op });
  const t0 = Date.now();

  try {
    const startSpan = (desc: string, spanOp: string): SentrySpanHandle => {
      const span = transaction.startChild({ op: spanOp, description: desc });
      return {
        ok:   () => { span.setStatus('ok');             span.finish(); },
        fail: () => { span.setStatus('internal_error'); span.finish(); },
      };
    };

    const result = await fn(startSpan);
    transaction.setStatus('ok');
    return result;
  } catch (e) {
    transaction.setStatus('internal_error');
    throw e;
  } finally {
    transaction.finish();
    const duration = Date.now() - t0;
    void recordMetric(`${name}.duration`, duration, { op });
  }
}

export interface SentrySpanHandle {
  ok:   () => void;
  fail: () => void;
}

// ─── Consultas de salud (para el dashboard admin) ─────────

export const fetchSaludSistema = async (): Promise<AlertasSalud | null> => {
  try {
    const { data, error } = await supabase
      .from('v_sistema_salud')
      .select('*')
      .single();
    if (error) return null;
    return data as AlertasSalud;
  } catch {
    return null;
  }
};

export const fetchMetricasReservas = async (): Promise<MetricasReservas | null> => {
  try {
    const { data, error } = await supabase
      .from('v_metricas_reservas')
      .select('*')
      .single();
    if (error) return null;
    return data as MetricasReservas;
  } catch {
    return null;
  }
};

export const fetchLogsRecientes = async (limite = 50): Promise<LogEntry & { id: number; created_at: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('app_logs')
      .select('id, created_at, level, message, feature, action, user_id, metadata')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) return [];
    return (data ?? []) as (LogEntry & { id: number; created_at: string })[];
  } catch {
    return [];
  }
};

// Ping rápido para verificar que Supabase responde
export const pingSupabase = async (): Promise<number | null> => {
  const t0 = Date.now();
  try {
    const { error } = await supabase.from('usuarios').select('id').limit(1);
    if (error) return null;
    return Date.now() - t0;
  } catch {
    return null;
  }
};

export const initObservability = (appVersion: string) => {
  setAppVersion(appVersion);
};
