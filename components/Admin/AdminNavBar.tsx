// ============================================================
//  components/Admin/AdminNavBar.tsx
// ============================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTemaContext } from '../../lib/TemaContext';
import { Seccion } from './tipos';

const NAV: { id: Seccion; label: string; abrev: string }[] = [
  { id: 'dashboard', label: 'Panel',    abrev: 'PNL' },
  { id: 'destinos',  label: 'Destinos', abrev: 'DST' },
  { id: 'rutas',     label: 'Rutas',    abrev: 'RTS' },
  { id: 'reservas',  label: 'Reservas', abrev: 'RSV' },
  { id: 'usuarios',  label: 'Usuarios', abrev: 'USR' },
];

interface Props {
  esPC: boolean;
  seccion: Seccion;
  onSeleccionar: (s: Seccion) => void;
}

export const AdminNavBar = React.memo(function AdminNavBar({ esPC, seccion, onSeleccionar }: Props) {
  const { tema, isDark } = useTemaContext();
  const { bottom: bottomInset } = useSafeAreaInsets();

  if (esPC) {
    return (
      <View style={[s.sidebar, { backgroundColor: isDark ? '#0D1412' : '#0f172a' }]}>
        <View style={s.sidebarHeader}>
          <Text style={s.sidebarTitulo}>Admin</Text>
          <Text style={s.sidebarSub}>Mexcursión</Text>
        </View>
        <View style={s.separador} />
        {NAV.map(n => (
          <TouchableOpacity
            key={n.id}
            style={[s.navItem, seccion === n.id && s.navItemActivo]}
            onPress={() => onSeleccionar(n.id)}
          >
            <View style={[s.navAbrev, seccion === n.id && { backgroundColor: tema.primario }]}>
              <Text style={[s.navAbrevTxt, seccion === n.id && s.navAbrevTxtActivo]}>{n.abrev}</Text>
            </View>
            <Text style={[s.navLabel, seccion === n.id && s.navLabelActivo]}>{n.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={[
      s.bottomBar,
      {
        paddingBottom: Math.max(bottomInset, 8),
        backgroundColor: tema.superficieBlanca,
        borderTopColor: tema.borde,
        borderTopWidth: 1,
      },
    ]}>
      {NAV.map(n => (
        <TouchableOpacity
          key={n.id}
          style={[
            s.bottomItem,
            seccion === n.id && { backgroundColor: tema.primarioSuave, borderRadius: 10 },
          ]}
          onPress={() => onSeleccionar(n.id)}
        >
          <Text style={[
            s.bottomLabel,
            { color: seccion === n.id ? tema.primario : tema.textoMuted },
            seccion === n.id && { fontWeight: '700' },
          ]}>
            {n.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const s = StyleSheet.create({
  // Sidebar PC
  sidebar:           { width: 80, paddingVertical: 16, alignItems: 'center', elevation: 4 },
  sidebarHeader:     { alignItems: 'center', marginBottom: 20 },
  sidebarTitulo:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  sidebarSub:        { color: '#94a3b8', fontSize: 11 },
  separador:         { height: 1, backgroundColor: '#1e293b', width: '80%', marginVertical: 12 },
  navItem:           { width: '100%', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  navItemActivo:     { backgroundColor: '#1e293b' },
  navAbrev:          { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  navAbrevTxt:       { color: '#cbd5f5', fontWeight: '600', fontSize: 11 },
  navAbrevTxtActivo: { color: '#fff' },
  navLabel:          { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  navLabelActivo:    { color: '#fff' },
  // Bottom bar móvil
  bottomBar:   { flexDirection: 'row', elevation: 8 },
  bottomItem:  { flex: 1, alignItems: 'center', paddingVertical: 11 },
  bottomLabel: { fontSize: 11 },
});
