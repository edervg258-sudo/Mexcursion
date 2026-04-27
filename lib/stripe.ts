import { supabase } from './supabase';

type CreatePaymentIntentInput = {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

type CreatePaymentIntentOutput = {
  clientSecret: string;
  intentId: string;
};

type ConfirmPaymentInput = {
  intentId: string;
  paymentMethodId: string;
};

type ConfirmPaymentOutput = {
  success: boolean;
  paymentId: string;
  status?: string;
  error?: string;
};

export async function crearIntentoPago(
  input: CreatePaymentIntentInput
): Promise<CreatePaymentIntentOutput> {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo crear el intent de pago.');
  }

  const clientSecret = String(data?.clientSecret ?? '');
  const intentId = String(data?.intentId ?? '');

  if (!clientSecret || !intentId) {
    throw new Error('Respuesta inválida al crear el intent de pago.');
  }

  return { clientSecret, intentId };
}

export async function confirmarPago(
  input: ConfirmPaymentInput
): Promise<ConfirmPaymentOutput> {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo confirmar el pago.');
  }

  const success = Boolean(data?.success);
  const paymentId = String(data?.paymentId ?? '');

  if (!success) {
    throw new Error(data?.error || 'Pago rechazado o error');
  }

  return {
    success,
    paymentId,
    status: data?.status,
  };
}
