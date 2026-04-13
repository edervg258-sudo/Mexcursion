// ============================================================
//  components/NotificationIconButton.test.tsx  —  Pruebas unitarias
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationIconButton } from './NotificationIconButton';

jest.mock('../lib/TemaContext', () => ({
  useTemaContext: () => ({
    tema: {
      superficie: '#1C1F2A',
      superficieBlanca: '#FFFFFF',
      borde: '#2C2F3E',
      bordeInput: '#B8DFD6',
    },
    isDark: false,
  }),
}));

// Mock Image
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockImage = ({ source: _source, ...props }: { source: unknown; [key: string]: unknown }) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  return RN;
});

describe('NotificationIconButton', () => {
  it('debe renderizar correctamente', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<NotificationIconButton onPress={onPress} />);
    const button = getByTestId('notification-button');
    expect(button).toBeTruthy();
  });

  it('debe llamar onPress al presionar', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<NotificationIconButton onPress={onPress} />);
    const button = getByTestId('notification-button');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('debe tener accesibilidad correcta', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<NotificationIconButton onPress={onPress} />);
    const button = getByTestId('notification-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Abrir notificaciones');
  });
});
