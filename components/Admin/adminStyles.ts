// ============================================================
//  components/Admin/adminStyles.ts  —  Estilos compartidos
// ============================================================

import { StyleSheet } from 'react-native';

export const adminS = StyleSheet.create({
  seccionScroll: { padding: 16, gap: 14, paddingBottom: 120 },
  seccionTitulo: { fontSize: 22, fontWeight: '800' },
  subTitulo:     { fontSize: 14, fontWeight: '600' },

  // Cards
  itemCard:         { borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, elevation: 1 },
  itemCardInactivo: { opacity: 0.5 },
  itemCardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre:       { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  itemSub:          { fontSize: 12, marginTop: 3 },
  itemPrecio:       { fontSize: 14, fontWeight: '700', marginTop: 6 },
  itemAcciones:     { flexDirection: 'column', gap: 6 },

  badge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  // Formularios
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  formInput: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, elevation: 0 },
  formError: { fontSize: 12, color: '#DD331D', marginTop: 4, marginLeft: 2 },

  // Botones
  btnAccion:      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnAccionTxt:   { fontSize: 12, fontWeight: '700' },
  btnPrimario:    { backgroundColor: '#3AB7A5', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnPrimarioTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnNuevo:       { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnNuevoTxt:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnCancelarTxt: { fontWeight: '600' },

  // Chips filtro
  chipFiltro:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  chipFiltroTxt: { fontSize: 13 },

  // Búsqueda
  inputBusqueda: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },

  // Transiciones reserva
  barraEstado:      { width: 4, borderRadius: 4, marginRight: 4 },
  transicionRow:    { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btnTransicion:    { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  btnTransicionTxt: { fontSize: 12, fontWeight: '600' },

  // Usuarios
  tipoRow:           { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  avatarGrande:      { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarLetraGrande: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Helpers
  rowHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vacioCentrado: { paddingVertical: 40, alignItems: 'center' },
  textoVacio:    { fontSize: 14 },
  errorBannerTxt:{ fontSize: 13, fontWeight: '600' },
});
