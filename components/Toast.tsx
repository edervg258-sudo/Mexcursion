import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TipoToast = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  mostrar: (mensaje: string, tipo?: TipoToast, duracion?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ mostrar: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const COLORES: Record<TipoToast, { fondo: string; borde: string; icono: string }> = {
  success: { fondo: '#1A7A6E', borde: '#15655B', icono: '✓' },
  error:   { fondo: '#C0392B', borde: '#A93226', icono: '✕' },
  warning: { fondo: '#D35400', borde: '#B94600', icono: '⚠' },
  info:    { fondo: '#2471A3', borde: '#1F618D', icono: 'ℹ' },
};

function ToastBurbuja({ item }: { item: ToastItem }) {
  const opacidad   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidad,   { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [opacidad, translateY]);

  const c = COLORES[item.tipo];
  return (
    <Animated.View
      style={[
        s.burbuja,
        { backgroundColor: c.fondo, borderColor: c.borde, opacity: opacidad, transform: [{ translateY }] },
      ]}
    >
      <Text style={s.icono}>{c.icono}</Text>
      <Text style={s.mensaje} numberOfLines={3}>{item.mensaje}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const contador = useRef(0);
  const { bottom } = useSafeAreaInsets();

  const mostrar = useCallback(
    (mensaje: string, tipo: TipoToast = 'info', duracion = 3200) => {
      const id = ++contador.current;
      setToasts(prev => [...prev.slice(-2), { id, mensaje, tipo }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duracion);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <View
        style={[s.pila, { bottom: Math.max(bottom, 16) + 8 }]}
        pointerEvents="none"
      >
        {toasts.map(t => (
          <ToastBurbuja key={t.id} item={t} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  pila: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
  },
  burbuja: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    maxWidth: 500,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      default: { elevation: 8 },
    }),
  },
  icono:   { fontSize: 16, color: '#fff', fontWeight: '700', minWidth: 18, textAlign: 'center' },
  mensaje: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500', lineHeight: 19 },
});
