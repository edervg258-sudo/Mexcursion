import AsyncStorage from '@react-native-async-storage/async-storage';

type FeatureFlags = {
  enableOfflineQueue: boolean;
  enableEnhancedPayments: boolean;
  enableRealtimeAnalytics: boolean;
  enablePerfTracking: boolean;
};

const STORAGE_KEY = '@feature_flags_overrides_v1';

const defaults: FeatureFlags = {
  enableOfflineQueue: true,
  enableEnhancedPayments: true,
  enableRealtimeAnalytics: true,
  enablePerfTracking: true,
};

let cachedOverrides: Partial<FeatureFlags> | null = null;

const loadOverrides = async () => {
  if (cachedOverrides) return cachedOverrides;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cachedOverrides = raw ? (JSON.parse(raw) as Partial<FeatureFlags>) : {};
  } catch {
    cachedOverrides = {};
  }
  return cachedOverrides;
};

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const overrides = await loadOverrides();
  return { ...defaults, ...overrides };
};

export const setFeatureFlagOverride = async <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
  const overrides = await loadOverrides();
  const next = { ...overrides, [key]: value };
  cachedOverrides = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const resetFeatureFlags = async () => {
  cachedOverrides = {};
  await AsyncStorage.removeItem(STORAGE_KEY);
};

