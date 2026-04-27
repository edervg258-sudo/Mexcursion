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

export type CancellationPolicy = 'flexible' | 'moderada' | 'estricta';

type CancelReservationInput = {
  reservation_id: number;
  cancellation_policy?: CancellationPolicy;
};

type CancelReservationOutput = {
  success: boolean;
  refund_amount: number;
  stripe_refund_id: string | null;
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

export async function cancelarReservaConRefund(
  input: CancelReservationInput
): Promise<CancelReservationOutput> {
  const { data, error } = await supabase.functions.invoke('cancel-reservation', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo cancelar la reserva.');
  }

  return {
    success:          Boolean(data?.success),
    refund_amount:    Number(data?.refund_amount ?? 0),
    stripe_refund_id: data?.stripe_refund_id ?? null,
  };
}

export async function enviarEmail(
  to: string,
  template: string,
  templateData: Record<string, string | number>
): Promise<void> {
  // Fire-and-forget — email failures must not block UX
  supabase.functions
    .invoke('send-email', { body: { to, template, data: templateData } })
    .catch((err) => console.warn('send-email error (non-fatal):', err));
}
