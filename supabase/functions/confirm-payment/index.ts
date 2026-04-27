import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface ConfirmPaymentRequest {
  intentId: string;
  paymentMethodId: string;
}

interface ConfirmPaymentResponse {
  success: boolean;
  paymentId: string;
  status?: string;
  error?: string;
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

    const body: ConfirmPaymentRequest = await req.json();
    const { intentId, paymentMethodId } = body;

    // Validation
    if (!intentId || typeof intentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid intentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid paymentMethodId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Confirm payment intent
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${intentId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_method: paymentMethodId,
        }).toString(),
      }
    );

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json() as { error?: { message: string } };
      console.error('Stripe API error:', errorData);
      return new Response(
        JSON.stringify({
          success: false,
          paymentId: '',
          error: errorData.error?.message || 'Payment confirmation failed',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripeData = await stripeResponse.json() as {
      id: string;
      status: string;
      charges?: {
        data?: Array<{ id: string }>;
      };
    };

    // Check if payment succeeded
    if (stripeData.status === 'succeeded') {
      // Get charge ID for payment reference
      const chargeId = stripeData.charges?.data?.[0]?.id || stripeData.id;

      const response: ConfirmPaymentResponse = {
        success: true,
        paymentId: chargeId,
        status: stripeData.status,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (stripeData.status === 'requires_action') {
      // Payment requires additional action (like 3D Secure)
      const response: ConfirmPaymentResponse = {
        success: false,
        paymentId: '',
        status: 'requires_action',
        error: 'Payment requires additional authentication',
      };

      return new Response(JSON.stringify(response), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const response: ConfirmPaymentResponse = {
        success: false,
        paymentId: '',
        status: stripeData.status,
        error: `Payment failed with status: ${stripeData.status}`,
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', success: false, paymentId: '' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
