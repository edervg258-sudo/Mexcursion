// ============================================================
//  components/Admin/SeccionUsuarios.tsx
// ============================================================

import React from 'react';
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SkeletonFilas } from '../../app/(tabs)/skeletonloader';
import { useTemaContext } from '../../lib/TemaContext';
import { adminS } from './adminStyles';
import { Usuario } from './tipos';

interface Props {
  usuarios: Usuario[];
  usuariosFiltrados: Usuario[];
  cargando: boolean;
  busqueda: string;
  filtro: string;
  orden: string;
  onBusqueda: (v: string) => void;
  onFiltro: (v: string) => void;
  onOrden: (v: string) => void;
  onCambiarTipo: (id: string, tipoActual: string) => void;
  onToggleActivo: (id: string) => void;
}

export const SeccionUsuarios = React.memo(function SeccionUsuarios({
  usuarios, usuariosFiltrados, cargando,
  busqueda, filtro, orden,
  onBusqueda, onFiltro, onOrden,
  onCambiarTipo, onToggleActivo,
}: Props) {
  const { tema } = useTemaContext();

  return (
    <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
      <View style={adminS.rowHeader}>
        <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
          Usuarios{' '}
          <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
            ({usuariosFiltrados.length}{usuariosFiltrados.length !== usuarios.length ? ` de ${usuarios.length}` : ''})
          </Text>
        </Text>
        <View style={[adminS.badge, { backgroundColor: tema.primarioSuave }]}>
          <Text style={[adminS.badgeTxt, { color: tema.primario }]}>
            {usuarios.filter(u => u.tipo === 'admin').length} admin
          </Text>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={[adminS.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, color: tema.texto, fontSize: 14 }}
          placeholder="Buscar por nombre, usuario o correo…"
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

      {/* Chips tipo */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
          {[
            { clave: 'todos', label: 'Todos' },
            { clave: 'admin', label: 'Admin' },
            { clave: 'activos', label: 'Activos' },
            { clave: 'inactivos', label: 'Inactivos' },
          ].map(f => (
            <TouchableOpacity
              key={f.clave}
              style={[adminS.chipFiltro, { backgroundColor: filtro === f.clave ? tema.primario : tema.superficieBlanca }]}
              onPress={() => onFiltro(f.clave)}
            >
              <Text style={[adminS.chipFiltroTxt, { color: filtro === f.clave ? '#fff' : tema.textoMuted }, filtro === f.clave && { fontWeight: '700' }]}>
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
            { id: 'nombre', label: 'A-Z' },
            { id: 'reservas', label: '+ Reservas' },
            { id: 'reciente', label: 'Más nuevos' },
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

      {cargando ? <SkeletonFilas cantidad={4} /> : usuariosFiltrados.length === 0 ? (
        <View style={adminS.vacioCentrado}>
          <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>
            {usuarios.length === 0
              ? 'Sin usuarios registrados'
              : busqueda ? `Sin resultados para "${busqueda}"` : 'Sin resultados'}
          </Text>
        </View>
      ) : usuariosFiltrados.map(u => (
        <View
          key={u.id}
          style={[adminS.itemCard, { backgroundColor: tema.superficieBlanca }, !u.activo && adminS.itemCardInactivo]}
        >
          <View style={[adminS.avatarGrande, { backgroundColor: u.tipo === 'admin' ? tema.primario : tema.borde }]}>
            <Text style={[adminS.avatarLetraGrande, { color: u.tipo === 'admin' ? '#fff' : tema.textoSecundario }]}>
              {u.nombre?.[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={adminS.itemCardRow}>
              <Text style={[adminS.itemNombre, { color: tema.texto }]}>{u.nombre}</Text>
              <View style={[adminS.badge, { backgroundColor: u.activo ? tema.primarioSuave : tema.superficie }]}>
                <Text style={[adminS.badgeTxt, { color: u.activo ? tema.primario : tema.textoMuted }]}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
            <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>{u.correo}</Text>
            <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>
              {u.reservas_count} reserva{u.reservas_count !== 1 ? 's' : ''}
            </Text>
            <View style={adminS.tipoRow}>
              <View style={[adminS.badge, { backgroundColor: u.tipo === 'admin' ? tema.primarioSuave : tema.superficie }]}>
                <Text style={[adminS.badgeTxt, { color: u.tipo === 'admin' ? tema.primario : tema.textoMuted }]}>
                  {u.tipo === 'admin' ? 'Administrador' : 'Normal'}
                </Text>
              </View>
              <Pressable
                style={[adminS.btnTransicion, {
                  borderColor: u.tipo === 'admin' ? '#9A7118' : tema.primario,
                  backgroundColor: (u.tipo === 'admin' ? '#9A7118' : tema.primario) + '15',
                }]}
                android_ripple={{ borderless: false }}
                onPress={() => onCambiarTipo(u.id, u.tipo)}
              >
                <Text style={[adminS.btnTransicionTxt, { color: u.tipo === 'admin' ? '#9A7118' : tema.primario }]}>
                  {u.tipo === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            style={[adminS.btnAccion, { backgroundColor: tema.superficie, borderColor: u.activo ? tema.acento : tema.primario }]}
            android_ripple={{ borderless: false }}
            onPress={() => onToggleActivo(u.id)}
          >
            <Text style={[adminS.btnAccionTxt, { color: u.activo ? tema.acento : tema.primario }]}>
              {u.activo ? 'Bloquear' : 'Activar'}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
});
