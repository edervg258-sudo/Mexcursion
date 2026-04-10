import sys

file_path = r'c:\Users\usuario\MiPrimerApp\app\(tabs)\rutas.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

idx_tema = next(i for i, line in enumerate(lines) if "import { Tema } from '../../lib/tema';" in line)
idx_boton = next(i for i, line in enumerate(lines) if "const botonNotificaciones =" in line)
idx_principal = next(i for i, line in enumerate(lines) if "VISTA PRINCIPAL:" in line)
idx_modal = next(i for i, line in enumerate(lines) if "<Modal visible={modalNuevoVisible}" in line)
idx_tabchrome_end = len(lines) - 1 - next(i for i, line in enumerate(reversed(lines)) if "</TabChrome>" in line)

# 1. Modals
lines_modals = [
"      <ModalNuevoItinerario\n",
"        visible={modalNuevoVisible}\n",
"        onClose={() => setModalNuevoVisible(false)}\n",
"        nuevoNombre={nuevoNombre}\n",
"        setNuevoNombre={setNuevoNombre}\n",
"        handleCrearItinerario={handleCrearItinerario}\n",
"        t={t}\n",
"      />\n\n",
"      <ModalDetalleSugerencia\n",
"        visible={modalRutaVisible}\n",
"        onClose={() => setModalRutaVisible(false)}\n",
"        rutaDetalle={rutaDetalle}\n",
"        idioma={idioma}\n",
"        t={t}\n",
"        colorNivel={colorNivel}\n",
"        imagenDeEstado={imagenDeEstado}\n",
"        iniciarAgregarSugerida={iniciarAgregarSugerida}\n",
"      />\n\n",
"      <ModalAgregarSugerencia\n",
"        visible={modalItiVisible}\n",
"        onClose={() => setModalItiVisible(false)}\n",
"        itinerarios={itinerarios}\n",
"        nuevoNombreIti={nuevoNombreIti}\n",
"        setNuevoNombreIti={setNuevoNombreIti}\n",
"        agregarSugeridaAItinerario={agregarSugeridaAItinerario}\n",
"        crearItiYAgregar={crearItiYAgregar}\n",
"        t={t}\n",
"      />\n"
]
lines[idx_modal:idx_tabchrome_end] = lines_modals

# 2. Vista Detalle
lines_vista = [
"    return (\n",
"      <VistaDetalleItinerario\n",
"        esPC={esPC}\n",
"        itinerarioActivo={itinerarioActivo}\n",
"        setItinerarioActivo={setItinerarioActivo}\n",
"        items={items}\n",
"        costoTotal={costoTotal}\n",
"        diasTotales={diasTotales}\n",
"        nivelTop={nivelTop}\n",
"        compartirItinerario={compartirItinerario}\n",
"        handleEliminarItinerario={handleEliminarItinerario}\n",
"        handleQuitarItem={handleQuitarItem}\n",
"        moverItem={moverItem}\n",
"        colorNivel={colorNivel}\n",
"        imagenDeEstado={imagenDeEstado}\n",
"        t={t}\n",
"      />\n",
"    );\n",
"  }\n\n"
]
lines[idx_boton:idx_principal - 1] = lines_vista

# 3. Imports
lines_imports = [
"import { Tema } from '../../lib/tema';\n",
"import { ModalNuevoItinerario } from '../../components/Rutas/ModalNuevoItinerario';\n",
"import { ModalAgregarSugerencia } from '../../components/Rutas/ModalAgregarSugerencia';\n",
"import { ModalDetalleSugerencia } from '../../components/Rutas/ModalDetalleSugerencia';\n",
"import { VistaDetalleItinerario } from '../../components/Rutas/VistaDetalleItinerario';\n"
]
lines[idx_tema:idx_tema+1] = lines_imports

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("SUCCESS")
