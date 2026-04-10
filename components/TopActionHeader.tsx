import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NotificationIconButton } from './NotificationIconButton';

type TopActionHeaderProps = {
  title: string;
  subtitle?: string;
  showInlineLogo?: boolean;
  onNotificationsPress: () => void;
  onBackPress?: () => void;
  maxWidth?: number;
};

export function TopActionHeader({
  title,
  subtitle,
  showInlineLogo = false,
  onNotificationsPress,
  onBackPress,
  maxWidth,
}: TopActionHeaderProps) {
  return (
    <View style={[styles.encabezado, maxWidth ? { maxWidth } : null]}>
      <View style={styles.leadingRow}>
        {onBackPress ? (
          <TouchableOpacity style={styles.botonAtras} onPress={onBackPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Volver">
            <Text style={styles.textoAtras}>{'‹'}</Text>
          </TouchableOpacity>
        ) : null}
        {showInlineLogo ? (
          <Image source={require('../assets/images/logo.png')} style={styles.logoFijo} resizeMode="contain" />
        ) : null}
      </View>
      <View style={[styles.textWrap, (showInlineLogo || onBackPress) && styles.textWrapConLogo]}>
        {!!subtitle && <Text style={styles.subtitulo}>{subtitle}</Text>}
        <Text style={styles.tituloEncabezado}>{title}</Text>
      </View>
      <View style={styles.iconosHeader}>
        <NotificationIconButton onPress={onNotificationsPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 8, width: '100%', minHeight: 72, alignSelf: 'center' },
  leadingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, gap: 8 },
  botonAtras: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  textoAtras: { fontSize: 26, color: '#3A4A47', lineHeight: 30 },
  logoFijo: { width: 46, height: 46 },
  textWrap: { flex: 1 },
  textWrapConLogo: { paddingLeft: 6 },
  subtitulo: { fontSize: 12, color: '#71827F', fontWeight: '600' },
  tituloEncabezado: { fontSize: 18, fontWeight: '800', color: '#333' },
  iconosHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
