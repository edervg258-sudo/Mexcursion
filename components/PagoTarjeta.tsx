import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { normalizeError, userMessageForError } from '../lib/error-handling';
import { confirmarPago, crearIntentoPago } from '../lib/stripe';
import { addBreadcrumb, captureApiError } from '../lib/sentry';
import { sombra } from '../lib/estilos';
import { useTemaContext } from '../lib/TemaContext';

interface PagoTarjetaProps {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

const PagoTarjetaContent = ({
  amount,
  description,
  payerEmail,
  externalReference,
  onSuccess,
  onError,
}: PagoTarjetaProps) => {
  const { isDark } = useTemaContext();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create payment intent on mount
  useEffect(() => {
    let mounted = true;

    const crearIntent = async () => {
      setLoading(true);
      try {
        const result = await crearIntentoPago({
          amount,
          description,
          payerEmail,
          externalReference,
        });

        if (!mounted) return;

        setClientSecret(result.clientSecret);
        setIntentId(result.intentId);

        addBreadcrumb({
          category: 'payments',
          message: 'payment_intent_created',
          data: { intentId: result.intentId, amount, description },
        });
      } catch (err) {
        if (!mounted) return;

        const normalized = normalizeError(err);
        const userMessage = userMessageForError(normalized);

        captureApiError({
          feature: 'payments',
          action: 'create_payment_intent',
          error: err,
          metadata: { amount, description, externalReference },
        });

        setError(userMessage);
        onError(userMessage);
        Alert.alert('Error', userMessage);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    crearIntent();

    return () => {
      mounted = false;
    };
  }, [amount, description, payerEmail, externalReference, onError]);

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret || !intentId || procesando) {
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        const msg = 'Por favor completa los datos de tu tarjeta.';
        setError(msg);
        onError(msg);
        Alert.alert('Error', msg);
        setProcesando(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? window.location.href : '',
          payment_method_data: {
            billing_details: {
              email: payerEmail,
            },
          },
        },
      });

      if (confirmError) {
        const userMessage = userMessageForError(normalizeError(confirmError));
        captureApiError({
          feature: 'payments',
          action: 'confirm_payment',
          error: confirmError,
          metadata: { amount, description },
        });
        setError(userMessage);
        onError(userMessage);
        Alert.alert('Error', userMessage);
        setProcesando(false);
        return;
      }

      if (!paymentIntent) {
        const msg = 'No se pudo procesar el pago. Intenta de nuevo.';
        setError(msg);
        onError(msg);
        Alert.alert('Error', msg);
        setProcesando(false);
        return;
      }

      addBreadcrumb({
        category: 'payments',
        message: 'payment_confirmed',
        data: { paymentId: paymentIntent.id, status: paymentIntent.status },
      });

      onSuccess(paymentIntent.id);
    } catch (err) {
      setProcesando(false);

      const normalized = normalizeError(err);
      const userMessage = userMessageForError(normalized);

      captureApiError({
        feature: 'payments',
        action: 'confirm_payment',
        error: err,
        metadata: { amount, description, intentId },
      });

      setError(userMessage);
      onError(userMessage);
      Alert.alert('Error', userMessage);
    }
  };

  return (
    <ScrollView
      style={[estilos.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      contentContainerStyle={estilos.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={estilos.header}>
        <Text style={[estilos.headerTitulo, { color: isDark ? '#fff' : '#333' }]}>
          Datos de la tarjeta
        </Text>
        <Text style={[estilos.headerSubtitulo, { color: isDark ? '#aaa' : '#666' }]}>
          Pagos seguros con Stripe
        </Text>
      </View>

      {/* Monto */}
      <View style={[estilos.tarjetaMonto, { backgroundColor: '#3AB7A5' }]}>
        <Text style={estilos.montoLabel}>Total a pagar</Text>
        <Text style={estilos.monto}>${amount.toLocaleString()}<Text style={estilos.montoMXN}> MXN</Text></Text>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={estilos.loadingContainer}>
          <ActivityIndicator size="large" color="#3AB7A5" />
          <Text style={[estilos.loadingText, { color: isDark ? '#fff' : '#333' }]}>
            Preparando pago...
          </Text>
        </View>
      )}

      {/* Card Element */}
      {!loading && clientSecret && (
        <>
          <View style={[estilos.cardContainer, { borderColor: isDark ? '#444' : '#ddd' }]}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: isDark ? '#fff' : '#333',
                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                    '::placeholder': {
                      color: isDark ? '#aaa' : '#999',
                    },
                  },
                  invalid: {
                    color: '#DD331D',
                  },
                },
                hidePostalCode: true,
              }}
            />
          </View>

          {/* Error message */}
          {error && (
            <View style={[estilos.errorBanner, { backgroundColor: isDark ? '#2A1210' : '#FEF0EE' }]}>
              <Text style={estilos.errorText}>{error}</Text>
            </View>
          )}

          {/* Info box */}
          <View style={[estilos.infoBox, { backgroundColor: isDark ? '#2a3f3f' : '#f0faf9', borderColor: isDark ? '#3a5f5f' : '#d1e8e5' }]}>
            <Text style={[estilos.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>
              💳 Datos de prueba (test mode):
            </Text>
            <Text style={[estilos.infoText, { color: isDark ? '#fff' : '#333' }]}>
              Tarjeta: 4242 4242 4242 4242
            </Text>
            <Text style={[estilos.infoText, { color: isDark ? '#fff' : '#333' }]}>
              Vencimiento: 12/25
            </Text>
            <Text style={[estilos.infoText, { color: isDark ? '#fff' : '#333' }]}>
              CVC: 242
            </Text>
          </View>

          {/* Pay button */}
          <TouchableOpacity
            testID="pay-card-button"
            style={[estilos.btnPagar, procesando && { opacity: 0.6 }]}
            onPress={handlePay}
            disabled={procesando}
            activeOpacity={0.85}
          >
            {procesando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={estilos.btnText}>Pagar ahora</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export function PagoTarjeta(props: PagoTarjetaProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: Stripe key not configured</Text>
      </View>
    );
  }

  const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

  return (
    <Elements stripe={stripePromise}>
      <PagoTarjetaContent {...props} />
    </Elements>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 20,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitulo: {
    fontSize: 13,
    fontWeight: '500',
  },
  tarjetaMonto: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...sombra({ color: '#3AB7A5', opacity: 0.35, radius: 10, offsetY: 4, elevation: 5 }),
  },
  montoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 6,
  },
  monto: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  montoMXN: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    height: 80,
    justifyContent: 'center',
  },
  cardField: {
    height: 56,
  },
  errorBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DD331D33',
  },
  errorText: {
    color: '#DD331D',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  btnPagar: {
    backgroundColor: '#DD331D',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    ...sombra({ color: '#DD331D', opacity: 0.35, radius: 8, offsetY: 4, elevation: 5 }),
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
