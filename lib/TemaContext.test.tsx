// ============================================================
//  lib/TemaContext.test.tsx
// ============================================================
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { TemaProvider, useTemaContext } from './TemaContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('TemaContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('debe proporcionar el hook useTemaContext', () => {
    const Consumer = () => {
      const context = useTemaContext();
      expect(typeof context.toggleTema).toBe('function');
      expect(typeof context.isDark).toBe('boolean');
      expect(context.tema).toBeDefined();
      return null;
    };
    render(<TemaProvider><Consumer /></TemaProvider>);
  });

  it('debe tener toggleTema como función', () => {
    const Consumer = () => {
      const { toggleTema } = useTemaContext();
      return <button testID="toggle" onPress={toggleTema} />;
    };
    const { getByTestId } = render(<TemaProvider><Consumer /></TemaProvider>);
    expect(getByTestId('toggle')).toBeTruthy();
  });

  it('debe llamar AsyncStorage.setItem al hacer toggle', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const Consumer = () => {
      const { toggleTema } = useTemaContext();
      return <button testID="toggle" onPress={toggleTema} />;
    };
    const { getByTestId } = render(<TemaProvider><Consumer /></TemaProvider>);

    await act(async () => {
      fireEvent.press(getByTestId('toggle'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('debe tener isDark booleano', () => {
    const Consumer = () => {
      const { isDark } = useTemaContext();
      return <text testID="isDark">{String(isDark)}</text>;
    };
    const { getByTestId } = render(<TemaProvider><Consumer /></TemaProvider>);
    expect(getByTestId('isDark')).toBeTruthy();
  });
});