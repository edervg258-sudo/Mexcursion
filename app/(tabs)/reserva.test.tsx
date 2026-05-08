import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReservaScreen from './reserva';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: mockPush },
  useLocalSearchParams: () => ({
    nombre: 'Yucatán',
    paquete: 'Económico',
    precio: '3500',
  }),
}));

jest.mock('../../lib/IdiomaContext', () => ({
  useIdioma: () => ({
    t: (k: string, vars?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        rsv_paso_reserva: 'Reserva',
        rsv_paso_pago: 'Pago',
        rsv_paso_confirmacion: 'Confirmación',
        rsv_datos_viaje: 'Datos del viaje',
        rsv_paquete: `Paquete: ${vars?.n ?? ''}`,
        rsv_destino: 'Destino',
        rsv_precio_persona: 'Precio/persona',
        rsv_num_personas: 'Número de personas',
        rsv_total: 'Total',
        rsv_nombre: 'Nombre',
        rsv_correo: 'Correo',
        rsv_telefono: 'Teléfono',
        rsv_fecha: 'Fecha',
        rsv_notas: 'Notas',
        rsv_notas_hint: 'Notas opcionales',
        rsv_ph_nombre: 'Tu nombre completo',
        rsv_ph_correo: 'tu@correo.com',
        rsv_ph_telefono: '10 dígitos',
        rsv_continuar: 'Continuar',
        rsv_err_nombre: 'El nombre debe tener al menos 3 caracteres',
        rsv_err_correo: 'Ingresa un correo válido',
        rsv_err_telefono: 'Ingresa un teléfono de 10 dígitos',
        rsv_err_fecha: 'Selecciona una fecha futura válida',
        conf_paquete: 'Paquete',
      };
      return map[k] ?? k;
    },
  }),
}));

jest.mock('../../components/BookingStepLayout', () => ({
  BookingStepLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../lib/estilos', () => ({
  sombra: () => ({}),
}));

describe('ReservaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra los campos del formulario', () => {
    const { getByTestId, getByText } = render(<ReservaScreen />);
    expect(getByTestId('traveler-name-input')).toBeTruthy();
    expect(getByTestId('traveler-email-input')).toBeTruthy();
    expect(getByTestId('traveler-phone-input')).toBeTruthy();
    expect(getByTestId('reserve-continue-button')).toBeTruthy();
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('muestra error si nombre tiene menos de 3 caracteres', async () => {
    const { getByTestId, getByText } = render(<ReservaScreen />);
    fireEvent.changeText(getByTestId('traveler-name-input'), 'Ab');
    fireEvent.press(getByTestId('reserve-continue-button'));
    await waitFor(() => {
      expect(getByText('El nombre debe tener al menos 3 caracteres')).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('muestra error si correo es inválido', async () => {
    const { getByTestId, getByText } = render(<ReservaScreen />);
    fireEvent.changeText(getByTestId('traveler-name-input'), 'Usuario Prueba');
    fireEvent.changeText(getByTestId('traveler-email-input'), 'no-es-correo');
    fireEvent.press(getByTestId('reserve-continue-button'));
    await waitFor(() => {
      expect(getByText('Ingresa un correo válido')).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('muestra error si teléfono tiene menos de 10 dígitos', async () => {
    const { getByTestId, getByText } = render(<ReservaScreen />);
    fireEvent.changeText(getByTestId('traveler-name-input'), 'Usuario Prueba');
    fireEvent.changeText(getByTestId('traveler-email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('traveler-phone-input'), '12345');
    fireEvent.press(getByTestId('reserve-continue-button'));
    await waitFor(() => {
      expect(getByText('Ingresa un teléfono de 10 dígitos')).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('incrementa y decrementa el número de personas', () => {
    const { getByLabelText } = render(<ReservaScreen />);
    const btnAumentar = getByLabelText('Aumentar número de personas');
    const btnReducir  = getByLabelText('Reducir número de personas');
    const conteo      = getByLabelText('1 personas');

    expect(conteo).toBeTruthy();
    fireEvent.press(btnAumentar);
    expect(getByLabelText('2 personas')).toBeTruthy();
    fireEvent.press(btnReducir);
    expect(getByLabelText('1 personas')).toBeTruthy();
  });

  it('no permite reducir personas por debajo de 1', () => {
    const { getByLabelText } = render(<ReservaScreen />);
    const btnReducir = getByLabelText('Reducir número de personas');
    fireEvent.press(btnReducir);
    expect(getByLabelText('1 personas')).toBeTruthy();
  });
});
