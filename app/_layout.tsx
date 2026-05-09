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
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { configurarBarraAndroid } from '../lib/android-ui';
import { logEvent, setUserId, AnalyticsEvents } from '../lib/analytics';
import { getFeatureFlags } from '../lib/feature-flags';
import { IdiomaProvider } from '../lib/IdiomaContext';
import { initPerformanceMonitoring, preloadCriticalResources } from '../lib/performance';
import '../lib/react-19-filter';
import { supabase } from '../lib/supabase';
import { TemaProvider } from '../lib/TemaContext';
import { initSentry, setUser } from '../lib/sentry';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const IGNORED_WARNINGS = [
  'props.pointerEvents is deprecated',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
  'Invalid Refresh Token',
  'Refresh Token Not Found',
];

LogBox.ignoreLogs(IGNORED_WARNINGS);

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

  const [fontsLoaded] = useFonts({
    Ionicons: Platform.OS === 'web'
      ? { uri: 'https://unpkg.com/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf' }
      : require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') { SplashScreen.hideAsync(); }
  }, [fontsLoaded]);

  useEffect(() => { configurarBarraAndroid(); }, []);
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
      }
    });
    return () => subscription.unsubscribe();
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
                </BottomSheetModalProvider>
              </ThemeProvider>
            </TemaProvider>
          </IdiomaProvider>
        </ErrorBoundary>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
