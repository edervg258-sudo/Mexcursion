import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Pressable, ScrollView,
    StyleSheet, Text, TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminDashboard } from '../../components/AdminDashboard';
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
import { Tema } from '../../lib/tema';
import { SkeletonFilas } from './skeletonloader';

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
  const { bottom: bottomInset } = useSafeAreaInsets();

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

  // ── Cálculos reales ───────────────────────────────────────────────────
  const ahora         = new Date();
  const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesPas  = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

  const enEsteMes  = (fecha: string) => new Date(fecha) >= inicioEsteMes;
  const enMesPas   = (fecha: string) => new Date(fecha) >= inicioMesPas && new Date(fecha) < inicioEsteMes;
  const trend      = (actual: number, anterior: number) =>
    anterior === 0 ? (actual > 0 ? 100 : 0) : Math.round(((actual - anterior) / anterior) * 100);

  const formatTiempo = (fecha: string) => {
    const seg = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 1000);
    if (seg < 60)    return 'Hace un momento';
    if (seg < 3600)  return `Hace ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `Hace ${Math.floor(seg / 3600)}h`;
    return `Hace ${Math.floor(seg / 86400)}d`;
  };

  // Top destinos reales: agrupar reservas por destino
  const topDestinos = Object.entries(
    reservas.reduce<Record<string, number>>((acc, r) => {
      if (r.destino) acc[r.destino] = (acc[r.destino] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, count]) => ({ nombre, reservas: count }));

  // Actividad reciente real: mezcla de reservas + altas de usuarios
  const actividadReservas = [...reservas]
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, 6)
    .map(r => ({
      tipo: 'reserva',
      descripcion: `Reserva ${r.estado}: ${r.destino} — ${r.nombre_usuario}`,
      tiempo: formatTiempo(r.creado_en),
      _ts: new Date(r.creado_en).getTime(),
    }));

  const actividadUsuarios = [...usuarios]
    .filter(u => !!u.creado_en)
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, 4)
    .map(u => ({
      tipo: 'usuario',
      descripcion: `Nuevo usuario: ${u.nombre || u.correo}`,
      tiempo: formatTiempo(u.creado_en),
      _ts: new Date(u.creado_en).getTime(),
    }));

  const actividadReciente = [...actividadReservas, ...actividadUsuarios]
    .sort((a, b) => b._ts - a._ts)
    .slice(0, 8)
    .map(({ tipo, descripcion, tiempo }) => ({ tipo, descripcion, tiempo }));

  // Trends mes a mes
  const resEsteMes  = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en)).length;
  const resMesPas   = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)).length;
  const ingEsteMes  = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en) && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
  const ingMesPas   = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)  && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
  const usrEsteMes  = usuarios.filter(u => u.creado_en && enEsteMes(u.creado_en)).length;
  const usrMesPas   = usuarios.filter(u => u.creado_en && enMesPas(u.creado_en)).length;

  // Stats
  const stats = {
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
    <View style={[s.bottomBar, { paddingBottom: Math.max(bottomInset, 8) }]}>
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
    <AdminDashboard 
      stats={stats} 
      cargando={cargando} 
      esPC={esPC}
    />
  );

  // ── Destinos ────────────────────────────────────────────────────────────────
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
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => handleToggleActivoDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: d.activo ? '#9A7118' : Tema.primario }]}>
                    {d.activo ? 'Pausar' : 'Activar'}
                  </Text>
                </Pressable>
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => abrirFormEditar(d)}>
                  <Text style={s.btnAccionTxt}>Editar</Text>
                </Pressable>
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(221,51,29,0.12)', borderless: false }} onPress={() => handleEliminarDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: Tema.acento }]}>Eliminar</Text>
                </Pressable>
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
          {cargando ? <SkeletonFilas cantidad={4} /> : rutasSugeridas.length === 0 ? (
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
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => handleToggleActivoRuta(r.id)}>
                  <Text style={[s.btnAccionTxt, { color: r.activo ? '#9A7118' : Tema.primario }]}>
                    {r.activo ? 'Pausar' : 'Activar'}
                  </Text>
                </Pressable>
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => abrirFormRutaEditar(r)}>
                  <Text style={s.btnAccionTxt}>Editar</Text>
                </Pressable>
                <Pressable style={s.btnAccion} android_ripple={{ color: 'rgba(221,51,29,0.12)', borderless: false }} onPress={() => handleEliminarRuta(r.id)}>
                  <Text style={[s.btnAccionTxt, { color: Tema.acento }]}>Eliminar</Text>
                </Pressable>
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
          ? <SkeletonFilas cantidad={4} />
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
                          <Pressable
                            key={tr.estado}
                            style={[s.btnTransicion, { borderColor: tr.color }]}
                            android_ripple={{ color: tr.color + '30', borderless: false }}
                            onPress={() => handleCambiarEstado(r, tr.estado)}
                          >
                            <Text style={[s.btnTransicionTxt, { color: tr.color }]}>{tr.label}</Text>
                          </Pressable>
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
          <SkeletonFilas cantidad={4} />
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
                <Pressable
                  style={[s.btnTransicion, { borderColor: u.tipo === 'admin' ? '#9A7118' : Tema.primario }]}
                  android_ripple={{ color: u.tipo === 'admin' ? 'rgba(154,113,24,0.15)' : `${Tema.primario}25`, borderless: false }}
                  onPress={() => handleCambiarTipo(u.id, u.tipo)}
                >
                  <Text style={[s.btnTransicionTxt, { color: u.tipo === 'admin' ? '#9A7118' : Tema.primario }]}>
                    {u.tipo === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              style={[s.btnAccion, { borderColor: u.activo ? Tema.acento : Tema.primario }]}
              android_ripple={{ color: u.activo ? 'rgba(221,51,29,0.12)' : `${Tema.primario}25`, borderless: false }}
              onPress={() => handleToggleActivo(u.id)}
            >
              <Text style={[s.btnAccionTxt, { color: u.activo ? Tema.acento : Tema.primario }]}>
                {u.activo ? 'Bloquear' : 'Activar'}
              </Text>
            </Pressable>
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
            <View style={{ flex: 1 }}>
  {SECCIONES[seccion]}

  {(seccion === 'destinos' || seccion === 'rutas') && (
    <TouchableOpacity
      style={s.fab}
      onPress={seccion === 'destinos' ? abrirFormNuevo : abrirFormRutaNuevo}
      activeOpacity={0.85}
    >
      <Text style={s.fabTxt}>+</Text>
    </TouchableOpacity>
  )}
</View>

<NavBar />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f4f6f8', // fondo más Android
  },

  segura: { flex: 1 },

  layoutMovil: {
    flex: 1,
  },

  headerMovil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    elevation: 4,
  },

  headerTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  btnAtras: {
    fontSize: 18,
    color: Tema.primario,
  },

  // SECCIONES
  seccionScroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 120,
  },

  seccionTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },

  subTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
  },

  // CARDS
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    elevation: 2,
  },

  itemCardInactivo: {
    opacity: 0.5,
  },

  itemNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  itemSub: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },

  itemPrecio: {
    fontSize: 14,
    fontWeight: '700',
    color: Tema.acento,
    marginTop: 6,
  },

  // BOTONES
  btnAccion: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
  },

  btnAccionTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },

  pressed: {
    transform: [{ scale: 0.96 }],
  },

  // BADGES
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgeTxt: {
    fontSize: 12,
    fontWeight: '700',
  },

  // STATS
  gridStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },

  statValor: {
    fontSize: 26,
    fontWeight: '900',
  },

  statLabel: {
    fontSize: 12,
    color: '#777',
  },

  // INPUTS
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  formInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    elevation: 1,
  },

  // BOTÓN PRINCIPAL
  btnPrimario: {
    backgroundColor: Tema.primario,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  btnPrimarioTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  btnDeshabilitado: {
    backgroundColor: '#ccc',
  },

  // CHIPS
  chipFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 1,
  },

  chipFiltroActivo: {
    backgroundColor: Tema.primario,
  },

  chipFiltroTxt: {
    fontSize: 13,
    color: '#555',
  },

  chipFiltroTxtActivo: {
    color: '#fff',
    fontWeight: '700',
  },

  // BOTTOM BAR
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 10,
  },

  bottomItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },

  bottomItemActivo: {
    backgroundColor: Tema.primarioSuave,
    borderRadius: 12,
  },

  bottomLabel: {
    fontSize: 12,
    color: '#777',
  },

  bottomLabelActivo: {
    color: Tema.primario,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Tema.primario,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },

  fabTxt: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },

  // OTROS
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  vacioCentrado: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  textoVacio: {
    color: '#777'},
  
  sidebar: {
  width: 80,
  backgroundColor: '#0f172a',
  paddingVertical: 16,
  alignItems: 'center',
  elevation: 6,
},

sidebarHeader: {
  alignItems: 'center',
  marginBottom: 20,
},

sidebarTitulo: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},

sidebarSub: {
  color: '#94a3b8',
  fontSize: 12,
},

separador: {
  height: 1,
  backgroundColor: '#1e293b',
  width: '80%',
  marginVertical: 12,
},

navItem: {
  width: '100%',
  alignItems: 'center',
  paddingVertical: 10,
  borderRadius: 10,
},

navItemActivo: {
  backgroundColor: '#1e293b',
},

navAbrev: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#1e293b',
},

navAbrevActivo: {
  backgroundColor: '#2563eb',
},

navAbrevTxt: {
  color: '#cbd5f5',
  fontWeight: '600',
},

navAbrevTxtActivo: {
  color: '#fff',
},

navLabel: {
  fontSize: 11,
  color: '#94a3b8',
  marginTop: 4,
},

navLabelActivo: {
  color: '#fff',
},

filaResumen: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
},

filaResumenNombre: {
  fontSize: 15,
  fontWeight: '600',
  color: '#0f172a',
},

filaResumenSub: {
  fontSize: 12,
  color: '#64748b',
},

avatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#2563eb',
  justifyContent: 'center',
  alignItems: 'center',
},

avatarLetra: {
  color: '#fff',
  fontWeight: '700',
},

avatarGrande: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#2563eb',
  justifyContent: 'center',
  alignItems: 'center',
},

avatarLetraGrande: {
  color: '#fff',
  fontSize: 20,
  fontWeight: '700',
},

btnNuevo: {
  backgroundColor: '#2563eb',
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
},

btnNuevoTxt: {
  color: '#fff',
  fontWeight: '600',
},

btnCancelarTxt: {
  color: '#ef4444',
  fontWeight: '600',
},

itemCardRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

itemAcciones: {
  flexDirection: 'row',
  gap: 10,
},

barraEstado: {
  height: 6,
  borderRadius: 10,
  backgroundColor: '#22c55e',
  marginTop: 6,
},

transicionRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10,
},

btnTransicion: {
  backgroundColor: '#e2e8f0',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
},

btnTransicionTxt: {
  color: '#0f172a',
  fontWeight: '500',
},

tipoRow: {
  flexDirection: 'row',
  gap: 8,
},

layoutPC: {
  flexDirection: 'row',
  flex: 1,
},

contenidoPC: {
  flex: 1,
  padding: 20,
},

headerPC: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},

});
