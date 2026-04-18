// ============================================================
//  components/Admin/SeccionDestinos.tsx
// ============================================================

import React from 'react';
import {
  Pressable, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useTemaContext } from '../../lib/TemaContext';
import { adminS } from './adminStyles';
import { Destino } from './tipos';

interface FormState {
  nombre: string;
  categoria: string;
  precio: string;
  desc: string;
  errores: Record<string, string | undefined>;
}

interface Props {
  destinos: Destino[];
  destinosFiltrados: Destino[];
  modoForm: 'nuevo' | 'editar' | null;
  form: FormState;
  busqueda: string;
  filtroCategoria: string;
  ordenDestinos: string;
  categoriasDestino: string[];
  onAbrirFormNuevo: () => void;
  onCancelarForm: () => void;
  onGuardar: () => void;
  onSetForm: (campo: keyof Omit<FormState, 'errores'>, valor: string) => void;
  onLimpiarError: (campo: string) => void;
  onEliminar: (id: number) => void;
  onToggleActivo: (id: number) => void;
  onEditar: (d: Destino) => void;
  onBusqueda: (v: string) => void;
  onFiltroCategoria: (v: string) => void;
  onOrden: (v: string) => void;
}

export const SeccionDestinos = React.memo(function SeccionDestinos({
  destinos, destinosFiltrados, modoForm, form,
  busqueda, filtroCategoria, ordenDestinos, categoriasDestino,
  onAbrirFormNuevo, onCancelarForm, onGuardar,
  onSetForm, onLimpiarError, onEliminar, onToggleActivo, onEditar,
  onBusqueda, onFiltroCategoria, onOrden,
}: Props) {
  const { tema } = useTemaContext();

  const campos = [
    { key: 'nombre',    label: 'Nombre',      val: form.nombre,    ph: 'Ej: Oaxaca' },
    { key: 'categoria', label: 'Categoría',   val: form.categoria, ph: 'Playa / Cultura / Aventura...' },
    { key: 'precio',    label: 'Precio base', val: form.precio,    ph: 'Ej: 2500', numeric: true },
    { key: 'desc',      label: 'Descripción', val: form.desc,      ph: 'Descripción breve' },
  ] as const;

  if (modoForm) {
    return (
      <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
        <View style={adminS.rowHeader}>
          <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
            {modoForm === 'nuevo' ? 'Nuevo destino' : 'Editar destino'}
          </Text>
          <TouchableOpacity onPress={onCancelarForm}>
            <Text style={[adminS.btnCancelarTxt, { color: tema.acento }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {campos.map(f => {
          const error = form.errores[f.key];
          return (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={[adminS.formLabel, { color: tema.textoMuted }]}>{f.label}</Text>
              <TextInput
                style={[adminS.formInput, {
                  backgroundColor: tema.superficieBlanca,
                  color: tema.texto,
                  borderColor: error ? '#DD331D' : tema.borde,
                  borderWidth: 1,
                }]}
                value={f.val}
                onChangeText={v => { onSetForm(f.key, v); if (error) onLimpiarError(f.key); }}
                placeholder={f.ph}
                placeholderTextColor={tema.textoMuted}
                keyboardType={f.numeric ? 'numeric' : 'default'}
              />
              {error && <Text style={adminS.formError}>{error}</Text>}
            </View>
          );
        })}

        <TouchableOpacity style={adminS.btnPrimario} onPress={onGuardar}>
          <Text style={adminS.btnPrimarioTxt}>Guardar destino</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
      <View style={adminS.rowHeader}>
        <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
          Destinos{' '}
          <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
            ({destinosFiltrados.length}{destinosFiltrados.length !== destinos.length ? ` de ${destinos.length}` : ''})
          </Text>
        </Text>
        <TouchableOpacity style={[adminS.btnNuevo, { backgroundColor: tema.primario }]} onPress={onAbrirFormNuevo}>
          <Text style={adminS.btnNuevoTxt}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={[adminS.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
        <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, color: tema.texto, fontSize: 14 }}
          placeholder="Buscar destino…"
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

      {/* Chips categoría */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
          {categoriasDestino.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[adminS.chipFiltro, { backgroundColor: filtroCategoria === cat ? tema.primario : tema.superficieBlanca }]}
              onPress={() => onFiltroCategoria(cat)}
            >
              <Text style={[adminS.chipFiltroTxt, { color: filtroCategoria === cat ? '#fff' : tema.textoMuted }, filtroCategoria === cat && { fontWeight: '700' }]}>
                {cat === 'todas' ? 'Todas' : cat}
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
            { id: 'precio-asc', label: 'Precio ↑' },
            { id: 'precio-desc', label: 'Precio ↓' },
            { id: 'activos', label: 'Activos' },
          ].map(o => (
            <TouchableOpacity
              key={o.id}
              style={[adminS.chipFiltro, { backgroundColor: ordenDestinos === o.id ? tema.acento : tema.superficieBlanca }]}
              onPress={() => onOrden(o.id)}
            >
              <Text style={[adminS.chipFiltroTxt, { color: ordenDestinos === o.id ? '#fff' : tema.textoMuted }, ordenDestinos === o.id && { fontWeight: '700' }]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {destinosFiltrados.length === 0 ? (
        <View style={adminS.vacioCentrado}>
          <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>
            {destinos.length === 0
              ? 'Sin destinos registrados'
              : busqueda
                ? `Sin resultados para "${busqueda}"`
                : 'Sin resultados para este filtro'}
          </Text>
        </View>
      ) : destinosFiltrados.map(d => (
        <View
          key={d.id}
          style={[adminS.itemCard, { backgroundColor: tema.superficieBlanca }, !d.activo && adminS.itemCardInactivo]}
        >
          <View style={{ flex: 1 }}>
            <View style={adminS.itemCardRow}>
              <Text style={[adminS.itemNombre, { color: tema.texto }]}>{d.nombre}</Text>
              <View style={[adminS.badge, { backgroundColor: d.activo ? tema.primarioSuave : tema.superficie }]}>
                <Text style={[adminS.badgeTxt, { color: d.activo ? tema.primario : tema.textoMuted }]}>{d.categoria}</Text>
              </View>
            </View>
            <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>{d.descripcion}</Text>
            <Text style={[adminS.itemPrecio, { color: tema.acento }]}>${d.precio.toLocaleString()} MXN / persona</Text>
          </View>
          <View style={adminS.itemAcciones}>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
              onPress={() => onToggleActivo(d.id)}
            >
              <Text style={[adminS.btnAccionTxt, { color: d.activo ? '#9A7118' : tema.primario }]}>
                {d.activo ? 'Pausar' : 'Activar'}
              </Text>
            </Pressable>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
              onPress={() => onEditar(d)}
            >
              <Text style={[adminS.btnAccionTxt, { color: tema.texto }]}>Editar</Text>
            </Pressable>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(221,51,29,0.12)', borderless: false }}
              onPress={() => onEliminar(d.id)}
            >
              <Text style={[adminS.btnAccionTxt, { color: tema.acento }]}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
});
