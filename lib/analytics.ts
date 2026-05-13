import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const ANALYTICS_QUEUE_KEY = '@analytics_event_queue_v1';
const MAX_QUEUE = 300;
const FLUSH_INTERVAL = 30000; // Flush every 30 seconds max
const FLUSH_AT_COUNT = 10; // Flush after 10 events

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
let flushTimer: NodeJS.Timeout | null = null;
let eventsSinceFlush = 0;

export const AnalyticsEvents = {
  APP_OPEN: 'app_open',
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
  SEARCH: 'search',
  VIEW_ITEM: 'view_item',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',
  ADD_TO_FAVORITES: 'add_to_favorites',
  REMOVE_FROM_FAVORITES: 'remove_from_favorites',
  SHARE: 'share',
  RATE_APP: 'rate_app',
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
  eventsSinceFlush++;

  // Flush if we hit the threshold or schedule a delayed flush
  if (eventsSinceFlush >= FLUSH_AT_COUNT) {
    void flushQueue();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushQueue();
    }, FLUSH_INTERVAL);
  }
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
      if (__DEV__) console.error('Analytics flush error:', error);
      return;
    }

    await saveQueue([]);
    eventsSinceFlush = 0;
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
  await flushQueue();
};

export const setUserProperties = async (properties: Record<string, string>) => {
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

  await enqueueEvent(payload);
  // flush is now debounced in enqueueEvent
};
