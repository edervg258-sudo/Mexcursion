// ============================================================
//  components/PagoMercadoPago.tsx  —  Integración MercadoPago
// ============================================================

import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { normalizeError, userMessageForError } from '../lib/error-handling';
import { addBreadcrumb, captureApiError } from '../lib/sentry';
import { useTemaContext } from '../lib/TemaContext';

interface PagoMercadoPagoProps {
  amount: number;
  description: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function PagoMercadoPago({
  amount,
  description,
  onSuccess,
  onError,
  onCancel
}: PagoMercadoPagoProps) {
  const { isDark } = useTemaContext();
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  // Guard: prevent callback races (success/error/cancel) from WebView multi-events
  const finishedRef = useRef(false);

  // Stable URL: external_reference must not change between renders
  const checkoutUrl = useMemo(() => {
    const baseUrl = 'https://www.mercadopago.com.mx/checkout/v1/redirect';
    const externalRef = `mercursion-${amount}-${Date.now()}`;
    const params = new URLSearchParams({
      'public_key': process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY || 'TEST-123456789',
      'transaction_amount': amount.toString(),
      'title': description,
      'description': description,
      'currency_id': 'MXN',
      'external_reference': externalRef,
      'back_url': 'mercursion://payment/success',
      'auto_return': 'approved',
    });
    return `${baseUrl}?${params.toString()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally computed once per mount

  const extractPaymentId = (url: string): string => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('payment_id') || `mp-${Date.now()}`;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    addBreadcrumb({
      category: 'payments.webview',
      message: 'navigation_state_change',
      data: { url },
    });

    // Detectar éxito de pago — guard against duplicate WebView state changes
    if (url.includes('payment/success') || url.includes('approved')) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onSuccess(extractPaymentId(url));
      }
      return false;
    }

    // Detectar error
    if (url.includes('payment/error') || url.includes('rejected')) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onError('Pago rechazado o error');
      }
      return false;
    }

    // Detectar cancelación
    if (url.includes('payment/cancel') || url.includes('cancelled')) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onCancel();
      }
      return false;
    }

    return true;
  };

  return (
    <View style={estilos.container}>
      {loading && (
        <View style={estilos.loading}>
          <ActivityIndicator size="large" color="#3AB7A5" />
          <Text style={[estilos.loadingText, { color: isDark ? '#fff' : '#333' }]}>
            Procesando pago...
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        style={estilos.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        renderLoading={() => <></>}
        onError={(syntheticEvent) => {
          setLoading(false);
          const webError = syntheticEvent.nativeEvent?.description ?? 'checkout_error';
          const normalized = normalizeError(webError);
          captureApiError({
            feature: 'payments',
            action: 'checkout_webview_error',
            error: webError,
            metadata: { amount, description },
          });
          const userMessage = userMessageForError(normalized);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onError(userMessage);
          }
          Alert.alert('Error', userMessage);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
});
