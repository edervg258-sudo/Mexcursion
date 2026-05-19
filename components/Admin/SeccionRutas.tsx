// components/Admin/SeccionRutas.tsx — CRUD de sugerencias_rutas
import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SkeletonFilas } from '../../app/(tabs)/skeletonloader';
import {
  actualizarRutaSugerida,
  crearRutaSugerida,
  eliminarRutaSugerida,
  obtenerRutasSugeridas,
  toggleActivoRutaSugerida,
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
import { adminS } from './adminStyles';

type Ruta = {
  id: string;
  titulo: string;
  estado: string;
  nivel: string;
  activo: number;
};

type ModoForm = 'nuevo' | 'editar' | null;

const NIVELES = ['premium', 'medio', 'economico'];
const C_NIVEL: Record<string, { fondo: string; texto: string }> = {
  premium:   { fondo: '#FEF8E8', texto: '#9A7118' },
  medio:     { fondo: '#E8F5F2', texto: '#3AB7A5' },
  economico: { fondo: '#F0F8FF', texto: '#3E5FA8' },
};

export function SeccionRutas() {
  const { tema } = useTemaContext();

  const [rutas, setRutas]         = useState<Ruta[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [modoForm, setModoForm]   = useState<ModoForm>(null);
  const [editando, setEditando]   = useState<Ruta | null>(null);
  const [busqueda, setBusqueda]   = useState('');
  const [filtroNivel, setFiltroNivel] = useState('todos');

  const [fTitulo, setFTitulo]   = useState('');
  const [fEstado, setFEstado]   = useState('');
  const [fNivel, setFNivel]     = useState('medio');
  const [errores, setErrores]   = useState<Record<string, string>>({});

  const cargar = async () => {
    setCargando(true);
    const data = await obtenerRutasSugeridas();
    setRutas(data as Ruta[]);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setModoForm('nuevo'); setEditando(null);
    setFTitulo(''); setFEstado(''); setFNivel('medio'); setErrores({});
  };

  const abrirEditar = (r: Ruta) => {
    setModoForm('editar'); setEditando(r);
    setFTitulo(r.titulo); setFEstado(r.estado); setFNivel(r.nivel); setErrores({});
  };

  const cancelar = () => { setModoForm(null); setEditando(null); };

  const guardar = async () => {
    const errs: Record<string, string> = {};
    if (!fTitulo.trim())  errs.titulo = 'El título es requerido';
    if (!fEstado.trim())  errs.estado = 'El estado es requerido';
    if (!fNivel)          errs.nivel  = 'El nivel es requerido';
    if (Object.keys(errs).length) { setErrores(errs); return; }
    setErrores({});

    const payload = { titulo: fTitulo.trim(), estado: fEstado.trim(), nivel: fNivel };
    if (modoForm === 'nuevo') {
      await crearRutaSugerida(payload);
    } else if (editando) {
      await actualizarRutaSugerida(editando.id, payload);
    }
    setModoForm(null);
    await cargar();
  };

  const eliminar = (r: Ruta) => {
    Alert.alert('Eliminar ruta', `¿Eliminar "${r.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await eliminarRutaSugerida(r.id);
        await cargar();
      }},
    ]);
  };

  const toggleActivo = async (r: Ruta) => {
    await toggleActivoRutaSugerida(r.id);
    await cargar();
  };

  const rutasFiltradas = rutas
    .filter(r => filtroNivel === 'todos' || r.nivel === filtroNivel)
    .filter(r => {
      const q = busqueda.toLowerCase();
      return !q || r.titulo.toLowerCase().includes(q) || r.estado.toLowerCase().includes(q);
    });

  if (modoForm) {
    return (
      <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
        <View style={adminS.rowHeader}>
          <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
            {modoForm === 'nuevo' ? 'Nueva ruta' : 'Editar ruta'}
          </Text>
          <TouchableOpacity onPress={cancelar}>
            <Text style={[adminS.btnCancelarTxt, { color: tema.textoMuted }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* Título */}
        <View>
          <Text style={[adminS.formLabel, { color: tema.texto }]}>Título</Text>
          <TextInput
            style={[adminS.formInput, { backgroundColor: tema.superficieBlanca, color: tema.texto, borderWidth: 1, borderColor: errores.titulo ? '#DD331D' : tema.borde }]}
            placeholder="Ej: Ruta del Mezcal"
            placeholderTextColor={tema.textoMuted}
            value={fTitulo}
            onChangeText={v => { setFTitulo(v); setErrores(e => ({ ...e, titulo: '' })); }}
          />
          {!!errores.titulo && <Text style={adminS.formError}>{errores.titulo}</Text>}
        </View>

        {/* Estado */}
        <View>
          <Text style={[adminS.formLabel, { color: tema.texto }]}>Estado (destino)</Text>
          <TextInput
            style={[adminS.formInput, { backgroundColor: tema.superficieBlanca, color: tema.texto, borderWidth: 1, borderColor: errores.estado ? '#DD331D' : tema.borde }]}
            placeholder="Ej: Oaxaca"
            placeholderTextColor={tema.textoMuted}
            value={fEstado}
            onChangeText={v => { setFEstado(v); setErrores(e => ({ ...e, estado: '' })); }}
          />
          {!!errores.estado && <Text style={adminS.formError}>{errores.estado}</Text>}
        </View>

        {/* Nivel */}
        <View>
          <Text style={[adminS.formLabel, { color: tema.texto }]}>Nivel</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {NIVELES.map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => setFNivel(n)}
                style={[adminS.chipFiltro, {
                  backgroundColor: fNivel === n ? tema.primario : tema.superficieBlanca,
                  borderWidth: 1,
                  borderColor: fNivel === n ? tema.primario : tema.borde,
                }]}
              >
                <Text style={[adminS.chipFiltroTxt, { color: fNivel === n ? '#fff' : tema.texto, fontWeight: fNivel === n ? '700' : '400' }]}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={adminS.btnPrimario} onPress={guardar}>
          <Text style={adminS.btnPrimarioTxt}>{modoForm === 'nuevo' ? 'Crear ruta' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[adminS.seccionScroll, { backgroundColor: tema.fondo }]}>
      {/* Header */}
      <View style={adminS.rowHeader}>
        <Text style={[adminS.seccionTitulo, { color: tema.texto }]}>
          Rutas{' '}
          <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
            ({rutasFiltradas.length}{rutasFiltradas.length !== rutas.length ? ` de ${rutas.length}` : ''})
          </Text>
        </Text>
        <TouchableOpacity style={[adminS.btnNuevo, { backgroundColor: tema.primario }]} onPress={abrirNuevo}>
          <Text style={adminS.btnNuevoTxt}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {cargando ? <SkeletonFilas cantidad={4} /> : (
        <>
          {/* Búsqueda */}
          <View style={[adminS.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, color: tema.texto, fontSize: 14 }}
              placeholder="Buscar por título o estado…"
              placeholderTextColor={tema.textoMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Text style={{ color: tema.textoMuted, fontSize: 16, paddingLeft: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Chips nivel */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {['todos', ...NIVELES].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[adminS.chipFiltro, { backgroundColor: filtroNivel === n ? tema.primario : tema.superficieBlanca }]}
                  onPress={() => setFiltroNivel(n)}
                >
                  <Text style={[adminS.chipFiltroTxt, { color: filtroNivel === n ? '#fff' : tema.textoMuted, fontWeight: filtroNivel === n ? '700' : '400' }]}>
                    {n.charAt(0).toUpperCase() + n.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Lista */}
          {rutasFiltradas.length === 0 ? (
            <View style={adminS.vacioCentrado}>
              <Text style={[adminS.textoVacio, { color: tema.textoMuted }]}>
                {rutas.length === 0 ? 'Sin rutas. Crea la primera.' : 'Sin resultados.'}
              </Text>
            </View>
          ) : rutasFiltradas.map(r => {
            const cn = C_NIVEL[r.nivel] ?? { fondo: '#f0f0f0', texto: '#888' };
            return (
              <View key={r.id} style={[adminS.itemCard, {
                backgroundColor: tema.superficieBlanca,
                opacity: r.activo ? 1 : 0.55,
              }]}>
                <View style={{ flex: 1 }}>
                  <View style={adminS.itemCardRow}>
                    <Text style={[adminS.itemNombre, { color: tema.texto }]}>{r.titulo}</Text>
                    <View style={[adminS.badge, { backgroundColor: cn.fondo }]}>
                      <Text style={[adminS.badgeTxt, { color: cn.texto }]}>{r.nivel}</Text>
                    </View>
                  </View>
                  <Text style={[adminS.itemSub, { color: tema.textoMuted }]}>📍 {r.estado}</Text>
                  <View style={adminS.tipoRow}>
                    <TouchableOpacity
                      style={[adminS.btnAccion, { backgroundColor: r.activo ? '#FEF0EE' : '#E8F5F2' }]}
                      onPress={() => toggleActivo(r)}
                    >
                      <Text style={[adminS.btnAccionTxt, { color: r.activo ? '#DD331D' : '#3AB7A5' }]}>
                        {r.activo ? 'Pausar' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[adminS.btnAccion, { backgroundColor: tema.superficieBlanca, borderWidth: 1, borderColor: tema.borde }]}
                      onPress={() => abrirEditar(r)}
                    >
                      <Text style={[adminS.btnAccionTxt, { color: tema.texto }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[adminS.btnAccion, { backgroundColor: '#FEF0EE' }]}
                      onPress={() => eliminar(r)}
                    >
                      <Text style={[adminS.btnAccionTxt, { color: '#DD331D' }]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
