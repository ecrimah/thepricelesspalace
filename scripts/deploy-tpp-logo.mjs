import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const iconsDir = path.join(pub, 'icons');

const defaultSource = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-hp-OneDrive-Desktop-websites-palace',
  'assets',
  'c__Users_hp_AppData_Roaming_Cursor_User_workspaceStorage_f831908087544b2adeebf8747915e6b7_images_ChatGPT_Image_Jul_28__2026__07_33_40_PM-4f4ca4e3-931b-45a8-8fc3-db575f731d08.png'
);

const SOURCE = process.env.TPP_LOGO_SOURCE || defaultSource;

/** Brand blue for light backgrounds (header, admin card). */
const BRAND_RGB = { r: 30, g: 64, b: 175 }; // #1e40af

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Turn black/near-black pixels transparent; optional recolor for light-bg variant. */
async function logoFromSource(recolor) {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Remove dark background (black square)
    if (lum < 45) {
      out[idx + 3] = 0;
      continue;
    }

    // Soft edge: semi-transparent near threshold
    if (lum < 80) {
      out[idx + 3] = Math.round(((lum - 45) / 35) * 255);
    }

    if (recolor) {
      out[idx] = BRAND_RGB.r;
      out[idx + 1] = BRAND_RGB.g;
      out[idx + 2] = BRAND_RGB.b;
    } else {
      // Keep white letterforms on transparent
      out[idx] = 255;
      out[idx + 1] = 255;
      out[idx + 2] = 255;
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function buildLogoVariants() {
  const logoWhite = await logoFromSource(false);
  const logoDark = await logoFromSource(true);

  fs.writeFileSync(path.join(pub, 'logo-white.png'), logoWhite);
  fs.writeFileSync(path.join(pub, 'logo.png'), logoDark);
  console.log('logo.png (blue, transparent) + logo-white.png (white, transparent)');
  return { logoWhite, logoDark };
}

async function buildIcons(logoBuffer, bg) {
  ensureDir(iconsDir);
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'contain', background: bg })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  }

  for (const size of [192, 512]) {
    const iconSize = Math.round(size * 0.72);
    const offset = Math.round((size - iconSize) / 2);
    const resized = await sharp(logoBuffer)
      .resize(iconSize, iconSize, { fit: 'contain', background: bg })
      .png()
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: resized, left: offset, top: offset }])
      .png()
      .toFile(path.join(iconsDir, `icon-maskable-${size}x${size}.png`));
  }

  for (const [size, name] of [
    [32, 'favicon-32.png'],
    [180, 'apple-touch-icon.png'],
    [512, 'favicon.png'],
  ]) {
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'contain', background: bg })
      .png()
      .toFile(path.join(pub, name));
  }

  fs.copyFileSync(path.join(pub, 'favicon-32.png'), path.join(pub, 'favicon.ico'));
  fs.unlinkSync(path.join(pub, 'favicon-32.png'));
  console.log('favicons + PWA icons');
}

async function buildOgImages(logoWhite) {
  const logoOnOg = await sharp(logoWhite)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="20%" cy="20%" r="70%">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#1e40af" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="#1e40af"/>
      <rect width="1200" height="630" fill="url(#g)"/>
      <text x="600" y="548" text-anchor="middle" fill="#ffffff" fill-opacity="0.72" font-family="Arial, sans-serif" font-size="22">Dresses, bags, slippers, wigs &amp; more</text>
    </svg>
  `;

  const base = sharp(Buffer.from(svg)).png();
  const og = await base
    .composite([{ input: logoOnOg, top: 118, left: 440 }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(pub, 'og-image.png'), og);
  fs.writeFileSync(path.join(pub, 'twitter-image.png'), og);
  console.log('og-image.png + twitter-image.png');
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`TPP logo not found: ${SOURCE}`);
    process.exit(1);
  }

  ensureDir(pub);
  const { logoWhite, logoDark } = await buildLogoVariants();
  const iconBg = { r: 30, g: 64, b: 175, alpha: 1 };
  await buildIcons(logoDark, iconBg);
  await buildOgImages(logoWhite);
  console.log('TPP logo deployed (background removed) across public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
