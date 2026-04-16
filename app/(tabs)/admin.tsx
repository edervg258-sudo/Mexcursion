import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    Pressable, ScrollView,
    StyleSheet, Text, TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminDashboard } from '../../components/AdminDashboard';
import { RUTAS_TEMATICAS } from '../../lib/datos/rutas-tematicas';
import {
    actualizarDestino,
    actualizarEstadoReserva,
    cambiarTipoUsuario, cargarTodasLasReservas,
    cargarTodosLosUsuarios,
    crearDestino,
    eliminarDestino,
    obtenerTodosLosDestinos,
    obtenerUsuarioActivo,
    toggleActivoDestinoAdmin,
    toggleActivoUsuarioAdmin
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';
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

// ── Imágenes de rutas ──────────────────────────────────────────────────────
const RUTA_IMG: Record<string, number> = {
  colonial: require('../../assets/images/guanajuato.png') as number,
  maya:     require('../../assets/images/chiapas.png') as number,
  pacifico: require('../../assets/images/sinaloa.png') as number,
  sabor:    require('../../assets/images/jalisco.png') as number,
  aventura: require('../../assets/images/chihuahua.png') as number,
};

// ── Colores de estado de reserva ───────────────────────────────────────────
const C_ESTADO_BASE: Record<string, { fondo: string; texto: string; label: string }> = {
  confirmada: { fondo: '#E8F5F2', texto: '#3AB7A5', label: 'Confirmada'  },
  completada: { fondo: '#F0F0F0', texto: '#666',    label: 'Completada'  },
  cancelada:  { fondo: '#FEF0EE', texto: '#DD331D', label: 'Cancelada'   },
  pendiente:  { fondo: '#FEF8E8', texto: '#9A7118', label: 'Pendiente'   },
};

const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  pendiente:  [{ label: 'Confirmar', estado: 'confirmada', color: '#3AB7A5' }, { label: 'Cancelar', estado: 'cancelada', color: '#DD331D' }],
  confirmada: [{ label: 'Completar', estado: 'completada', color: '#27AE60' }, { label: 'Cancelar', estado: 'cancelada', color: '#DD331D' }],
  completada: [],
  cancelada:  [],
};

// ── Componente principal ───────────────────────────────────────────────────
export default function AdminScreen() {
  const { width }               = useWindowDimensions();
  const esPC                    = width >= 768;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { tema, isDark }        = useTemaContext();

  const [seccion, setSeccion]   = useState<Seccion>('dashboard');
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificado, setVerificado] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // CRUD destinos
  const [modoForm, setModoForm]           = useState<'nuevo' | 'editar' | null>(null);
  const [destinoEdit, setDestinoEdit]     = useState<Destino | null>(null);
  const [formNombre, setFormNombre]       = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formPrecio, setFormPrecio]       = useState('');
  const [formDesc, setFormDesc]           = useState('');
  const [formErrores, setFormErrores]     = useState<Record<string, string | undefined>>({});

  // Filtros y búsqueda — destinos
  const [busquedaDestino, setBusquedaDestino] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [ordenDestinos, setOrdenDestinos]     = useState('nombre');

  // Filtros y búsqueda — reservas
  const [filtroReserva, setFiltroReserva]     = useState('todas');
  const [filtroFecha, setFiltroFecha]         = useState('todas');
  const [busquedaReserva, setBusquedaReserva] = useState('');
  const [ordenReservas, setOrdenReservas]     = useState('reciente');

  // Filtros y búsqueda — usuarios
  const [filtroUsuario, setFiltroUsuario]     = useState('todos');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [ordenUsuarios, setOrdenUsuarios]     = useState('nombre');

  // ── Carga de datos (extraída para poder llamar desde "Reintentar") ────
  const recargar = useCallback(async () => {
    setErrorCarga(null);
    setCargando(true);
    try {
      const sesion = await obtenerUsuarioActivo();
      if (!sesion || sesion.tipo !== 'admin') { router.back(); return; }
      const [r, u, d] = await Promise.all([
        cargarTodasLasReservas(),
        cargarTodosLosUsuarios(),
        obtenerTodosLosDestinos(),
      ]);
      setReservas(r as Reserva[]);
      setUsuarios(u as Usuario[]);
      setDestinos(d as Destino[]);
    } catch {
      setErrorCarga('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      setCargando(false);
      setVerificado(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setVerificado(false);
    recargar();
  }, [recargar]));

  // ── CRUD destinos ─────────────────────────────────────────────────────
  const abrirFormNuevo = () => {
    setModoForm('nuevo'); setDestinoEdit(null);
    setFormNombre(''); setFormCategoria(''); setFormPrecio(''); setFormDesc('');
    setFormErrores({});
  };
  const abrirFormEditar = (d: Destino) => {
    setModoForm('editar'); setDestinoEdit(d);
    setFormNombre(d.nombre); setFormCategoria(d.categoria);
    setFormPrecio(String(d.precio)); setFormDesc(d.descripcion);
    setFormErrores({});
  };
  const guardarDestino = async () => {
    const errores: Record<string, string> = {};
    if (!formNombre.trim())     errores.nombre    = 'El nombre es requerido';
    if (!formCategoria.trim())  errores.categoria = 'La categoría es requerida';
    const precioNum = Number(formPrecio);
    if (!formPrecio.trim() || isNaN(precioNum) || precioNum <= 0) {
      errores.precio = 'Ingresa un precio mayor a $0';
    }
    if (Object.keys(errores).length > 0) { setFormErrores(errores); return; }
    setFormErrores({});
    if (modoForm === 'nuevo') {
      await crearDestino({ nombre: formNombre.trim(), categoria: formCategoria.trim(), descripcion: formDesc.trim(), precio: precioNum });
    } else if (destinoEdit) {
      await actualizarDestino(destinoEdit.id, { nombre: formNombre.trim(), categoria: formCategoria.trim(), descripcion: formDesc.trim(), precio: precioNum });
    }
    setModoForm(null);
    setDestinos(await obtenerTodosLosDestinos() as Destino[]);
  };
  const handleEliminarDestino = (id: number) => {
    Alert.alert('Eliminar destino', '¿Seguro que quieres eliminar este destino?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarDestino(id);
          setDestinos(await obtenerTodosLosDestinos() as Destino[]);
      } },
    ]);
  };
  const handleToggleActivoDestino = async (id: number) => {
    await toggleActivoDestinoAdmin(id);
    setDestinos(await obtenerTodosLosDestinos() as Destino[]);
  };

  // ── Usuarios ──────────────────────────────────────────────────────────
  const handleCambiarTipo = async (id: string, tipoActual: string) => {
    const nuevoTipo = tipoActual === 'admin' ? 'normal' : 'admin';
    setUsuarios(u => u.map(x => x.id === id ? { ...x, tipo: nuevoTipo } : x));
    await cambiarTipoUsuario(id, nuevoTipo);
  };
  const handleToggleActivo = async (id: string) => {
    setUsuarios(u => u.map(x => x.id === id ? { ...x, activo: x.activo ? 0 : 1 } : x));
    await toggleActivoUsuarioAdmin(id);
  };
  const handleCambiarEstado = (reserva: Reserva, nuevo_estado: string) => {
    const tr = TRANSICIONES[reserva.estado]?.find(t => t.estado === nuevo_estado);
    const esCancelacion = nuevo_estado === 'cancelada';
    Alert.alert(
      tr?.label ?? 'Cambiar estado',
      `¿${tr?.label ?? 'Cambiar'} la reserva ${reserva.folio}?\n\n${esCancelacion ? 'Esta acción notificará al usuario y no se puede deshacer fácilmente.' : `Pasará de "${reserva.estado}" a "${nuevo_estado}".`}`,
      [
        { text: 'No, volver', style: 'cancel' },
        {
          text: tr?.label ?? 'Confirmar',
          style: esCancelacion ? 'destructive' : 'default',
          onPress: async () => {
            setReservas(r => r.map(x => x.id === reserva.id ? { ...x, estado: nuevo_estado } : x));
            await actualizarEstadoReserva(reserva.id, nuevo_estado);
          },
        },
      ]
    );
  };

  // ── Estadísticas reales ────────────────────────────────────────────────
  const ahora         = new Date();
  const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesPas  = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const enEsteMes = (f: string) => new Date(f) >= inicioEsteMes;
  const enMesPas  = (f: string) => new Date(f) >= inicioMesPas && new Date(f) < inicioEsteMes;
  const trend     = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);
  const formatTiempo = (fecha: string) => {
    const seg = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 1000);
    if (seg < 60)    { return 'Hace un momento'; }
    if (seg < 3600)  { return `Hace ${Math.floor(seg / 60)} min`; }
    if (seg < 86400) { return `Hace ${Math.floor(seg / 3600)}h`; }
    return `Hace ${Math.floor(seg / 86400)}d`;
  };

  const topDestinos = Object.entries(
    reservas.reduce<Record<string, number>>((acc, r) => {
      if (r.destino) { acc[r.destino] = (acc[r.destino] ?? 0) + 1; }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, count]) => ({ nombre, reservas: count }));

  const actividadReciente = [
    ...[...reservas].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()).slice(0, 6)
      .map(r => ({ tipo: 'reserva', descripcion: `Reserva ${r.estado}: ${r.destino} — ${r.nombre_usuario}`, tiempo: formatTiempo(r.creado_en), _ts: new Date(r.creado_en).getTime() })),
    ...[...usuarios].filter(u => !!u.creado_en).sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()).slice(0, 4)
      .map(u => ({ tipo: 'usuario', descripcion: `Nuevo usuario: ${u.nombre || u.correo}`, tiempo: formatTiempo(u.creado_en), _ts: new Date(u.creado_en).getTime() })),
  ].sort((a, b) => b._ts - a._ts).slice(0, 8).map(({ tipo, descripcion, tiempo }) => ({ tipo, descripcion, tiempo }));

  const resEsteMes = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en)).length;
  const resMesPas  = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)).length;
  const ingEsteMes = reservas.filter(r => r.creado_en && enEsteMes(r.creado_en) && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
  const ingMesPas  = reservas.filter(r => r.creado_en && enMesPas(r.creado_en)  && r.estado !== 'cancelada').reduce((a, r) => a + (r.total ?? 0), 0);
  const usrEsteMes = usuarios.filter(u => u.creado_en && enEsteMes(u.creado_en)).length;
  const usrMesPas  = usuarios.filter(u => u.creado_en && enMesPas(u.creado_en)).length;

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

  // ── Datos filtrados y ordenados ────────────────────────────────────────
  const categoriasDestino = [
    'todas',
    ...Array.from(new Set(destinos.map(d => d.categoria).filter(Boolean).map(c => c.trim()))).sort(),
  ];

  const destinosFiltrados = (() => {
    const q = busquedaDestino.toLowerCase().trim();
    const base = destinos
      .filter(d => filtroCategoria === 'todas' || d.categoria.trim().toLowerCase() === filtroCategoria.toLowerCase())
      .filter(d => !q || d.nombre.toLowerCase().includes(q) || d.categoria.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q));
    return [...base].sort((a, b) => {
      switch (ordenDestinos) {
        case 'precio-asc':  return a.precio - b.precio;
        case 'precio-desc': return b.precio - a.precio;
        case 'activos':     return (b.activo ? 1 : 0) - (a.activo ? 1 : 0);
        default:            return a.nombre.localeCompare(b.nombre);
      }
    });
  })();

  const reservasFiltradas = (() => {
    const q = busquedaReserva.toLowerCase().trim();
    const ahora2 = new Date();
    const hace7  = new Date(ahora2); hace7.setDate(ahora2.getDate() - 7);
    const hace30 = new Date(ahora2); hace30.setDate(ahora2.getDate() - 30);
    const base = reservas
      .filter(r => filtroReserva === 'todas' || r.estado === filtroReserva)
      .filter(r => {
        if (filtroFecha === 'todas') return true;
        const f = r.creado_en ? new Date(r.creado_en) : null;
        if (!f) return false;
        if (filtroFecha === 'hoy')    return f.toDateString() === ahora2.toDateString();
        if (filtroFecha === 'semana') return f >= hace7;
        if (filtroFecha === 'mes')    return f >= hace30;
        return true;
      })
      .filter(r => !q || (
        r.folio?.toLowerCase().includes(q) ||
        r.nombre_usuario?.toLowerCase().includes(q) ||
        r.destino?.toLowerCase().includes(q)
      ));
    return [...base].sort((a, b) => {
      switch (ordenReservas) {
        case 'antiguo':    return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
        case 'total-desc': return (b.total ?? 0) - (a.total ?? 0);
        case 'total-asc':  return (a.total ?? 0) - (b.total ?? 0);
        default:           return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
      }
    });
  })();

  const usuariosFiltradosOrdenados = (() => {
    const q = busquedaUsuario.toLowerCase().trim();
    const base = usuarios
      .filter(u => filtroUsuario === 'todos'    ? true
                 : filtroUsuario === 'admin'    ? u.tipo === 'admin'
                 : filtroUsuario === 'activos'  ? !!u.activo
                 : !u.activo)
      .filter(u => !q || (
        u.nombre?.toLowerCase().includes(q) ||
        u.correo?.toLowerCase().includes(q) ||
        u.nombre_usuario?.toLowerCase().includes(q)
      ));
    return [...base].sort((a, b) => {
      switch (ordenUsuarios) {
        case 'reservas': return (b.reservas_count ?? 0) - (a.reservas_count ?? 0);
        case 'reciente': return new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime();
        default:         return (a.nombre || '').localeCompare(b.nombre || '');
      }
    });
  })();

  // ── Nav ───────────────────────────────────────────────────────────────
  const NAV: { id: Seccion; label: string; abrev: string }[] = [
    { id: 'dashboard', label: 'Panel',    abrev: 'PNL' },
    { id: 'destinos',  label: 'Destinos', abrev: 'DST' },
    { id: 'rutas',     label: 'Rutas',    abrev: 'RTS' },
    { id: 'reservas',  label: 'Reservas', abrev: 'RSV' },
    { id: 'usuarios',  label: 'Usuarios', abrev: 'USR' },
  ];

  const NavBar = () => esPC ? (
    <View style={[s.sidebar, { backgroundColor: isDark ? '#0D1412' : '#0f172a' }]}>
      <View style={s.sidebarHeader}>
        <Text style={s.sidebarTitulo}>Admin</Text>
        <Text style={s.sidebarSub}>Mexcursión</Text>
      </View>
      <View style={s.separador} />
      {NAV.map(n => (
        <TouchableOpacity key={n.id} style={[s.navItem, seccion === n.id && s.navItemActivo]} onPress={() => setSeccion(n.id)}>
          <View style={[s.navAbrev, seccion === n.id && { backgroundColor: tema.primario }]}>
            <Text style={[s.navAbrevTxt, seccion === n.id && s.navAbrevTxtActivo]}>{n.abrev}</Text>
          </View>
          <Text style={[s.navLabel, seccion === n.id && s.navLabelActivo]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ flex: 1 }} />
    </View>
  ) : (
    <View style={[s.bottomBar, { paddingBottom: Math.max(bottomInset, 8), backgroundColor: tema.superficieBlanca, borderTopColor: tema.borde, borderTopWidth: 1 }]}>
      {NAV.map(n => (
        <TouchableOpacity key={n.id} style={[s.bottomItem, seccion === n.id && { backgroundColor: tema.primarioSuave, borderRadius: 10 }]} onPress={() => setSeccion(n.id)}>
          <Text style={[s.bottomLabel, { color: seccion === n.id ? tema.primario : tema.textoMuted }, seccion === n.id && { fontWeight: '700' }]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Banner de error global (con botón Reintentar) ─────────────────────
  const ErrorBanner = () => errorCarga ? (
    <View style={{
      backgroundColor: isDark ? '#2A1210' : '#FEF0EE',
      borderRadius: 10, padding: 12, margin: 12,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <Text style={[s.errorBannerTxt, { color: '#DD331D', flex: 1, marginRight: 8 }]}>{errorCarga}</Text>
      <TouchableOpacity onPress={recargar}>
        <Text style={{ color: '#DD331D', fontWeight: '700', fontSize: 13 }}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  // ── Dashboard ─────────────────────────────────────────────────────────
  const Dashboard = () => (
    <AdminDashboard stats={stats} cargando={cargando} esPC={esPC} />
  );

  // ── Destinos ──────────────────────────────────────────────────────────
  const Destinos = () => (
    <View style={{ flex: 1 }}>
      {modoForm ? (
        <ScrollView contentContainerStyle={[s.seccionScroll, { backgroundColor: tema.fondo }]}>
          <View style={s.rowHeader}>
            <Text style={[s.seccionTitulo, { color: tema.texto }]}>{modoForm === 'nuevo' ? 'Nuevo destino' : 'Editar destino'}</Text>
            <TouchableOpacity onPress={() => setModoForm(null)}>
              <Text style={[s.btnCancelarTxt, { color: tema.acento }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          {([
            { key: 'nombre',    label: 'Nombre',      val: formNombre,    set: setFormNombre,    ph: 'Ej: Oaxaca' },
            { key: 'categoria', label: 'Categoría',   val: formCategoria, set: setFormCategoria, ph: 'Playa / Cultura / Aventura...' },
            { key: 'precio',    label: 'Precio base', val: formPrecio,    set: setFormPrecio,    ph: 'Ej: 2500', numeric: true },
            { key: 'desc',      label: 'Descripción', val: formDesc,      set: setFormDesc,      ph: 'Descripción breve' },
          ] as { key: string; label: string; val: string; set: (v: string) => void; ph: string; numeric?: boolean }[]).map(f => {
            const error = formErrores[f.key];
            return (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={[s.formLabel, { color: tema.textoMuted }]}>{f.label}</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: tema.superficieBlanca, color: tema.texto, borderColor: error ? '#DD331D' : tema.borde, borderWidth: 1 }]}
                  value={f.val}
                  onChangeText={v => { f.set(v); if (error) setFormErrores(e => ({ ...e, [f.key]: undefined })); }}
                  placeholder={f.ph}
                  placeholderTextColor={tema.textoMuted}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                />
                {error && <Text style={s.formError}>{error}</Text>}
              </View>
            );
          })}
          <TouchableOpacity style={s.btnPrimario} onPress={guardarDestino}>
            <Text style={s.btnPrimarioTxt}>Guardar destino</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[s.seccionScroll, { backgroundColor: tema.fondo }]}>
          <View style={s.rowHeader}>
            <Text style={[s.seccionTitulo, { color: tema.texto }]}>
              Destinos{' '}
              <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
                ({destinosFiltrados.length}{destinosFiltrados.length !== destinos.length ? ` de ${destinos.length}` : ''})
              </Text>
            </Text>
            <TouchableOpacity style={[s.btnNuevo, { backgroundColor: tema.primario }]} onPress={abrirFormNuevo}>
              <Text style={s.btnNuevoTxt}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>

          {/* Búsqueda */}
          <View style={[s.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
            <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, color: tema.texto, fontSize: 14 }}
              placeholder="Buscar destino…"
              placeholderTextColor={tema.textoMuted}
              value={busquedaDestino}
              onChangeText={setBusquedaDestino}
              returnKeyType="search"
            />
            {busquedaDestino.length > 0 && (
              <TouchableOpacity onPress={() => setBusquedaDestino('')}>
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
                  style={[s.chipFiltro, { backgroundColor: filtroCategoria === cat ? tema.primario : tema.superficieBlanca }]}
                  onPress={() => setFiltroCategoria(cat)}
                >
                  <Text style={[s.chipFiltroTxt, { color: filtroCategoria === cat ? '#fff' : tema.textoMuted }, filtroCategoria === cat && { fontWeight: '700' }]}>
                    {cat === 'todas' ? 'Todas' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Chips orden */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {[{ id: 'nombre', label: 'A-Z' }, { id: 'precio-asc', label: 'Precio ↑' }, { id: 'precio-desc', label: 'Precio ↓' }, { id: 'activos', label: 'Activos' }].map(o => (
                <TouchableOpacity
                  key={o.id}
                  style={[s.chipFiltro, { backgroundColor: ordenDestinos === o.id ? tema.acento : tema.superficieBlanca }]}
                  onPress={() => setOrdenDestinos(o.id)}
                >
                  <Text style={[s.chipFiltroTxt, { color: ordenDestinos === o.id ? '#fff' : tema.textoMuted }, ordenDestinos === o.id && { fontWeight: '700' }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {destinosFiltrados.length === 0 ? (
            <View style={s.vacioCentrado}>
              <Text style={[s.textoVacio, { color: tema.textoMuted }]}>
                {destinos.length === 0 ? 'Sin destinos registrados' : busquedaDestino ? `Sin resultados para "${busquedaDestino}"` : 'Sin resultados para este filtro'}
              </Text>
            </View>
          ) : destinosFiltrados.map(d => (
            <View key={d.id} style={[s.itemCard, { backgroundColor: tema.superficieBlanca }, !d.activo && s.itemCardInactivo]}>
              <View style={{ flex: 1 }}>
                <View style={s.itemCardRow}>
                  <Text style={[s.itemNombre, { color: tema.texto }]}>{d.nombre}</Text>
                  <View style={[s.badge, { backgroundColor: d.activo ? tema.primarioSuave : tema.superficie }]}>
                    <Text style={[s.badgeTxt, { color: d.activo ? tema.primario : tema.textoMuted }]}>{d.categoria}</Text>
                  </View>
                </View>
                <Text style={[s.itemSub, { color: tema.textoMuted }]}>{d.descripcion}</Text>
                <Text style={[s.itemPrecio, { color: tema.acento }]}>${d.precio.toLocaleString()} MXN / persona</Text>
              </View>
              <View style={s.itemAcciones}>
                <Pressable style={[s.btnAccion, { backgroundColor: tema.superficie }]} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => handleToggleActivoDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: d.activo ? '#9A7118' : tema.primario }]}>{d.activo ? 'Pausar' : 'Activar'}</Text>
                </Pressable>
                <Pressable style={[s.btnAccion, { backgroundColor: tema.superficie }]} android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }} onPress={() => abrirFormEditar(d)}>
                  <Text style={[s.btnAccionTxt, { color: tema.texto }]}>Editar</Text>
                </Pressable>
                <Pressable style={[s.btnAccion, { backgroundColor: tema.superficie }]} android_ripple={{ color: 'rgba(221,51,29,0.12)', borderless: false }} onPress={() => handleEliminarDestino(d.id)}>
                  <Text style={[s.btnAccionTxt, { color: tema.acento }]}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── Rutas temáticas (datos locales — RUTAS_TEMATICAS) ─────────────────
  const RutasView = () => (
    <ScrollView contentContainerStyle={[s.seccionScroll, { backgroundColor: tema.fondo }]}>
      <Text style={[s.seccionTitulo, { color: tema.texto }]}>Rutas temáticas ({RUTAS_TEMATICAS.length})</Text>
      <Text style={[s.subTitulo, { color: tema.textoMuted, marginBottom: 16, fontSize: 13 }]}>
        Rutas curadas de la app. Para editar el contenido, modifica{' '}
        <Text style={{ fontFamily: 'monospace', color: tema.primario }}>lib/datos/rutas-tematicas.ts</Text>
      </Text>
      {RUTAS_TEMATICAS.map(r => {
        const img = RUTA_IMG[r.id];
        const difColor = r.dificultad === 'Fácil' ? '#3AB7A5' : r.dificultad === 'Moderada' ? '#e9c46a' : '#DD331D';
        return (
          <View key={r.id} style={[s.rutaCard, { backgroundColor: tema.superficieBlanca, borderColor: r.color + '55', borderLeftColor: r.color }]}>
            <View style={s.rutaCardTop}>
              {img && <Image source={img} style={s.rutaCardImg} resizeMode="cover" />}
              <View style={{ flex: 1 }}>
                <View style={[s.itemCardRow, { marginBottom: 4 }]}>
                  <Text style={[s.itemNombre, { color: tema.texto }]}>{r.nombre}</Text>
                  <View style={[s.badge, { backgroundColor: difColor + '22', borderWidth: 1, borderColor: difColor }]}>
                    <Text style={[s.badgeTxt, { color: difColor }]}>{r.dificultad}</Text>
                  </View>
                </View>
                <Text style={[s.itemSub, { color: tema.textoMuted }]} numberOfLines={2}>{r.descripcion}</Text>
              </View>
            </View>
            <View style={[s.rutaCardInfo, { borderTopColor: tema.borde }]}>
              <View style={s.rutaInfoItem}>
                <Text style={[s.rutaInfoLbl, { color: tema.textoMuted }]}>Destinos</Text>
                <Text style={[s.rutaInfoVal, { color: r.color }]}>{r.estadoIds.length}</Text>
              </View>
              <View style={s.rutaInfoItem}>
                <Text style={[s.rutaInfoLbl, { color: tema.textoMuted }]}>Días total</Text>
                <Text style={[s.rutaInfoVal, { color: tema.texto }]}>{r.estadoIds.length * r.diasPorEstado}</Text>
              </View>
              <View style={s.rutaInfoItem}>
                <Text style={[s.rutaInfoLbl, { color: tema.textoMuted }]}>Presupuesto</Text>
                <Text style={[s.rutaInfoVal, { color: tema.texto }]}>{r.presupuestoDiario}</Text>
              </View>
              <View style={s.rutaInfoItem}>
                <Text style={[s.rutaInfoLbl, { color: tema.textoMuted }]}>Época</Text>
                <Text style={[s.rutaInfoVal, { color: tema.texto }]}>{r.mejorEpoca}</Text>
              </View>
            </View>
            <View style={s.rutaTags}>
              {r.tags.map(tag => (
                <View key={tag} style={[s.rutaTag, { backgroundColor: r.color + '18', borderColor: r.color + '44' }]}>
                  <Text style={[s.rutaTagTxt, { color: r.color }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ── Reservas ──────────────────────────────────────────────────────────
  const Reservas = () => {
    const filtradas = reservasFiltradas;
    return (
      <ScrollView contentContainerStyle={[s.seccionScroll, { backgroundColor: tema.fondo }]}>
        <Text style={[s.seccionTitulo, { color: tema.texto }]}>
          Reservas{' '}
          <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
            ({filtradas.length}{filtradas.length !== reservas.length ? ` de ${reservas.length}` : ''})
          </Text>
        </Text>
        {cargando ? <SkeletonFilas cantidad={4} /> : (
          <>
            {/* Búsqueda */}
            <View style={[s.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
              <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
              <TextInput
                style={{ flex: 1, color: tema.texto, fontSize: 14 }}
                placeholder="Buscar por folio, usuario o destino…"
                placeholderTextColor={tema.textoMuted}
                value={busquedaReserva}
                onChangeText={setBusquedaReserva}
                returnKeyType="search"
              />
              {busquedaReserva.length > 0 && (
                <TouchableOpacity onPress={() => setBusquedaReserva('')}>
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
                    style={[s.chipFiltro, { backgroundColor: filtroReserva === f ? tema.primario : tema.superficieBlanca }]}
                    onPress={() => setFiltroReserva(f)}
                  >
                    <Text style={[s.chipFiltroTxt, { color: filtroReserva === f ? '#fff' : tema.textoMuted }, filtroReserva === f && { fontWeight: '700' }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Chips fecha */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {[{ id: 'todas', label: 'Cualquier fecha' }, { id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Últimos 7 días' }, { id: 'mes', label: 'Últimos 30 días' }].map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[s.chipFiltro, { backgroundColor: filtroFecha === f.id ? tema.acento : tema.superficieBlanca }]}
                    onPress={() => setFiltroFecha(f.id)}
                  >
                    <Text style={[s.chipFiltroTxt, { color: filtroFecha === f.id ? '#fff' : tema.textoMuted }, filtroFecha === f.id && { fontWeight: '700' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Chips orden */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {[{ id: 'reciente', label: 'Más nuevo' }, { id: 'antiguo', label: 'Más antiguo' }, { id: 'total-desc', label: 'Mayor total' }, { id: 'total-asc', label: 'Menor total' }].map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[s.chipFiltro, { backgroundColor: ordenReservas === o.id ? tema.acento : tema.superficieBlanca }]}
                    onPress={() => setOrdenReservas(o.id)}
                  >
                    <Text style={[s.chipFiltroTxt, { color: ordenReservas === o.id ? '#fff' : tema.textoMuted }, ordenReservas === o.id && { fontWeight: '700' }]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {filtradas.length === 0 ? (
              <View style={s.vacioCentrado}><Text style={[s.textoVacio, { color: tema.textoMuted }]}>{reservas.length === 0 ? 'Sin reservas registradas' : busquedaReserva ? `Sin resultados para "${busquedaReserva}"` : 'Sin resultados para este filtro'}</Text></View>
            ) : filtradas.map(r => {
              const ce = C_ESTADO_BASE[r.estado] ?? { fondo: '#f0f0f0', texto: '#888', label: r.estado };
              const transiciones = TRANSICIONES[r.estado] ?? [];
              const esCancelada = r.estado === 'cancelada';
              const esPendiente = r.estado === 'pendiente';
              return (
                <View key={r.folio ?? r.id} style={[
                  s.itemCard,
                  { backgroundColor: esCancelada
                      ? (isDark ? '#2A1210' : '#FEF0EE')
                      : esPendiente
                        ? (isDark ? '#2A2410' : '#FEFBEC')
                        : tema.superficieBlanca,
                    opacity: esCancelada ? 0.82 : 1,
                  },
                ]}>
                  <View style={[s.barraEstado, { backgroundColor: ce.texto }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.itemCardRow}>
                      <Text style={[s.itemNombre, { color: esCancelada ? ce.texto : tema.texto, textDecorationLine: esCancelada ? 'line-through' : 'none' }]}>{r.folio}</Text>
                      <View style={[s.badge, { backgroundColor: ce.fondo }]}>
                        <Text style={[s.badgeTxt, { color: ce.texto }]}>{ce.label}</Text>
                      </View>
                    </View>
                    <Text style={[s.itemSub, { color: esCancelada ? ce.texto + 'AA' : tema.textoMuted }]}>{r.nombre_usuario} · {r.destino}</Text>
                    <Text style={[s.itemSub, { color: tema.textoMuted }]}>{r.fecha} · {r.personas} persona{r.personas !== 1 ? 's' : ''} · Paq. {r.paquete}</Text>
                    <Text style={[s.itemSub, { color: tema.textoMuted }]}>{r.metodo}</Text>
                    <Text style={[
                      s.itemPrecio,
                      { color: esCancelada ? '#DD331D' : tema.acento,
                        textDecorationLine: esCancelada ? 'line-through' : 'none' },
                    ]}>
                      {esCancelada ? '−' : ''}${(r.total ?? 0).toLocaleString()} MXN
                    </Text>
                    {transiciones.length > 0 && (
                      <View style={s.transicionRow}>
                        {transiciones.map(tr => (
                          <Pressable key={tr.estado} style={[s.btnTransicion, { borderColor: tr.color, backgroundColor: tr.color + '15' }]} android_ripple={{ color: tr.color + '30', borderless: false }} onPress={() => handleCambiarEstado(r, tr.estado)}>
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
        )}
      </ScrollView>
    );
  };

  // ── Usuarios ──────────────────────────────────────────────────────────
  const Usuarios = () => {
    const filtrados = usuariosFiltradosOrdenados;
    return (
      <ScrollView contentContainerStyle={[s.seccionScroll, { backgroundColor: tema.fondo }]}>
        <View style={s.rowHeader}>
          <Text style={[s.seccionTitulo, { color: tema.texto }]}>
            Usuarios{' '}
            <Text style={{ color: tema.textoMuted, fontSize: 16, fontWeight: '400' }}>
              ({filtrados.length}{filtrados.length !== usuarios.length ? ` de ${usuarios.length}` : ''})
            </Text>
          </Text>
          <View style={[s.badge, { backgroundColor: tema.primarioSuave }]}>
            <Text style={[s.badgeTxt, { color: tema.primario }]}>{usuarios.filter(u => u.tipo === 'admin').length} admin</Text>
          </View>
        </View>

        {/* Búsqueda */}
        <View style={[s.inputBusqueda, { backgroundColor: tema.superficieBlanca, borderColor: tema.borde }]}>
          <Text style={{ color: tema.textoMuted, fontSize: 15, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: tema.texto, fontSize: 14 }}
            placeholder="Buscar por nombre, usuario o correo…"
            placeholderTextColor={tema.textoMuted}
            value={busquedaUsuario}
            onChangeText={setBusquedaUsuario}
            returnKeyType="search"
          />
          {busquedaUsuario.length > 0 && (
            <TouchableOpacity onPress={() => setBusquedaUsuario('')}>
              <Text style={{ color: tema.textoMuted, fontSize: 16, paddingLeft: 6 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chips tipo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {[{ clave: 'todos', label: 'Todos' }, { clave: 'admin', label: 'Admin' }, { clave: 'activos', label: 'Activos' }, { clave: 'inactivos', label: 'Inactivos' }].map(f => (
              <TouchableOpacity key={f.clave} style={[s.chipFiltro, { backgroundColor: filtroUsuario === f.clave ? tema.primario : tema.superficieBlanca }]} onPress={() => setFiltroUsuario(f.clave)}>
                <Text style={[s.chipFiltroTxt, { color: filtroUsuario === f.clave ? '#fff' : tema.textoMuted }, filtroUsuario === f.clave && { fontWeight: '700' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Chips orden */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {[{ id: 'nombre', label: 'A-Z' }, { id: 'reservas', label: '+ Reservas' }, { id: 'reciente', label: 'Más nuevos' }].map(o => (
              <TouchableOpacity
                key={o.id}
                style={[s.chipFiltro, { backgroundColor: ordenUsuarios === o.id ? tema.acento : tema.superficieBlanca }]}
                onPress={() => setOrdenUsuarios(o.id)}
              >
                <Text style={[s.chipFiltroTxt, { color: ordenUsuarios === o.id ? '#fff' : tema.textoMuted }, ordenUsuarios === o.id && { fontWeight: '700' }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {cargando ? <SkeletonFilas cantidad={4} /> : filtrados.length === 0 ? (
          <View style={s.vacioCentrado}><Text style={[s.textoVacio, { color: tema.textoMuted }]}>{usuarios.length === 0 ? 'Sin usuarios registrados' : busquedaUsuario ? `Sin resultados para "${busquedaUsuario}"` : 'Sin resultados'}</Text></View>
        ) : filtrados.map(u => (
          <View key={u.id} style={[s.itemCard, { backgroundColor: tema.superficieBlanca }, !u.activo && s.itemCardInactivo]}>
            <View style={[s.avatarGrande, { backgroundColor: u.tipo === 'admin' ? tema.primario : tema.borde }]}>
              <Text style={[s.avatarLetraGrande, { color: u.tipo === 'admin' ? '#fff' : tema.textoSecundario }]}>{u.nombre?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.itemCardRow}>
                <Text style={[s.itemNombre, { color: tema.texto }]}>{u.nombre}</Text>
                <View style={[s.badge, { backgroundColor: u.activo ? tema.primarioSuave : tema.superficie }]}>
                  <Text style={[s.badgeTxt, { color: u.activo ? tema.primario : tema.textoMuted }]}>{u.activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
              </View>
              <Text style={[s.itemSub, { color: tema.textoMuted }]}>{u.correo}</Text>
              <Text style={[s.itemSub, { color: tema.textoMuted }]}>{u.reservas_count} reserva{u.reservas_count !== 1 ? 's' : ''}</Text>
              <View style={s.tipoRow}>
                <View style={[s.badge, { backgroundColor: u.tipo === 'admin' ? tema.primarioSuave : tema.superficie }]}>
                  <Text style={[s.badgeTxt, { color: u.tipo === 'admin' ? tema.primario : tema.textoMuted }]}>{u.tipo === 'admin' ? 'Administrador' : 'Normal'}</Text>
                </View>
                <Pressable style={[s.btnTransicion, { borderColor: u.tipo === 'admin' ? '#9A7118' : tema.primario, backgroundColor: (u.tipo === 'admin' ? '#9A7118' : tema.primario) + '15' }]} android_ripple={{ borderless: false }} onPress={() => handleCambiarTipo(u.id, u.tipo)}>
                  <Text style={[s.btnTransicionTxt, { color: u.tipo === 'admin' ? '#9A7118' : tema.primario }]}>{u.tipo === 'admin' ? 'Quitar admin' : 'Hacer admin'}</Text>
                </Pressable>
              </View>
            </View>
            <Pressable style={[s.btnAccion, { backgroundColor: tema.superficie, borderColor: u.activo ? tema.acento : tema.primario }]} android_ripple={{ borderless: false }} onPress={() => handleToggleActivo(u.id)}>
              <Text style={[s.btnAccionTxt, { color: u.activo ? tema.acento : tema.primario }]}>{u.activo ? 'Bloquear' : 'Activar'}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    );
  };

  const SECCIONES: Record<Seccion, React.ReactNode> = {
    dashboard: <Dashboard />,
    destinos:  <Destinos  />,
    rutas:     <RutasView />,
    reservas:  <Reservas  />,
    usuarios:  <Usuarios  />,
  };

  if (!verificado) {
    return (
      <View style={[s.contenedor, { backgroundColor: tema.fondo, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={tema.primario} />
      </View>
    );
  }

  return (
    <View style={[s.contenedor, { backgroundColor: tema.fondo }]}>
      <SafeAreaView style={s.segura}>
        {esPC ? (
          <View style={s.layoutPC}>
            <NavBar />
            <View style={[s.contenidoPC, { backgroundColor: tema.fondo }]}>
              <View style={[s.headerPC, { borderBottomColor: tema.borde, borderBottomWidth: 1, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={[s.btnAtras, { color: tema.primario }]}>Volver a la app</Text>
                </TouchableOpacity>
                <Text style={[s.headerTitulo, { color: tema.texto }]}>Panel de administración</Text>
                <View style={{ width: 100 }} />
              </View>
              <ErrorBanner />
              <View style={{ flex: 1 }}>{SECCIONES[seccion]}</View>
            </View>
          </View>
        ) : (
          <View style={s.layoutMovil}>
            <View style={[s.headerMovil, { backgroundColor: tema.superficieBlanca, borderBottomColor: tema.borde, borderBottomWidth: 1 }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[s.btnAtras, { color: tema.primario, fontSize: 22 }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[s.headerTitulo, { color: tema.texto }]}>Admin</Text>
              <View style={{ width: 40 }} />
            </View>
            <ErrorBanner />
            <View style={{ flex: 1 }}>
              {SECCIONES[seccion]}
              {seccion === 'destinos' && !modoForm && (
                <TouchableOpacity style={[s.fab, { backgroundColor: tema.primario }]} onPress={abrirFormNuevo} activeOpacity={0.85}>
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
  contenedor:    { flex: 1 },
  segura:        { flex: 1 },
  layoutMovil:   { flex: 1 },
  layoutPC:      { flexDirection: 'row', flex: 1 },

  headerMovil:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, elevation: 2 },
  headerTitulo:  { fontSize: 16, fontWeight: '700' },
  btnAtras:      { fontSize: 16, fontWeight: '600' },

  seccionScroll: { padding: 16, gap: 14, paddingBottom: 120 },
  seccionTitulo: { fontSize: 22, fontWeight: '800' },
  subTitulo:     { fontSize: 14, fontWeight: '600' },

  // Cards
  itemCard:         { borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, elevation: 1 },
  itemCardInactivo: { opacity: 0.5 },
  itemCardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre:       { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  itemSub:          { fontSize: 12, marginTop: 3 },
  itemPrecio:       { fontSize: 14, fontWeight: '700', marginTop: 6 },
  itemAcciones:     { flexDirection: 'column', gap: 6 },

  badge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  // Formularios
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  formInput: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, elevation: 0 },
  formError: { fontSize: 12, color: '#DD331D', marginTop: 4, marginLeft: 2 },

  // Botones
  btnAccion:      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnAccionTxt:   { fontSize: 12, fontWeight: '700' },
  btnPrimario:    { backgroundColor: '#3AB7A5', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnNuevo:       { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnNuevoTxt:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnCancelarTxt: { fontWeight: '600' },

  // Chips filtro
  chipFiltro:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  chipFiltroTxt: { fontSize: 13 },

  // Bottom bar
  bottomBar:   { flexDirection: 'row', elevation: 8 },
  bottomItem:  { flex: 1, alignItems: 'center', paddingVertical: 11 },
  bottomLabel: { fontSize: 11 },

  // FAB
  fab:    { position: 'absolute', right: 20, bottom: 80, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 26, fontWeight: 'bold' },

  // Sidebar PC
  sidebar:           { width: 80, paddingVertical: 16, alignItems: 'center', elevation: 4 },
  sidebarHeader:     { alignItems: 'center', marginBottom: 20 },
  sidebarTitulo:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  sidebarSub:        { color: '#94a3b8', fontSize: 11 },
  separador:         { height: 1, backgroundColor: '#1e293b', width: '80%', marginVertical: 12 },
  navItem:           { width: '100%', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  navItemActivo:     { backgroundColor: '#1e293b' },
  navAbrev:          { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  navAbrevTxt:       { color: '#cbd5f5', fontWeight: '600', fontSize: 11 },
  navAbrevTxtActivo: { color: '#fff' },
  navLabel:          { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  navLabelActivo:    { color: '#fff' },

  // Contenido PC
  contenidoPC: { flex: 1, padding: 20 },
  headerPC:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  // Reservas
  barraEstado:      { width: 4, borderRadius: 4, marginRight: 4 },
  transicionRow:    { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btnTransicion:    { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  btnTransicionTxt: { fontSize: 12, fontWeight: '600' },

  // Usuarios
  tipoRow:            { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  avatarGrande:       { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarLetraGrande:  { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Otros
  rowHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vacioCentrado:{ paddingVertical: 40, alignItems: 'center' },
  textoVacio:   { fontSize: 14 },

  // Búsqueda
  inputBusqueda: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },

  // Error
  errorBannerTxt: { fontSize: 13, fontWeight: '600' },

  // Rutas temáticas
  rutaCard:     { borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden', elevation: 1, marginBottom: 2 },
  rutaCardTop:  { flexDirection: 'row', gap: 12, padding: 14 },
  rutaCardImg:  { width: 68, height: 68, borderRadius: 10 },
  rutaCardInfo: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 14, gap: 0 },
  rutaInfoItem: { flex: 1, alignItems: 'center', gap: 2 },
  rutaInfoLbl:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  rutaInfoVal:  { fontSize: 13, fontWeight: '800' },
  rutaTags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  rutaTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  rutaTagTxt:   { fontSize: 11, fontWeight: '600' },
});
