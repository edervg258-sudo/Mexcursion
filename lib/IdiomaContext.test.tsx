// ============================================================
//  lib/IdiomaContext.test.tsx
// ============================================================
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { IdiomaProvider, useIdioma } from './IdiomaContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('IdiomaContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('debe proporcionar el hook useIdioma', () => {
    const Consumer = () => {
      const { idioma } = useIdioma();
      return <text testID="idioma">{idioma}</text>;
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('idioma')).toBeTruthy();
  });

  it('debe tener la función t()', () => {
    const Consumer = () => {
      const { t } = useIdioma();
      return <text testID="traduccion">{t('saludo')}</text>;
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('traduccion')).toBeTruthy();
  });

  it('debe permitir cambiar el idioma', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const Consumer = () => {
      const { idioma, cambiarIdioma } = useIdioma();
      return (
        <>
          <text testID="idioma">{idioma}</text>
          <button testID="cambiar" onPress={() => cambiarIdioma('en')} />
        </>
      );
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('idioma')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('cambiar'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('mx_idioma', 'en');
  });

  it('debe soportar variables en traducciones', () => {
    const Consumer = () => {
      const { t } = useIdioma();
      return <text testID="traduccion">{t('precio', { cantidad: 100 })}</text>;
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('traduccion')).toBeTruthy();
  });
});