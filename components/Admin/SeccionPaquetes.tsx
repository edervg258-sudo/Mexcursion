// ============================================================
//  components/Admin/SeccionPaquetes.tsx
// ============================================================

import React from 'react';
import {
  Pressable, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useTemaContext } from '../../lib/TemaContext';
import { adminS } from './adminStyles';
import { Destino, Paquete } from './tipos';

interface PaqFormState {
  estadoId: string;
  nombre: string;
  descripcion: string;
  precio: string;
  errores: Record<string, string | undefined>;
}

interface Props {
  paquetes: Paquete[];
  paquetesFiltrados: Paquete[];
  destinos: Destino[];
  modoForm: 'nuevo' | 'editar' | null;
  form: PaqFormState;
  filtroPaqDestino: string;
  onAbrirFormNuevo: () => void;
  onCancelarForm: () => void;
  onGuardar: () => void;
  onSetForm: (campo: keyof Omit<PaqFormState, 'errores'>, valor: string) => void;
  onLimpiarError: (campo: string) => void;
  onEliminar: (id: number) => void;
  onToggleDisponible: (id: number) => void;
  onEditar: (p: Paquete) => void;
  onFiltroDestino: (v: string) => void;
}

export const SeccionPaquetes = React.memo(function SeccionPaquetes({
  paquetes, paquetesFiltrados, destinos, modoForm, form,
  filtroPaqDestino,
  onAbrirFormNuevo, onCancelarForm, onGuardar,
  onSetForm, onLimpiarError, onEliminar, onToggleDisponible, onEditar,
  onFiltroDestino,
}: Props) {
  const { tema } = useTemaContext();

  const nombreDestino = (estado_id: number) =>
    destinos.find(d => d.id === estado_id)?.nombre ?? `#${estado_id}`;

  if (modoForm) {
    return (
      <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
        <View style={adminS.rowHeader}>
          <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
            {modoForm === 'nuevo' ? 'Nuevo paquete' : 'Editar paquete'}
          </Text>
          <TouchableOpacity onPress={onCancelarForm}>
            <Text style={[adminS.btnCancelarTxt, { color: tema.acento }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de destino */}
        <View style={{ marginBottom: 14 }}>
          <Text style={[adminS.formLabel, { color: tema.textoMuted }]}>Destino</Text>
          {form.errores.estadoId && (
            <Text style={adminS.formError}>{form.errores.estadoId}</Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {destinos.map(d => {
                const seleccionado = form.estadoId === String(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[adminS.chipFiltro, {
                      backgroundColor: seleccionado ? tema.primario : tema.superficieBlanca,
                      borderColor: form.errores.estadoId ? '#DD331D' : (seleccionado ? tema.primario : tema.borde),
                      borderWidth: 1,
                    }]}
                    onPress={() => { onSetForm('estadoId', String(d.id)); onLimpiarError('estadoId'); }}
                  >
                    <Text style={[adminS.chipFiltroTxt, { color: seleccionado ? '#fff' : tema.textoMuted }]}>
                      {d.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Campos de texto */}
        {[
          { key: 'nombre' as const,      label: 'Nombre del paquete', ph: 'Ej: Básico / Estándar / Premium' },
          { key: 'descripcion' as const, label: 'Descripción',        ph: 'Qué incluye el paquete' },
          { key: 'precio' as const,      label: 'Precio (MXN)',       ph: 'Ej: 1500', numeric: true },
        ].map(f => {
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
                value={form[f.key]}
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
          <Text style={adminS.btnPrimarioTxt}>Guardar paquete</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const destinosConPaquetes = destinos.filter(d => paquetes.some(p => p.estado_id === d.id));

  return (
    <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
      <View style={adminS.rowHeader}>
        <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
          Paquetes{' '}
          <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
            ({paquetesFiltrados.length}{paquetesFiltrados.length !== paquetes.length ? ` de ${paquetes.length}` : ''})
          </Text>
        </Text>
        <TouchableOpacity style={[adminS.btnNuevo, { backgroundColor: tema.primario }]} onPress={onAbrirFormNuevo}>
          <Text style={adminS.btnNuevoTxt}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Chips filtro por destino */}
      {destinosConPaquetes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {[{ id: 'todos', nombre: 'Todos' }, ...destinosConPaquetes].map(d => (
              <TouchableOpacity
                key={d.id}
                style={[adminS.chipFiltro, { backgroundColor: filtroPaqDestino === String(d.id) ? tema.primario : tema.superficieBlanca }]}
                onPress={() => onFiltroDestino(String(d.id))}
              >
                <Text style={[adminS.chipFiltroTxt, {
                  color: filtroPaqDestino === String(d.id) ? '#fff' : tema.textoMuted,
                  fontWeight: filtroPaqDestino === String(d.id) ? '700' : '400',
                }]}>
                  {d.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {paquetes.length === 0 ? (
        <View style={adminS.vacioCentrado}>
          <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>Sin paquetes registrados</Text>
          <Text style={[{ color: tema.textoMuted, fontSize: 13, textAlign: 'center', marginTop: 6 }]}>
            Crea paquetes para que los viajeros los elijan al reservar
          </Text>
        </View>
      ) : paquetesFiltrados.length === 0 ? (
        <View style={adminS.vacioCentrado}>
          <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>Sin paquetes para este destino</Text>
        </View>
      ) : paquetesFiltrados.map(p => (
        <View
          key={p.id}
          style={[adminS.itemCard, {
            backgroundColor: tema.superficieBlanca,
            opacity: p.disponible ? 1 : 0.7,
          }]}
        >
          <View style={{ flex: 1 }}>
            <View style={adminS.itemCardRow}>
              <Text style={[adminS.itemNombre, { color: tema.texto }]}>{p.nombre}</Text>
              <View style={[adminS.badge, {
                backgroundColor: p.disponible ? tema.primarioSuave : tema.superficie,
              }]}>
                <Text style={[adminS.badgeTxt, { color: p.disponible ? tema.primario : tema.textoMuted }]}>
                  {p.disponible ? 'Disponible' : 'No disponible'}
                </Text>
              </View>
            </View>
            <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>
              {nombreDestino(p.estado_id)}
            </Text>
            {!!p.descripcion && (
              <Text style={[adminS.itemSub, { color: tema.textoMuted }]} numberOfLines={2}>
                {p.descripcion}
              </Text>
            )}
            <Text style={[adminS.itemPrecio, { color: tema.acento }]}>
              ${Number(p.precio).toLocaleString()} MXN / persona
            </Text>
          </View>
          <View style={adminS.itemAcciones}>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
              onPress={() => onToggleDisponible(p.id)}
            >
              <Text style={[adminS.btnAccionTxt, { color: p.disponible ? '#9A7118' : tema.primario }]}>
                {p.disponible ? 'Pausar' : 'Activar'}
              </Text>
            </Pressable>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
              onPress={() => onEditar(p)}
            >
              <Text style={[adminS.btnAccionTxt, { color: tema.texto }]}>Editar</Text>
            </Pressable>
            <Pressable
              style={[adminS.btnAccion, { backgroundColor: tema.superficie }]}
              android_ripple={{ color: 'rgba(221,51,29,0.12)', borderless: false }}
              onPress={() => onEliminar(p.id)}
            >
              <Text style={[adminS.btnAccionTxt, { color: tema.acento }]}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
});
