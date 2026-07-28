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
  'c__Users_hp_AppData_Roaming_Cursor_User_workspaceStorage_f831908087544b2adeebf8747915e6b7_images_WhatsApp_Image_2026-07-28_at_4.45.52_PM-811fc94e-3036-4b11-81cd-9dec810a6742.png'
);

const SOURCE = process.env.TPP_LOGO_SOURCE || defaultSource;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function buildLogoVariants() {
  const logo512 = await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(pub, 'logo.png'), logo512);
  fs.writeFileSync(path.join(pub, 'logo-white.png'), logo512);
  console.log('logo.png + logo-white.png');
  return logo512;
}

async function buildIcons(logoBuffer) {
  ensureDir(iconsDir);
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  }

  for (const size of [192, 512]) {
    const iconSize = Math.round(size * 0.72);
    const offset = Math.round((size - iconSize) / 2);
    const resized = await sharp(logoBuffer)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
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
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(path.join(pub, name));
  }

  fs.copyFileSync(path.join(pub, 'favicon-32.png'), path.join(pub, 'favicon.ico'));
  fs.unlinkSync(path.join(pub, 'favicon-32.png'));
  console.log('favicons + PWA icons');
}

async function buildOgImages(logoBuffer) {
  const logoOnOg = await sharp(logoBuffer)
    .resize(320, 320, { fit: 'contain', background: { r: 20, g: 20, b: 20, alpha: 1 } })
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
      <text x="600" y="500" text-anchor="middle" fill="#60a5fa" font-family="Georgia, serif" font-size="46" font-weight="700">The Priceless Palace</text>
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
  const logoBuffer = await buildLogoVariants();
  await buildIcons(logoBuffer);
  await buildOgImages(logoBuffer);
  console.log('TPP logo deployed across public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
