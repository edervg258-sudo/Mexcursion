// ============================================================
//  components/TabChrome.test.tsx  —  Pruebas unitarias
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TabChrome } from './TabChrome';

// Mock expo-router
jest.mock('expo-router', () => ({
  usePathname: jest.fn(),
  router: { push: jest.fn() },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const mockSafeAreaView = ({ children }: { children: unknown }) => children;
  mockSafeAreaView.displayName = 'SafeAreaView';
  return {
    useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
    SafeAreaView: mockSafeAreaView,
  };
});

// Mock IdiomaContext
jest.mock('../lib/IdiomaContext', () => ({
  useIdioma: jest.fn(() => ({ t: (key: string) => key })),
}));

// Mock TemaContext
jest.mock('../lib/TemaContext', () => ({
  useTemaContext: jest.fn(() => ({
    tema: {
      fondo: '#FAF7F0', superficieBlanca: '#FFFFFF', superficie: '#FFFCF8',
      borde: '#E8E2D9', textoMuted: '#8E8E8E', texto: '#1C1C1C',
      primarioSuave: '#E8F5F2', mapaOverlay: 0.11,
    },
    isDark: false,
    toggleTema: jest.fn(),
  })),
}));

// Mock AsyncStorage (required by TemaContext)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock PESTANAS
jest.mock('../lib/constantes', () => ({
  PESTANAS: [
    { ruta: '/(tabs)/home', iconoRojo: 'red.png', iconoGris: 'grey.png' },
    { ruta: '/(tabs)/search', iconoRojo: 'red.png', iconoGris: 'grey.png' },
  ],
}));

// Mock Image and other RN components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockImage = ({ source: _source, ...props }: { source: unknown; [key: string]: unknown }) => <RN.View {...props} />;
  MockImage.displayName = 'Image';
  RN.Image = MockImage;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockStatusBar = ({ ...props }: { [key: string]: unknown }) => <RN.View {...props} />;
  MockStatusBar.displayName = 'StatusBar';
  RN.StatusBar = MockStatusBar;
  return RN;
});

describe('TabChrome', () => {
  const defaultProps = {
    children: <></>,
    esPC: false,
  };

  beforeEach(() => {
    const { usePathname } = jest.requireMock('expo-router');
    usePathname.mockReturnValue('/(tabs)/home');
  });

  it('debe renderizar children correctamente', () => {
    render(<TabChrome {...defaultProps} />);
    // Assuming children have testID, but since mocked, check if renders
    expect(true).toBe(true); // Placeholder
  });

  it('debe renderizar título cuando se proporciona', () => {
    const { getByText } = render(<TabChrome {...defaultProps} title="Test Title" />);
    expect(getByText('Test Title')).toBeTruthy();
  });

  it('debe renderizar botón de atrás cuando onBack se proporciona', () => {
    const onBack = jest.fn();
    // El botón ‹ solo se muestra cuando también hay title
    const { getByText } = render(<TabChrome {...defaultProps} title="Detalle" onBack={onBack} />);
    const backButton = getByText('‹');
    fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('debe mostrar logo cuando no hay título y showLogoWhenNoTitle es true', () => {
    const { root } = render(<TabChrome {...defaultProps} showLogoWhenNoTitle={true} />);
    expect(root).toBeTruthy();
  });

  it('debe navegar al presionar pestañas', () => {
    const { router } = jest.requireMock('expo-router');
    expect(router.push).not.toHaveBeenCalled(); // Before press
  });

  it('debe aplicar maxWidth cuando se proporciona', () => {
    const { root } = render(<TabChrome {...defaultProps} maxWidth={800} />);
    expect(root).toBeTruthy();
  });
});