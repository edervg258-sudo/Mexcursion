// ============================================================
//  components/Admin/SeccionReportes.tsx
// ============================================================

import React, { useMemo } from 'react';
import {
  Platform, Pressable, ScrollView, Share,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useTemaContext } from '../../lib/TemaContext';
import { Destino, Reserva, Usuario } from './tipos';

interface Props {
  reservas: Reserva[];
  destinos: Destino[];
  usuarios: Usuario[];
}

// ── CSV helpers ────────────────────────────────────────────────────────────

function escaparCSV(v: any): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function generarCSV(filas: Record<string, any>[]): string {
  if (!filas.length) return '';
  const cols = Object.keys(filas[0]);
  return [
    cols.join(','),
    ...filas.map(f => cols.map(c => escaparCSV(f[c])).join(',')),
  ].join('\n');
}

async function descargarCSV(csv: string, nombre: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: csv, title: nombre });
  }
}

// ── Barra simple ───────────────────────────────────────────────────────────

function BarraSimple({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={es.barraFondo}>
      <View style={[es.barraRelleno, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export const SeccionReportes = React.memo(function SeccionReportes({ reservas, destinos, usuarios }: Props) {
  const { tema } = useTemaContext();

  // ── Cómputos principales ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const ahora = new Date();

    // Ingresos totales (sin canceladas)
    const ingresoTotal = reservas
      .filter(r => r.estado !== 'cancelada')
      .reduce((s, r) => s + (r.total ?? 0), 0);

    // Distribución por estado
    const porEstado: Record<string, number> = { confirmada: 0, completada: 0, cancelada: 0, pendiente: 0 };
    reservas.forEach(r => { if (r.estado in porEstado) porEstado[r.estado]++; });
    const totalRes = reservas.length || 1;

    // Top 5 destinos por ingresos
    const agrupado: Record<string, { reservas: number; ingresos: number }> = {};
    reservas.filter(r => r.estado !== 'cancelada' && r.destino).forEach(r => {
      agrupado[r.destino] = agrupado[r.destino] ?? { reservas: 0, ingresos: 0 };
      agrupado[r.destino].reservas++;
      agrupado[r.destino].ingresos += r.total ?? 0;
    });
    const topDestinos = Object.entries(agrupado)
      .sort((a, b) => b[1].ingresos - a[1].ingresos)
      .slice(0, 5);
    const maxIngreso = Math.max(1, ...topDestinos.map(([, v]) => v.ingresos));

    // Ingresos por mes (últimos 6 meses)
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ahora);
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('es-MX', { month: 'short' }),
      };
    });
    const ingresosMes = meses.map(({ year, month, label }) => {
      const total = reservas
        .filter(r => r.estado !== 'cancelada' && r.creado_en)
        .filter(r => {
          const d = new Date(r.creado_en);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((s, r) => s + (r.total ?? 0), 0);
      return { label, total };
    });
    const maxMes = Math.max(1, ...ingresosMes.map(m => m.total));

    // Tasa de conversión (confirmadas + completadas / total)
    const exitosas = (porEstado.confirmada + porEstado.completada);
    const tasaConversion = reservas.length ? Math.round((exitosas / reservas.length) * 100) : 0;

    // Ticket promedio
    const ticketPromedio = exitosas
      ? Math.round(ingresoTotal / exitosas)
      : 0;

    return {
      ingresoTotal, porEstado, totalRes, topDestinos, maxIngreso,
      ingresosMes, maxMes, tasaConversion, ticketPromedio, exitosas,
    };
  }, [reservas]);

  // ── Exportar CSV ─────────────────────────────────────────────────────

  const exportarReservas = () => {
    const csv = generarCSV(reservas.map(r => ({
      folio: r.folio,
      usuario: r.nombre_usuario,
      destino: r.destino,
      paquete: r.paquete,
      fecha: r.fecha,
      personas: r.personas,
      total: r.total,
      metodo: r.metodo,
      estado: r.estado,
      creado_en: r.creado_en,
    })));
    descargarCSV(csv, 'reservas');
  };

  const exportarDestinos = () => {
    const csv = generarCSV(destinos.map(d => ({
      id: d.id,
      nombre: d.nombre,
      categoria: d.categoria,
      precio: d.precio,
      descripcion: d.descripcion,
      activo: d.activo ? 'sí' : 'no',
    })));
    descargarCSV(csv, 'destinos');
  };

  const exportarUsuarios = () => {
    const csv = generarCSV(usuarios.map(u => ({
      nombre: u.nombre,
      correo: u.correo,
      nombre_usuario: u.nombre_usuario,
      tipo: u.tipo,
      activo: u.activo ? 'sí' : 'no',
      reservas: u.reservas_count,
      registrado: u.creado_en,
    })));
    descargarCSV(csv, 'usuarios');
  };

  const COLORES_ESTADO: Record<string, string> = {
    confirmada: '#3AB7A5',
    completada: '#27AE60',
    cancelada:  '#DD331D',
    pendiente:  '#9A7118',
  };

  return (
    <ScrollView contentContainerStyle={[es.scroll, { backgroundColor: tema.fondo }]}>
      <Text style={[es.titulo, { color: tema.texto }]}>Reportes</Text>

      {/* ── KPI cards ── */}
      <View style={es.gridKpi}>
        {[
          { label: 'Ingresos totales',   valor: `$${stats.ingresoTotal.toLocaleString()}`, color: '#27AE60' },
          { label: 'Ticket promedio',    valor: `$${stats.ticketPromedio.toLocaleString()}`, color: tema.primario },
          { label: 'Tasa de éxito',      valor: `${stats.tasaConversion}%`, color: '#3AB7A5' },
          { label: 'Reservas exitosas',  valor: stats.exitosas, color: '#3E5FA8' },
        ].map(({ label, valor, color }) => (
          <View key={label} style={[es.kpiCard, { backgroundColor: tema.superficieBlanca, borderTopColor: color }]}>
            <Text style={[es.kpiValor, { color }]}>{valor}</Text>
            <Text style={[es.kpiLabel, { color: tema.textoMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Ingresos por mes ── */}
      <View style={[es.seccion, { backgroundColor: tema.superficieBlanca }]}>
        <Text style={[es.seccionTitulo, { color: tema.texto }]}>Ingresos últimos 6 meses</Text>
        {stats.ingresosMes.map(({ label, total }) => (
          <View key={label} style={es.filaMes}>
            <Text style={[es.mesMes, { color: tema.textoMuted }]}>{label}</Text>
            <View style={{ flex: 1 }}>
              <BarraSimple pct={(total / stats.maxMes) * 100} color={tema.primario} />
            </View>
            <Text style={[es.mesMonto, { color: tema.texto }]}>
              {total > 0 ? `$${total.toLocaleString()}` : '—'}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Distribución por estado ── */}
      <View style={[es.seccion, { backgroundColor: tema.superficieBlanca }]}>
        <Text style={[es.seccionTitulo, { color: tema.texto }]}>Distribución de reservas</Text>
        {Object.entries(stats.porEstado).map(([estado, cant]) => {
          const pct = Math.round((cant / stats.totalRes) * 100);
          const color = COLORES_ESTADO[estado] ?? '#aaa';
          return (
            <View key={estado} style={es.filaEstado}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[es.estadoLabel, { color: tema.texto }]}>
                  {estado.charAt(0).toUpperCase() + estado.slice(1)}
                </Text>
                <Text style={[es.estadoPct, { color }]}>{cant} ({pct}%)</Text>
              </View>
              <BarraSimple pct={pct} color={color} />
            </View>
          );
        })}
      </View>

      {/* ── Top destinos ── */}
      {stats.topDestinos.length > 0 && (
        <View style={[es.seccion, { backgroundColor: tema.superficieBlanca }]}>
          <Text style={[es.seccionTitulo, { color: tema.texto }]}>Top destinos por ingresos</Text>
          {stats.topDestinos.map(([nombre, { reservas: res, ingresos }], idx) => (
            <View key={nombre} style={es.filaDestino}>
              <View style={[es.rank, { backgroundColor: idx === 0 ? tema.primario : idx === 1 ? '#9A7118' : '#3E5FA8' }]}>
                <Text style={es.rankTxt}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[es.destinoNombre, { color: tema.texto }]} numberOfLines={1}>{nombre}</Text>
                  <Text style={[es.destinoMonto, { color: '#27AE60' }]}>${ingresos.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <BarraSimple pct={(ingresos / stats.maxIngreso) * 100} color={tema.primario} />
                  </View>
                  <Text style={[es.reservasCnt, { color: tema.textoMuted }]}>{res} reserva{res !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Exportar CSV ── */}
      <View style={[es.seccion, { backgroundColor: tema.superficieBlanca }]}>
        <Text style={[es.seccionTitulo, { color: tema.texto }]}>Exportar datos</Text>
        <Text style={[es.seccionSub, { color: tema.textoMuted }]}>
          {Platform.OS === 'web' ? 'Descarga archivos CSV directamente' : 'Comparte los datos como archivo CSV'}
        </Text>
        <View style={es.botonesExport}>
          {[
            { label: 'Reservas', onPress: exportarReservas, color: tema.primario },
            { label: 'Destinos', onPress: exportarDestinos, color: '#3E5FA8' },
            { label: 'Usuarios', onPress: exportarUsuarios, color: '#9A7118' },
          ].map(({ label, onPress, color }) => (
            <Pressable
              key={label}
              style={[es.btnExport, { borderColor: color, backgroundColor: color + '12' }]}
              android_ripple={{ color: color + '30', borderless: false }}
              onPress={onPress}
            >
              <Text style={[es.btnExportTxt, { color }]}>⬇ {label}.csv</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
});

const es = StyleSheet.create({
  scroll:        { padding: 16, gap: 16, paddingBottom: 120 },
  titulo:        { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  gridKpi:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard:       { flex: 1, minWidth: 140, borderRadius: 14, padding: 16, borderTopWidth: 4, elevation: 1 },
  kpiValor:      { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  kpiLabel:      { fontSize: 12, fontWeight: '500' },
  seccion:       { borderRadius: 14, padding: 16, elevation: 1, gap: 12 },
  seccionTitulo: { fontSize: 16, fontWeight: '700' },
  seccionSub:    { fontSize: 13, marginTop: -6 },
  filaMes:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mesMes:        { width: 36, fontSize: 12, fontWeight: '600' },
  mesMonto:      { width: 80, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  barraFondo:    { height: 8, borderRadius: 4, backgroundColor: '#f0f0f0', overflow: 'hidden', flex: 1 },
  barraRelleno:  { height: '100%', borderRadius: 4 },
  filaEstado:    { gap: 2 },
  estadoLabel:   { fontSize: 13, fontWeight: '600' },
  estadoPct:     { fontSize: 13, fontWeight: '700' },
  filaDestino:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rank:          { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankTxt:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  destinoNombre: { fontSize: 13, fontWeight: '600', flex: 1 },
  destinoMonto:  { fontSize: 13, fontWeight: '700' },
  reservasCnt:   { fontSize: 11, width: 60, textAlign: 'right' },
  botonesExport: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btnExport:     { flex: 1, minWidth: 100, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  btnExportTxt:  { fontSize: 13, fontWeight: '700' },
});
