const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'logo-icon.png');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const BG_COLOR = '#24D398';

// Android adaptive icon safe zone: content should fit in 66dp circle.
// Foreground is generated at 108dp base and scales per density.
const DENSITIES = {
  mdpi: { launcher: 48, foreground: 108 },
  hdpi: { launcher: 72, foreground: 162 },
  xhdpi: { launcher: 96, foreground: 216 },
  xxhdpi: { launcher: 144, foreground: 324 },
  xxxhdpi: { launcher: 192, foreground: 432 },
};

/**
 * Remove isolated opaque pixels left by thresholding anti-aliased edges.
 */
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
  const THRESHOLD = 230;
  const pixels = Buffer.alloc(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminosity >= THRESHOLD) {
      // Keep the original light pixel fully opaque.
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    } else {
      // Make the green background transparent.
      pixels[i + 3] = 0;
    }
  }

  const cleaned = despeckle(pixels, width, height, 2);
  return sharp(cleaned, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function generateIcon(size, circular = false) {
  // For legacy launchers we keep the app background color with the white
  // graphic centered. This still looks like the original logo but uses the
  // extracted graphic so the edges are clean.
  const logoSize = Math.round(size * 0.58);
  const logo = await extractTransparentLogo(logoSize);

  let canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_COLOR,
    },
  }).png();

  canvas = canvas.composite([{
    input: logo,
    gravity: 'center',
  }]);

  if (circular) {
    const mask = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .composite([{
        input: Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`),
        gravity: 'center',
      }])
      .toBuffer();

    canvas = sharp(await canvas.toBuffer())
      .ensureAlpha()
      .composite([{
        input: mask,
        blend: 'dest-in',
        gravity: 'center',
      }]);
  }

  return canvas.png().toBuffer();
}

async function generateForeground(size) {
  // Adaptive foreground: transparent PNG with the white graphic.
  // Use 66% of the 108dp canvas so it fits safely in any mask shape.
  const logoSize = Math.round(size * 0.66);
  const logo = await extractTransparentLogo(logoSize);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .composite([{
      input: logo,
      gravity: 'center',
    }])
    .toBuffer();
}

async function main() {
  for (const [density, sizes] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    const launcher = await generateIcon(sizes.launcher, false);
    await fs.promises.writeFile(path.join(dir, 'ic_launcher.png'), launcher);

    const round = await generateIcon(sizes.launcher, true);
    await fs.promises.writeFile(path.join(dir, 'ic_launcher_round.png'), round);

    const foreground = await generateForeground(sizes.foreground);
    await fs.promises.writeFile(path.join(dir, 'ic_launcher_foreground.png'), foreground);

    console.log(`Generated ${density} icons`);
  }

  // Background color for adaptive icons
  const bgPath = path.join(RES_DIR, 'values', 'ic_launcher_background.xml');
  fs.mkdirSync(path.dirname(bgPath), { recursive: true });
  await fs.promises.writeFile(bgPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`);

  // Adaptive icon definitions
  const anyDpiDir = path.join(RES_DIR, 'mipmap-anydpi-v26');
  fs.mkdirSync(anyDpiDir, { recursive: true });

  const launcherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;

  await fs.promises.writeFile(path.join(anyDpiDir, 'ic_launcher.xml'), launcherXml);
  await fs.promises.writeFile(path.join(anyDpiDir, 'ic_launcher_round.xml'), launcherXml);

  console.log('Android icons generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
