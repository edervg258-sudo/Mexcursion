// ============================================================
//  hooks/use-network-status.test.ts
// ============================================================
import { renderHook, act } from '@testing-library/react-native';
import { useNetworkStatus } from './use-network-status';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

describe('useNetworkStatus', () => {
  let mockListener: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void);

  beforeEach(() => {
    jest.clearAllMocks();
    mockListener = () => {};
    const { addEventListener } = require('@react-native-community/netinfo');
    (addEventListener as jest.Mock).mockImplementation((callback: (state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) => {
      mockListener = callback;
      return jest.fn();
    });
  });

  it('debe retornar estado inicial conectado', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('debe actualizar estado cuando cambia la conexión', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockListener({ isConnected: false, isInternetReachable: null });
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('debe llamar addEventListener una vez', () => {
    renderHook(() => useNetworkStatus());
    const { addEventListener } = require('@react-native-community/netinfo');
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});