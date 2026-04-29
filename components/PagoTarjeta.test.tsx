import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PagoTarjeta } from './PagoTarjeta';

jest.mock('../lib/TemaContext', () => ({
  useTemaContext: () => ({ isDark: false }),
}));

describe('PagoTarjeta simulado', () => {
  const baseProps = {
    amount: 1200,
    description: 'Reserva test',
    payerEmail: 'test@example.com',
    externalReference: 'ref-123',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra error si falta titular', () => {
    const { getByText } = render(<PagoTarjeta {...baseProps} />);
    fireEvent.press(getByText('Pagar ahora'));
    expect(baseProps.onError).toHaveBeenCalledWith('Ingresa el nombre del titular.');
  });

  it('muestra error si numero no tiene 16 digitos', () => {
    const { getByPlaceholderText, getByText } = render(<PagoTarjeta {...baseProps} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del titular'), 'Usuario Test');
    fireEvent.changeText(getByPlaceholderText('Numero de tarjeta'), '1234');
    fireEvent.press(getByText('Pagar ahora'));
    expect(baseProps.onError).toHaveBeenCalledWith('Ingresa un numero de tarjeta de 16 digitos.');
  });

  it('ejecuta onSuccess con folio simulado cuando inputs son validos', async () => {
    jest.useFakeTimers();
    const { getByPlaceholderText, getByText } = render(<PagoTarjeta {...baseProps} />);

    fireEvent.changeText(getByPlaceholderText('Nombre del titular'), 'Usuario Test');
    fireEvent.changeText(getByPlaceholderText('Numero de tarjeta'), '4242424242424242');
    fireEvent.changeText(getByPlaceholderText('MM/AA'), '12/26');
    fireEvent.changeText(getByPlaceholderText('CVV'), '123');
    fireEvent.press(getByText('Pagar ahora'));

    await act(async () => {
      jest.advanceTimersByTime(950);
    });
    await waitFor(() => {
      expect(baseProps.onSuccess).toHaveBeenCalledWith('sim-card-ref-123');
    });
    jest.useRealTimers();
  });
});
