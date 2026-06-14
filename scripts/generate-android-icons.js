const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'logo-icon.png');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const densities = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

const bgColor = '#24D398';

async function generate() {
  for (const d of densities) {
    const outDir = path.join(resDir, d.dir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Launcher icon (square with rounded corners look from source)
    await sharp(source)
      .resize(d.size, d.size, { fit: 'contain', background: bgColor })
      .png()
      .toFile(path.join(outDir, 'ic_launcher.png'));

    // Round launcher icon (same source works inside circular mask)
    await sharp(source)
      .resize(d.size, d.size, { fit: 'contain', background: bgColor })
      .png()
      .toFile(path.join(outDir, 'ic_launcher_round.png'));

    // Adaptive foreground: same source but transparent background
    await sharp(source)
      .resize(d.fgSize, d.fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outDir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${d.dir}: ${d.size}x${d.size} / fg ${d.fgSize}x${d.fgSize}`);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
