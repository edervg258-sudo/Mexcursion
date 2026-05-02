// supabase/functions/confirmar-reserva/index.ts
// Edge Function: valida, inserta la reserva atómicamente y envía email de confirmación.
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — inyectadas automáticamente por Supabase
//   RESEND_API_KEY                           — agregar en Dashboard > Edge Functions > Secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METODOS_OK = new Set(['tarjeta', 'spei', 'oxxo']);
const ESTADOS_OK  = new Set(['confirmada', 'pendiente', 'cancelada']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── 1. Autenticación ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authErr || !user) return json({ error: 'Token inválido' }, 401);

  // ── 2. Payload ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo JSON inválido' }, 400);
  }

  const folio     = String(body.folio    ?? '').trim().toUpperCase().slice(0, 40);
  const destino   = String(body.destino  ?? '').trim();
  const paquete   = String(body.paquete  ?? '').trim();
  const fecha     = String(body.fecha    ?? '').trim();
  const metodo    = String(body.metodo   ?? '').toLowerCase();
  const estado    = String(body.estado   ?? '').toLowerCase();
  const personas  = Number(body.personas ?? 0);
  const total     = Number(body.total    ?? -1);
  const notas     = String(body.notas    ?? '').trim();

  if (folio.length < 4)                         return json({ error: 'Folio inválido' }, 400);
  if (!destino || !paquete)                     return json({ error: 'Destino o paquete vacío' }, 400);
  if (!METODOS_OK.has(metodo))                  return json({ error: 'Método de pago inválido' }, 400);
  if (!ESTADOS_OK.has(estado))                  return json({ error: 'Estado inválido' }, 400);
  if (!Number.isFinite(personas) || personas < 1 || personas > 20)
    return json({ error: 'Número de personas inválido' }, 400);
  if (!Number.isFinite(total) || total < 0)     return json({ error: 'Total inválido' }, 400);

  // ── 3. Idempotencia ───────────────────────────────────────────────────────
  const { data: existente } = await supabaseAdmin
    .from('reservas')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('folio', folio)
    .maybeSingle();

  if (existente?.id) return json({ resultado: 'idempotent' });

  // ── 4. Inserción atómica ──────────────────────────────────────────────────
  // Usamos service_role para que el trigger `validar_reserva` sea la única
  // barrera de seguridad del lado del servidor, sin interferencia de RLS.
  const fechaISO = /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)
    ? fecha.split('/').reverse().join('-')
    : fecha;

  const fila: Record<string, unknown> = {
    usuario_id: user.id,
    folio,
    destino,
    paquete,
    fecha: fechaISO,
    personas,
    total,
    metodo,
    estado,
  };
  if (notas) fila.notas = notas;

  const { error: insertErr } = await supabaseAdmin.from('reservas').insert(fila);
  if (insertErr) {
    if ((insertErr as { code?: string }).code === '23505') return json({ resultado: 'idempotent' });
    console.error('insertar reserva:', insertErr.message);
    return json({ error: 'Error al guardar la reserva' }, 500);
  }

  // Crear notificación server-side (evita problemas de RLS del cliente)
  const confirmada = estado === 'confirmada';
  await supabaseAdmin.from('notificaciones').insert({
    usuario_id: user.id,
    tipo: confirmada ? 'pago_exitoso' : 'pago_pendiente',
    titulo: confirmada ? `Pago confirmado - Folio: ${folio}` : `Pago pendiente - Folio: ${folio}`,
    mensaje: JSON.stringify({ folio, metodo, estado }),
  }).catch(err => console.error('notificación fallida (ignorada):', err.message));

  // ── 5. Email de confirmación (Resend) ─────────────────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const correo    = user.email;

  if (resendKey && correo) {
    // Obtenemos el nombre del perfil del usuario
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('nombre')
      .eq('id', user.id)
      .maybeSingle();

    const nombre      = perfil?.nombre ?? 'Viajero';
    const confirmada  = estado === 'confirmada';
    const asunto      = confirmada
      ? `✅ Reserva confirmada — ${destino}`
      : `⏳ Reserva pendiente de pago — ${destino}`;

    const htmlMetodo: Record<string, string> = {
      tarjeta: 'Tarjeta de crédito/débito',
      spei:    'Transferencia SPEI',
      oxxo:    'Pago en OXXO',
    };

    const instruccionesPendiente = metodo === 'spei'
      ? '<p>Realiza tu transferencia SPEI y tu reserva se confirmará en minutos.</p>'
      : '<p>Presenta tu folio en cualquier tienda OXXO para completar el pago.</p>';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}
  h1{color:#2563eb}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  td{padding:10px;border-bottom:1px solid #eee}
  td:first-child{font-weight:bold;width:40%}
  .folio{background:#f0f9ff;padding:16px;border-radius:8px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:2px;color:#1e40af}
  .footer{margin-top:32px;font-size:12px;color:#888}
</style></head>
<body>
  <h1>${confirmada ? '¡Tu reserva está confirmada!' : 'Reserva recibida — pago pendiente'}</h1>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>${confirmada
    ? `Tu reserva en <strong>${destino}</strong> ha sido confirmada exitosamente.`
    : `Recibimos tu reserva en <strong>${destino}</strong>. Completa el pago para confirmarla.`
  }</p>

  ${!confirmada ? instruccionesPendiente : ''}

  <div class="folio">${folio}</div>

  <table>
    <tr><td>Destino</td><td>${destino}</td></tr>
    <tr><td>Paquete</td><td>${paquete}</td></tr>
    <tr><td>Fecha</td><td>${fecha}</td></tr>
    <tr><td>Personas</td><td>${personas}</td></tr>
    <tr><td>Total</td><td>$${Number(total).toLocaleString('es-MX')} MXN</td></tr>
    <tr><td>Método de pago</td><td>${htmlMetodo[metodo] ?? metodo}</td></tr>
    <tr><td>Estado</td><td>${confirmada ? '✅ Confirmada' : '⏳ Pendiente'}</td></tr>
  </table>

  <p>Gracias por elegir <strong>Mexcursión</strong>. ¡Que disfrutes tu viaje!</p>
  <div class="footer">Si tienes dudas, responde a este correo.</div>
</body>
</html>`;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: ['edervg258@gmail.com'],
          subject: asunto,
          html,
        }),
      });
      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error('Resend error:', emailRes.status, errBody);
      }
    } catch (emailErr) {
      // El email falla en silencio — la reserva ya está guardada
      console.error('email send failed:', emailErr);
    }
  }

  return json({ resultado: 'saved' });
});
