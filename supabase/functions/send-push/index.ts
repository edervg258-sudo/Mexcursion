// supabase/functions/send-push/index.ts
// Invocar: POST /functions/v1/send-push
// Body: { usuario_id: string, titulo: string, cuerpo: string }
// Requiere env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (inyectadas automáticamente por Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { usuario_id, titulo, cuerpo } = await req.json() as {
      usuario_id: string;
      titulo: string;
      cuerpo: string;
    };

    if (!usuario_id || !titulo || !cuerpo) {
      return Response.json({ error: 'usuario_id, titulo y cuerpo son requeridos' }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Obtener push_token y preferencia de notificaciones del usuario
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('push_token, notificaciones')
      .eq('id', usuario_id)
      .maybeSingle();

    if (userError) {
      return Response.json({ error: 'Error al obtener usuario' }, { status: 500 });
    }

    if (!usuario?.push_token) {
      return Response.json({ skipped: true, reason: 'sin_token' });
    }

    if (!usuario.notificaciones) {
      return Response.json({ skipped: true, reason: 'notificaciones_desactivadas' });
    }

    // Enviar via Expo Push API
    const pushRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: usuario.push_token,
        title: titulo,
        body: cuerpo,
        sound: 'default',
        channelId: 'default',
      }),
    });

    const pushData = await pushRes.json();

    // Expo devuelve { data: { status: 'ok' | 'error', ... } }
    const ticket = pushData?.data;
    if (ticket?.status === 'error') {
      console.error('[send-push] Expo error:', ticket.message, ticket.details);
      return Response.json({ sent: false, ticket }, { status: 200 });
    }

    return Response.json({ sent: true, ticket }, { status: 200 });
  } catch (err) {
    console.error('[send-push] Unhandled error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
