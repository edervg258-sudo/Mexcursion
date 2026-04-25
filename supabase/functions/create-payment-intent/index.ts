import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CreatePaymentIntentRequest {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
  intentId: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: CreatePaymentIntentRequest = await req.json();
    const { amount, description, payerEmail, externalReference } = body;

    // Validation
    if (typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid description' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!payerEmail || typeof payerEmail !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid payerEmail' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!externalReference || typeof externalReference !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid externalReference' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Amount in cents (Stripe expects cents)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amountInCents.toString(),
        currency: 'mxn',
        description: description,
        receipt_email: payerEmail,
        idempotency_key: externalReference,
        metadata: {
          external_reference: externalReference,
          source: 'mexcursion-app',
        },
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      console.error('Stripe API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment intent' }),
        { status: stripeResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripeData = await stripeResponse.json() as {
      id: string;
      client_secret: string;
    };

    const response: CreatePaymentIntentResponse = {
      clientSecret: stripeData.client_secret,
      intentId: stripeData.id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
