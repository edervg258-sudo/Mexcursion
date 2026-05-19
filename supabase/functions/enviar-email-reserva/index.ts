import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const { tipo, reserva_id, usuario_id } = body;

    console.log('enviar-email-reserva recibido:', JSON.stringify({ tipo, reserva_id, usuario_id }));

    // ── Modo A: datos completos vienen en el body (nueva reserva) ──────────
    let folio    = body.folio    as string | undefined;
    let destino  = body.destino  as string | undefined;
    let paquete  = body.paquete  as string | undefined;
    let fecha    = body.fecha    as string | undefined;
    let personas = body.personas as number | undefined;
    let total    = body.total    as number | undefined;
    let metodo   = body.metodo   as string | undefined;
    let estado   = body.estado   as string | undefined;
    let nombre       = 'Viajero';
    let correoDestino = body.correo as string | undefined;

    // ── Modo B: solo reserva_id (admin cambia estado) — consulta la BD ────
    if (reserva_id && !folio) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const { data: r, error: re } = await sb
        .from('reservas')
        .select('folio, destino, paquete, fecha, personas, total, metodo, estado, usuario_id')
        .eq('id', reserva_id)
        .single();

      if (re || !r) {
        console.error('Reserva no encontrada:', re?.message);
        return json({ error: 'Reserva no encontrada', detalle: re?.message }, 404);
      }

      folio    = r.folio;
      destino  = r.destino;
      paquete  = r.paquete;
      fecha    = r.fecha;
      personas = r.personas;
      total    = r.total;
      metodo   = r.metodo;
      estado   = r.estado ?? tipo;

      // Buscar nombre y correo del usuario
      const { data: u } = await sb
        .from('usuarios')
        .select('nombre, email')
        .eq('id', r.usuario_id)
        .maybeSingle();
      nombre        = u?.nombre ?? 'Viajero';
      correoDestino = correoDestino ?? u?.email ?? undefined;
    }

    // Buscar nombre y correo del usuario si se pasó usuario_id directamente
    if (usuario_id && (nombre === 'Viajero' || !correoDestino)) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: u } = await sb
        .from('usuarios')
        .select('nombre, email')
        .eq('id', usuario_id)
        .maybeSingle();
      nombre        = u?.nombre ?? nombre;
      correoDestino = correoDestino ?? u?.email ?? undefined;
    }

    if (!folio) {
      console.error('Faltan datos para enviar el correo');
      return json({ error: 'Faltan datos: folio requerido' }, 400);
    }

    if (!correoDestino) {
      console.error('No se encontró correo del destinatario');
      return json({ error: 'Faltan datos: correo del destinatario requerido' }, 400);
    }

    // ── Construir email ────────────────────────────────────────────────────
    const detalles = `
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:8px;color:#666">Folio</td><td style="padding:8px;font-weight:700">${folio}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Destino</td><td style="padding:8px">${destino}</td></tr>
        <tr><td style="padding:8px;color:#666">Paquete</td><td style="padding:8px">${paquete}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Fecha</td><td style="padding:8px">${fecha}</td></tr>
        <tr><td style="padding:8px;color:#666">Personas</td><td style="padding:8px">${personas}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Total</td><td style="padding:8px;font-weight:700;color:#27AE60">$${(total ?? 0).toLocaleString('es-MX')} MXN</td></tr>
        ${tipo === 'nueva' ? `<tr><td style="padding:8px;color:#666">Método de pago</td><td style="padding:8px">${metodo}</td></tr>` : ''}
      </table>
    `;

    let asunto: string;
    let encabezado: string;
    let cuerpoExtra = '';

    if (tipo === 'confirmada') {
      asunto      = `✅ Reserva ${folio} confirmada — Mexcursión`;
      encabezado  = `¡Tu reserva ha sido confirmada, ${nombre}!`;
      cuerpoExtra = '<p style="color:#3AB7A5;font-weight:600">Nuestro equipo revisó tu pago y todo está listo. ¡Prepárate para tu aventura! 🌮🗺️</p>';
    } else if (tipo === 'cancelada') {
      asunto      = `Reserva ${folio} cancelada — Mexcursión`;
      encabezado  = `Tu reserva fue cancelada, ${nombre}`;
      cuerpoExtra = '<p style="color:#DD331D">Si tienes dudas sobre el motivo, contáctanos.</p>';
    } else {
      asunto      = `🎉 Recibimos tu reserva ${folio} — Mexcursión`;
      encabezado  = `¡Gracias por reservar con Mexcursión, ${nombre}!`;
      cuerpoExtra = (estado === 'pendiente')
        ? '<p style="color:#9A7118;font-weight:600">⏳ Tu pago está pendiente de verificación. Te notificaremos cuando sea confirmado.</p>'
        : '<p style="color:#27AE60;font-weight:600">✅ ¡Tu reserva está confirmada y lista!</p>';
    }

    const html = `
      <div style="max-width:560px;margin:0 auto;font-family:sans-serif;color:#222">
        <div style="background:#2B7A6F;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Mexcursión</h1>
          <p style="color:#a8e6e0;margin:4px 0 0">Descubre México con nosotros</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="margin-top:0">${encabezado}</h2>
          ${cuerpoExtra}
          <h3 style="margin-bottom:8px;color:#444">Detalles de tu reserva</h3>
          ${detalles}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#999;margin:0">Este correo fue enviado automáticamente. No respondas a este mensaje.</p>
        </div>
      </div>
    `;

    // ── Enviar email con Resend ───────────────────────────────────────────
    // IMPORTANTE: El 'from' debe ser un dominio verificado en Resend
    // Opciones:
    // 1. Crear dominio propio: cambiar a 'reservas@tudominio.com'
    // 2. Usar sandbox (solo desarrollo): 'onboarding@resend.dev'
    // 3. Cambiar a SendGrid/Mailgun si no tienes dominio
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mexcursión <reservas@mexcursion.is-pro.dev>',
        to:   [correoDestino],
        subject: asunto,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return json({ error: 'Email no enviado', resend: err }, 500);
    }

    const resendData = await emailRes.json();
    console.log('Email enviado OK, id:', resendData.id);
    return json({ ok: true, email_id: resendData.id });

  } catch (err) {
    console.error('enviar-email-reserva excepción:', String(err));
    return json({ error: String(err) }, 500);
  }
});
