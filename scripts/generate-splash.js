const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'logo-icon.png');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const BG_COLOR = '#24D398';

const SPLASHES = [
  { dir: 'drawable', width: 480, height: 320 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
];

const THRESHOLD = 230;

function despeckle(pixels, width, height, iterations = 2) {
  let src = pixels;
  for (let iter = 0; iter < iterations; iter++) {
    const dst = Buffer.from(src);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        if (src[idx + 3] === 0) continue;
        let opaqueNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            if (src[nIdx + 3] > 0) opaqueNeighbors++;
          }
        }
        if (opaqueNeighbors < 2) {
          dst[idx + 3] = 0;
        }
      }
    }
    src = dst;
  }
  return src;
}

/**
 * Extract the white chart graphic from the source logo, removing the green
 * background. Returns a transparent PNG of the requested size.
 */
async function extractTransparentLogo(size) {
  const { data, info } = await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = Buffer.alloc(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminosity >= THRESHOLD) {
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    } else {
      pixels[i + 3] = 0;
    }
  }

  const cleaned = despeckle(pixels, width, height, 2);
  return sharp(cleaned, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function generateSplash(width, height) {
  // Logo size: 20% of the shortest side, capped for small screens
  const minSide = Math.min(width, height);
  const logoSize = Math.round(minSide * 0.32);

  const logo = await extractTransparentLogo(logoSize);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .png()
    .composite([{ input: logo, gravity: 'center' }])
    .toBuffer();
}

async function main() {
  for (const { dir, width, height } of SPLASHES) {
    const outDir = path.join(RES_DIR, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const buffer = await generateSplash(width, height);
    await fs.promises.writeFile(path.join(outDir, 'splash.png'), buffer);
    console.log(`Generated ${dir}/splash.png (${width}x${height})`);
  }
  console.log('Android splash screens generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
