// ============================================================
//  components/PagoMercadoPago.tsx  —  Integración MercadoPago
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { normalizeError, userMessageForError } from '../lib/error-handling';
import { crearPreferenciaMercadoPago } from '../lib/mercadopago';
import { addBreadcrumb, captureApiError } from '../lib/sentry';
import { useTemaContext } from '../lib/TemaContext';

interface PagoMercadoPagoProps {
  amount: number;
  description: string;
  payerEmail?: string;
  externalReference: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function PagoMercadoPago({
  amount,
  description,
  payerEmail,
  externalReference,
  onSuccess,
  onError,
  onCancel
}: PagoMercadoPagoProps) {
  const { isDark } = useTemaContext();
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  // Guard: prevent callback races (success/error/cancel) from WebView multi-events
  const finishedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const crearPreferencia = async () => {
      setLoading(true);
      try {
        const preferencia = await crearPreferenciaMercadoPago({
          amount,
          description,
          payerEmail,
          externalReference,
        });
        if (!mounted) return;
        setCheckoutUrl(preferencia.initPoint);
      } catch (err) {
        if (!mounted) return;
        const normalized = normalizeError(err);
        const userMessage = userMessageForError(normalized);
        captureApiError({
          feature: 'payments',
          action: 'create_preference',
          error: err,
          metadata: { amount, description, externalReference },
        });
        if (!finishedRef.current) {
          finishedRef.current = true;
          onError(userMessage);
        }
        Alert.alert('Error', userMessage);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    crearPreferencia();

    return () => {
      mounted = false;
    };
  }, [amount, description, externalReference, onError, payerEmail]);

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

      {checkoutUrl ? (
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
              metadata: { amount, description, externalReference },
            });
            const userMessage = userMessageForError(normalized);
            if (!finishedRef.current) {
              finishedRef.current = true;
              onError(userMessage);
            }
            Alert.alert('Error', userMessage);
          }}
        />
      ) : null}
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
