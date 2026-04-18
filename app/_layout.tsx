import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { ToastProvider } from '../components/Toast';
import { configurarBarraAndroid } from '../lib/android-ui';
import { logEvent, setUserId, AnalyticsEvents } from '../lib/analytics';
import { getFeatureFlags } from '../lib/feature-flags';
import { IdiomaProvider } from '../lib/IdiomaContext';
import { initPerformanceMonitoring, preloadCriticalResources } from '../lib/performance';
import {
    configurarNotificaciones,
    getNotifications,
    registrarParaPush,
} from '../lib/push-notifications';
import '../lib/react-19-filter'; // Importar filtro de advertencias
import { supabase } from '../lib/supabase';
import { TemaProvider } from '../lib/TemaContext';
import { RUTAS_APP } from '../lib/constantes/navegacion';
import { initSentry, setUser } from '../lib/sentry';
type NotificationSubscription = { remove: () => void };

// Parches web globales
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Elimina el outline azul del browser en todos los TextInput
  const style = document.createElement('style');
  style.textContent = 'input, textarea { outline: none !important; }';
  document.head.appendChild(style);

  // Fix: cuando React Navigation aplica aria-hidden a una screen inactiva, el
  // browser bloquea el atributo y emite una advertencia si algún descendiente
  // retiene el foco. El MutationObserver es asíncrono (llega tarde); en cambio,
  // interceptar setAttribute de forma síncrona mueve el foco ANTES de que el
  // browser valide el cambio, eliminando la advertencia por completo.
  const origSetAttr = HTMLElement.prototype.setAttribute;
  HTMLElement.prototype.setAttribute = function (name: string, value: string) {
    if (name === 'aria-hidden' && value === 'true') {
      const focused = document.activeElement as HTMLElement | null;
      if (focused && focused !== document.body && this.contains(focused)) {
        focused.blur();
      }
    }
    return origSetAttr.call(this, name, value);
  };
}

// Lista de warnings a ignorar
const IGNORED_WARNINGS = [
  'props.pointerEvents is deprecated',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found in the navigation state',
  'Require cycle:'
];

// Ignorar en nativo (Android/iOS)
LogBox.ignoreLogs(IGNORED_WARNINGS);

// Ignorar en web (Expo Web)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  const originalWarn = console.warn;
  // eslint-disable-next-line no-console
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && IGNORED_WARNINGS.some(msg => args[0].includes(msg))) {
      return;
    }
    originalWarn(...args);
  };
}

export const unstable_settings = {
  initialRouteName: 'registro',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 horas de cache persistente
      staleTime: 1000 * 60 * 2,    // Evita requests si los datos tienen menos de 2 minutos
      retry: 1,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notifListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const SESSION_IDLE_TIMEOUT = 15 * 60 * 1000; // 15 min

  // Barra de navegación Android
  useEffect(() => {
    const configurarBarra = async () => {
      await configurarBarraAndroid();
    };
    configurarBarra();
  }, []);

  // Configuración base de notificaciones (canal Android + handler en primer plano)
  useEffect(() => {
    configurarNotificaciones().catch(() => {});
  }, []);

  // Inicializar Sentry
  useEffect(() => {
    initSentry();
  }, []);

  // Warm-up recursos críticos y hooks de performance
  useEffect(() => {
    const initRuntime = async () => {
      const flags = await getFeatureFlags();
      preloadCriticalResources();
      if (flags.enablePerfTracking) {
        initPerformanceMonitoring();
      }
      if (flags.enableRealtimeAnalytics) {
        await logEvent(AnalyticsEvents.APP_OPEN, { source: 'root_layout' });
      }
    };
    initRuntime();
  }, []);

  // Sesión: redirect en cambios de auth + registrar push para sesiones persistidas
  useEffect(() => {
    // Si ya hay sesión activa al arrancar (token persistido), registrar push
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        registrarParaPush(session.user.id).catch(() => {});
        setUserId(session.user.id);
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setTimeout(() => router.push('/login'), 0);
      }
      // Registrar push token al iniciar sesión
      if (event === 'SIGNED_IN' && session?.user?.id) {
        registrarParaPush(session.user.id).catch(() => {});
        // Analytics
        setUserId(session.user.id);
        logEvent(AnalyticsEvents.LOGIN, { method: 'email' });
        // Sentry
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
      }
      if (event === 'SIGNED_OUT') {
        setUserId('');
        setUser({ id: '', email: '' });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Session idle timeout — sign out after 15 min in background
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (nextState === 'active' && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current > SESSION_IDLE_TIMEOUT) {
          supabase.auth.signOut();
        }
        backgroundedAt.current = null;
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  // Listeners de notificaciones push
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) { return; }

    // Notificación recibida con la app en primer plano
    notifListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Tap en una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.data?.ruta) {
        setTimeout(() => router.push(response.notification.request.content.data.ruta as never), 0);
      } else if (response.notification.request.content.data?.notificacion_id) {
        setTimeout(() => router.push(RUTAS_APP.NOTIFICACIONES as never), 0);
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <ErrorBoundary>
          <IdiomaProvider>
            <TemaProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <BottomSheetModalProvider>
                  <OfflineBanner />
                  <ToastProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="registro"         options={{ headerShown: false }} />
                    <Stack.Screen name="login"            options={{ headerShown: false }} />
                    <Stack.Screen name="nueva-contrasena" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
                  </Stack>

                  <StatusBar style="auto" />
                  </ToastProvider>
                </BottomSheetModalProvider>
              </ThemeProvider>
            </TemaProvider>
          </IdiomaProvider>
        </ErrorBoundary>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
