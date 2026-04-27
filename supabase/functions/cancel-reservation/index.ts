import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CancellationPolicy = 'flexible' | 'moderada' | 'estricta';

// Returns refund ratio (0.0–1.0) based on hours before travel date
const REFUND_RATIO: Record<CancellationPolicy, (hours: number) => number> = {
  flexible: (h) => (h >= 24 ? 1.0 : 0.5),
  moderada: (h) => (h >= 72 ? 1.0 : h >= 24 ? 0.5 : 0.0),
  estricta:  (h) => (h >= 168 ? 1.0 : 0.0),
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate caller via JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const body = await req.json() as { reservation_id: number; cancellation_policy?: CancellationPolicy };
  const { reservation_id, cancellation_policy = 'moderada' } = body;

  if (!reservation_id) {
    return new Response(JSON.stringify({ error: 'reservation_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch reservation — verify user owns it
  const { data: reserva, error: fetchErr } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', reservation_id)
    .eq('usuario_id', user.id)
    .maybeSingle();

  if (fetchErr || !reserva) {
    return new Response(JSON.stringify({ error: 'Reservation not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (reserva.estado === 'cancelada') {
    return new Response(JSON.stringify({ error: 'Already cancelled' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Calculate refund amount (informational — no real payment processor)
  const travelDate = new Date(reserva.fecha);
  const hoursUntilTravel = (travelDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const policy = REFUND_RATIO[cancellation_policy] ?? REFUND_RATIO.moderada;
  const refundRatio = policy(hoursUntilTravel);
  const refundAmount = Math.round(reserva.total * refundRatio * 100) / 100;

  // Update reservation to cancelled
  await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', reservation_id);

  // Create in-app notification
  const notifMsg = refundAmount > 0
    ? `Reserva cancelada. Reembolso estimado: $${refundAmount.toLocaleString()} MXN (contacta soporte para tramitarlo).`
    : 'Reserva cancelada. No aplica reembolso según la política seleccionada.';

  await supabase.from('notificaciones').insert({
    usuario_id: user.id,
    tipo: 'sistema',
    titulo: 'Reserva cancelada',
    mensaje: notifMsg,
    leida: false,
    creado_en: new Date().toISOString(),
  });

  // Send confirmation email
  const { data: userData } = await supabase
    .from('usuarios')
    .select('email, nombre')
    .eq('id', user.id)
    .maybeSingle();

  if (userData?.email) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: userData.email,
        template: 'cancelacion_reserva',
        data: {
          nombre: userData.nombre ?? 'Viajero',
          folio: reserva.folio,
          destino: reserva.destino,
          refund_amount: refundAmount,
        },
      },
    });
  }

  return new Response(
    JSON.stringify({ success: true, refund_amount: refundAmount, stripe_refund_id: null }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
