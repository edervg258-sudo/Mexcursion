import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    ScrollView,
    StyleSheet, Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminDashboard } from '../../components/AdminDashboard';
import { AdminNavBar } from '../../components/Admin/AdminNavBar';
import { SeccionDestinos } from '../../components/Admin/SeccionDestinos';
import { SeccionReservas } from '../../components/Admin/SeccionReservas';
import { SeccionUsuarios } from '../../components/Admin/SeccionUsuarios';
import { Destino, Reserva, Seccion, Usuario } from '../../components/Admin/tipos';
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
  const [esAdmin, setEsAdmin]       = useState<boolean | null>(null);
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
      if (!sesion || sesion.tipo !== 'admin') {
        setEsAdmin(false);
        // replace en vez de back: impide que el usuario vuelva a esta pantalla
        router.replace('/(tabs)/menu' as never);
        return;
      }
      setEsAdmin(true);
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

  // ── Usuarios ──────────────────────────────────────────────────────────────
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

  // NavBar delegado a AdminNavBar

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

  // ── Secciones delegadas a componentes externos ────────────────────────
  const Dashboard = () => (
    <AdminDashboard stats={stats} cargando={cargando} esPC={esPC} />
  );

  const Destinos = () => (
    <SeccionDestinos
      destinos={destinos}
      destinosFiltrados={destinosFiltrados}
      modoForm={modoForm}
      form={{ nombre: formNombre, categoria: formCategoria, precio: formPrecio, desc: formDesc, errores: formErrores }}
      busqueda={busquedaDestino}
      filtroCategoria={filtroCategoria}
      ordenDestinos={ordenDestinos}
      categoriasDestino={categoriasDestino}
      onAbrirFormNuevo={abrirFormNuevo}
      onCancelarForm={() => setModoForm(null)}
      onGuardar={guardarDestino}
      onSetForm={(campo, val) => {
        if (campo === 'nombre')    setFormNombre(val);
        if (campo === 'categoria') setFormCategoria(val);
        if (campo === 'precio')    setFormPrecio(val);
        if (campo === 'desc')      setFormDesc(val);
      }}
      onLimpiarError={campo => setFormErrores(e => ({ ...e, [campo]: undefined }))}
      onEliminar={handleEliminarDestino}
      onToggleActivo={handleToggleActivoDestino}
      onEditar={abrirFormEditar}
      onBusqueda={setBusquedaDestino}
      onFiltroCategoria={setFiltroCategoria}
      onOrden={setOrdenDestinos}
    />
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

  const Reservas = () => (
    <SeccionReservas
      reservas={reservas}
      reservasFiltradas={reservasFiltradas}
      cargando={cargando}
      busqueda={busquedaReserva}
      filtroEstado={filtroReserva}
      filtroFecha={filtroFecha}
      orden={ordenReservas}
      onBusqueda={setBusquedaReserva}
      onFiltroEstado={setFiltroReserva}
      onFiltroFecha={setFiltroFecha}
      onOrden={setOrdenReservas}
      onCambiarEstado={handleCambiarEstado}
    />
  );

  const Usuarios = () => (
    <SeccionUsuarios
      usuarios={usuarios}
      usuariosFiltrados={usuariosFiltradosOrdenados}
      cargando={cargando}
      busqueda={busquedaUsuario}
      filtro={filtroUsuario}
      orden={ordenUsuarios}
      onBusqueda={setBusquedaUsuario}
      onFiltro={setFiltroUsuario}
      onOrden={setOrdenUsuarios}
      onCambiarTipo={handleCambiarTipo}
      onToggleActivo={handleToggleActivo}
    />
  );

  const SECCIONES: Record<Seccion, React.ReactNode> = {
    dashboard: <Dashboard />,
    destinos:  <Destinos  />,
    rutas:     <RutasView />,
    reservas:  <Reservas  />,
    usuarios:  <Usuarios  />,
  };

  // No-admin: no renderizar nada (la navegación ya está en curso)
  if (esAdmin === false) return null;

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
            <AdminNavBar esPC={esPC} seccion={seccion} onSeleccionar={setSeccion} />
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
            <AdminNavBar esPC={esPC} seccion={seccion} onSeleccionar={setSeccion} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  // Layout
  contenedor:  { flex: 1 },
  segura:      { flex: 1 },
  layoutMovil: { flex: 1 },
  layoutPC:    { flexDirection: 'row', flex: 1 },

  // Header
  headerMovil:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, elevation: 2 },
  headerTitulo: { fontSize: 16, fontWeight: '700' },
  btnAtras:     { fontSize: 16, fontWeight: '600' },

  // Contenido PC
  contenidoPC: { flex: 1, padding: 20 },
  headerPC:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  // FAB
  fab:    { position: 'absolute', right: 20, bottom: 80, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 26, fontWeight: 'bold' },

  // Error banner
  errorBannerTxt: { fontSize: 13, fontWeight: '600' },

  // Rutas temáticas (SeccionRutas inline)
  rutaCard:     { borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden', elevation: 1, marginBottom: 2 },
  rutaCardTop:  { flexDirection: 'row', gap: 12, padding: 14 },
  rutaCardImg:  { width: 68, height: 68, borderRadius: 10 },
  rutaCardInfo: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  rutaInfoItem: { flex: 1, alignItems: 'center', gap: 2 },
  rutaInfoLbl:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  rutaInfoVal:  { fontSize: 13, fontWeight: '800' },
  rutaTags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  rutaTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  rutaTagTxt:   { fontSize: 11, fontWeight: '600' },
  itemCardRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemNombre:   { fontSize: 15, fontWeight: '700', flex: 1 },
  itemSub:      { fontSize: 12, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTxt:     { fontSize: 11, fontWeight: '700' },
  subTitulo:    { fontSize: 14, fontWeight: '600' },
  seccionScroll:{ padding: 16, gap: 14, paddingBottom: 120 },
  seccionTitulo:{ fontSize: 22, fontWeight: '800' },
});
