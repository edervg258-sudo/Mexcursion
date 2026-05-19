// ============================================================
//  lib/IdiomaContext.test.tsx
// ============================================================
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
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
      return <Text testID="idioma">{idioma}</Text>;
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('idioma')).toBeTruthy();
  });

  it('debe tener la función t()', () => {
    const Consumer = () => {
      const { t } = useIdioma();
      return <Text testID="traduccion">{t('saludo')}</Text>;
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
          <Text testID="idioma">{idioma}</Text>
          <TouchableOpacity testID="cambiar" onPress={() => cambiarIdioma('en')} />
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
      return <Text testID="traduccion">{t('precio', { cantidad: 100 })}</Text>;
    };
    const { getByTestId } = render(<IdiomaProvider><Consumer /></IdiomaProvider>);
    expect(getByTestId('traduccion')).toBeTruthy();
  });
});