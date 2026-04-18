import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store is limited to ~2 KB per value on native.
// Values that exceed this limit fall back to AsyncStorage (non-sensitive large blobs).
const MAX_SECURE_BYTES = 1800;

export async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  const value = await SecureStore.getItemAsync(key);
  if (value !== null) return value;
  // Fallback: large value was stored in AsyncStorage
  return AsyncStorage.getItem(`_as_${key}`);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  if (new Blob([value]).size <= MAX_SECURE_BYTES) {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(`_as_${key}`);
  } else {
    // Value too large for SecureStore; store in AsyncStorage and clear SecureStore slot
    await AsyncStorage.setItem(`_as_${key}`, value);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  }
}

export async function secureRemove(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(key).catch(() => {});
  }
  await AsyncStorage.removeItem(`_as_${key}`).catch(() => {});
}
