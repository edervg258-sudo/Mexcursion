// components/AdminDashboard.tsx - Dashboard mejorado para panel admin
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SkeletonFilas } from '../app/(tabs)/skeletonloader';
import { Tema } from '../lib/tema';

interface DashboardStats {
  totalReservas: number;
  ingresos: number;
  confirmadas: number;
  pendientes: number;
  completadas: number;
  canceladas: number;
  usuarios: number;
  destinosActivos: number;
  reservasHoy: number;
  crecimientoUsuarios: number;
  trendReservas: number;
  trendIngresos: number;
  topDestinos: { nombre: string; reservas: number }[];
  actividadReciente: { tipo: string; descripcion: string; tiempo: string }[];
}

interface AdminDashboardProps {
  stats: DashboardStats;
  cargando: boolean;
  esPC: boolean;
  onIrAPendientes?: () => void;
}

export function AdminDashboard({ stats, cargando, esPC, onIrAPendientes }: AdminDashboardProps) {
  const StatCard = ({ label, valor, color, trend }: { 
    label: string; 
    valor: string | number; 
    color: string; 
    trend?: number;
  }) => (
    <View style={[estilos.statCard, { borderTopColor: color, ...(esPC && estilos.statCardPC) }]}>
      <View style={estilos.statHeader}>
        <Text style={[estilos.statValor, { color }]}>{valor}</Text>
        {trend !== undefined && (
          <View style={[estilos.trendBadge, { backgroundColor: trend > 0 ? '#D4EDDA' : '#F8D7DA' }]}>
            <Text style={[estilos.trendText, { color: trend > 0 ? '#155724' : '#721C24' }]}>
              {trend > 0 ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      <Text style={estilos.statLabel}>{label}</Text>
    </View>
  );

  const _QuickActions = () => (
    <View style={estilos.quickActions}>
      <Text style={estilos.sectionTitle}>Acciones rápidas</Text>
      <View style={[estilos.actionsGrid, esPC && estilos.actionsGridPC]}>
        <View style={[estilos.actionCard, { backgroundColor: Tema.primarioSuave }]}>
          <Text style={estilos.actionTitle}>Ver reportes</Text>
          <Text style={estilos.actionDesc}>Análisis detallado</Text>
        </View>
        <View style={[estilos.actionCard, { backgroundColor: '#FEF8E8' }]}>
          <Text style={estilos.actionTitle}>Gestionar usuarios</Text>
          <Text style={estilos.actionDesc}>Administrar roles</Text>
        </View>
        <View style={[estilos.actionCard, { backgroundColor: '#F0F8FF' }]}>
          <Text style={estilos.actionTitle}>Configurar destinos</Text>
          <Text style={estilos.actionDesc}>Añadir nuevos lugares</Text>
        </View>
        <View style={[estilos.actionCard, { backgroundColor: '#FFF5F5' }]}>
          <Text style={estilos.actionTitle}>Notificaciones</Text>
          <Text style={estilos.actionDesc}>Enviar alertas</Text>
        </View>
      </View>
    </View>
  );

  const TopDestinos = ({ topDestinos }: { topDestinos: { nombre: string; reservas: number }[] }) => (
    <View style={estilos.topDestinos}>
      <Text style={estilos.sectionTitle}>Destinos populares</Text>
      <View style={estilos.destinosList}>
        {topDestinos.map((destino, index) => (
          <View key={destino.nombre} style={estilos.destinoItem}>
            <View style={[estilos.destinoRank, { backgroundColor: index === 0 ? Tema.primario : index === 1 ? '#9A7118' : '#3E5FA8' }]}>
              <Text style={estilos.destinoRankText}>{index + 1}</Text>
            </View>
            <Text style={estilos.destinoNombre}>{destino.nombre}</Text>
            <View style={estilos.destinoReservas}>
              <Text style={estilos.destinoReservasText}>{destino.reservas} reservas</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (cargando) {
    return (
      <ScrollView contentContainerStyle={estilos.seccionScroll}>
        <Text style={estilos.seccionTitulo}>Panel general</Text>
        <SkeletonFilas cantidad={4} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.seccionScroll}>
      <Text style={estilos.seccionTitulo}>Panel de administración</Text>

      {/* Alerta de reservas pendientes */}
      {stats.pendientes > 0 && (
        <TouchableOpacity
          onPress={onIrAPendientes}
          activeOpacity={0.8}
          style={estilos.alertaPendientes}
        >
          <View style={estilos.alertaPendientesLeft}>
            <Text style={estilos.alertaPendientesIcono}>⏳</Text>
            <View>
              <Text style={estilos.alertaPendientesTitulo}>
                {stats.pendientes} reserva{stats.pendientes !== 1 ? 's' : ''} pendiente{stats.pendientes !== 1 ? 's' : ''} de confirmar
              </Text>
              <Text style={estilos.alertaPendientesSub}>
                Pagos SPEI u OXXO esperando verificación
              </Text>
            </View>
          </View>
          <Text style={estilos.alertaPendientesFlecha}>›</Text>
        </TouchableOpacity>
      )}

      {/* Stats principales */}
      <View style={[estilos.gridStats, esPC && estilos.gridStatsPC]}>
        <StatCard label="Reservas totales"  valor={stats.totalReservas}                    color={Tema.primario}      trend={stats.trendReservas} />
        <StatCard label="Ingresos MXN"      valor={`$${stats.ingresos.toLocaleString()}`}  color="#27AE60"            trend={stats.trendIngresos} />
        <StatCard label="Confirmadas"       valor={stats.confirmadas}                       color={Tema.primario} />
        <StatCard label="Pendientes"        valor={stats.pendientes}                        color="#9A7118" />
        <StatCard label="Completadas"       valor={stats.completadas}                       color="#3E5FA8" />
        <StatCard label="Canceladas"        valor={stats.canceladas}                        color="#DD331D" />
        <StatCard label="Usuarios activos"  valor={stats.usuarios}                          color="#3E5FA8"            trend={stats.crecimientoUsuarios} />
        <StatCard label="Destinos activos"  valor={stats.destinosActivos}                   color={Tema.primarioOscuro} />
        <StatCard label="Reservas hoy"      valor={stats.reservasHoy}                       color="#E91E63" />
      </View>

      {/* Destinos populares */}
      {stats.topDestinos.length > 0 ? (
        <TopDestinos topDestinos={stats.topDestinos} />
      ) : (
        <View style={estilos.topDestinos}>
          <Text style={estilos.sectionTitle}>Destinos populares</Text>
          <View style={[estilos.destinosList, { alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={{ color: '#aaa', fontSize: 14 }}>Sin reservas registradas aún</Text>
          </View>
        </View>
      )}

      {/* Actividad reciente */}
      <View style={estilos.activitySummary}>
        <Text style={estilos.sectionTitle}>Actividad reciente</Text>
        <View style={estilos.activityList}>
          {stats.actividadReciente.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: '#aaa', fontSize: 14 }}>Sin actividad registrada</Text>
            </View>
          ) : stats.actividadReciente.map((actividad, index) => (
            <View key={index} style={[estilos.activityItem, index === stats.actividadReciente.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[
                estilos.activityDot,
                { backgroundColor: actividad.tipo === 'reserva' ? Tema.primario : '#27AE60' },
              ]} />
              <Text style={estilos.activityText} numberOfLines={1}>{actividad.descripcion}</Text>
              <Text style={estilos.activityTime}>{actividad.tiempo}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  seccionScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  alertaPendientes: {
    backgroundColor: '#FEF8E8',
    borderWidth: 1,
    borderColor: '#9A7118',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertaPendientesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  alertaPendientesIcono: {
    fontSize: 28,
  },
  alertaPendientesTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A5A10',
  },
  alertaPendientesSub: {
    fontSize: 12,
    color: '#9A7118',
    marginTop: 2,
  },
  alertaPendientesFlecha: {
    fontSize: 24,
    color: '#9A7118',
    fontWeight: '700',
  },
  seccionTitulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#222',
    marginBottom: 24,
  },
  gridStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  gridStatsPC: {
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardPC: {
    minWidth: 200,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statValor: {
    fontSize: 32,
    fontWeight: '800',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionsGridPC: {
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  topDestinos: {
    marginBottom: 32,
  },
  destinosList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  destinoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  destinoRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destinoRankText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  destinoNombre: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  destinoReservas: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  destinoReservasText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activitySummary: {
    marginBottom: 32,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#222',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});
