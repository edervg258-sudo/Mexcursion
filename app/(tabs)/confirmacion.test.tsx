// ============================================================
//  app/(tabs)/confirmacion.test.tsx
//  Tests de la pantalla de confirmación: estado confirmado/pendiente,
//  código OXXO, navegación y detalle de reserva.
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks deben declararse antes del import del componente (jest los hoisting)
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../lib/IdiomaContext', () => ({
  useIdioma: () => ({ t: (k: string) => k }),
}));

jest.mock('../../lib/TemaContext', () => ({
  useTemaContext: () => ({
    tema: {
      texto: '#000',
      textoSecundario: '#666',
      textoMuted: '#999',
      superficie: '#f5f5f5',
      superficieBlanca: '#fff',
      borde: '#e0e0e0',
      primarioSuave: '#f0faf9',
    },
    isDark: false,
  }),
}));

jest.mock('../../components/BookingStepLayout', () => {
  const React = require('react');
  return {
    BookingStepLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('../../components/CodigoBarrasOxxo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ referencia }: { referencia: string }) =>
      React.createElement(View, {
        testID: 'codigo-barras-oxxo',
        accessibilityLabel: `ref:${referencia}`,
      }),
  };
});

jest.mock('../../lib/estilos', () => ({
  sombra: () => ({}),
}));

// Importar el componente DESPUÉS de los mocks
import ConfirmacionScreen from './confirmacion';
import { router, useLocalSearchParams } from 'expo-router';

const mockRouterReplace = router.replace as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseParams = {
  nombre: 'Cancún',
  paquete: 'premium',
  precio: '5000',
  personas: '2',
  fecha: '15/07/2026',
  nombre_viajero: 'Juan Pérez',
  telefono: '5551234567',
  notas: '',
  folio: 'MX-ABCD1234',
  metodo: 'tarjeta',
  ref_oxxo: '',
  estado: 'confirmada',
};

function setup(overrides: Partial<typeof baseParams> = {}) {
  mockUseLocalSearchParams.mockReturnValue({ ...baseParams, ...overrides });
  return render(<ConfirmacionScreen />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfirmacionScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado confirmado (tarjeta) ───────────────────────────────────────────────

  describe('Estado confirmado — tarjeta', () => {
    it('muestra el ícono ✓ para reserva confirmada', () => {
      const { getByText } = setup({ estado: 'confirmada', metodo: 'tarjeta' });
      expect(getByText('✓')).toBeTruthy();
    });

    it('muestra el folio de la reserva', () => {
      const { getByText } = setup();
      expect(getByText('MX-ABCD1234')).toBeTruthy();
    });

    it('muestra el nombre del destino', () => {
      const { getAllByText } = setup();
      expect(getAllByText(/Cancún/).length).toBeGreaterThan(0);
    });

    it('muestra la fecha de viaje', () => {
      const { getByText } = setup();
      expect(getByText('15/07/2026')).toBeTruthy();
    });

    it('muestra el precio total con formato MXN', () => {
      const { getByText } = setup();
      expect(getByText(/5,000.*MXN/i)).toBeTruthy();
    });

    it('no muestra el código de barras OXXO para tarjeta', () => {
      const { queryByTestId } = setup({ metodo: 'tarjeta', estado: 'confirmada' });
      expect(queryByTestId('codigo-barras-oxxo')).toBeNull();
    });

    it('muestra la nota/aviso conf_aviso para pago no-OXXO', () => {
      const { getByText } = setup({ metodo: 'tarjeta' });
      expect(getByText('conf_aviso')).toBeTruthy();
    });
  });

  // ── Estado pendiente (OXXO) ───────────────────────────────────────────────────

  describe('Estado pendiente — OXXO', () => {
    it('muestra el ícono ⏳ para reserva pendiente', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'oxxo' });
      expect(getByText('⏳')).toBeTruthy();
    });

    it('muestra el título "Reserva en proceso"', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'oxxo' });
      expect(getByText('Reserva en proceso')).toBeTruthy();
    });

    it('muestra el componente CodigoBarrasOxxo', () => {
      const { getByTestId } = setup({
        metodo: 'oxxo',
        estado: 'pendiente',
        ref_oxxo: '8570000012345678',
      });
      expect(getByTestId('codigo-barras-oxxo')).toBeTruthy();
    });

    it('pasa la referencia OXXO al código de barras', () => {
      const { getByTestId } = setup({
        metodo: 'oxxo',
        estado: 'pendiente',
        ref_oxxo: '8570000087654321',
      });
      expect(getByTestId('codigo-barras-oxxo').props.accessibilityLabel).toBe('ref:8570000087654321');
    });

    it('muestra el folio aunque el estado sea pendiente', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'oxxo' });
      expect(getByText('MX-ABCD1234')).toBeTruthy();
    });

    it('indica al usuario que pague en OXXO en el subtítulo', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'oxxo' });
      expect(getByText(/OXXO/)).toBeTruthy();
    });
  });

  // ── Estado pendiente (SPEI) ───────────────────────────────────────────────────

  describe('Estado pendiente — SPEI', () => {
    it('muestra el ícono ⏳ para SPEI pendiente', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'spei' });
      expect(getByText('⏳')).toBeTruthy();
    });

    it('muestra "Reserva en proceso" para SPEI', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'spei' });
      expect(getByText('Reserva en proceso')).toBeTruthy();
    });

    it('no muestra código de barras OXXO para SPEI', () => {
      const { queryByTestId } = setup({ estado: 'pendiente', metodo: 'spei' });
      expect(queryByTestId('codigo-barras-oxxo')).toBeNull();
    });

    it('indica al usuario que haga transferencia SPEI', () => {
      const { getByText } = setup({ estado: 'pendiente', metodo: 'spei' });
      expect(getByText(/SPEI/)).toBeTruthy();
    });
  });

  // ── Detalle de reserva ────────────────────────────────────────────────────────

  describe('Detalle de reserva', () => {
    it('muestra el nombre del viajero', () => {
      const { getByText } = setup();
      expect(getByText('Juan Pérez')).toBeTruthy();
    });

    it('muestra el teléfono', () => {
      const { getByText } = setup();
      expect(getByText('5551234567')).toBeTruthy();
    });

    it('muestra el número de personas', () => {
      const { getByText } = setup();
      expect(getByText('2')).toBeTruthy();
    });

    it('muestra el paquete elegido', () => {
      const { getByText } = setup();
      expect(getByText('premium')).toBeTruthy();
    });

    it('muestra notas especiales cuando existen', () => {
      const { getByText } = setup({ notas: 'Silla de ruedas requerida' });
      expect(getByText('Silla de ruedas requerida')).toBeTruthy();
    });

    it('no muestra la sección de notas cuando está vacía', () => {
      const { queryByText } = setup({ notas: '' });
      expect(queryByText('conf_notas')).toBeNull();
    });
  });

  // ── Navegación ────────────────────────────────────────────────────────────────

  describe('Navegación', () => {
    it('botón Explorar navega al menú principal', () => {
      const { getByLabelText } = setup();
      fireEvent.press(getByLabelText('Explorar más destinos'));
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/menu');
    });

    it('botón Mis Reservas navega a la pantalla de reservas', () => {
      const { getByLabelText } = setup();
      fireEvent.press(getByLabelText('Ir a mis reservas'));
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/mis_reservas');
    });

    it('botón Explorar solo llama a replace una vez', () => {
      const { getByLabelText } = setup();
      fireEvent.press(getByLabelText('Explorar más destinos'));
      expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    });
  });

  // ── Casos borde ───────────────────────────────────────────────────────────────

  describe('Casos borde', () => {
    it('estado "pendiente_pago" también muestra ⏳', () => {
      const { getByText } = setup({ estado: 'pendiente_pago', metodo: 'oxxo' });
      expect(getByText('⏳')).toBeTruthy();
    });

    it('precio 0 no rompe la pantalla', () => {
      const { getByTestId } = setup({ precio: '0' });
      expect(getByTestId('confirmacion-screen')).toBeTruthy();
    });

    it('muestra fallback "00000000" como ref cuando ref_oxxo y folio son vacíos', () => {
      const { getByTestId } = setup({
        metodo: 'oxxo',
        estado: 'pendiente',
        ref_oxxo: undefined as unknown as string,
        folio: undefined as unknown as string,
      });
      expect(getByTestId('codigo-barras-oxxo').props.accessibilityLabel).toBe('ref:00000000');
    });
  });
});
