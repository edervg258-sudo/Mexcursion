import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailTemplate =
  | 'confirmacion_reserva'
  | 'cancelacion_reserva'
  | 'modificacion_reserva'
  | 'bienvenida';

type TemplateData = Record<string, string | number>;

const TEMPLATES: Record<
  EmailTemplate,
  (d: TemplateData) => { subject: string; html: string }
> = {
  confirmacion_reserva: (d) => ({
    subject: `✅ Reserva confirmada — ${d.destino}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#3AB7A5;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">¡Tu reserva está confirmada!</h1>
        </div>
        <div style="padding:24px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 20px;">Hola <strong>${d.nombre}</strong>, tu viaje a <strong>${d.destino}</strong> está listo.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
            <tr style="background:#f9f9f9;"><td style="padding:10px 14px;font-weight:600;">Folio</td><td style="padding:10px 14px;">${d.folio}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600;">Destino</td><td style="padding:10px 14px;">${d.destino}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:10px 14px;font-weight:600;">Paquete</td><td style="padding:10px 14px;">${d.paquete}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600;">Fecha</td><td style="padding:10px 14px;">${d.fecha}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:10px 14px;font-weight:600;">Personas</td><td style="padding:10px 14px;">${d.personas}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600;">Total</td><td style="padding:10px 14px;color:#3AB7A5;font-weight:700;">$${Number(d.total).toLocaleString()} MXN</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin:0;">Mexcursión — Descubre México 🇲🇽</p>
        </div>
      </div>`,
  }),

  cancelacion_reserva: (d) => ({
    subject: `❌ Reserva cancelada — ${d.destino}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#DD331D;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Reserva cancelada</h1>
        </div>
        <div style="padding:24px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
          <p>Hola <strong>${d.nombre}</strong>, tu reserva ha sido cancelada.</p>
          <p><strong>Folio:</strong> ${d.folio} &nbsp;|&nbsp; <strong>Destino:</strong> ${d.destino}</p>
          ${
            Number(d.refund_amount) > 0
              ? `<p style="background:#e8f8f5;padding:14px;border-radius:8px;color:#3AB7A5;font-weight:600;">
                   Reembolso: $${Number(d.refund_amount).toLocaleString()} MXN<br>
                   <span style="font-weight:400;font-size:13px;color:#555;">Se procesará en 5-10 días hábiles según tu banco.</span>
                 </p>`
              : `<p style="background:#fff8e1;padding:14px;border-radius:8px;color:#b8860b;">No aplica reembolso según la política de cancelación seleccionada.</p>`
          }
          <p style="color:#888;font-size:12px;margin:20px 0 0;">Mexcursión — Descubre México 🇲🇽</p>
        </div>
      </div>`,
  }),

  modificacion_reserva: (d) => ({
    subject: `✏️ Reserva modificada — ${d.destino}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#3AB7A5;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Reserva actualizada</h1>
        </div>
        <div style="padding:24px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
          <p>Hola <strong>${d.nombre}</strong>, tu reserva fue modificada con éxito.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
            <tr style="background:#f9f9f9;"><td style="padding:10px 14px;font-weight:600;">Folio</td><td style="padding:10px 14px;">${d.folio}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600;">Destino</td><td style="padding:10px 14px;">${d.destino}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:10px 14px;font-weight:600;">Nueva fecha</td><td style="padding:10px 14px;">${d.fecha}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600;">Personas</td><td style="padding:10px 14px;">${d.personas}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin:0;">Mexcursión — Descubre México 🇲🇽</p>
        </div>
      </div>`,
  }),

  bienvenida: (d) => ({
    subject: '¡Bienvenido a Mexcursión! 🇲🇽',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#3AB7A5;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">¡Bienvenido, ${d.nombre}!</h1>
        </div>
        <div style="padding:24px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
          <p>Estás listo para descubrir los 32 estados de México. Explora destinos, crea itinerarios y reserva paquetes desde la app.</p>
          <p style="color:#888;font-size:12px;margin:20px 0 0;">Mexcursión — Descubre México 🇲🇽</p>
        </div>
      </div>`,
  }),
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    // Not configured — silently succeed so callers don't fail
    console.warn('RESEND_API_KEY not set — email skipped');
    return new Response(JSON.stringify({ sent: false, reason: 'not_configured' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json() as { to: string; template: EmailTemplate; data: TemplateData };
  const { to, template, data } = body;

  if (!to || !template || !data) {
    return new Response(JSON.stringify({ error: 'Missing fields: to, template, data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tmpl = TEMPLATES[template];
  if (!tmpl) {
    return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { subject, html } = tmpl(data);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Mexcursión <noreply@mexcursion.mx>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Resend error:', errText);
    // Return 200 so callers don't retry indefinitely
    return new Response(JSON.stringify({ sent: false, error: errText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ sent: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
