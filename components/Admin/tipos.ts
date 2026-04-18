// ============================================================
//  components/Admin/tipos.ts  —  Tipos compartidos del panel
// ============================================================

export type Seccion = 'dashboard' | 'destinos' | 'rutas' | 'reservas' | 'usuarios';

export type Destino = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion: string;
  activo: boolean;
};

export type Reserva = {
  id: number;
  folio: string;
  usuario_id: number;
  nombre_usuario: string;
  destino: string;
  paquete: string;
  fecha: string;
  personas: number;
  total: number;
  metodo: string;
  estado: string;
  creado_en: string;
};

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  nombre_usuario: string;
  creado_en: string;
  reservas_count: number;
  activo: number;
  tipo: string;
};

export const C_ESTADO_BASE: Record<string, { fondo: string; texto: string; label: string }> = {
  confirmada: { fondo: '#E8F5F2', texto: '#3AB7A5', label: 'Confirmada' },
  completada: { fondo: '#F0F0F0', texto: '#666',    label: 'Completada' },
  cancelada:  { fondo: '#FEF0EE', texto: '#DD331D', label: 'Cancelada'  },
  pendiente:  { fondo: '#FEF8E8', texto: '#9A7118', label: 'Pendiente'  },
};

export const TRANSICIONES: Record<string, { label: string; estado: string; color: string }[]> = {
  pendiente:  [
    { label: 'Confirmar', estado: 'confirmada', color: '#3AB7A5' },
    { label: 'Cancelar',  estado: 'cancelada',  color: '#DD331D' },
  ],
  confirmada: [
    { label: 'Completar', estado: 'completada', color: '#27AE60' },
    { label: 'Cancelar',  estado: 'cancelada',  color: '#DD331D' },
  ],
  completada: [],
  cancelada:  [],
};
