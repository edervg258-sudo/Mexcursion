// ============================================================
//  components/Admin/SeccionReservas.tsx
// ============================================================

import React from 'react';
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SkeletonFilas } from '../../app/(tabs)/skeletonloader';
import { useTemaContext } from '../../lib/TemaContext';
import { adminS } from './adminStyles';
import { C_ESTADO_BASE, Reserva, TRANSICIONES } from './tipos';

interface Props {
  reservas: Reserva[];
  reservasFiltradas: Reserva[];
  cargando: boolean;
  busqueda: string;
  filtroEstado: string;
  filtroFecha: string;
  orden: string;
  onBusqueda: (v: string) => void;
  onFiltroEstado: (v: string) => void;
  onFiltroFecha: (v: string) => void;
  onOrden: (v: string) => void;
  onCambiarEstado: (r: Reserva, nuevoEstado: string) => void;
}

export const SeccionReservas = React.memo(function SeccionReservas({
  reservas, reservasFiltradas, cargando,
  busqueda, filtroEstado, filtroFecha, orden,
  onBusqueda, onFiltroEstado, onFiltroFecha, onOrden, onCambiarEstado,
}: Props) {
  const { tema, isDark } = useTemaContext();

  return (
    <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
      <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
        Reservas{' '}
        <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
          ({reservasFiltradas.length}{reservasFiltradas.length !== reservas.length ? ` de ${reservas.length}` : ''})
        </Text>
      </Text>

      {cargando ? <SkeletonFilas cantidad={4} /> : (
        <>
          {/* Búsqueda */}
          <View style={[adminS.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, color: tema.texto, fontSize: 14 }}
              placeholder="Buscar por folio, usuario o destino…"
              placeholderTextColor={tema.textoMuted}
              value={busqueda}
              onChangeText={onBusqueda}
              returnKeyType="search"
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => onBusqueda('')}>
                <Text style={{ color: tema.textoMuted, fontSize: 16, paddingLeft: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Chips estado */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {['todas', 'pendiente', 'confirmada', 'completada', 'cancelada'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[adminS.chipFiltro, { backgroundColor: filtroEstado === f ? tema.primario : tema.superficieBlanca }]}
                  onPress={() => onFiltroEstado(f)}
                >
                  <Text style={[adminS.chipFiltroTxt, { color: filtroEstado === f ? '#fff' : tema.textoMuted }, filtroEstado === f && { fontWeight: '700' }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Chips fecha */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {[
                { id: 'todas', label: 'Cualquier fecha' },
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Últimos 7 días' },
                { id: 'mes', label: 'Últimos 30 días' },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[adminS.chipFiltro, { backgroundColor: filtroFecha === f.id ? tema.acento : tema.superficieBlanca }]}
                  onPress={() => onFiltroFecha(f.id)}
                >
                  <Text style={[adminS.chipFiltroTxt, { color: filtroFecha === f.id ? '#fff' : tema.textoMuted }, filtroFecha === f.id && { fontWeight: '700' }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Chips orden */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {[
                { id: 'reciente', label: 'Más nuevo' },
                { id: 'antiguo', label: 'Más antiguo' },
                { id: 'total-desc', label: 'Mayor total' },
                { id: 'total-asc', label: 'Menor total' },
              ].map(o => (
                <TouchableOpacity
                  key={o.id}
                  style={[adminS.chipFiltro, { backgroundColor: orden === o.id ? tema.acento : tema.superficieBlanca }]}
                  onPress={() => onOrden(o.id)}
                >
                  <Text style={[adminS.chipFiltroTxt, { color: orden === o.id ? '#fff' : tema.textoMuted }, orden === o.id && { fontWeight: '700' }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {reservasFiltradas.length === 0 ? (
            <View style={adminS.vacioCentrado}>
              <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>
                {reservas.length === 0
                  ? 'Sin reservas registradas'
                  : busqueda ? `Sin resultados para "${busqueda}"` : 'Sin resultados para este filtro'}
              </Text>
            </View>
          ) : reservasFiltradas.map(r => {
            const ce = C_ESTADO_BASE[r.estado] ?? { fondo: '#f0f0f0', texto: '#888', label: r.estado };
            const transiciones = TRANSICIONES[r.estado] ?? [];
            const esCancelada = r.estado === 'cancelada';
            const esPendiente = r.estado === 'pendiente';
            return (
              <View key={r.folio ?? r.id} style={[adminS.itemCard, {
                backgroundColor: esCancelada
                  ? (isDark ? '#2A1210' : '#FEF0EE')
                  : esPendiente
                    ? (isDark ? '#2A2410' : '#FEFBEC')
                    : tema.superficieBlanca,
                opacity: esCancelada ? 0.82 : 1,
              }]}>
                <View style={[adminS.barraEstado, { backgroundColor: ce.texto }]} />
                <View style={{ flex: 1 }}>
                  <View style={adminS.itemCardRow}>
                    <Text style={[adminS.itemNombre, {
                      color: esCancelada ? ce.texto : tema.texto,
                      textDecorationLine: esCancelada ? 'line-through' : 'none',
                    }]}>{r.folio}</Text>
                    <View style={[adminS.badge, { backgroundColor: ce.fondo }]}>
                      <Text style={[adminS.badgeTxt, { color: ce.texto }]}>{ce.label}</Text>
                    </View>
                  </View>
                  <Text style={[adminS.itemSub, { color: esCancelada ? ce.texto + 'AA' : tema.textoMuted }]}>
                    {r.nombre_usuario} · {r.destino}
                  </Text>
                  <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>
                    {r.fecha} · {r.personas} persona{r.personas !== 1 ? 's' : ''} · Paq. {r.paquete}
                  </Text>
                  <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>{r.metodo}</Text>
                  <Text style={[adminS.itemPrecio, {
                    color: esCancelada ? '#DD331D' : tema.acento,
                    textDecorationLine: esCancelada ? 'line-through' : 'none',
                  }]}>
                    {esCancelada ? '−' : ''}${(r.total ?? 0).toLocaleString()} MXN
                  </Text>
                  {transiciones.length > 0 && (
                    <View style={adminS.transicionRow}>
                      {transiciones.map(tr => (
                        <Pressable
                          key={tr.estado}
                          style={[adminS.btnTransicion, { borderColor: tr.color, backgroundColor: tr.color + '15' }]}
                          android_ripple={{ color: tr.color + '30', borderless: false }}
                          onPress={() => onCambiarEstado(r, tr.estado)}
                        >
                          <Text style={[adminS.btnTransicionTxt, { color: tr.color }]}>{tr.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
});
