// supabase/functions/enviar-email-reserva/index.ts
// Envía correos de notificación de reserva usando Resend.
// Variables de entorno requeridas: RESEND_API_KEY, FROM_EMAIL (opcional)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'reservas@mexcursion.com';

interface ReservaEmailPayload {
  to: string;
  nombre: string;
  folio: string;
  destino: string;
  paquete: string;
  fecha: string;
  personas: number;
  total: number;
  estado: string;
  metodo: string;
}

function asunto(estado: string): string {
  switch (estado) {
    case 'pendiente':  return 'Tu reserva está pendiente de pago — Mexcursion';
    case 'confirmada': return '¡Tu reserva fue confirmada! — Mexcursion';
    case 'cancelada':  return 'Tu reserva fue cancelada — Mexcursion';
    default:           return 'Actualización de tu reserva — Mexcursion';
  }
}

function cuerpoHtml(p: ReservaEmailPayload): string {
  const formatPeso = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const colorEstado: Record<string, string> = {
    pendiente:  '#9A7118',
    confirmada: '#3AB7A5',
    cancelada:  '#DD331D',
  };
  const badgeBg: Record<string, string> = {
    pendiente:  '#FEF8E8',
    confirmada: '#E8F5F2',
    cancelada:  '#FEF0EE',
  };
  const labelEstado: Record<string, string> = {
    pendiente:  'Pendiente de pago',
    confirmada: 'Confirmada',
    cancelada:  'Cancelada',
  };
  const mensajes: Record<string, string> = {
    pendiente:  `Tu reserva ha sido registrada y está <strong>pendiente de pago</strong> con ${p.metodo.toUpperCase()}. Completa tu pago para asegurar tu lugar.`,
    confirmada: `¡Excelentes noticias! Tu reserva ha sido <strong>confirmada</strong>. ¡Prepárate para una gran experiencia en ${p.destino}!`,
    cancelada:  `Tu reserva ha sido <strong>cancelada</strong>. Si tienes dudas o deseas hacer una nueva reserva, contáctanos.`,
  };

  const color = colorEstado[p.estado] ?? '#333';
  const bg    = badgeBg[p.estado] ?? '#f5f5f5';
  const label = labelEstado[p.estado] ?? p.estado;
  const msg   = mensajes[p.estado] ?? '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${asunto(p.estado)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#3AB7A5;padding:28px 32px">
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:13px;letter-spacing:1px;text-transform:uppercase">Mexcursion</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.3">${asunto(p.estado)}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;color:#555;font-size:16px">Hola, <strong style="color:#222">${p.nombre || 'viajero'}</strong></p>
            <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6">${msg}</p>

            <!-- Estado badge -->
            <div style="display:inline-block;background:${bg};color:${color};border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;margin-bottom:24px">
              ${label}
            </div>

            <!-- Detalle reserva -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:10px;overflow:hidden">
              <tr style="background:#fafafa">
                <td colspan="2" style="padding:12px 16px;font-size:12px;color:#888;font-weight:700;letter-spacing:.8px;text-transform:uppercase">Detalle de tu reserva</td>
              </tr>
              <tr style="border-top:1px solid #eee">
                <td style="padding:12px 16px;color:#888;font-size:14px">Folio</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;font-weight:700;text-align:right">${p.folio}</td>
              </tr>
              <tr style="border-top:1px solid #eee;background:#fafafa">
                <td style="padding:12px 16px;color:#888;font-size:14px">Destino</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;text-align:right">${p.destino}</td>
              </tr>
              <tr style="border-top:1px solid #eee">
                <td style="padding:12px 16px;color:#888;font-size:14px">Paquete</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;text-align:right">${p.paquete}</td>
              </tr>
              <tr style="border-top:1px solid #eee;background:#fafafa">
                <td style="padding:12px 16px;color:#888;font-size:14px">Fecha</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;text-align:right">${p.fecha}</td>
              </tr>
              <tr style="border-top:1px solid #eee">
                <td style="padding:12px 16px;color:#888;font-size:14px">Personas</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;text-align:right">${p.personas}</td>
              </tr>
              <tr style="border-top:1px solid #eee;background:#fafafa">
                <td style="padding:12px 16px;color:#888;font-size:14px">Método de pago</td>
                <td style="padding:12px 16px;color:#222;font-size:14px;text-align:right">${p.metodo.toUpperCase()}</td>
              </tr>
              <tr style="border-top:2px solid #eee">
                <td style="padding:14px 16px;color:#333;font-size:15px;font-weight:700">Total</td>
                <td style="padding:14px 16px;color:#3AB7A5;font-size:18px;font-weight:700;text-align:right">${formatPeso(p.total)}</td>
              </tr>
            </table>

            <p style="margin:28px 0 0;color:#aaa;font-size:12px;line-height:1.6">
              Si no reconoces esta reserva, puedes ignorar este mensaje.<br>
              Este correo fue generado automáticamente por Mexcursion.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee">
            <p style="margin:0;color:#bbb;font-size:12px;text-align:center">© 2025 Mexcursion · Todos los derechos reservados</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (!RESEND_API_KEY) {
    console.error('enviar-email-reserva: falta RESEND_API_KEY');
    return new Response(JSON.stringify({ error: 'config_missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: ReservaEmailPayload;
  try {
    payload = await req.json() as ReservaEmailPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { to, nombre, folio, destino, paquete, fecha, personas, total, estado, metodo } = payload;
  if (!to || !folio || !estado) {
    return new Response(JSON.stringify({ error: 'campos_requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: asunto(estado),
      html: cuerpoHtml({ to, nombre, folio, destino, paquete, fecha, personas, total, estado, metodo }),
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    console.error('enviar-email-reserva Resend error:', resendRes.status, detail);
    return new Response(JSON.stringify({ error: 'resend_error', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await resendRes.json();
  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
