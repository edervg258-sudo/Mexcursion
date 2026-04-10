import os
import re

files_to_process = [
    r"c:\Users\usuario\MiPrimerApp\app\(tabs)\detalle.tsx",
    r"c:\Users\usuario\MiPrimerApp\components\Rutas\ModalDetalleSugerencia.tsx",
    r"c:\Users\usuario\MiPrimerApp\components\Rutas\VistaDetalleItinerario.tsx"
]

for file_path in files_to_process:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Replace 'Dimensions, Image,' with 'Dimensions,' in detalle
    content = content.replace('Dimensions, Image,', 'Dimensions,')
    # Replace 'Image, StyleSheet,' with 'StyleSheet,' in Modals
    content = content.replace('Image, StyleSheet,', 'StyleSheet,')
    content = content.replace('Image, ScrollView,', 'ScrollView,')
    content = content.replace('Image, View,', 'View,')
    content = content.replace('Image,\n', '\n')
    
    if "from 'expo-image'" not in content:
        content = re.sub(r"(import React.*?;\n)", r"\1import { Image } from 'expo-image';\n", content, count=1)
    
    content = content.replace('resizeMode="cover"', 'contentFit="cover" transition={200}')
    content = content.replace('resizeMode="contain"', 'contentFit="contain"')
    content = content.replace('resizeMode="stretch"', 'contentFit="fill"')

    if original != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"No changes for {file_path}")
