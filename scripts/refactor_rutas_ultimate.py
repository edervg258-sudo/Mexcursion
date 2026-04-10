import sys

file_path = r'c:\Users\usuario\MiPrimerApp\app\(tabs)\rutas.tsx'
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Fix CRLF for consistency
text = text.replace("\r\n", "\n")

text = text.replace("import { Tema } from '../../lib/tema';", "import { Tema } from '../../lib/tema';\nimport { ModalNuevoItinerario } from '../../components/Rutas/ModalNuevoItinerario';\nimport { ModalAgregarSugerencia } from '../../components/Rutas/ModalAgregarSugerencia';\nimport { ModalDetalleSugerencia } from '../../components/Rutas/ModalDetalleSugerencia';\nimport { VistaDetalleItinerario } from '../../components/Rutas/VistaDetalleItinerario';\nimport { TabChrome } from '../../components/TabChrome';\nimport { useIdioma } from '../../lib/IdiomaContext';\n")

text = text.replace("  const [claveParaAgregar,  setClaveParaAgregar]  = useState<string | null>(null);", "  const [claveParaAgregar,  setClaveParaAgregar]  = useState<string | null>(null);\n  const { t, idioma } = useIdioma();\n")

# Detail view
detail_view_start = "    return (\n      <Layout titulo={itinerarioActivo.nombre}"
detail_view_end = "      </Layout>\n    );\n  }"

idx1 = text.find(detail_view_start)
idx2 = text.find(detail_view_end, idx1)

if idx1 != -1 and idx2 != -1:
    text = text[:idx1] + """    return (
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
    );
  }""" + text[idx2 + len(detail_view_end):]
elif idx1 == -1:
    print("Could not find detail view start")

# Main wrapper
text = text.replace("<Layout esPC={esPC} estaActiva={estaActiva} navegarPestana={navegarPestana}>", "<TabChrome esPC={esPC} showLogoWhenNoTitle={false}>")
text = text.replace("    </Layout>", "    </TabChrome>")

# Modals
modals_start = "      <Modal visible={modalNuevoVisible}"
modals_end = "    </TabChrome>"

idx_m1 = text.find(modals_start)
idx_m2 = text.rfind(modals_end)

if idx_m1 != -1 and idx_m2 != -1:
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
      />\n"""
    text = text[:idx_m1] + replace_modals + text[idx_m2:]
elif idx_m1 == -1:
    print("Could not find modals start")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("ULTIMATE REFACTOR DONE")
