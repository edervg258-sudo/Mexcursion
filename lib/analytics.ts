// ============================================================
//  lib/analytics.ts  —  Firebase Analytics
// ============================================================

import * as Analytics from 'expo-firebase-analytics';

export const logEvent = async (event: string, params?: Record<string, any>) => {
  try {
    await Analytics.logEvent(event, params);
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

export const setUserId = async (userId: string) => {
  try {
    await Analytics.setUserId(userId);
  } catch (error) {
    console.warn('Analytics setUserId error:', error);
  }
};

export const setUserProperties = async (properties: Record<string, string>) => {
  try {
    await Analytics.setUserProperties(properties);
  } catch (error) {
    console.warn('Analytics setUserProperties error:', error);
  }
};

// Eventos comunes
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