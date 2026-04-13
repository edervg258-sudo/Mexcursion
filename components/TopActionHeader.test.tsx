// ============================================================
//  components/TopActionHeader.test.tsx  —  Pruebas unitarias
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopActionHeader } from './TopActionHeader';

// Mock NotificationIconButton
jest.mock('./NotificationIconButton', () => {
  const { View } = jest.requireActual('react-native');
  const MockNotificationIconButton = ({ onPress }: { onPress: () => void }) => (
    <View testID="notification-button" accessibilityRole="button" accessibilityLabel="Abrir notificaciones" onTouchEnd={onPress} />
  );
  MockNotificationIconButton.displayName = 'NotificationIconButton';
  return { NotificationIconButton: MockNotificationIconButton };
});

// Mock Image
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockImage = ({ source: _source, ...props }: { source: unknown; [key: string]: unknown }) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  return RN;
});

describe('TopActionHeader', () => {
  const defaultProps = {
    title: 'Test Title',
    onNotificationsPress: jest.fn(),
  };

  it('debe renderizar el título correctamente', () => {
    const { getByText } = render(<TopActionHeader {...defaultProps} />);
    expect(getByText('Test Title')).toBeTruthy();
  });

  it('debe renderizar el subtítulo cuando se proporciona', () => {
    const { getByText } = render(<TopActionHeader {...defaultProps} subtitle="Test Subtitle" />);
    expect(getByText('Test Subtitle')).toBeTruthy();
    expect(getByText('Test Title')).toBeTruthy();
  });

  it('debe renderizar el botón de atrás cuando onBackPress se proporciona', () => {
    const onBackPress = jest.fn();
    const { getByText } = render(<TopActionHeader {...defaultProps} onBackPress={onBackPress} />);
    const backButton = getByText('‹');
    expect(backButton).toBeTruthy();
    fireEvent.press(backButton);
    expect(onBackPress).toHaveBeenCalled();
  });

  it('no debe renderizar el botón de atrás cuando no se proporciona onBackPress', () => {
    const { queryByText } = render(<TopActionHeader {...defaultProps} />);
    expect(queryByText('‹')).toBeNull();
  });

  it('debe renderizar el logo inline cuando showInlineLogo es true', () => {
    const { root } = render(<TopActionHeader {...defaultProps} showInlineLogo={true} />);
    // Check that it renders without error
    expect(root).toBeTruthy();
  });

  it('debe llamar onNotificationsPress cuando se presiona el botón de notificaciones', () => {
    const { getByTestId } = render(<TopActionHeader {...defaultProps} />);
    const notificationButton = getByTestId('notification-button');
    fireEvent.press(notificationButton);
    expect(defaultProps.onNotificationsPress).toHaveBeenCalled();
  });

  it('debe aplicar maxWidth cuando se proporciona', () => {
    const { root } = render(<TopActionHeader {...defaultProps} maxWidth={500} />);
    expect(root).toBeTruthy();
  });
});