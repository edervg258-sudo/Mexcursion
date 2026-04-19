#!/usr/bin/env node
const sharp = require('sharp');
const path = require('path');

const sourceImage = path.join(__dirname, '../assets/images/logo.png');
const outDir = path.join(__dirname, '../assets/images');

const brandColor = { r: 58, g: 183, b: 165 }; // #3AB7A5

(async () => {
  try {
    console.log('Generating Android Adaptive Icons...\n');

    // Foreground — logo con padding transparente (logo ocupa 2/3, resto vacío)
    // Tamaño del logo dentro: 683x683 (2/3 de 1024), padding: ~170 en cada lado
    console.log('  → android-icon-foreground.png');
    await sharp(sourceImage)
      .resize(683, 683, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 170,
        bottom: 171,
        left: 170,
        right: 171,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outDir, 'android-icon-foreground.png'));

    // Background — color sólido (tu color de marca #3AB7A5)
    console.log('  → android-icon-background.png');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: brandColor
      }
    })
      .png()
      .toFile(path.join(outDir, 'android-icon-background.png'));

    // Monochrome — logo en blanco (Android lo colorea según el tema)
    // Convierte a escala de grises, niega (para que el logo sea blanco), y aplica padding
    console.log('  → android-icon-monochrome.png');
    await sharp(sourceImage)
      .grayscale()
      .negate()
      .resize(683, 683, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 170,
        bottom: 171,
        left: 170,
        right: 171,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outDir, 'android-icon-monochrome.png'));

    console.log('\n✓ All Android Adaptive Icons generated successfully!');
  } catch (err) {
    console.error('✗ Error generating icons:', err.message);
    process.exit(1);
  }
})();
