import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = header.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
    const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.split('=')[1]);

    if (!timestamp || !signatures.length) return false;

    // Reject events older than 5 minutes (replay attack protection)
    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signedPayload),
    );
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return signatures.some((sig) => sig === expectedSig);
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    return new Response(JSON.stringify({ error: 'Configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Read body as text — must happen before any other body parsing
  const body = await req.text();

  const isValid = await verifyStripeSignature(body, signature, stripeWebhookSecret);
  if (!isValid) {
    console.error('Invalid Stripe signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = JSON.parse(body) as { id: string; type: string; data: { object: Record<string, unknown> } };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Idempotency check — skip already-processed events
  const { data: already } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (already) {
    return new Response(JSON.stringify({ received: true, idempotent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as { id: string; metadata?: { external_reference?: string } };
        const ref = intent.metadata?.external_reference;
        if (ref) {
          await supabase
            .from('reservas')
            .update({ estado: 'confirmada', stripe_payment_intent_id: intent.id })
            .eq('folio', ref)
            .neq('estado', 'cancelada');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as { id: string; metadata?: { external_reference?: string } };
        const ref = intent.metadata?.external_reference;
        if (ref) {
          await supabase
            .from('reservas')
            .update({ estado: 'pendiente' })
            .eq('folio', ref)
            .eq('estado', 'confirmada');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent?: string };
        const piId = charge.payment_intent;
        if (piId) {
          const { data: reserva } = await supabase
            .from('reservas')
            .select('id, usuario_id, folio, destino')
            .eq('stripe_payment_intent_id', piId)
            .maybeSingle();

          if (reserva) {
            await supabase
              .from('reservas')
              .update({ estado: 'cancelada' })
              .eq('id', reserva.id);

            await supabase.from('notificaciones').insert({
              usuario_id: reserva.usuario_id,
              tipo: 'sistema',
              titulo: 'Reembolso procesado',
              mensaje: `Tu reembolso por la reserva a ${reserva.destino} (folio ${reserva.folio}) fue procesado.`,
              leida: false,
              creado_en: new Date().toISOString(),
            });
          }
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge but don't process
        break;
    }

    // Record event for idempotency
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
