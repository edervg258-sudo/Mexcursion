import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PermisoOnboarding } from '../components/PermisoOnboarding';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
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
import '../lib/react-19-filter';
import { supabase } from '../lib/supabase';
import { installWebAriaFix } from '../lib/web-aria';
import { TemaProvider } from '../lib/TemaContext';
import { initSentry, setUser } from '../lib/sentry';

type NotificationSubscription = { remove: () => void };

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input, textarea { outline: none !important; }';
  document.head.appendChild(style);
  installWebAriaFix();
}

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
  'Invalid Refresh Token',
  'Refresh Token Not Found',
]);

export const unstable_settings = {
  initialRouteName: 'registro',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({ storage: AsyncStorage });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notifListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);
  // uid pendiente de permiso: muestra onboarding antes de pedir push
  const [pendingPushUid, setPendingPushUid] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Ionicons: Platform.OS === 'web'
      ? { uri: 'https://unpkg.com/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf' }
      : require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') { SplashScreen.hideAsync(); }
  }, [fontsLoaded]);

  useEffect(() => { configurarBarraAndroid(); }, []);
  useEffect(() => { configurarNotificaciones(); }, []);
  useEffect(() => { initSentry(); }, []);

  useEffect(() => {
    const initRuntime = async () => {
      const flags = await getFeatureFlags();
      preloadCriticalResources();
      if (flags.enablePerfTracking) { initPerformanceMonitoring(); }
      if (flags.enableRealtimeAnalytics) { await logEvent(AnalyticsEvents.APP_OPEN, { source: 'root_layout' }); }
    };
    initRuntime();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        supabase.auth.signOut().catch(() => {});
        return;
      }
      if (event === 'SIGNED_OUT') {
        setTimeout(() => router.push('/login'), 0);
        setUserId('');
        setUser({ id: '', email: '' });
      }
      if (event === 'SIGNED_IN' && session?.user?.id) {
        const uid = session.user.id;
        setUserId(uid);
        logEvent(AnalyticsEvents.LOGIN, { method: 'email' });
        setUser({ id: uid, email: session.user.email ?? undefined });

        // Verificar si ya tiene permiso de push; si no, mostrar onboarding primero
        const Notifications = getNotifications();
        if (Notifications) {
          Notifications.getPermissionsAsync().then(({ status }) => {
            if (status === 'granted') {
              registrarParaPush(uid).catch(() => {});
            } else {
              setPendingPushUid(uid);
            }
          }).catch(() => {
            registrarParaPush(uid).catch(() => {});
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) { return; }
    notifListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.data?.ruta) {
        setTimeout(() => router.push(response.notification.request.content.data.ruta as never), 0);
      } else if (response.notification.request.content.data?.notificacion_id) {
        setTimeout(() => router.push('/(tabs)/notificaciones' as never), 0);
      }
    });
    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) { return null; }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <ErrorBoundary>
          <IdiomaProvider>
            <TemaProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <BottomSheetModalProvider>
                  <OfflineBanner />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="registro"         options={{ headerShown: false }} />
                    <Stack.Screen name="login"            options={{ headerShown: false }} />
                    <Stack.Screen name="nueva-contrasena" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
                  </Stack>
                  <StatusBar style="auto" />
                  {/* Onboarding de permisos antes de pedir push al SO */}
                  <PermisoOnboarding
                    visible={!!pendingPushUid}
                    tipo="notificaciones"
                    onAceptar={() => {
                      if (pendingPushUid) { registrarParaPush(pendingPushUid).catch(() => {}); }
                      setPendingPushUid(null);
                    }}
                    onRechazar={() => setPendingPushUid(null)}
                  />
                </BottomSheetModalProvider>
              </ThemeProvider>
            </TemaProvider>
          </IdiomaProvider>
        </ErrorBoundary>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
