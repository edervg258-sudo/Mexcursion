import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CrearPreferenciaBody = {
  amount: number;
  description: string;
  payerEmail?: string;
  externalReference: string;
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  try {
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) {
      return json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN en el entorno del servidor.' }, 500);
    }

    const body = (await req.json()) as Partial<CrearPreferenciaBody>;
    const amount = Number(body.amount ?? 0);
    const description = String(body.description ?? '').trim();
    const externalReference = String(body.externalReference ?? '').trim();
    const payerEmail = body.payerEmail ? String(body.payerEmail).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Monto inválido.' }, 400);
    }
    if (!description) {
      return json({ error: 'Descripción obligatoria.' }, 400);
    }
    if (!externalReference) {
      return json({ error: 'externalReference es obligatorio.' }, 400);
    }

    const deepLinkScheme = Deno.env.get('APP_DEEPLINK_SCHEME') || 'mercursion';
    const paymentSuccess = `${deepLinkScheme}://payment/success`;
    const paymentError = `${deepLinkScheme}://payment/error`;
    const paymentPending = `${deepLinkScheme}://payment/pending`;

    const payload = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: amount,
          currency_id: 'MXN',
        },
      ],
      external_reference: externalReference,
      back_urls: {
        success: paymentSuccess,
        failure: paymentError,
        pending: paymentPending,
      },
      auto_return: 'approved',
      payer: payerEmail ? { email: payerEmail } : undefined,
      statement_descriptor: 'MEXCURSION',
      metadata: {
        source: 'mexcursion-app',
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference,
      },
      body: JSON.stringify(payload),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      return json(
        {
          error: 'MercadoPago rechazó la creación de preferencia.',
          details: mpData,
        },
        502
      );
    }

    const preferenceId = String(mpData?.id ?? '');
    const initPoint = String(mpData?.init_point ?? mpData?.sandbox_init_point ?? '');

    if (!preferenceId || !initPoint) {
      return json({ error: 'Respuesta inválida de MercadoPago.', details: mpData }, 502);
    }

    return json({
      preferenceId,
      initPoint,
    });
  } catch (error) {
    return json(
      {
        error: 'Error inesperado creando preferencia.',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
