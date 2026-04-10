import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

export async function configurarBarraAndroid() {
  if (Platform.OS !== 'android') return;

  try {
    await NavigationBar.setVisibilityAsync('visible');
    await NavigationBar.setButtonStyleAsync('dark');
  } catch {}
}
