// ============================================================
//  components/TopActionHeader.test.tsx
// ============================================================
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopActionHeader } from './TopActionHeader';

jest.mock('./NotificationIconButton', () => {
  const { TouchableOpacity } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    NotificationIconButton: ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity testID="notification-button" onPress={onPress} />
    ),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const MockImage = ({ ...props }: { [key: string]: unknown }) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  return RN;
});

describe('TopActionHeader', () => {
  const mockOnNotifications = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar el título', () => {
    const { getByText } = render(
      <TopActionHeader title="Mi Título" onNotificationsPress={mockOnNotifications} />
    );
    expect(getByText('Mi Título')).toBeTruthy();
  });

  it('debe renderizar el subtítulo si se proporciona', () => {
    const { getByText } = render(
      <TopActionHeader title="Título" subtitle="Subtítulo" onNotificationsPress={mockOnNotifications} />
    );
    expect(getByText('Subtítulo')).toBeTruthy();
  });

  it('debe llamar onNotificationsPress al presionar notificaciones', () => {
    const { getByTestId } = render(
      <TopActionHeader title="Título" onNotificationsPress={mockOnNotifications} />
    );
    fireEvent.press(getByTestId('notification-button'));
    expect(mockOnNotifications).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar botón de atrás cuando onBackPress existe', () => {
    const { getByLabelText } = render(
      <TopActionHeader title="Título" onNotificationsPress={mockOnNotifications} onBackPress={mockOnBack} />
    );
    expect(getByLabelText('Volver')).toBeTruthy();
  });

  it('debe llamar onBackPress al presionar botón de atrás', () => {
    const { getByLabelText } = render(
      <TopActionHeader title="Título" onNotificationsPress={mockOnNotifications} onBackPress={mockOnBack} />
    );
    fireEvent.press(getByLabelText('Volver'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('no debe mostrar botón de atrás si no hay onBackPress', () => {
    const { queryByLabelText } = render(
      <TopActionHeader title="Título" onNotificationsPress={mockOnNotifications} />
    );
    expect(queryByLabelText('Volver')).toBeNull();
  });
});