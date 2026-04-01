import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const originalWarn = console.warn;
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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const configurarBarra = async () => {
      try {
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setButtonStyleAsync('dark');
      } catch {}
    };

    configurarBarra();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="registro" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="nueva-contrasena" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
