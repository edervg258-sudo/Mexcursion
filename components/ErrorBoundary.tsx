import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) { return this.props.fallback; }
      return (
        <View style={s.contenedor}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.titulo}>Algo salió mal</Text>
          <Text style={s.mensaje} numberOfLines={4}>
            {this.state.error?.message ?? 'Error desconocido'}
          </Text>
          <TouchableOpacity style={s.btn} onPress={this.reset}>
            <Text style={s.btnTxt}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FAF7F0' },
  emoji:      { fontSize: 52, marginBottom: 16 },
  titulo:     { fontSize: 20, fontWeight: '800', color: '#222', marginBottom: 8 },
  mensaje:    { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:        { backgroundColor: '#3AB7A5', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  btnTxt:     { color: '#fff', fontWeight: '800', fontSize: 15 },
});
