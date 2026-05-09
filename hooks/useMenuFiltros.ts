import { useState, useMemo } from 'react';
import { TODOS_LOS_ESTADOS } from '../lib/constantes';
import { useIdioma } from '../lib/IdiomaContext';

type TipoOrden = 'mas_caro' | 'mas_barato' | 'az';

export type EstadoConFavorito = typeof TODOS_LOS_ESTADOS[0] & { favorito: boolean };

export function useMenuFiltros() {
  const { t } = useIdioma();

  const [busqueda, setBusqueda]               = useState('');
  const [orden, setOrden]                     = useState<TipoOrden>('az');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  const CATEGORIAS = [
    { clave: 'Todos',       label: t('menu_cat_todos') },
    { clave: 'Playa',       label: t('menu_cat_playa') },
    { clave: 'Cultura',     label: t('menu_cat_cultura') },
    { clave: 'Aventura',    label: t('menu_cat_aventura') },
    { clave: 'Gastronomía', label: t('menu_cat_gastro') },
    { clave: 'Ciudad',      label: t('menu_cat_ciudad') },
  ];

  const OPCIONES_ORDEN: { clave: TipoOrden; etiqueta: string }[] = [
    { clave: 'az',         etiqueta: t('menu_orden_az') },
    { clave: 'mas_barato', etiqueta: t('menu_menor_precio') },
    { clave: 'mas_caro',   etiqueta: t('menu_mayor_precio') },
  ];

  const etiquetaOrdenActual = OPCIONES_ORDEN.find(o => o.clave === orden)?.etiqueta ?? t('menu_orden_az');

  const filtrar = useMemo(() => (estados: EstadoConFavorito[]) =>
    estados
      .filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .filter(e => categoriaActiva === 'Todos' || e.categoria === categoriaActiva)
      .sort((a, b) => {
        if (orden === 'mas_caro')   { return b.precio - a.precio; }
        if (orden === 'mas_barato') { return a.precio - b.precio; }
        return a.nombre.localeCompare(b.nombre);
      }),
  [busqueda, categoriaActiva, orden]);

  const limpiarFiltros = () => { setBusqueda(''); setCategoriaActiva('Todos'); };

  return {
    busqueda, setBusqueda,
    orden, setOrden,
    categoriaActiva, setCategoriaActiva,
    dropdownAbierto, setDropdownAbierto,
    CATEGORIAS,
    OPCIONES_ORDEN,
    etiquetaOrdenActual,
    filtrar,
    limpiarFiltros,
  };
}
