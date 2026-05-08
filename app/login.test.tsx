import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from './login';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('../lib/supabase-db', () => ({
  iniciarSesion: jest.fn(),
  obtenerUsuarioActivo: jest.fn().mockResolvedValue(null),
  solicitarRecuperacionContrasena: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const MockImage = (props: Record<string, unknown>) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  return RN;
});

jest.mock('../components/EyeIcon', () => ({
  EyeIcon: () => null,
}));

import { iniciarSesion } from '../lib/supabase-db';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (iniciarSesion as jest.Mock).mockResolvedValue({ exito: false, error: 'Credenciales inválidas' });
  });

  it('muestra los campos de correo y contraseña', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('login-email-input')).toBeTruthy();
    expect(getByTestId('login-password-input')).toBeTruthy();
    expect(getByTestId('login-continue-button')).toBeTruthy();
  });

  it('muestra error si correo está vacío al presionar continuar', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(getByText(/Ingresa tu correo/i)).toBeTruthy();
    });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it('muestra error si correo tiene formato inválido', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login-email-input'), 'no-es-correo');
    fireEvent.changeText(getByTestId('login-password-input'), '123456');
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(getByText(/correo válido/i)).toBeTruthy();
    });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it('muestra error si contraseña tiene menos de 6 caracteres', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login-email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('login-password-input'), '123');
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(getByText(/al menos 6 caracteres/i)).toBeTruthy();
    });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it('llama iniciarSesion con correo y contraseña cuando el formulario es válido', async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login-email-input'), 'usuario@test.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'password123');
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(iniciarSesion).toHaveBeenCalledWith('usuario@test.com', 'password123');
    });
  });

  it('muestra error del servidor cuando el login falla', async () => {
    (iniciarSesion as jest.Mock).mockResolvedValue({ exito: false, error: 'Correo no registrado' });
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login-email-input'), 'noexiste@test.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'password123');
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(getByText(/Correo no registrado/i)).toBeTruthy();
    });
  });

  it('navega al menú cuando el login es exitoso', async () => {
    (iniciarSesion as jest.Mock).mockResolvedValue({ exito: true });
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login-email-input'), 'usuario@test.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'password123');
    fireEvent.press(getByTestId('login-continue-button'));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/menu');
    });
  });
});
