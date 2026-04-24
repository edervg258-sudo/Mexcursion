import { supabase } from './supabase';

type CrearPreferenciaInput = {
  amount: number;
  description: string;
  payerEmail?: string;
  externalReference: string;
};

type CrearPreferenciaOutput = {
  preferenceId: string;
  initPoint: string;
};

export async function crearPreferenciaMercadoPago(
  input: CrearPreferenciaInput
): Promise<CrearPreferenciaOutput> {
  const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo crear la preferencia de pago.');
  }

  const preferenceId = String(data?.preferenceId ?? '');
  const initPoint = String(data?.initPoint ?? '');

  if (!preferenceId || !initPoint) {
    throw new Error('Respuesta inválida al crear preferencia de pago.');
  }

  return { preferenceId, initPoint };
}
