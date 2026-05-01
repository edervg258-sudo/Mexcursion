import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = 'reservas@mexcursion.app';

interface ReservaPayload {
  correo: string;
  nombre: string;
  folio: string;
  destino: string;
  paquete: string;
  fecha: string;
  personas: number;
  total: number;
  metodo: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const payload: ReservaPayload = await req.json();

    const metodoLabel: Record<string, string> = {
      tarjeta: 'Tarjeta de crédito/débito',
      spei:    'Transferencia SPEI',
      oxxo:    'Pago en OXXO',
    };

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #FAF7F0; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 520px; margin: 0 auto; border-top: 4px solid #3AB7A5; }
  h1 { color: #333; font-size: 22px; margin-bottom: 4px; }
  .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
  .folio { background: #f0faf8; border-radius: 10px; padding: 14px 20px; margin-bottom: 24px; }
  .folio-num { font-size: 22px; font-weight: 800; color: #3AB7A5; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  td:first-child { color: #888; width: 40%; }
  td:last-child { color: #333; font-weight: 600; }
  .total { font-size: 18px; font-weight: 800; color: #3AB7A5; }
  .footer { text-align: center; color: #bbb; font-size: 12px; margin-top: 24px; }
</style></head>
<body>
  <div class="card">
    <h1>¡Reserva confirmada! 🎉</h1>
    <p class="sub">Hola ${payload.nombre}, tu reserva ha sido registrada exitosamente.</p>
    <div class="folio">
      <div style="color:#888;font-size:12px;margin-bottom:4px">Número de folio</div>
      <div class="folio-num">${payload.folio}</div>
    </div>
    <table>
      <tr><td>Destino</td><td>${payload.destino}</td></tr>
      <tr><td>Paquete</td><td style="text-transform:capitalize">${payload.paquete}</td></tr>
      <tr><td>Fecha</td><td>${payload.fecha}</td></tr>
      <tr><td>Personas</td><td>${payload.personas}</td></tr>
      <tr><td>Método de pago</td><td>${metodoLabel[payload.metodo] ?? payload.metodo}</td></tr>
      <tr><td>Total</td><td class="total">$${payload.total.toLocaleString('es-MX')} MXN</td></tr>
    </table>
    <p class="footer">Mexcursión · Descubre México</p>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [payload.correo],
        subject: `Confirmación de reserva ${payload.folio} — ${payload.destino}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Email no enviado' }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('confirmar-reserva error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
