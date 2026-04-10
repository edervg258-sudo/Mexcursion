import sys

file_path = r'c:\Users\usuario\MiPrimerApp\app\(tabs)\rutas.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize line endings to help matching
text = text.replace('\r\n', '\n')

# 1. Imports
target_imports = """import { Tema } from '../../lib/tema';

// ─────────────────────────────────────────────────────────────────────────────
//  Colores de nivel con opacidad controlada"""
replace_imports = """import { Tema } from '../../lib/tema';

import { ModalNuevoItinerario } from '../../components/Rutas/ModalNuevoItinerario';
import { ModalAgregarSugerencia } from '../../components/Rutas/ModalAgregarSugerencia';
import { ModalDetalleSugerencia } from '../../components/Rutas/ModalDetalleSugerencia';
import { VistaDetalleItinerario } from '../../components/Rutas/VistaDetalleItinerario';

// ─────────────────────────────────────────────────────────────────────────────
//  Colores de nivel con opacidad controlada"""

# 2. StatChip
target_statchip = """// ─────────────────────────────────────────────────────────────────────────────
//  Chip de estadística
// ─────────────────────────────────────────────────────────────────────────────
const StatChip = ({ emoji, label }: { emoji: string; label: string }) => (
  <View style={s.statChip}>
    <Text style={s.statEmoji}>{emoji}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════"""
replace_statchip = """// ═══════════════════════════════════════════════════════════════════════════════"""

# 3. Vista detalle itinerario
target_vistadetalle = """    const botonNotificaciones = <NotificationIconButton onPress={() => router.push('/(tabs)/notificaciones' as any)} />;

    return (
      <TabChrome esPC={esPC} title={itinerarioActivo.nombre} onBack={() => setItinerarioActivo(null)} headerRight={botonNotificaciones}>
        <View style={{ flex: 1 }}>

          {items.length > 0 && (
            <View style={s.statsBanner}>
              <StatChip emoji="📍" label={`${items.length} ${items.length === 1 ? t('rut_destino') : t('rut_destinos')}`} />
              <View style={s.statDivisor} />
              <StatChip emoji="⌛" label={`~${diasTotales} días`} />
              <View style={s.statDivisor} />
              <StatChip emoji="💰" label={`$${costoTotal.toLocaleString()} MXN`} />
              <View style={s.statDivisor} />
              <StatChip emoji="✨" label={nivelTop} />
            </View>
          )}

          <View style={s.accionesBarra}>
            <TouchableOpacity style={s.accionBtn}
              onPress={() => compartirItinerario(items, itinerarioActivo.nombre)}>
              <Text style={s.accionBtnTxt}>{t('rut_compartir_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.accionBtn, s.accionBtnDanger]}
              onPress={() => handleEliminarItinerario(itinerarioActivo.id)}>
              <Text style={[s.accionBtnTxt, { color: Tema.acento }]}>{t('rut_borrar_viaje_btn')}</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.textoVacioEmoji}>✈️</Text>
              <Text style={s.tituloVacio}>{t('rut_viaje_vacio')}</Text>
              <Text style={s.subtituloVacio}>
                {t('rut_viaje_vacio_msg')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.clave}
              contentContainerStyle={s.listaItems}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              renderItem={({ item, index }) => (
                <View style={s.tarjetaItem}>
                  {index < items.length - 1 && <View style={s.lineaTimeline} />}

                  <View style={[s.burbujaPaso, { borderColor: colorNivel(item.nivel) }]}>
                    <Text style={[s.textoBurbuja, { color: colorNivel(item.nivel) }]}>{index + 1}</Text>
                  </View>

                  <View style={s.cuerpoItem}>
                    <Image source={imagenDeEstado(item.estado)} style={s.imgItem} resizeMode="cover" />
                    <View style={s.infoItem}>
                      <Text style={s.tituloItem} numberOfLines={1}>{item.titulo}</Text>
                      <Text style={s.estadoItem}>{item.estado}</Text>
                      <View style={[s.chipNivel, { backgroundColor: colorNivel(item.nivel, 0.15) }]}>
                        <Text style={[s.chipNivelTxt, { color: colorNivel(item.nivel) }]}>
                          {item.nivel}
                        </Text>
                      </View>
                    </View>

                    <View style={s.controlesItem}>
                      {index > 0 && (
                        <Pressable style={s.btnMover} onPress={() => moverItem(index, -1)}>
                          <Text style={s.btnMoverTxt}>↑</Text>
                        </Pressable>
                      )}
                      {index < items.length - 1 && (
                        <Pressable style={s.btnMover} onPress={() => moverItem(index, 1)}>
                          <Text style={s.btnMoverTxt}>↓</Text>
                        </Pressable>
                      )}
                      <Pressable style={s.btnEliminar} onPress={() => handleQuitarItem(item.clave)}>
                        <Text style={s.btnEliminarTxt}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </TabChrome>
    );"""
replace_vistadetalle = """    return (
      <VistaDetalleItinerario
        esPC={esPC}
        itinerarioActivo={itinerarioActivo}
        setItinerarioActivo={setItinerarioActivo}
        items={items}
        costoTotal={costoTotal}
        diasTotales={diasTotales}
        nivelTop={nivelTop}
        compartirItinerario={compartirItinerario}
        handleEliminarItinerario={handleEliminarItinerario}
        handleQuitarItem={handleQuitarItem}
        moverItem={moverItem}
        colorNivel={colorNivel}
        imagenDeEstado={imagenDeEstado}
        t={t}
      />
    );"""

# 4. Modals
target_modals_start = "      <Modal visible={modalNuevoVisible}"
target_modals_end = "    </TabChrome>"

idx_start = text.find(target_modals_start)
idx_end = text.find("    </TabChrome>", idx_start)

if idx_start != -1 and idx_end != -1:
    replace_modals = """      <ModalNuevoItinerario
        visible={modalNuevoVisible}
        onClose={() => setModalNuevoVisible(false)}
        nuevoNombre={nuevoNombre}
        setNuevoNombre={setNuevoNombre}
        handleCrearItinerario={handleCrearItinerario}
        t={t}
      />

      <ModalDetalleSugerencia
        visible={modalRutaVisible}
        onClose={() => setModalRutaVisible(false)}
        rutaDetalle={rutaDetalle}
        idioma={idioma}
        t={t}
        colorNivel={colorNivel}
        imagenDeEstado={imagenDeEstado}
        iniciarAgregarSugerida={iniciarAgregarSugerida}
      />

      <ModalAgregarSugerencia
        visible={modalItiVisible}
        onClose={() => setModalItiVisible(false)}
        itinerarios={itinerarios}
        nuevoNombreIti={nuevoNombreIti}
        setNuevoNombreIti={setNuevoNombreIti}
        agregarSugeridaAItinerario={agregarSugeridaAItinerario}
        crearItiYAgregar={crearItiYAgregar}
        t={t}
      />
"""
    text = text[:idx_start] + replace_modals + "\n" + text[idx_end:]
else:
    print("Could not find modals")


text = text.replace(target_imports, replace_imports)
text = text.replace(target_statchip, replace_statchip)
text = text.replace(target_vistadetalle, replace_vistadetalle)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESSFULLY REFACTORED")
