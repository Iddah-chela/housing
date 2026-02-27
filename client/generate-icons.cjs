/**
 * Generate PWA icons from favicon.svg
 * Run: node generate-icons.js
 * 
 * Prerequisites: npm install sharp
 * (only needed once to generate the icons, not a runtime dependency)
 */
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, 'public', 'favicon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    const sizes = [192, 512];

    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, 'public', 'icons', `icon-${size}.png`));
      console.log(`Generated icon-${size}.png`);
    }

    console.log('Done! PWA icons generated in public/icons/');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('sharp not found. Install it first:');
      console.log('  npm install sharp --save-dev');
      console.log('Then re-run this script.');
    } else {
      console.error(err);
    }
  }
}

generateIcons();
