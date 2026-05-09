import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RUTAS_TEMATICAS } from '../../lib/datos/rutas-tematicas';
import { useTemaContext } from '../../lib/TemaContext';

import guanajuatoImg from '../../assets/images/guanajuato.png';
import chiapasImg from '../../assets/images/chiapas.png';
import sinaloaImg from '../../assets/images/sinaloa.png';
import jaliscoImg from '../../assets/images/jalisco.png';
import chihuahuaImg from '../../assets/images/chihuahua.png';

const RUTA_IMG: Record<string, number> = {
  colonial: guanajuatoImg,
  maya:     chiapasImg,
  pacifico: sinaloaImg,
  sabor:    jaliscoImg,
  aventura: chihuahuaImg,
};

export function SeccionRutas() {
  const { tema } = useTemaContext();

  return (
    <ScrollView contentContainerStyle={[s.scroll, { backgroundColor: tema.fondo }]}>
      <Text style={[s.titulo, { color: tema.texto }]}>Rutas temáticas ({RUTAS_TEMATICAS.length})</Text>
      <Text style={[s.subTitulo, { color: tema.textoMuted, marginBottom: 16, fontSize: 13 }]}>
        Rutas curadas de la app. Para editar el contenido, modifica{' '}
        <Text style={{ fontFamily: 'monospace', color: tema.primario }}>lib/datos/rutas-tematicas.ts</Text>
      </Text>

      {RUTAS_TEMATICAS.map(r => {
        const img = RUTA_IMG[r.id];
        const difColor = r.dificultad === 'Fácil' ? '#3AB7A5' : r.dificultad === 'Moderada' ? '#e9c46a' : '#DD331D';
        return (
          <View key={r.id} style={[s.rutaCard, { backgroundColor: tema.superficieBlanca, borderColor: r.color + '55', borderLeftColor: r.color }]}>
            <View style={s.rutaCardTop}>
              {img && <Image source={img} style={s.rutaCardImg} resizeMode="cover" />}
              <View style={{ flex: 1 }}>
                <View style={[s.itemCardRow, { marginBottom: 4 }]}>
                  <Text style={[s.itemNombre, { color: tema.texto }]}>{r.nombre}</Text>
                  <View style={[s.badge, { backgroundColor: difColor + '22', borderWidth: 1, borderColor: difColor }]}>
                    <Text style={[s.badgeTxt, { color: difColor }]}>{r.dificultad}</Text>
                  </View>
                </View>
                <Text style={[s.itemSub, { color: tema.textoMuted }]} numberOfLines={2}>{r.descripcion}</Text>
              </View>
            </View>
            <View style={[s.rutaCardInfo, { borderTopColor: tema.borde }]}>
              {[
                { lbl: 'Destinos',    val: String(r.estadoIds.length),              color: r.color },
                { lbl: 'Días total',  val: String(r.estadoIds.length * r.diasPorEstado), color: tema.texto },
                { lbl: 'Presupuesto', val: r.presupuestoDiario,                     color: tema.texto },
                { lbl: 'Época',       val: r.mejorEpoca,                            color: tema.texto },
              ].map(({ lbl, val, color }) => (
                <View key={lbl} style={s.rutaInfoItem}>
                  <Text style={[s.rutaInfoLbl, { color: tema.textoMuted }]}>{lbl}</Text>
                  <Text style={[s.rutaInfoVal, { color }]}>{val}</Text>
                </View>
              ))}
            </View>
            <View style={s.rutaTags}>
              {r.tags.map(tag => (
                <View key={tag} style={[s.rutaTag, { backgroundColor: r.color + '18', borderColor: r.color + '44' }]}>
                  <Text style={[s.rutaTagTxt, { color: r.color }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { padding: 16, gap: 14, paddingBottom: 120 },
  titulo:       { fontSize: 22, fontWeight: '800' },
  subTitulo:    { fontSize: 14, fontWeight: '600' },
  rutaCard:     { borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden', elevation: 1, marginBottom: 2 },
  rutaCardTop:  { flexDirection: 'row', gap: 12, padding: 14 },
  rutaCardImg:  { width: 68, height: 68, borderRadius: 10 },
  rutaCardInfo: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  rutaInfoItem: { flex: 1, alignItems: 'center', gap: 2 },
  rutaInfoLbl:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  rutaInfoVal:  { fontSize: 13, fontWeight: '800' },
  rutaTags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  rutaTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  rutaTagTxt:   { fontSize: 11, fontWeight: '600' },
  itemCardRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemNombre:   { fontSize: 15, fontWeight: '700', flex: 1 },
  itemSub:      { fontSize: 12, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTxt:     { fontSize: 11, fontWeight: '700' },
});
