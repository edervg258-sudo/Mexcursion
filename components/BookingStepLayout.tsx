import { router } from 'expo-router';
import React from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BookingStepLayoutProps = {
  children: React.ReactNode;
  currentStep: number;
  steps: string[];
  title?: string;
  subtitle?: string;
  brandTitle?: string;
  showLogoOnly?: boolean;
};

const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <View style={styles.indicadorPasos}>
    {steps.map((step, index) => {
      const active = index === currentStep;
      const complete = index < currentStep;
      return (
        <React.Fragment key={step + index}>
          <View style={styles.filaPaso}>
            <View style={[styles.circuloPaso, active && styles.circuloActivo, complete && styles.circuloCompleto]}>
              {complete ? (
                <Text style={styles.checkPaso}>✓</Text>
              ) : (
                <Text style={[styles.numPaso, active && styles.numPasoActivo]}>{index + 1}</Text>
              )}
            </View>
            <Text style={[styles.etiquetaPaso, (active || complete) && styles.etiquetaActiva]}>{step}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.lineaPaso, (complete || currentStep > index) && styles.lineaCompleta]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

export function BookingStepLayout({
  children,
  currentStep,
  steps,
  title,
  subtitle,
  brandTitle,
  showLogoOnly = false,
}: BookingStepLayoutProps) {
  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../assets/images/mapa.png')} style={styles.imagenMapa} resizeMode="contain" />

      <SafeAreaView style={styles.area}>
        <View style={styles.header}>
          {showLogoOnly ? (
            <>
              <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.headerTitulo}>{brandTitle ?? 'Mexcursion'}</Text>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}>
                <Text style={styles.chevron}>‹</Text>
              </TouchableOpacity>
              <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
              <View style={styles.headerTextWrap}>
                <Text style={styles.titulo}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitulo}>{subtitle}</Text>}
              </View>
            </>
          )}
        </View>

        <StepIndicator currentStep={currentStep} steps={steps} />
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa: { opacity: 0.1, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  area: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  btnVolver: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 26, color: '#3AB7A5', lineHeight: 30 },
  logo: { width: 46, height: 46 },
  headerTextWrap: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '700', color: '#333' },
  subtitulo: { fontSize: 11, color: '#3AB7A5', fontWeight: '600' },
  headerTitulo: { fontSize: 17, fontWeight: '800', color: '#333' },
  indicadorPasos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filaPaso: { alignItems: 'center', gap: 4 },
  circuloPaso: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  circuloActivo: { backgroundColor: '#3AB7A5' },
  circuloCompleto: { backgroundColor: '#3AB7A5' },
  checkPaso: { color: '#fff', fontSize: 13, fontWeight: '700' },
  numPaso: { fontSize: 12, fontWeight: '700', color: '#aaa' },
  numPasoActivo: { color: '#fff' },
  etiquetaPaso: { fontSize: 10, color: '#aaa', fontWeight: '500' },
  etiquetaActiva: { color: '#3AB7A5', fontWeight: '700' },
  lineaPaso: { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 6, marginBottom: 14 },
  lineaCompleta: { backgroundColor: '#3AB7A5' },
});
