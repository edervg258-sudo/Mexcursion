import { Href, router, usePathname } from 'expo-router';
import React from 'react';
import {
    Image,
    ImageSourcePropType,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PESTANAS } from '../lib/constantes';
import { useIdioma } from '../lib/IdiomaContext';
import { TraduccionClave } from '../lib/traducciones';

type TabChromeProps = {
  children: React.ReactNode;
  esPC: boolean;
  title?: string;
  onBack?: () => void;
  headerRight?: React.ReactNode;
  showLogoWhenNoTitle?: boolean;
  maxWidth?: number;
  backgroundImage?: ImageSourcePropType;
};

export function TabChrome({
  children,
  esPC,
  title,
  onBack,
  headerRight,
  showLogoWhenNoTitle = true,
  maxWidth = 900,
  backgroundImage = require('../assets/images/mapa.png'),
}: TabChromeProps) {
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();
  const { t } = useIdioma();

  const navigateTab = (ruta: string) => setTimeout(() => router.push(ruta as Href), 0);
  const isActive = (ruta: string) => !!pathname && pathname.endsWith(ruta.replace('/(tabs)', ''));

  const sidebar = (
    <View style={styles.sidebar}>
      <Image source={require('../assets/images/logo.png')} style={styles.logoSidebar} resizeMode="contain" />
      <View style={styles.separadorSidebar} />
      {PESTANAS.map(p => {
        const active = isActive(p.ruta);
        return (
          <TouchableOpacity
            key={p.ruta}
            style={[styles.itemSidebar, active && styles.itemSidebarActivo]}
            onPress={() => navigateTab(p.ruta)}
            activeOpacity={0.75}
          >
            <Image source={active ? p.iconoRojo : p.iconoGris} style={styles.iconoSidebar} resizeMode="contain" />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const header = title ? (
    <View style={[styles.encabezado, { maxWidth }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.botonAtras} activeOpacity={0.8}>
          <Text style={styles.textoAtras}>{'‹'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <Text style={styles.tituloEncabezado} numberOfLines={1}>{title}</Text>
      {headerRight ?? <View style={styles.headerSpacer} />}
    </View>
  ) : (
    showLogoWhenNoTitle && !esPC ? (
      <View style={[styles.logoSoloRow, { maxWidth }]}>
        <Image source={require('../assets/images/logo.png')} style={styles.logoFijo} resizeMode="contain" />
      </View>
    ) : null
  );

  const bottomBar = (
    <View style={[styles.envolturaBarra, { paddingBottom: Math.max(bottom, 8) }]}>
      <View style={styles.barraPestanas}>
        {PESTANAS.map(p => {
          const active = isActive(p.ruta);
          return (
            <TouchableOpacity
              key={p.ruta}
              style={styles.itemPestana}
              activeOpacity={1}
              onPress={() => navigateTab(p.ruta)}
            >
              <Image source={active ? p.iconoRojo : p.iconoGris} style={styles.iconoPestana} resizeMode="contain" />
              <Text style={[styles.etiquetaPestana, active && styles.etiquetaPestanaActiva]}>
                {t(('tab_' + p.ruta.replace('/(tabs)/', '')) as TraduccionClave)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={backgroundImage} style={styles.imagenMapa} resizeMode="contain" />

      {esPC ? (
        <View style={styles.layoutPC}>
          {sidebar}
          <SafeAreaView style={styles.areaSeguraPC}>
            {header}
            <View style={[styles.contentWrap, { maxWidth }]}>{children}</View>
          </SafeAreaView>
        </View>
      ) : (
        <View style={styles.layoutMovil}>
          <SafeAreaView style={styles.areaSeguraMovil} edges={['top', 'left', 'right']}>
            {header}
            <View style={[styles.contentWrap, { maxWidth }]}>{children}</View>
          </SafeAreaView>
          {bottomBar}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FAF7F0' },
  imagenMapa: { opacity: 0.12, position: 'absolute', width: '90%', height: '100%', alignSelf: 'center' },
  layoutPC: { flex: 1, flexDirection: 'row' },
  layoutMovil: { flex: 1 },
  areaSeguraPC: { flex: 1 },
  areaSeguraMovil: { flex: 1 },
  contentWrap: { flex: 1, width: '100%', alignSelf: 'center' },
  sidebar: { width: 64, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e8e8e8', alignItems: 'center', paddingTop: 16, paddingBottom: 20, gap: 4 },
  logoSidebar: { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar: { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo: { backgroundColor: '#f0faf9' },
  iconoSidebar: { width: 28, height: 28 },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, width: '100%', alignSelf: 'center', minHeight: 64 },
  logoSoloRow: { width: '100%', alignSelf: 'center', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 2, minHeight: 72, justifyContent: 'center' },
  logoFijo: { width: 46, height: 46 },
  botonAtras: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  textoAtras: { fontSize: 26, color: '#3A4A47', lineHeight: 30 },
  tituloEncabezado: { flex: 1, fontSize: 18, fontWeight: '800', color: '#333', textAlign: 'center' },
  headerSpacer: { width: 38, height: 38 },
  envolturaBarra: { width: '100%', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  barraPestanas: { flexDirection: 'row', backgroundColor: '#fff', width: '100%', maxWidth: 800, alignSelf: 'center' },
  itemPestana: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, height: 56 },
  iconoPestana: { width: 28, height: 28 },
  etiquetaPestana: { fontSize: 10, color: '#999', marginTop: 2 },
  etiquetaPestanaActiva: { color: '#3AB7A5', fontWeight: '700' },
});
