import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  actualizarDestino,
  actualizarEstadoReserva,
  actualizarRutaSugerida,
  cambiarTipoUsuario, cargarTodasLasReservas,
  cargarTodosLosUsuarios,
  crearDestino,
  crearRutaSugerida,
  eliminarDestino,
  eliminarRutaSugerida,
  obtenerRutasSugeridas,
  obtenerTodosLosDestinos,
  obtenerUsuarioActivo,
  toggleActivoDestinoAdmin,
  toggleActivoRutaSugerida,
  toggleActivoUsuarioAdmin
} from '../../lib/supabase-db';
import { sombraTarjeta, Tema } from '../../lib/tema';

// ── Tipos ──────────────────────────────────────────────────────────────────
type Seccion = 'dashboard' | 'destinos' | 'rutas' | 'reservas' | 'usuarios';

type Destino = {
  id: number; nombre: string; categoria: string;
  precio: number; descripcion: string; activo: boolean;
};

type Reserva = {
  id: number; folio: string; usuario_id: number; nombre_usuario: string;
  destino: string; paquete: string; fecha: string; personas: number;
  total: number; metodo: string; estado: string; creado_en: string;
};

type Usuario = {
  id: string; nombre: string; correo: string; nombre_usuario: string;
  creado_en: string; reservas_count: number; activo: number; tipo: string;
};

type RutaSugerida = {
  id: string; titulo: string; estado: string; nivel: string; activo: number; created_at: string;
};

// ── Colores de estado (paleta) ────────────────────────────────────────────
const C_ESTADO: Record<string, { fondo: string; texto: string; label: string }> = {
  confirmada: { fondo: Tema.primarioSuave,  texto: Tema.primario,  label: 'Confirmada'  },
  completada: { fondo: '#F0F0F0',           texto: '#666',         label: 'Completada'  },
  cancelada:  { fondo: '#FEF0EE',           texto: Tema.acento,    label: 'Cancelada'   },
  pendiente:  { fondo: '#FEF8E8',           texto: '#9A7118',      label: 'Pendiente'   },
};

// ── Transiciones de estado permitidas ─────────────────────────────────────
const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  pendiente:  [
    { label: 'Confirmar',  estado: 'confirmada', color: Tema.primario },
    { label: 'Cancelar',   estado: 'cancelada',  color: Tema.acento   },
  ],
  confirmada: [
    { label: 'Completar',  estado: 'completada', color: '#27AE60'     },
    { label: 'Cancelar',   estado: 'cancelada',  color: Tema.acento   },
  ],
  completada: [],
  cancelada:  [],
};

// ── Componente principal ───────────────────────────────────────────────────
export default function AdminScreen() {
  const { width } = useWindowDimensions();
  const esPC = width >= 768;

  const [seccion, setSeccion]         = useState<Seccion>('dashboard');

  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [rutasSugeridas, setRutasSugeridas] = useState<RutaSugerida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificado, setVerificado] = useState(false);

  // CRUD destinos
  const [modoForm, setModoForm]             = useState<'nuevo' | 'editar' | null>(null);
  const [destinoEdit, setDestinoEdit]       = useState<Destino | null>(null);
  const [formNombre, setFormNombre]         = useState('');
  const [formCategoria, setFormCategoria]   = useState('');
  const [formPrecio, setFormPrecio]         = useState('');
  const [formDesc, setFormDesc]             = useState('');

  // CRUD Rutas Sugeridas
  const [modoFormRuta, setModoFormRuta]     = useState<'nuevo' | 'editar' | null>(null);
  const [rutaEdit, setRutaEdit]             = useState<RutaSugerida | null>(null);
  const [formTituloRuta, setFormTituloRuta] = useState('');
  const [formEstadoRuta, setFormEstadoRuta] = useState('');
  const [formNivelRuta, setFormNivelRuta]   = useState('');

  // Filtros
  const [filtroReserva, setFiltroReserva] = useState('todas');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');

  useFocusEffect(useCallback(() => {
    setVerificado(false);
    const cargar = async () => {
      setCargando(true);
      const sesion = await obtenerUsuarioActivo();
      if (!sesion || sesion.tipo !== 'admin') {
        router.back();
        return;
      }
      const [r, u, d, ru] = await Promise.all([
        cargarTodasLasReservas(),
        cargarTodosLosUsuarios(),
        obtenerTodosLosDestinos(),
        obtenerRutasSugeridas()
      ]);
      setReservas(r as Reserva[]);
      setUsuarios(u as Usuario[]);
      setDestinos(d as Destino[]);
      setRutasSugeridas(ru as RutaSugerida[]);
      setCargando(false);
      setVerificado(true);
    };
    cargar();
  }, []));

  // CRUD destinos
  const abrirFormNuevo = () => {
    setModoForm('nuevo'); setDestinoEdit(null);
    setFormNombre(''); setFormCategoria(''); setFormPrecio(''); setFormDesc('');
  };
  const abrirFormEditar = (d: Destino) => {
    setModoForm('editar'); setDestinoEdit(d);
    setFormNombre(d.nombre); setFormCategoria(d.categoria);
    setFormPrecio(String(d.precio)); setFormDesc(d.descripcion);
  };
  const guardarDestino = async () => {
    if (!formNombre || !formCategoria || !formPrecio) return;
    if (modoForm === 'nuevo') {
      await crearDestino({ nombre: formNombre, categoria: formCategoria, descripcion: formDesc, precio: Number(formPrecio) });
    } else if (destinoEdit) {
      await actualizarDestino(destinoEdit.id, { nombre: formNombre, categoria: formCategoria, descripcion: formDesc, precio: Number(formPrecio) });
    }
    setModoForm(null);
    const ts = await obtenerTodosLosDestinos();
    setDestinos(ts as Destino[]);
  };
  const handleEliminarDestino = (id: number) => {
    Alert.alert('Eliminar destino', '¿Seguro que quieres eliminar este destino?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarDestino(id);
          const ts = await obtenerTodosLosDestinos();
          setDestinos(ts as Destino[]);
      } },
    ]);
  };
  const handleToggleActivoDestino = async (id: number) => {
    await toggleActivoDestinoAdmin(id);
    const ts = await obtenerTodosLosDestinos();
    setDestinos(ts as Destino[]);
  };

  // CRUD Rutas Sugeridas
  const abrirFormRutaNuevo = () => {
    setModoFormRuta('nuevo'); setRutaEdit(null);
    setFormTituloRuta(''); setFormEstadoRuta(''); setFormNivelRuta('premium');
  };
  const abrirFormRutaEditar = (r: RutaSugerida) => {
    setModoFormRuta('editar'); setRutaEdit(r);
    setFormTituloRuta(r.titulo); setFormEstadoRuta(r.estado); setFormNivelRuta(r.nivel);
  };
  const guardarRuta = async () => {
    if (!formTituloRuta || !formEstadoRuta || !formNivelRuta) return;
    if (modoFormRuta === 'nuevo') {
      await crearRutaSugerida({ titulo: formTituloRuta, estado: formEstadoRuta, nivel: formNivelRuta });
    } else if (rutaEdit) {
      await actualizarRutaSugerida(rutaEdit.id, { titulo: formTituloRuta, estado: formEstadoRuta, nivel: formNivelRuta });
    }
    setModoFormRuta(null);
    const rs = await obtenerRutasSugeridas();
    setRutasSugeridas(rs as RutaSugerida[]);
  };
  const handleEliminarRuta = (id: string) => {
    Alert.alert('Eliminar Ruta', '¿Seguro que quieres eliminar esta ruta sugerida?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarRutaSugerida(id);
          const rs = await obtenerRutasSugeridas();
          setRutasSugeridas(rs as RutaSugerida[]);
      } },
    ]);
  };
  const handleToggleActivoRuta = async (id: string) => {
    await toggleActivoRutaSugerida(id);
    const rs = await obtenerRutasSugeridas();
    setRutasSugeridas(rs as RutaSugerida[]);
  };

  // Usuarios
  const handleCambiarTipo = async (id: string, tipoActual: string) => {
    const nuevoTipo = tipoActual === 'admin' ? 'normal' : 'admin';
    setUsuarios(u => u.map(x => x.id === id ? { ...x, tipo: nuevoTipo } : x));
    await cambiarTipoUsuario(id, nuevoTipo);
  };
  const handleToggleActivo = async (id: string) => {
    setUsuarios(u => u.map(x => x.id === id ? { ...x, activo: x.activo ? 0 : 1 } : x));
    await toggleActivoUsuarioAdmin(id);
  };

  // Reservas — cambio de estado con historial
  const handleCambiarEstado = async (reserva: Reserva, nuevo_estado: string) => {
    setReservas(r => r.map(x => x.id === reserva.id ? { ...x, estado: nuevo_estado } : x));
    await actualizarEstadoReserva(reserva.id, nuevo_estado);
  };

  // Stats
  const stats = {
    totalReservas:   reservas.length,
    ingresos:        reservas.filter(r => r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0),
    confirmadas:     reservas.filter(r => r.estado === 'confirmada').length,
    usuarios:        usuarios.filter(u => u.activo).length,
    destinosActivos: destinos.filter(d => d.activo).length,
  };

  // (Pantalla de login manual eliminada, validación mediante base de datos y rol)

  // ── Nav ───────────────────────────────────────────────────────────────
  const NAV: { id: Seccion; label: string; abrev: string }[] = [
    { id: 'dashboard', label: 'Panel',     abrev: 'PNL' },
    { id: 'destinos',  label: 'Destinos',  abrev: 'DST' },
    { id: 'rutas',     label: 'Rutas',     abrev: 'RTS' },
    { id: 'reservas',  label: 'Reservas',  abrev: 'RSV' },
    { id: 'usuarios',  label: 'Usuarios',  abrev: 'USR' },
  ];

  const NavBar = () => esPC ? (
    <View style={s.sidebar}>
      <View style={s.sidebarHeader}>
        <Text style={s.sidebarTitulo}>Admin</Text>
        <Text style={s.sidebarSub}>Mexcursión</Text>
      </View>
      <View style={s.separador} />
      {NAV.map(n => (
        <TouchableOpacity
          key={n.id}
          style={[s.navItem, seccion === n.id && s.navItemActivo]}
          onPress={() => setSeccion(n.id)}
        >
          <View style={[s.navAbrev, seccion === n.id && s.navAbrevActivo]}>
            <Text style={[s.navAbrevTxt, seccion === n.id && s.navAbrevTxtActivo]}>{n.abrev}</Text>
          </View>
          <Text style={[s.navLabel, seccion === n.id && s.navLabelActivo]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ flex: 1 }} />
    </View>
  ) : (
    <View style={s.bottomBar}>
      {NAV.map(n => (
        <TouchableOpacity
          key={n.id}
          style={[s.bottomItem, seccion === n.id && s.bottomItemActivo]}
          onPress={() => setSeccion(n.id)}
        >
          <Text style={[s.bottomLabel, seccion === n.id && s.bottomLabelActivo]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Dashboard ─────────────────────────────────────────────────────────
  const Dashboard = () => (
    <ScrollView contentContainerStyle={s.seccionScroll}>
      <Text style={s.seccionTitulo}>Panel general</Text>
      {cargando
        ? <ActivityIndicator color={Tema.primario} style={{ marginTop: 24 }} />
        : <>
          <View style={s.gridStats}>
            {[
              { label: 'Reservas totales', valor: stats.totalReservas,                   color: Tema.primario       },
              { label: 'Ingresos MXN',     valor: `$${stats.ingresos.toLocaleString()}`, color: '#27AE60'           },
              { label: 'Confirmadas',      valor: stats.confirmadas,                     color: '#9A7118'           },
              { label: 'Usuarios activos', valor: stats.usuarios,                        color: '#3E5FA8'           },
              { label: 'Destinos activos', valor: stats.destinosActivos,                 color: Tema.primarioOscuro },
            ].map(st => (
              <View key={st.label} style={[s.statCard, { borderTopColor: st.color }]}>
                <Text style={[s.statValor, { color: st.color }]}>{st.valor}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.subTitulo}>Últimas reservas</Text>
          {reservas.length === 0
            ? <View style={s.vacioCentrado}><Text style={s.textoVacio}>Sin reservas registradas</Text></View>
            : reservas.slice(0, 3).map(r => {
              const ce = C_ESTADO[r.estado] ?? { fondo: '#f0f0f0', texto: '#888', label: r.estado };
              return (
                <View key={r.folio ?? r.id} style={s.filaResumen}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.filaResumenNombre}>{r.folio} · {r.destino}</Text>
                    <Text style={s.filaResumenSub}>{r.nombre_usuario} · {r.fecha}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: ce.fondo }]}>
                    <Text style={[s.badgeTxt, { color: ce.texto }]}>{ce.label}</Text>
                  </View>
                </View>
              );
            })}

          <Text style={[s.subTitulo, { marginTop: 20 }]}>Usuarios recientes</Text>
          {usuarios.length === 0
            ? <View style={s.vacioCentrado}><Text style={s.textoVacio}>Sin usuarios registrados</Text></View>
            : usuarios.slice(0, 3).map(u => (
              <View key={u.id} style={s.filaResumen}>
                <View style={[s.avatar, { backgroundColor: u.tipo === 'admin' ? Tema.primario : Tema.borde }]}>
                  <Text style={[s.avatarLetra, { color: u.tipo === 'admin' ? '#fff' : Tema.textoSecundario }]}>
                    {u.nombre?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.filaResumenNombre}>{u.nombre}</Text>
                  <Text style={s.filaResumenSub}>{u.correo} · {u.reservas_count} reserva{u.reservas_count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: u.tipo === 'admin' ? Tema.primarioSuave : '#f0f0f0' }]}>
                  <Text style={[s.badgeTxt, { color: u.tipo === 'admin' ? Tema.primario : '#888' }]}>
                    {u.tipo === 'admin' ? 'Admin' : 'Normal'}
                  </Text>
                </View>
              </View>
            ))}
        </>
      }
    </ScrollView>
  );

  // ── Destinos ──────────────────────────────────────────────────────────
  const Destinos = () => (
    <View style={{ flex: 1 }}>
      {modoForm ? (
        <ScrollView contentContainerStyle={s.seccionScroll}>
          <View style={s.rowHeader}>
            <Text style={s.seccionTitulo}>{modoForm === 'nuevo' ? 'Nuevo destino' : 'Editar destino'}</Text>
            <TouchableOpacity onPress={() => setModoForm(null)}>
              <Text style={s.btnCancelarTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: 'Nombre',      val: formNombre,    set: setFormNombre,    ph: 'Ej: Oaxaca' },
            { label: 'Categoría',   val: formCategoria, set: setFormCategoria, ph: 'Playa / Cultura / Aventura...' },
            { label: 'Precio base', val: formPrecio,    set: setFormPrecio,    ph: 'Ej: 2500', numeric: true },
            { label: 'Descripción', val: formDesc,      set: setFormDesc,      ph: 'Descripción breve' },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={s.formLabel}>{f.label}</Text>
              <TextInput
                style={s.formInput}
                value={f.val}
                onChangeText={f.set}
                placeholder={f.ph}
                placeholderTextColor={Tema.textoMuted}
                keyboardType={(f as any).numeric ? 'numeric' : 'default'}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.btnPrimario, (!formNombre || !formCategoria || !formPrecio) && s.btnDeshabilitado]}
            onPress={guardarDestino}
            disabled={!formNombre || !formCategoria || !formPrecio}
          >
            <Text style={s.btnPrimarioTxt}>Guardar destino</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.seccionScroll}>
          <View style={s.rowHeader}>
            <Text style={s.seccionTitulo}>Destinos ({destinos.length})</Text>
            <TouchableOpacity style={s.btnNuevo} onPress={abrirFormNuevo}>
              <Text style={s.btnNuevoTxt}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
          {destinos.map(d => (
            <View key={d.id} style={[s.itemCard, !d.activo && s.itemCardInactivo]}>
              <View style={{ flex: 1 }}>
                <View style={s.itemCardRow}>
                  <Text style={s.itemNombre}>{d.nombre}</Text>
                  <View style={[s.badge, { backgroundColor: d.activo ? Tema.primarioSuave : '#f0f0f0' }]}>
                    <Text style={[s.badgeTxt, { color: d.activo ? Tema.primario : '#aaa' }]}>{d.categoria}</Text>
                  </View>
                </View>
                <Text style={s.itemSub}>{d.descripcion}</Text>
                <Text style={s.itemPrecio}>${d.precio.toLocaleString()} MXN / persona</Text>
              </View>
              <View style={s.itemAcciones}>
                <TouchableOpacity style={s.btnAccion} onPress={() => handleToggleActivoDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: d.activo ? '#9A7118' : Tema.primario }]}>
                    {d.activo ? 'Pausar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAccion} onPress={() => abrirFormEditar(d)}>
                  <Text style={s.btnAccionTxt}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAccion} onPress={() => handleEliminarDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: Tema.acento }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── Rutas Sugeridas ───────────────────────────────────────────────────
  const RutasSugeridas = () => (
    <View style={{ flex: 1 }}>
      {modoFormRuta ? (
        <ScrollView contentContainerStyle={s.seccionScroll}>
          <View style={s.rowHeader}>
            <Text style={s.seccionTitulo}>{modoFormRuta === 'nuevo' ? 'Nueva Ruta Sugerida' : 'Editar Ruta'}</Text>
            <TouchableOpacity onPress={() => setModoFormRuta(null)}>
              <Text style={s.btnCancelarTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: 'Título', val: formTituloRuta, set: setFormTituloRuta, ph: 'Ej: Ruta Maya Mágica' },
            { label: 'Estado principal', val: formEstadoRuta, set: setFormEstadoRuta, ph: 'Ej: Chiapas / Yucatán' },
            { label: 'Nivel recomendado', val: formNivelRuta, set: setFormNivelRuta, ph: 'economico / medio / premium' },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={s.formLabel}>{f.label}</Text>
              <TextInput
                style={s.formInput}
                value={f.val}
                onChangeText={f.set}
                placeholder={f.ph}
                placeholderTextColor={Tema.textoMuted}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.btnPrimario, (!formTituloRuta || !formEstadoRuta || !formNivelRuta) && s.btnDeshabilitado]}
            onPress={guardarRuta}
            disabled={!formTituloRuta || !formEstadoRuta || !formNivelRuta}
          >
            <Text style={s.btnPrimarioTxt}>Guardar Ruta</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.seccionScroll}>
          <View style={s.rowHeader}>
            <Text style={s.seccionTitulo}>Sugerencias de Ruta ({rutasSugeridas.length})</Text>
            <TouchableOpacity style={s.btnNuevo} onPress={abrirFormRutaNuevo}>
              <Text style={s.btnNuevoTxt}>+ Sugerencia</Text>
            </TouchableOpacity>
          </View>
          {cargando ? <ActivityIndicator color={Tema.primario} style={{ marginTop: 24 }} /> : rutasSugeridas.length === 0 ? (
            <View style={s.vacioCentrado}><Text style={s.textoVacio}>No hay sugerencias configuradas</Text></View>
          ) : rutasSugeridas.map(r => (
            <View key={r.id} style={[s.itemCard, r.activo === 0 && s.itemCardInactivo]}>
              <View style={{ flex: 1 }}>
                <View style={s.itemCardRow}>
                  <Text style={s.itemNombre}>{r.titulo}</Text>
                  <View style={[s.badge, { backgroundColor: r.activo ? Tema.primarioSuave : '#f0f0f0' }]}>
                    <Text style={[s.badgeTxt, { color: r.activo ? Tema.primario : '#aaa' }]}>{r.nivel}</Text>
                  </View>
                </View>
                <Text style={s.itemSub}>Foco en: {r.estado}</Text>
              </View>
              <View style={s.itemAcciones}>
                <TouchableOpacity style={s.btnAccion} onPress={() => handleToggleActivoRuta(r.id)}>
                  <Text style={[s.btnAccionTxt, { color: r.activo ? '#9A7118' : Tema.primario }]}>
                    {r.activo ? 'Pausar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAccion} onPress={() => abrirFormRutaEditar(r)}>
                  <Text style={s.btnAccionTxt}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnAccion} onPress={() => handleEliminarRuta(r.id)}>
                  <Text style={[s.btnAccionTxt, { color: Tema.acento }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── Reservas ──────────────────────────────────────────────────────────
  const Reservas = () => {
    const filtradas = filtroReserva === 'todas'
      ? reservas
      : reservas.filter(r => r.estado === filtroReserva);

    return (
      <ScrollView contentContainerStyle={s.seccionScroll}>
        <Text style={s.seccionTitulo}>Reservas ({reservas.length})</Text>
        {cargando
          ? <ActivityIndicator color={Tema.primario} style={{ marginTop: 24 }} />
          : <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {['todas', 'pendiente', 'confirmada', 'completada', 'cancelada'].map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[s.chipFiltro, filtroReserva === f && s.chipFiltroActivo]}
                    onPress={() => setFiltroReserva(f)}
                  >
                    <Text style={[s.chipFiltroTxt, filtroReserva === f && s.chipFiltroTxtActivo]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {filtradas.length === 0 ? (
              <View style={s.vacioCentrado}>
                <Text style={s.textoVacio}>{reservas.length === 0 ? 'Sin reservas registradas' : 'Sin resultados para este filtro'}</Text>
              </View>
            ) : filtradas.map(r => {
              const ce = C_ESTADO[r.estado] ?? { fondo: '#f0f0f0', texto: '#888', label: r.estado };
              const transiciones = TRANSICIONES[r.estado] ?? [];
              return (
                <View key={r.folio ?? r.id} style={s.itemCard}>
                  {/* Barra de estado izquierda */}
                  <View style={[s.barraEstado, { backgroundColor: ce.texto }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.itemCardRow}>
                      <Text style={s.itemNombre}>{r.folio}</Text>
                      <View style={[s.badge, { backgroundColor: ce.fondo }]}>
                        <Text style={[s.badgeTxt, { color: ce.texto }]}>{ce.label}</Text>
                      </View>
                    </View>
                    <Text style={s.itemSub}>{r.nombre_usuario} · {r.destino}</Text>
                    <Text style={s.itemSub}>{r.fecha} · {r.personas} persona{r.personas !== 1 ? 's' : ''} · Paq. {r.paquete}</Text>
                    <Text style={s.itemSub}>{r.metodo}</Text>
                    <Text style={s.itemPrecio}>${(r.total ?? 0).toLocaleString()} MXN</Text>

                    {/* Botones de transición de estado */}
                    {transiciones.length > 0 && (
                      <View style={s.transicionRow}>
                        {transiciones.map(tr => (
                          <TouchableOpacity
                            key={tr.estado}
                            style={[s.btnTransicion, { borderColor: tr.color }]}
                            onPress={() => handleCambiarEstado(r, tr.estado)}
                          >
                            <Text style={[s.btnTransicionTxt, { color: tr.color }]}>{tr.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        }
      </ScrollView>
    );
  };

  // ── Usuarios ──────────────────────────────────────────────────────────
  const Usuarios = () => {
    const filtrados = filtroUsuario === 'todos'    ? usuarios
      : filtroUsuario === 'admin'    ? usuarios.filter(u => u.tipo === 'admin')
      : filtroUsuario === 'activos'  ? usuarios.filter(u => u.activo)
      : usuarios.filter(u => !u.activo);

    return (
      <ScrollView contentContainerStyle={s.seccionScroll}>
        <View style={s.rowHeader}>
          <Text style={s.seccionTitulo}>Usuarios ({usuarios.length})</Text>
          <View style={[s.badge, { backgroundColor: Tema.primarioSuave }]}>
            <Text style={[s.badgeTxt, { color: Tema.primario }]}>
              {usuarios.filter(u => u.tipo === 'admin').length} admin
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {[
              { clave: 'todos',     label: 'Todos'     },
              { clave: 'admin',     label: 'Admin'     },
              { clave: 'activos',   label: 'Activos'   },
              { clave: 'inactivos', label: 'Inactivos' },
            ].map(f => (
              <TouchableOpacity
                key={f.clave}
                style={[s.chipFiltro, filtroUsuario === f.clave && s.chipFiltroActivo]}
                onPress={() => setFiltroUsuario(f.clave)}
              >
                <Text style={[s.chipFiltroTxt, filtroUsuario === f.clave && s.chipFiltroTxtActivo]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {cargando ? (
          <ActivityIndicator color={Tema.primario} style={{ marginTop: 24 }} />
        ) : filtrados.length === 0 ? (
          <View style={s.vacioCentrado}>
            <Text style={s.textoVacio}>{usuarios.length === 0 ? 'Sin usuarios registrados' : 'Sin resultados'}</Text>
          </View>
        ) : filtrados.map(u => (
          <View key={u.id} style={[s.itemCard, !u.activo && s.itemCardInactivo]}>
            <View style={[s.avatarGrande, { backgroundColor: u.tipo === 'admin' ? Tema.primario : Tema.borde }]}>
              <Text style={[s.avatarLetraGrande, { color: u.tipo === 'admin' ? '#fff' : Tema.textoSecundario }]}>
                {u.nombre?.[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.itemCardRow}>
                <Text style={s.itemNombre}>{u.nombre}</Text>
                <View style={[s.badge, { backgroundColor: u.activo ? Tema.primarioSuave : '#f0f0f0' }]}>
                  <Text style={[s.badgeTxt, { color: u.activo ? Tema.primario : '#aaa' }]}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
              <Text style={s.itemSub}>{u.correo}</Text>
              <Text style={s.itemSub}>{u.reservas_count} reserva{u.reservas_count !== 1 ? 's' : ''}</Text>
              <View style={s.tipoRow}>
                <View style={[s.badge, { backgroundColor: u.tipo === 'admin' ? Tema.primarioSuave : '#f5f5f5' }]}>
                  <Text style={[s.badgeTxt, { color: u.tipo === 'admin' ? Tema.primario : '#888' }]}>
                    {u.tipo === 'admin' ? 'Administrador' : 'Normal'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.btnTransicion, { borderColor: u.tipo === 'admin' ? '#9A7118' : Tema.primario }]}
                  onPress={() => handleCambiarTipo(u.id, u.tipo)}
                >
                  <Text style={[s.btnTransicionTxt, { color: u.tipo === 'admin' ? '#9A7118' : Tema.primario }]}>
                    {u.tipo === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[s.btnAccion, { borderColor: u.activo ? Tema.acento : Tema.primario }]}
              onPress={() => handleToggleActivo(u.id)}
            >
              <Text style={[s.btnAccionTxt, { color: u.activo ? Tema.acento : Tema.primario }]}>
                {u.activo ? 'Bloquear' : 'Activar'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  const SECCIONES: Record<Seccion, React.ReactNode> = {
    dashboard: <Dashboard />,
    destinos:  <Destinos  />,
    rutas:     <RutasSugeridas />,
    reservas:  <Reservas  />,
    usuarios:  <Usuarios  />,
  };

  if (!verificado) {
    return (
      <View style={[s.contenedor, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Tema.primario} />
      </View>
    );
  }

  return (
    <View style={s.contenedor}>
      <SafeAreaView style={s.segura}>
        {esPC ? (
          <View style={s.layoutPC}>
            <NavBar />
            <View style={s.contenidoPC}>
              <View style={s.headerPC}>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={s.btnAtras}>Volver a la app</Text>
                </TouchableOpacity>
                <Text style={s.headerTitulo}>Panel de administración</Text>
                <View style={{ width: 100 }} />
              </View>
              <View style={{ flex: 1 }}>{SECCIONES[seccion]}</View>
            </View>
          </View>
        ) : (
          <View style={s.layoutMovil}>
            <View style={s.headerMovil}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={s.btnAtras}>‹</Text>
              </TouchableOpacity>
              <Text style={s.headerTitulo}>Admin</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1 }}>{SECCIONES[seccion]}</View>
            <NavBar />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Login ──
  loginContenedor: { flex: 1, backgroundColor: Tema.primarioOscuro, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginCaja:       {
    width: '100%', maxWidth: 380, backgroundColor: Tema.superficie,
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 14,
    ...sombraTarjeta,
  },
  loginIcono:      { width: 64, height: 64, borderRadius: 32, backgroundColor: Tema.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  loginIconoLetra: { fontSize: 28, fontWeight: '800', color: Tema.primario },
  loginTitulo:     { fontSize: 22, fontWeight: '800', color: Tema.texto, textAlign: 'center' },
  loginSubtitulo:  { fontSize: 13, color: Tema.textoMuted, textAlign: 'center', marginTop: -6 },
  loginInput:      {
    width: '100%', height: 50, backgroundColor: Tema.inputFondo,
    borderRadius: 12, borderWidth: 1.5, borderColor: Tema.bordeInput,
    paddingHorizontal: 16, fontSize: 15, color: Tema.texto,
  },
  loginInputError: { borderColor: Tema.error },
  loginError:      { fontSize: 13, color: Tema.error, fontWeight: '600' },
  loginBtn:        {
    width: '100%', backgroundColor: Tema.primario, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  loginBtnTxt:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  loginVolver:     { fontSize: 13, color: Tema.textoMuted, fontWeight: '600' },

  // ── Layout ──
  contenedor:  { flex: 1, backgroundColor: Tema.fondo },
  segura:      { flex: 1 },
  layoutPC:    { flex: 1, flexDirection: 'row' },
  layoutMovil: { flex: 1, flexDirection: 'column' },

  // ── Sidebar ──
  sidebar:        { width: 200, backgroundColor: Tema.superficie, borderRightWidth: 1, borderRightColor: Tema.borde, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 14, gap: 4 },
  sidebarHeader:  { marginBottom: 4, paddingHorizontal: 4 },
  sidebarTitulo:  { fontSize: 16, fontWeight: '800', color: Tema.texto },
  sidebarSub:     { fontSize: 11, color: Tema.textoMuted, marginTop: 2 },
  separador:      { height: 1, backgroundColor: Tema.borde, marginVertical: 10 },
  navItem:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 },
  navItemActivo:  { backgroundColor: Tema.primarioSuave },
  navAbrev:       { width: 36, height: 36, borderRadius: 8, backgroundColor: Tema.fondo, alignItems: 'center', justifyContent: 'center' },
  navAbrevActivo: { backgroundColor: Tema.primario },
  navAbrevTxt:    { fontSize: 10, fontWeight: '800', color: Tema.textoMuted },
  navAbrevTxtActivo: { color: '#fff' },
  navLabel:       { fontSize: 14, color: Tema.textoSecundario, fontWeight: '500' },
  navLabelActivo: { color: Tema.primario, fontWeight: '700' },
  btnSalir:       { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Tema.borde },
  txtSalir:       { fontSize: 13, color: Tema.textoMuted, fontWeight: '600' },

  // ── Bottom bar ──
  bottomBar:        { flexDirection: 'row', backgroundColor: Tema.superficie, borderTopWidth: 1, borderTopColor: Tema.borde, paddingBottom: Platform.OS === 'android' ? 16 : 8 },
  bottomItem:       { flex: 1, alignItems: 'center', paddingVertical: 10 },
  bottomItemActivo: { borderTopWidth: 2, borderTopColor: Tema.primario },
  bottomLabel:      { fontSize: 11, color: Tema.textoMuted, fontWeight: '500' },
  bottomLabelActivo:{ fontSize: 11, color: Tema.primario, fontWeight: '800' },

  // ── Headers ──
  headerPC:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Tema.borde, backgroundColor: Tema.superficie },
  headerMovil:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Tema.borde, backgroundColor: Tema.superficie },
  headerTitulo: { fontSize: 15, fontWeight: '700', color: Tema.texto },
  btnAtras:     { fontSize: 14, color: Tema.primario, fontWeight: '600' },
  contenidoPC:  { flex: 1, flexDirection: 'column' },

  // ── Secciones ──
  seccionScroll: { padding: 20, gap: 12 },
  seccionTitulo: { fontSize: 20, fontWeight: '800', color: Tema.texto, marginBottom: 4 },
  subTitulo:     { fontSize: 14, fontWeight: '700', color: Tema.textoSecundario, marginTop: 4 },
  rowHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  btnCancelarTxt:{ fontSize: 14, color: Tema.acento, fontWeight: '600' },

  // ── Stats ──
  gridStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard:  {
    flex: 1, minWidth: 130, backgroundColor: Tema.superficie,
    borderRadius: 12, padding: 16, borderTopWidth: 3,
    borderWidth: 1, borderColor: Tema.borde, gap: 4,
    ...sombraTarjeta,
  },
  statValor: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Tema.textoMuted, lineHeight: 14 },

  // ── Item cards ──
  itemCard:       {
    backgroundColor: Tema.superficie, borderRadius: 12,
    padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: Tema.borde,
    ...sombraTarjeta,
  },
  itemCardInactivo: { opacity: 0.5 },
  itemCardRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemNombre:     { fontSize: 14, fontWeight: '700', color: Tema.texto, flex: 1, marginRight: 8 },
  itemSub:        { fontSize: 12, color: Tema.textoMuted, marginTop: 2, lineHeight: 17 },
  itemPrecio:     { fontSize: 13, fontWeight: '700', color: Tema.acento, marginTop: 6 },
  itemAcciones:   { gap: 6 },
  btnAccion:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: Tema.borde, alignItems: 'center' },
  btnAccionTxt:   { fontSize: 11, fontWeight: '700', color: Tema.textoSecundario },

  // ── Barra de estado lateral (reservas) ──
  barraEstado: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 4 },

  // ── Transiciones de estado ──
  transicionRow:    { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btnTransicion:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  btnTransicionTxt: { fontSize: 12, fontWeight: '700' },

  // ── Tipo usuario ──
  tipoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },

  // ── Badges ──
  badge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  // ── Formulario ──
  formLabel:     { fontSize: 13, fontWeight: '600', color: Tema.textoSecundario, marginBottom: 4 },
  formInput:     {
    backgroundColor: Tema.inputFondo, borderRadius: 10, borderWidth: 1.5,
    borderColor: Tema.bordeInput, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: Tema.texto,
  },
  btnPrimario:    { backgroundColor: Tema.primario, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDeshabilitado: { backgroundColor: Tema.borde },
  btnNuevo:      { backgroundColor: Tema.primario, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnNuevoTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Chips de filtro ──
  chipFiltro:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Tema.superficie, borderWidth: 1.5, borderColor: Tema.borde },
  chipFiltroActivo: { backgroundColor: Tema.primario, borderColor: Tema.primario },
  chipFiltroTxt:    { fontSize: 13, color: Tema.textoSecundario, fontWeight: '500' },
  chipFiltroTxtActivo: { color: '#fff', fontWeight: '700' },

  // ── Avatares ──
  avatar:           { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:      { fontWeight: '700', fontSize: 13 },
  avatarGrande:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetraGrande:{ fontWeight: '800', fontSize: 18 },

  // ── Resumen dashboard ──
  filaResumen:       {
    backgroundColor: Tema.superficie, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Tema.borde,
  },
  filaResumenNombre: { fontSize: 13, fontWeight: '700', color: Tema.texto },
  filaResumenSub:    { fontSize: 11, color: Tema.textoMuted, marginTop: 2 },

  // ── Vacío ──
  vacioCentrado: { paddingVertical: 32, alignItems: 'center' },
  textoVacio:    { fontSize: 13, color: Tema.textoMuted },
});
