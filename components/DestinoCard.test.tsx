// ============================================================
//  components/DestinoCard.test.tsx
// ============================================================
import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { DestinoCard } from './DestinoCard';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const MockImage = ({ source: _source, ...props }: { source: unknown; [key: string]: unknown }) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  return RN;
});

const mockDestino = {
  id: 1,
  nombre: 'Cancún',
  categoria: 'Playa',
  descripcion: '天堂 tropical con ruinas mayas',
  precio: 1500,
  imagen: { uri: 'https://example.com/cancun.jpg' },
  favorito: false,
} as any;

describe('DestinoCard', () => {
  const mockFadeAnim = { interpolate: jest.fn(() => ({ translateY: jest.fn() })) } as unknown as Animated.Value;
  const mockAnimFav = { interpolate: jest.fn() } as unknown as Animated.Value;
  const mockOnToggleFavorito = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar el nombre del destino', () => {
    const { getByText } = render(
      <DestinoCard item={mockDestino} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    expect(getByText('Cancún')).toBeTruthy();
  });

  it('debe renderizar la categoría', () => {
    const { getByText } = render(
      <DestinoCard item={mockDestino} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    expect(getByText('Playa')).toBeTruthy();
  });

  it('debe renderizar el precio formateado', () => {
    const { getByText } = render(
      <DestinoCard item={mockDestino} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    expect(getByText(/1,500/)).toBeTruthy();
  });

  it('debe tener accesibilidad correcta en el card principal', () => {
    const { getByTestId } = render(
      <DestinoCard item={mockDestino} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    const card = getByTestId('destination-card');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBe('Abrir destino Cancún');
  });

  it('debe llamar onToggleFavorito al presionar el botón de favorito', () => {
    const { getByLabelText } = render(
      <DestinoCard item={mockDestino} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    const favButton = getByLabelText('Agregar Cancún a favoritos');
    fireEvent.press(favButton);
    expect(mockOnToggleFavorito).toHaveBeenCalledWith(1);
  });

  it('debe mostrar accesibilidad correcta cuando es favorito', () => {
    const favorito = { ...mockDestino, favorito: true };
    const { getByLabelText } = render(
      <DestinoCard item={favorito} fadeAnim={mockFadeAnim} animFav={mockAnimFav} onToggleFavorito={mockOnToggleFavorito} />
    );
    expect(getByLabelText('Quitar Cancún de favoritos')).toBeTruthy();
  });

  it('debe mostrar resumen de reseñas cuando existe', () => {
    const { getByText } = render(
      <DestinoCard
        item={mockDestino}
        fadeAnim={mockFadeAnim}
        animFav={mockAnimFav}
        onToggleFavorito={mockOnToggleFavorito}
        resumenResenas={{ promedio: 4.7, total: 18 }}
      />
    );
    expect(getByText('4.7 ★ · 18 reseñas')).toBeTruthy();
  });
});
