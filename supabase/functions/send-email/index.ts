// Supabase Edge Function: send-email
// Proveedor: Resend (https://resend.com)
// Variables de entorno requeridas: RESEND_API_KEY, EMAIL_FROM

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API = 'https://api.resend.com/emails';

type Payload =
  | { tipo: 'confirmacion'; folio: string; destino: string; paquete: string; fecha: string; personas: number; total: number; email: string; nombre: string }
  | { tipo: 'cancelacion'; folio: string; destino: string; politica: { costo: number; reembolsable: number; mensaje: string }; email: string; nombre: string }
  | { tipo: 'bienvenida'; email: string; nombre: string };

function htmlConfirmacion(p: Extract<Payload, { tipo: 'confirmacion' }>) {
  return `
<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#3AB7A5;margin:0">Mexcursión</h1>
    <p style="color:#666;margin:4px 0">Descubre México</p>
  </div>
  <h2>¡Tu reserva está confirmada! 🎉</h2>
  <p>Hola <strong>${p.nombre}</strong>, tu aventura está lista.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0">
    <tr style="background:#f5f5f5"><td style="padding:12px;font-weight:bold">Folio</td><td style="padding:12px">${p.folio}</td></tr>
    <tr><td style="padding:12px;font-weight:bold">Destino</td><td style="padding:12px">${p.destino}</td></tr>
    <tr style="background:#f5f5f5"><td style="padding:12px;font-weight:bold">Paquete</td><td style="padding:12px">${p.paquete}</td></tr>
    <tr><td style="padding:12px;font-weight:bold">Fecha</td><td style="padding:12px">${p.fecha}</td></tr>
    <tr style="background:#f5f5f5"><td style="padding:12px;font-weight:bold">Personas</td><td style="padding:12px">${p.personas}</td></tr>
    <tr><td style="padding:12px;font-weight:bold">Total</td><td style="padding:12px"><strong style="color:#3AB7A5">$${p.total.toLocaleString('es-MX')} MXN</strong></td></tr>
  </table>
  <p style="color:#666;font-size:14px">Guarda este folio para cualquier consulta. Nos vemos en ${p.destino} 🌮</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="color:#999;font-size:12px;text-align:center">Mexcursión · México</p>
</body></html>`;
}

function htmlCancelacion(p: Extract<Payload, { tipo: 'cancelacion' }>) {
  return `
<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#3AB7A5;margin:0">Mexcursión</h1>
  </div>
  <h2>Reserva cancelada</h2>
  <p>Hola <strong>${p.nombre}</strong>, confirmamos la cancelación de tu reserva.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0">
    <tr style="background:#f5f5f5"><td style="padding:12px;font-weight:bold">Folio</td><td style="padding:12px">${p.folio}</td></tr>
    <tr><td style="padding:12px;font-weight:bold">Destino</td><td style="padding:12px">${p.destino}</td></tr>
    <tr style="background:#f5f5f5"><td style="padding:12px;font-weight:bold">Costo cancelación</td><td style="padding:12px">$${p.politica.costo.toLocaleString('es-MX')} MXN</td></tr>
    <tr><td style="padding:12px;font-weight:bold">Reembolsable</td><td style="padding:12px"><strong style="color:#3AB7A5">$${p.politica.reembolsable.toLocaleString('es-MX')} MXN</strong></td></tr>
  </table>
  <p>${p.politica.mensaje}</p>
  <p style="color:#666;font-size:14px">Esperamos verte pronto en otra aventura por México.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="color:#999;font-size:12px;text-align:center">Mexcursión · México</p>
</body></html>`;
}

function htmlBienvenida(p: Extract<Payload, { tipo: 'bienvenida' }>) {
  return `
<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#3AB7A5;margin:0">Mexcursión</h1>
    <p style="color:#666;margin:4px 0">Descubre México</p>
  </div>
  <h2>¡Bienvenido, ${p.nombre}! 🌮</h2>
  <p>Tu cuenta está lista. Explora los 32 estados de México y empieza a planear tu próxima aventura.</p>
  <p style="color:#666;font-size:14px">Si no creaste esta cuenta, ignora este mensaje.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="color:#999;font-size:12px;text-align:center">Mexcursión · México</p>
</body></html>`;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'noreply@mexcursion.com';

  if (!resendKey) {
    console.warn('send-email: RESEND_API_KEY no configurada — email omitido');
    return new Response(JSON.stringify({ ok: false, reason: 'no_key' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  let subject: string;
  let html: string;

  switch (payload.tipo) {
    case 'confirmacion':
      subject = `Reserva confirmada · ${payload.folio} — Mexcursión`;
      html = htmlConfirmacion(payload);
      break;
    case 'cancelacion':
      subject = `Reserva cancelada · ${payload.folio} — Mexcursión`;
      html = htmlCancelacion(payload);
      break;
    case 'bienvenida':
      subject = '¡Bienvenido a Mexcursión! 🌮';
      html = htmlBienvenida(payload);
      break;
    default:
      return new Response('Unknown email type', { status: 400 });
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [payload.email],
      subject,
      html,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
