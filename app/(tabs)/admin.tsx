import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert,
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
import { SeccionPaquetes } from '../../components/Admin/SeccionPaquetes';
import { SeccionReportes } from '../../components/Admin/SeccionReportes';
import { SeccionReservas } from '../../components/Admin/SeccionReservas';
import { SeccionUsuarios } from '../../components/Admin/SeccionUsuarios';
import { Destino, Paquete, Reserva, Seccion, Usuario } from '../../components/Admin/tipos';
import {
    actualizarDestino,
    actualizarEstadoReserva,
    actualizarPaquete,
    cambiarTipoUsuario,
    cargarTodasLasReservas,
    cargarTodosLosUsuarios,
    crearDestino,
    crearPaquete,
    eliminarDestino,
    eliminarPaquete,
    obtenerPaquetes,
    obtenerTodosLosDestinos,
    obtenerUsuarioActivo,
    registrarAuditAdmin,
    toggleActivoDestinoAdmin,
    toggleActivoUsuarioAdmin,
    toggleDisponiblePaquete,
} from '../../lib/supabase-db';
import { useTemaContext } from '../../lib/TemaContext';

const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  pendiente:  [{ label: 'Confirmar', estado: 'confirmada', color: '#3AB7A5' }, { label: 'Cancelar', estado: 'cancelada', color: '#DD331D' }],
  confirmada: [{ label: 'Completar', estado: 'completada', color: '#27AE60' }, { label: 'Cancelar', estado: 'cancelada', color: '#DD331D' }],
  completada: [],
  cancelada:  [],
};

// ── Componente principal ───────────────────────────────────────────────────
export default function AdminScreen() {
  const { width }            = useWindowDimensions();
  const esPC                 = width >= 768;
  useSafeAreaInsets();
  const { tema, isDark }     = useTemaContext();

  const [seccion, setSeccion]   = useState<Seccion>('dashboard');
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificado, setVerificado] = useState(false);
  const [esAdmin, setEsAdmin]       = useState<boolean | null>(null);
  const [adminId, setAdminId]       = useState<string>('');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ── Vista sub-sección destinos ─────────────────────────────────────────
  const [vistaDestinos, setVistaDestinos] = useState<'destinos' | 'paquetes'>('destinos');

  // ── CRUD destinos ──────────────────────────────────────────────────────
  const [modoForm, setModoForm]           = useState<'nuevo' | 'editar' | null>(null);
  const [destinoEdit, setDestinoEdit]     = useState<Destino | null>(null);
  const [formNombre, setFormNombre]       = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formPrecio, setFormPrecio]       = useState('');
  const [formDesc, setFormDesc]           = useState('');
  const [formErrores, setFormErrores]     = useState<Record<string, string | undefined>>({});

  // ── CRUD paquetes ──────────────────────────────────────────────────────
  const [modoPaqForm, setModoPaqForm]         = useState<'nuevo' | 'editar' | null>(null);
  const [paqueteEdit, setPaqueteEdit]         = useState<Paquete | null>(null);
  const [formPaqEstadoId, setFormPaqEstadoId] = useState('');
  const [formPaqNombre, setFormPaqNombre]     = useState('');
  const [formPaqDesc, setFormPaqDesc]         = useState('');
  const [formPaqPrecio, setFormPaqPrecio]     = useState('');
  const [formPaqErrores, setFormPaqErrores]   = useState<Record<string, string | undefined>>({});

  // ── Filtros destinos ───────────────────────────────────────────────────
  const [busquedaDestino, setBusquedaDestino] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [ordenDestinos, setOrdenDestinos]     = useState('nombre');

  // ── Filtros reservas ───────────────────────────────────────────────────
  const [filtroReserva, setFiltroReserva]     = useState('todas');
  const [filtroFecha, setFiltroFecha]         = useState('todas');
  const [busquedaReserva, setBusquedaReserva] = useState('');
  const [ordenReservas, setOrdenReservas]     = useState('reciente');

  // ── Filtros usuarios ───────────────────────────────────────────────────
  const [filtroUsuario, setFiltroUsuario]     = useState('todos');
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [ordenUsuarios, setOrdenUsuarios]     = useState('nombre');

  // ── Filtros paquetes ───────────────────────────────────────────────────
  const [filtroPaqDestino, setFiltroPaqDestino] = useState('todos');

  // ── Carga de datos ────────────────────────────────────────────────────
  const recargar = useCallback(async () => {
    setErrorCarga(null);
    setCargando(true);
    try {
      const sesion = await obtenerUsuarioActivo();
      if (!sesion || sesion.tipo !== 'admin') {
        setEsAdmin(false);
        router.replace('/(tabs)/menu' as never);
        return;
      }
      setEsAdmin(true);
      setAdminId(sesion.id);
      const [r, u, d, p] = await Promise.all([
        cargarTodasLasReservas(),
        cargarTodosLosUsuarios(),
        obtenerTodosLosDestinos(),
        obtenerPaquetes(),
      ]);
      setReservas(r as Reserva[]);
      setUsuarios(u as Usuario[]);
      setDestinos(d as Destino[]);
      setPaquetes(p as Paquete[]);
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
    if (!formNombre.trim())    errores.nombre    = 'El nombre es requerido';
    if (!formCategoria.trim()) errores.categoria = 'La categoría es requerida';
    const precioNum = Number(formPrecio);
    if (!formPrecio.trim() || isNaN(precioNum) || precioNum <= 0)
      errores.precio = 'Ingresa un precio mayor a $0';
    if (Object.keys(errores).length > 0) { setFormErrores(errores); return; }
    setFormErrores({});
    if (modoForm === 'nuevo') {
      await crearDestino({ nombre: formNombre.trim(), categoria: formCategoria.trim(), descripcion: formDesc.trim(), precio: precioNum });
      await registrarAuditAdmin(adminId, 'Crear destino', formNombre.trim());
    } else if (destinoEdit) {
      await actualizarDestino(destinoEdit.id, { nombre: formNombre.trim(), categoria: formCategoria.trim(), descripcion: formDesc.trim(), precio: precioNum });
      await registrarAuditAdmin(adminId, 'Editar destino', `ID ${destinoEdit.id}: ${formNombre.trim()}`);
    }
    setModoForm(null);
    setDestinos(await obtenerTodosLosDestinos() as Destino[]);
  };
  const handleEliminarDestino = (id: number) => {
    Alert.alert('Eliminar destino', '¿Seguro que quieres eliminar este destino?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarDestino(id);
          await registrarAuditAdmin(adminId, 'Eliminar destino', `ID ${id}`);
          setDestinos(await obtenerTodosLosDestinos() as Destino[]);
      }},
    ]);
  };
  const handleToggleActivoDestino = async (id: number) => {
    await toggleActivoDestinoAdmin(id);
    setDestinos(await obtenerTodosLosDestinos() as Destino[]);
  };

  // ── CRUD paquetes ─────────────────────────────────────────────────────
  const abrirFormNuevoPaq = () => {
    setModoPaqForm('nuevo'); setPaqueteEdit(null);
    setFormPaqEstadoId(destinos[0] ? String(destinos[0].id) : '');
    setFormPaqNombre(''); setFormPaqDesc(''); setFormPaqPrecio('');
    setFormPaqErrores({});
  };
  const abrirFormEditarPaq = (p: Paquete) => {
    setModoPaqForm('editar'); setPaqueteEdit(p);
    setFormPaqEstadoId(String(p.estado_id));
    setFormPaqNombre(p.nombre); setFormPaqDesc(p.descripcion);
    setFormPaqPrecio(String(p.precio));
    setFormPaqErrores({});
  };
  const guardarPaquete = async () => {
    const errores: Record<string, string> = {};
    if (!formPaqEstadoId) errores.estadoId = 'Selecciona un destino';
    if (!formPaqNombre.trim()) errores.nombre = 'El nombre es requerido';
    const precioNum = Number(formPaqPrecio);
    if (!formPaqPrecio.trim() || isNaN(precioNum) || precioNum < 0)
      errores.precio = 'Ingresa un precio válido';
    if (Object.keys(errores).length > 0) { setFormPaqErrores(errores); return; }
    const payload = {
      estado_id: Number(formPaqEstadoId),
      nombre: formPaqNombre.trim(),
      descripcion: formPaqDesc.trim(),
      precio: precioNum,
    };
    if (modoPaqForm === 'nuevo') {
      await crearPaquete(payload);
      await registrarAuditAdmin(adminId, 'Crear paquete', `${formPaqNombre.trim()} — destino ID ${formPaqEstadoId}`);
    } else if (paqueteEdit) {
      await actualizarPaquete(paqueteEdit.id, payload);
      await registrarAuditAdmin(adminId, 'Editar paquete', `ID ${paqueteEdit.id}: ${formPaqNombre.trim()}`);
    }
    setModoPaqForm(null);
    setPaquetes(await obtenerPaquetes() as Paquete[]);
  };
  const handleEliminarPaquete = (id: number) => {
    Alert.alert('Eliminar paquete', '¿Eliminar este paquete?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await eliminarPaquete(id);
          await registrarAuditAdmin(adminId, 'Eliminar paquete', `ID ${id}`);
          setPaquetes(await obtenerPaquetes() as Paquete[]);
      }},
    ]);
  };
  const handleToggleDisponiblePaquete = async (id: number) => {
    await toggleDisponiblePaquete(id);
    setPaquetes(await obtenerPaquetes() as Paquete[]);
  };

  // ── Usuarios ──────────────────────────────────────────────────────────
  const handleCambiarTipo = async (id: string, tipoActual: string) => {
    const nuevoTipo = tipoActual === 'admin' ? 'normal' : 'admin';
    setUsuarios(u => u.map(x => x.id === id ? { ...x, tipo: nuevoTipo } : x));
    await cambiarTipoUsuario(id, nuevoTipo);
    await registrarAuditAdmin(adminId, 'Cambiar tipo usuario', `${id}: ${tipoActual} → ${nuevoTipo}`);
  };
  const handleToggleActivo = async (id: string) => {
    setUsuarios(u => u.map(x => x.id === id ? { ...x, activo: x.activo ? 0 : 1 } : x));
    await toggleActivoUsuarioAdmin(id);
  };

  // ── Reservas ──────────────────────────────────────────────────────────
  const handleCambiarEstado = (reserva: Reserva, nuevo_estado: string) => {
    const tr = TRANSICIONES[reserva.estado]?.find(t => t.estado === nuevo_estado);
    const esCancelacion = nuevo_estado === 'cancelada';
    Alert.alert(
      tr?.label ?? 'Cambiar estado',
      `¿${tr?.label ?? 'Cambiar'} la reserva ${reserva.folio}?\n\n${esCancelacion
        ? 'Esta acción notificará al usuario y no se puede deshacer fácilmente.'
        : `Pasará de "${reserva.estado}" a "${nuevo_estado}".`}`,
      [
        { text: 'No, volver', style: 'cancel' },
        {
          text: tr?.label ?? 'Confirmar',
          style: esCancelacion ? 'destructive' : 'default',
          onPress: async () => {
            setReservas(r => r.map(x => x.id === reserva.id ? { ...x, estado: nuevo_estado } : x));
            await actualizarEstadoReserva(reserva.id, nuevo_estado);
            await registrarAuditAdmin(adminId, 'Cambio estado reserva', `${reserva.folio}: ${reserva.estado} → ${nuevo_estado}`);
          },
        },
      ]
    );
  };

  // ── Estadísticas ──────────────────────────────────────────────────────
  const ahora         = new Date();
  const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesPas  = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const enEsteMes = (f: string) => new Date(f) >= inicioEsteMes;
  const enMesPas  = (f: string) => new Date(f) >= inicioMesPas && new Date(f) < inicioEsteMes;
  const trend     = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);
  const formatTiempo = (fecha: string) => {
    const seg = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 1000);
    if (seg < 60)    return 'Hace un momento';
    if (seg < 3600)  return `Hace ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `Hace ${Math.floor(seg / 3600)}h`;
    return `Hace ${Math.floor(seg / 86400)}d`;
  };

  const topDestinos = Object.entries(
    reservas.reduce<Record<string, number>>((acc, r) => {
      if (r.destino) acc[r.destino] = (acc[r.destino] ?? 0) + 1;
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

  // ── Datos filtrados ───────────────────────────────────────────────────
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
      .filter(u => filtroUsuario === 'todos'   ? true
                 : filtroUsuario === 'admin'   ? u.tipo === 'admin'
                 : filtroUsuario === 'activos' ? !!u.activo
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

  const paquetesFiltrados = filtroPaqDestino === 'todos'
    ? paquetes
    : paquetes.filter(p => String(p.estado_id) === filtroPaqDestino);

  // ── Error banner ──────────────────────────────────────────────────────
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

  // ── Sub-tab para Destinos / Paquetes ──────────────────────────────────
  const TabDestinosPaquetes = () => (
    <View style={[s.subTab, { backgroundColor: tema.fondo, borderBottomColor: tema.borde, borderBottomWidth: 1 }]}>
      {(['destinos', 'paquetes'] as const).map(v => (
        <TouchableOpacity
          key={v}
          style={[s.subTabItem, vistaDestinos === v && { borderBottomColor: tema.primario, borderBottomWidth: 2 }]}
          onPress={() => { setVistaDestinos(v); setModoForm(null); setModoPaqForm(null); }}
        >
          <Text style={[s.subTabTxt, { color: vistaDestinos === v ? tema.primario : tema.textoMuted }, vistaDestinos === v && { fontWeight: '700' }]}>
            {v === 'destinos' ? `Destinos (${destinos.length})` : `Paquetes (${paquetes.length})`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Secciones ─────────────────────────────────────────────────────────
  const Dashboard = () => (
    <AdminDashboard stats={stats} cargando={cargando} esPC={esPC} />
  );

  const Destinos = () => (
    <View style={{ flex: 1 }}>
      {!modoForm && !modoPaqForm && <TabDestinosPaquetes />}
      {vistaDestinos === 'destinos' ? (
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
      ) : (
        <SeccionPaquetes
          paquetes={paquetes}
          paquetesFiltrados={paquetesFiltrados}
          destinos={destinos}
          modoForm={modoPaqForm}
          form={{
            estadoId: formPaqEstadoId,
            nombre: formPaqNombre,
            descripcion: formPaqDesc,
            precio: formPaqPrecio,
            errores: formPaqErrores,
          }}
          filtroPaqDestino={filtroPaqDestino}
          onAbrirFormNuevo={abrirFormNuevoPaq}
          onCancelarForm={() => setModoPaqForm(null)}
          onGuardar={guardarPaquete}
          onSetForm={(campo, val) => {
            if (campo === 'estadoId')    setFormPaqEstadoId(val);
            if (campo === 'nombre')      setFormPaqNombre(val);
            if (campo === 'descripcion') setFormPaqDesc(val);
            if (campo === 'precio')      setFormPaqPrecio(val);
          }}
          onLimpiarError={campo => setFormPaqErrores(e => ({ ...e, [campo]: undefined }))}
          onEliminar={handleEliminarPaquete}
          onToggleDisponible={handleToggleDisponiblePaquete}
          onEditar={abrirFormEditarPaq}
          onFiltroDestino={setFiltroPaqDestino}
        />
      )}
    </View>
  );

  const Reportes = () => (
    <SeccionReportes reservas={reservas} destinos={destinos} usuarios={usuarios} />
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
    reportes:  <Reportes  />,
    reservas:  <Reservas  />,
    usuarios:  <Usuarios  />,
  };

  if (esAdmin === false) return null;

  if (!verificado) {
    return (
      <View style={[s.contenedor, { backgroundColor: tema.fondo, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={tema.primario} />
      </View>
    );
  }

  const mostrarFabDestinos = seccion === 'destinos' && vistaDestinos === 'destinos' && !modoForm;
  const mostrarFabPaquetes = seccion === 'destinos' && vistaDestinos === 'paquetes' && !modoPaqForm;

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
              {mostrarFabDestinos && (
                <TouchableOpacity style={[s.fab, { backgroundColor: tema.primario }]} onPress={abrirFormNuevo} activeOpacity={0.85}>
                  <Text style={s.fabTxt}>+</Text>
                </TouchableOpacity>
              )}
              {mostrarFabPaquetes && (
                <TouchableOpacity style={[s.fab, { backgroundColor: tema.primario }]} onPress={abrirFormNuevoPaq} activeOpacity={0.85}>
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

// ── Audit log viewer inline (sección dentro de reportes) ──────────────────
export function AuditViewer({ reservas }: { reservas: Reserva[] }) {
  return (
    <ScrollView>
      {reservas.slice(0, 20).map((r, i) => (
        <View key={i} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
          <Text>{r.folio} — {r.estado}</Text>
        </View>
      ))}
    </ScrollView>
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

  // Sub-tab destinos/paquetes
  subTab:     { flexDirection: 'row', paddingHorizontal: 16 },
  subTabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subTabTxt:  { fontSize: 14 },

  // FAB
  fab:    { position: 'absolute', right: 20, bottom: 80, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 26, fontWeight: 'bold' },

  // Error banner
  errorBannerTxt: { fontSize: 13, fontWeight: '600' },
});
