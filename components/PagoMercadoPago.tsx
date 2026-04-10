// ============================================================
//  components/PagoMercadoPago.tsx  —  Integración MercadoPago
// ============================================================

import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
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

  // Generar checkout URL de MercadoPago
  const generateCheckoutURL = () => {
    const baseUrl = 'https://www.mercadopago.com.mx/checkout/v1/redirect';
    const params = new URLSearchParams({
      'public_key': process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY || 'TEST-123456789',
      'transaction_amount': amount.toString(),
      'title': description,
      'description': description,
      'currency_id': 'MXN',
      'external_reference': `mercursion-${Date.now()}`,
      'back_url': 'mercursion://payment/success',
      'auto_return': 'approved'
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;

    // Detectar éxito de pago
    if (url.includes('payment/success') || url.includes('approved')) {
      const paymentId = extractPaymentId(url);
      onSuccess(paymentId);
      return false; // Prevenir navegación
    }

    // Detectar error
    if (url.includes('payment/error') || url.includes('rejected')) {
      onError('Pago rechazado o error');
      return false;
    }

    // Detectar cancelación
    if (url.includes('payment/cancel') || url.includes('cancelled')) {
      onCancel();
      return false;
    }

    return true; // Continuar navegación normal
  };

  const extractPaymentId = (url: string): string => {
    // Extraer payment_id de la URL
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('payment_id') || `mp-${Date.now()}`;
  };

  const checkoutUrl = generateCheckoutURL();

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
        renderLoading={() => null}
        onError={() => {
          setLoading(false);
          Alert.alert('Error', 'No se pudo cargar el checkout de pago');
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