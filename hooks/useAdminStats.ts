import { useMemo } from 'react';
import { Reserva, Usuario } from '../components/Admin/tipos';

function formatTiempo(fecha: string, ahora: Date): string {
  const seg = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 1000);
  if (seg < 60)    { return 'Hace un momento'; }
  if (seg < 3600)  { return `Hace ${Math.floor(seg / 60)} min`; }
  if (seg < 86400) { return `Hace ${Math.floor(seg / 3600)}h`; }
  return `Hace ${Math.floor(seg / 86400)}d`;
}

function trend(a: number, b: number): number {
  return b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);
}

export type AdminStats = {
  totalReservas: number;
  ingresos: number;
  confirmadas: number;
  usuarios: number;
  destinosActivos: number;
  reservasHoy: number;
  crecimientoUsuarios: number;
  trendReservas: number;
  trendIngresos: number;
  topDestinos: { nombre: string; reservas: number }[];
  actividadReciente: { tipo: string; descripcion: string; tiempo: string }[];
};

export function useAdminStats(
  reservas: Reserva[],
  usuarios: Usuario[],
  destinos: { activo: boolean }[],
): AdminStats {
  return useMemo(() => {
    const ahora         = new Date();
    const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesPas  = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const enEsteMes = (f: string) => new Date(f) >= inicioEsteMes;
    const enMesPas  = (f: string) => new Date(f) >= inicioMesPas && new Date(f) < inicioEsteMes;

    const topDestinos = Object.entries(
      reservas.reduce<Record<string, number>>((acc, r) => {
        if (r.destino) { acc[r.destino] = (acc[r.destino] ?? 0) + 1; }
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, count]) => ({ nombre, reservas: count }));

    const actividadReciente = [
      ...[...reservas]
        .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
        .slice(0, 6)
        .map(r => ({
          tipo: 'reserva',
          descripcion: `Reserva ${r.estado}: ${r.destino} — ${r.nombre_usuario}`,
          tiempo: formatTiempo(r.creado_en, ahora),
          _ts: new Date(r.creado_en).getTime(),
        })),
      ...[...usuarios]
        .filter(u => !!u.creado_en)
        .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
        .slice(0, 4)
        .map(u => ({
          tipo: 'usuario',
          descripcion: `Nuevo usuario: ${u.nombre || u.correo}`,
          tiempo: formatTiempo(u.creado_en, ahora),
          _ts: new Date(u.creado_en).getTime(),
        })),
    ]
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 8)
      .map(({ tipo, descripcion, tiempo }) => ({ tipo, descripcion, tiempo }));

    const resEsteMes = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en)).length;
    const resMesPas  = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)).length;
    const ingEsteMes = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en) && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
    const ingMesPas  = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)  && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
    const usrEsteMes = usuarios.filter(u => u.creado_en && enEsteMes(u.creado_en)).length;
    const usrMesPas  = usuarios.filter(u => u.creado_en && enMesPas(u.creado_en)).length;

    return {
      totalReservas:       reservas.length,
      ingresos:            reservas.filter(r => r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0),
      confirmadas:         reservas.filter(r => r.estado === 'confirmada').length,
      usuarios:            usuarios.filter(u => u.activo).length,
      destinosActivos:     destinos.filter(d => d.activo).length,
      reservasHoy:         reservas.filter(r => r.creado_en && new Date(r.creado_en).toDateString() === ahora.toDateString()).length,
      crecimientoUsuarios: trend(usrEsteMes, usrMesPas),
      trendReservas:       trend(resEsteMes, resMesPas),
      trendIngresos:       trend(ingEsteMes, ingMesPas),
      topDestinos,
      actividadReciente,
    };
  }, [reservas, usuarios, destinos]);
}
