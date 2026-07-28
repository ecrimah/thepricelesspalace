import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir =
  process.env.BRAND_ASSETS_DIR ||
  path.join(process.env.USERPROFILE || '', '.cursor', 'projects', 'c-Users-hp-OneDrive-Desktop-websites-palace', 'assets');
const pub = path.join(root, 'public');
const iconsDir = path.join(pub, 'icons');

const copies = [
  ['logo.png', 'logo.png'],
  ['logo-white.png', 'logo-white.png'],
  ['og-image.png', 'og-image.png'],
  ['og-image.png', 'twitter-image.png'],
  ['hero-shop.png', 'hero-shop.png'],
  ['hero-wishlist.png', 'hero-wishlist.png'],
  ['hero-categories.png', 'hero-categories.png'],
  ['hero-home-1.png', 'hero-home-1.png'],
  ['hero-home-2.png', 'hero-home-2.png'],
  ['placeholder-product.png', 'placeholder-product.png'],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function copyMainAssets() {
  for (const [from, to] of copies) {
    const src = path.join(srcDir, from);
    const dest = path.join(pub, to);
    if (!fs.existsSync(src)) {
      console.warn(`Skip missing source: ${src}`);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${to}`);
  }
}

async function generateIcons(sourceIcon) {
  ensureDir(iconsDir);
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    const out = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(out);
    console.log(`Icon ${size}x${size}`);
  }

  for (const size of [192, 512]) {
    const canvas = size;
    const iconSize = Math.round(canvas * 0.72);
    const offset = Math.round((canvas - iconSize) / 2);
    const resized = await sharp(sourceIcon).resize(iconSize, iconSize, { fit: 'cover' }).png().toBuffer();
    const out = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
    await sharp({
      create: {
        width: canvas,
        height: canvas,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 },
      },
    })
      .composite([{ input: resized, left: offset, top: offset }])
      .png()
      .toFile(out);
    console.log(`Maskable icon ${size}x${size}`);
  }

  const faviconSizes = [32, 180, 512];
  for (const size of faviconSizes) {
    const name =
      size === 180 ? 'apple-touch-icon.png' : size === 512 ? 'favicon.png' : 'favicon-32.png';
    await sharp(sourceIcon).resize(size, size, { fit: 'cover' }).png().toFile(path.join(pub, name));
    console.log(name);
  }

  fs.copyFileSync(path.join(pub, 'favicon-32.png'), path.join(pub, 'favicon.ico'));
  fs.unlinkSync(path.join(pub, 'favicon-32.png'));
}

async function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`Brand assets folder not found: ${srcDir}`);
    process.exit(1);
  }

  ensureDir(pub);
  await copyMainAssets();

  const iconSrc = path.join(srcDir, 'app-icon.png');
  if (!fs.existsSync(iconSrc)) {
    console.warn('app-icon.png missing; skipping icon generation');
    return;
  }

  await generateIcons(iconSrc);
  console.log('Brand assets deployed to public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
