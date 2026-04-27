// ============================================================
//  app/(tabs)/pago.test.tsx
//  Tests de la pantalla de pago: selección de método, flujos
//  SPEI/OXXO/tarjeta, manejo de errores y guard de reentrada.
// ============================================================

import React from 'react';
import { Alert } from 'react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../lib/supabase-db', () => ({
  obtenerUsuarioActivo: jest.fn(),
  guardarReserva: jest.fn(),
  crearNotificacion: jest.fn(),
  agregarHistorial: jest.fn(),
}));

jest.mock('../../lib/sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureApiError: jest.fn(),
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

jest.mock('../../components/PagoTarjeta', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  return {
    PagoTarjeta: ({
      onSuccess,
      onBack,
    }: {
      onSuccess: (id: string) => void;
      onBack?: () => void;
    }) =>
      React.createElement(
        View,
        { testID: 'pago-tarjeta-mock' },
        React.createElement(TouchableOpacity, {
          testID: 'mock-tarjeta-success',
          onPress: () => onSuccess('pi_test_abc123xyz'),
        }),
        React.createElement(TouchableOpacity, {
          testID: 'mock-tarjeta-back',
          onPress: () => onBack?.(),
        }),
      ),
  };
});

jest.mock('../../lib/error-handling', () => ({
  normalizeError: (e: unknown) => ({ message: String(e), code: 'UNKNOWN' }),
  userMessageForError: () => 'Error de conexión',
}));

jest.mock('../../lib/estilos', () => ({
  sombra: () => ({}),
}));

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PagoScreen from './pago';
import { router, useLocalSearchParams } from 'expo-router';
import * as supabaseDb from '../../lib/supabase-db';

const mockRouterPush = router.push as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockObtenerUsuarioActivo = supabaseDb.obtenerUsuarioActivo as jest.Mock;
const mockGuardarReserva = supabaseDb.guardarReserva as jest.Mock;
const mockCrearNotificacion = supabaseDb.crearNotificacion as jest.Mock;
const mockAgregarHistorial = supabaseDb.agregarHistorial as jest.Mock;

const defaultParams = {
  nombre: 'Cancún',
  paquete: 'premium',
  precio: '5000',
  personas: '2',
  fecha: '15/07/2026',
  nombre_viajero: 'Juan Pérez',
  email: 'juan@test.com',
  telefono: '5551234567',
  notas: '',
};

function setup(params = defaultParams) {
  mockUseLocalSearchParams.mockReturnValue(params);
  return render(<PagoScreen />);
}

function setupMocks() {
  mockObtenerUsuarioActivo.mockResolvedValue({ id: 'user-123' });
  mockGuardarReserva.mockResolvedValue(true);
  mockCrearNotificacion.mockResolvedValue(undefined);
  mockAgregarHistorial.mockResolvedValue(undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PagoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // ── Renderizado ──────────────────────────────────────────────────────────────

  describe('Renderizado inicial', () => {
    it('muestra los tres botones de método de pago', () => {
      const { getByTestId } = setup();
      expect(getByTestId('payment-method-tarjeta')).toBeTruthy();
      expect(getByTestId('payment-method-spei')).toBeTruthy();
      expect(getByTestId('payment-method-oxxo')).toBeTruthy();
    });

    it('muestra el monto total formateado', () => {
      const { getByText } = setup();
      expect(getByText(/5,000/)).toBeTruthy();
    });

    it('muestra el botón de pago', () => {
      const { getByTestId } = setup();
      expect(getByTestId('pay-submit-button')).toBeTruthy();
    });

    it('muestra el nombre del destino en el resumen', () => {
      const { getAllByText } = setup();
      expect(getAllByText(/Cancún/).length).toBeGreaterThan(0);
    });

    it('no muestra instrucciones SPEI al cargar', () => {
      const { queryByText } = setup();
      expect(queryByText('pago_spei_titulo')).toBeNull();
    });

    it('no muestra referencia OXXO al cargar', () => {
      const { queryByText } = setup();
      expect(queryByText('pago_oxxo_titulo')).toBeNull();
    });
  });

  // ── Selección de método ───────────────────────────────────────────────────────

  describe('Selección de método de pago', () => {
    it('seleccionar SPEI muestra las instrucciones SPEI', () => {
      const { getByTestId, getByText } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));
      expect(getByText('pago_spei_titulo')).toBeTruthy();
    });

    it('seleccionar OXXO muestra las instrucciones OXXO', () => {
      const { getByTestId, getByText } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));
      expect(getByText('pago_oxxo_titulo')).toBeTruthy();
    });

    it('la referencia OXXO tiene formato correcto: 16 dígitos, prefijo 85700000', () => {
      const { getByTestId, getByText } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));
      expect(getByText(/^85700000\d{8}$/)).toBeTruthy();
    });

    it('la referencia OXXO es determinista (mismos params → misma ref)', () => {
      const { getByTestId, getByText: g1 } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));
      const ref1 = g1(/^85700000\d{8}$/).props.children;

      const { getByTestId: t2, getByText: g2 } = setup();
      fireEvent.press(t2('payment-method-oxxo'));
      const ref2 = g2(/^85700000\d{8}$/).props.children;

      expect(ref1).toBe(ref2);
    });

    it('seleccionar OXXO oculta las instrucciones SPEI', () => {
      const { getByTestId, queryByText } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));
      fireEvent.press(getByTestId('payment-method-oxxo'));
      expect(queryByText('pago_spei_titulo')).toBeNull();
    });
  });

  // ── Flujo tarjeta ─────────────────────────────────────────────────────────────

  describe('Flujo tarjeta', () => {
    it('pulsando pagar con tarjeta muestra el componente PagoTarjeta', () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('pay-submit-button'));
      expect(getByTestId('pago-tarjeta-mock')).toBeTruthy();
    });

    it('éxito en PagoTarjeta llama a guardarReserva con folio basado en paymentId', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('pay-submit-button'));

      await act(async () => {
        fireEvent.press(getByTestId('mock-tarjeta-success'));
      });

      await waitFor(() => {
        expect(mockGuardarReserva).toHaveBeenCalledWith(
          'user-123',
          expect.stringMatching(/^STRIPEpi_test_/),
          'Cancún', 'premium', '15/07/2026', 2, 5000, 'tarjeta', 'confirmada', ''
        );
      });
    });

    it('éxito en PagoTarjeta navega a confirmacion con estado=confirmada', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('pay-submit-button'));

      await act(async () => {
        fireEvent.press(getByTestId('mock-tarjeta-success'));
      });

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith(
          expect.objectContaining({
            pathname: '/(tabs)/confirmacion',
            params: expect.objectContaining({ metodo: 'tarjeta', estado: 'confirmada' }),
          })
        );
      });
    });

    it('volver atrás desde PagoTarjeta regresa a la selección de método', () => {
      const { getByTestId, queryByTestId } = setup();
      fireEvent.press(getByTestId('pay-submit-button'));
      expect(getByTestId('pago-tarjeta-mock')).toBeTruthy();

      fireEvent.press(getByTestId('mock-tarjeta-back'));
      expect(queryByTestId('pago-tarjeta-mock')).toBeNull();
      expect(getByTestId('payment-method-tarjeta')).toBeTruthy();
    });
  });

  // ── Flujo SPEI ────────────────────────────────────────────────────────────────

  describe('Flujo SPEI', () => {
    it('llama a guardarReserva con metodo=spei y estado=pendiente', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockGuardarReserva).toHaveBeenCalledWith(
          'user-123', expect.any(String),
          'Cancún', 'premium', '15/07/2026', 2, 5000, 'spei', 'pendiente', ''
        );
      });
    });

    it('navega a confirmacion con estado=pendiente tras pago SPEI', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({ metodo: 'spei', estado: 'pendiente' }),
          })
        );
      });
    });

    it('crea notificación de pago exitoso tras SPEI', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockCrearNotificacion).toHaveBeenCalledWith(
          'user-123', 'pago_exitoso', expect.stringContaining('Folio'), expect.any(String)
        );
      });
    });

    it('registra en historial tras SPEI', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockAgregarHistorial).toHaveBeenCalledWith(
          'user-123', 'pago', expect.stringContaining('spei'), expect.any(String)
        );
      });
    });
  });

  // ── Flujo OXXO ────────────────────────────────────────────────────────────────

  describe('Flujo OXXO', () => {
    it('llama a guardarReserva con metodo=oxxo y estado=pendiente', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockGuardarReserva).toHaveBeenCalledWith(
          'user-123', expect.any(String),
          'Cancún', 'premium', '15/07/2026', 2, 5000, 'oxxo', 'pendiente', ''
        );
      });
    });

    it('navega a confirmacion con ref_oxxo de 16 dígitos', async () => {
      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              metodo: 'oxxo',
              ref_oxxo: expect.stringMatching(/^85700000\d{8}$/),
            }),
          })
        );
      });
    });

    it('la ref_oxxo en la navegación coincide con la referencia mostrada', async () => {
      const { getByTestId, getByText } = setup();
      fireEvent.press(getByTestId('payment-method-oxxo'));
      const refMostrada = getByText(/^85700000\d{8}$/).props.children;

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => {
        const call = mockRouterPush.mock.calls[0]?.[0];
        expect(call?.params?.ref_oxxo).toBe(refMostrada);
      });
    });
  });

  // ── Manejo de errores ─────────────────────────────────────────────────────────

  describe('Manejo de errores', () => {
    it('muestra alerta cuando no hay sesión activa', async () => {
      mockObtenerUsuarioActivo.mockResolvedValue(null);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      await act(async () => {
        fireEvent.press(getByTestId('pay-submit-button'));
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      alertSpy.mockRestore();
    });

    it('muestra banner de error cuando guardarReserva falla (ambos intentos)', async () => {
      jest.useFakeTimers();
      mockGuardarReserva.mockResolvedValue(false);

      const { getByTestId, findByText } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      // Iniciar el flujo de pago
      fireEvent.press(getByTestId('pay-submit-button'));

      // Avanzar el tiempo para superar el delay de 800ms del reintento automático
      // sin alcanzar el timeout de 30 segundos
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(await findByText('No se pudo guardar la reserva. Intenta de nuevo.')).toBeTruthy();
      jest.useRealTimers();
    });

    it('botón Reintentar vuelve a llamar a procesarPago con éxito', async () => {
      jest.useFakeTimers();
      mockGuardarReserva
        .mockResolvedValueOnce(false)  // primer intento
        .mockResolvedValueOnce(false)  // reintento automático (800ms)
        .mockResolvedValue(true);      // reintentar manual

      const { getByTestId, findByText } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      fireEvent.press(getByTestId('pay-submit-button'));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      const btnReintentar = await findByText('Reintentar');

      await act(async () => {
        fireEvent.press(btnReintentar);
        // No avanzar timers aquí — las mocks resuelven inmediatamente
      });

      await waitFor(() => expect(mockRouterPush).toHaveBeenCalled(), { timeout: 5000 });
      jest.useRealTimers();
    });

    it('no navega a confirmacion si guardarReserva falla', async () => {
      jest.useFakeTimers();
      mockGuardarReserva.mockResolvedValue(false);

      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));
      fireEvent.press(getByTestId('pay-submit-button'));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => expect(mockGuardarReserva).toHaveBeenCalled());
      expect(mockRouterPush).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  // ── Guard de reentrada (anti double-tap) ─────────────────────────────────────

  describe('Guard de reentrada', () => {
    it('doble pulsación del botón no duplica la llamada a guardarReserva', async () => {
      let resolveGuardar!: (v: boolean) => void;
      mockGuardarReserva.mockImplementation(
        () => new Promise(res => { resolveGuardar = res; })
      );

      const { getByTestId } = setup();
      fireEvent.press(getByTestId('payment-method-spei'));

      // Dos pulsaciones rápidas antes de que la promesa resuelva
      fireEvent.press(getByTestId('pay-submit-button'));
      fireEvent.press(getByTestId('pay-submit-button'));

      // Esperar a que guardarReserva haya sido llamado al menos una vez
      await waitFor(() => expect(mockGuardarReserva).toHaveBeenCalledTimes(1));

      // Resolver la promesa pendiente
      await act(async () => {
        resolveGuardar(true);
      });

      // Confirmar que se llamó exactamente una vez (la segunda pulsación fue ignorada)
      expect(mockGuardarReserva).toHaveBeenCalledTimes(1);
    });
  });
});
