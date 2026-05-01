import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Mixpanel } from 'mixpanel-react-native';
import { supabase } from './supabase';
import { addBreadcrumb, captureApiError } from './sentry';

const ANALYTICS_QUEUE_KEY = '@analytics_event_queue_v1';
const MAX_QUEUE = 300;

type AnalyticsEvent = {
  event_name: string;
  user_id: string | null;
  properties: Record<string, unknown>;
  platform: string;
  app_version: string;
  created_at: string;
};

let currentUserId: string | null = null;
let flushing = false;
let mixpanelInstance: ReturnType<typeof Mixpanel> | null = null;

const initMixpanel = async () => {
  try {
    const token = Constants.expoConfig?.extra?.mixpanelToken as string | undefined;
    if (token) {
      mixpanelInstance = new Mixpanel(token, false);
      await mixpanelInstance.init();
    }
  } catch {
    // Mixpanel no disponible
  }
};

initMixpanel();

export const AnalyticsEvents = {
  // ── Sesión
  APP_OPEN:           'app_open',
  APP_INSTALL:        'app_install',       // primera apertura
  SESSION_START:      'session_start',

  // ── Auth
  LOGIN:              'login',
  SIGN_UP:            'sign_up',
  LOGOUT:             'logout',
  PASSWORD_RESET:     'password_reset',

  // ── Descubrimiento
  SEARCH:             'search',
  DESTINATION_VIEWED: 'destination_viewed',
  PACKAGE_SELECTED:   'package_selected',
  ADD_TO_FAVORITES:   'add_to_favorites',
  REMOVE_FROM_FAVORITES: 'remove_from_favorites',

  // ── Funnel de reserva (cada paso es un evento separado para medir drop-off)
  BOOKING_STARTED:          'booking_started',           // toca "Reservar"
  BOOKING_STEP_FORM:        'booking_step_form',         // llena datos del viajero
  BOOKING_STEP_PAYMENT:     'booking_step_payment',      // llega a pago
  PAYMENT_METHOD_SELECTED:  'payment_method_selected',
  PURCHASE:                 'purchase',                  // pago exitoso
  PURCHASE_FAILED:          'purchase_failed',

  // ── Post-reserva
  BOOKING_CANCELLED:        'booking_cancelled',
  REVIEW_SUBMITTED:         'review_submitted',

  // ── Itinerarios
  ITINERARY_CREATED:        'itinerary_created',
  ITINERARY_RENAMED:        'itinerary_renamed',
  ITINERARY_ITEM_ADDED:     'itinerary_item_added',

  // ── Notificaciones
  NOTIFICATION_RECEIVED:    'notification_received',
  NOTIFICATION_TAPPED:      'notification_tapped',
  DEEP_LINK_OPENED:         'deep_link_opened',

  // ── Offline / sync
  OFFLINE_ACTION_QUEUED:    'offline_action_queued',
  OFFLINE_SYNC_SUCCESS:     'offline_sync_success',
  OFFLINE_SYNC_FAILED:      'offline_sync_failed',

  // ── Social
  SHARE:              'share',
  RATE_APP:           'rate_app',
} as const;

const loadQueue = async (): Promise<AnalyticsEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = async (events: AnalyticsEvent[]) => {
  try {
    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    // no-op: analytics should never crash UX
  }
};

const enqueueEvent = async (event: AnalyticsEvent) => {
  const queue = await loadQueue();
  queue.push(event);
  await saveQueue(queue);
};

const flushQueue = async () => {
  if (flushing) return;
  // No intentes flush si no hay usuario autenticado (RLS bloquea inserts anónimos).
  // Los eventos quedan encolados en AsyncStorage y se envían al hacer login.
  if (!currentUserId) return;
  flushing = true;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const queue = await loadQueue();
    if (!queue.length) return;

    // Asignar user_id a eventos encolados antes del login
    const eventsToInsert = queue.map(e => ({
      ...e,
      user_id: e.user_id ?? currentUserId,
    }));

    const { error } = await supabase.from('analytics_eventos').insert(eventsToInsert);
    if (error) {
      captureApiError({
        feature: 'analytics',
        action: 'flush_queue',
        error,
        metadata: { queued_events: queue.length },
      });
      return;
    }

    await saveQueue([]);
    addBreadcrumb({
      category: 'analytics',
      message: 'flush_success',
      data: { count: queue.length },
    });
  } finally {
    flushing = false;
  }
};

NetInfo.addEventListener(state => {
  if (state.isConnected) {
    void flushQueue();
  }
});

export const setUserId = async (userId: string) => {
  currentUserId = userId?.trim() ? userId : null;
  
  if (mixpanelInstance && currentUserId) {
    try {
      await mixpanelInstance.identify(currentUserId);
    } catch {
      // no-op
    }
  }
  
  await flushQueue();
};

export const setUserProperties = async (properties: Record<string, string>) => {
  if (mixpanelInstance && currentUserId) {
    try {
      await mixpanelInstance.setUserProperties(properties);
    } catch {
      // no-op
    }
  }
  await logEvent('set_user_properties', properties);
};

export const logEvent = async (event: string, params: Record<string, unknown> = {}) => {
  const payload: AnalyticsEvent = {
    event_name: event,
    user_id: currentUserId,
    properties: params,
    platform: params.platform ? String(params.platform) : Platform.OS,
    app_version: params.app_version ? String(params.app_version) : '1.0.0',
    created_at: new Date().toISOString(),
  };

  if (mixpanelInstance && currentUserId) {
    try {
      await mixpanelInstance.track(event, params);
    } catch {
      // no-op
    }
  }

  await enqueueEvent(payload);
  await flushQueue();
};

// ── Helpers de negocio ────────────────────────────────────────────────────────

// Registra un paso del funnel de reserva. Úsalo en cada pantalla del flujo.
export const trackFunnelStep = async (
  step: 'started' | 'form' | 'payment' | 'completed' | 'failed',
  params: Record<string, unknown> = {}
) => {
  const eventMap = {
    started:   AnalyticsEvents.BOOKING_STARTED,
    form:      AnalyticsEvents.BOOKING_STEP_FORM,
    payment:   AnalyticsEvents.BOOKING_STEP_PAYMENT,
    completed: AnalyticsEvents.PURCHASE,
    failed:    AnalyticsEvents.PURCHASE_FAILED,
  };
  await logEvent(eventMap[step], params);
};

// Llama esto al hacer login/registro para enriquecer los perfiles de Mixpanel.
export const identifyUser = async (user: {
  id: string;
  nombre?: string;
  idioma?: string;
  tipo?: string;
}) => {
  await setUserId(user.id);
  if (mixpanelInstance) {
    try {
      await mixpanelInstance.identify(user.id);
      const props: Record<string, string> = { $distinct_id: user.id };
      if (user.nombre) props['$name'] = user.nombre;
      if (user.idioma) props['idioma'] = user.idioma;
      if (user.tipo)   props['tipo']   = user.tipo;
      await mixpanelInstance.setUserProperties(props);
    } catch {
      // no-op
    }
  }
};
