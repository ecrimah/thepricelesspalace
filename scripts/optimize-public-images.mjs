/**
 * Compress public heroes, products, logos, and OG images.
 * Run: npm run images:optimize
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const productsDir = path.join(pub, 'products');
const iconsDir = path.join(pub, 'icons');

async function recompressWebp(inputPath, maxWidth, quality) {
  const before = fs.statSync(inputPath).size;
  // Read into memory first so OneDrive/Windows locks don't block overwrite.
  const input = fs.readFileSync(inputPath);
  const buf = await sharp(input)
    .rotate()
    .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toBuffer();
  if (buf.length < before * 0.98) {
    fs.writeFileSync(inputPath, buf);
    console.log(
      `  ${path.basename(inputPath)}: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
    );
    return before - buf.length;
  }
  console.log(`  ${path.basename(inputPath)}: ${(before / 1024).toFixed(1)}KB (kept)`);
  return 0;
}

async function recompressPng(inputPath, maxWidth, { quality = 80, palette = false } = {}) {
  const before = fs.statSync(inputPath).size;
  const input = fs.readFileSync(inputPath);
  // Avoid palette:true on logos — it can flatten transparent white marks to black.
  const buf = await sharp(input)
    .rotate()
    .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
    .png({
      quality,
      compressionLevel: 9,
      adaptiveFiltering: true,
      ...(palette ? { palette: true } : {}),
    })
    .toBuffer();
  if (buf.length < before * 0.98) {
    fs.writeFileSync(inputPath, buf);
    console.log(
      `  ${path.basename(inputPath)}: ${(before / 1024).toFixed(1)}KB → ${(buf.length / 1024).toFixed(1)}KB`
    );
    return before - buf.length;
  }
  console.log(`  ${path.basename(inputPath)}: ${(before / 1024).toFixed(1)}KB (kept)`);
  return 0;
}

async function main() {
  console.log('Optimizing public images...\n');
  let saved = 0;

  console.log('Hero WebP (max 1600px, q72):');
  for (const f of fs.readdirSync(pub).filter((n) => /^hero-.*\.webp$/i.test(n))) {
    saved += await recompressWebp(path.join(pub, f), 1600, 72);
  }

  if (fs.existsSync(productsDir)) {
    console.log('\nProduct WebP (max 900px, q75):');
    for (const f of fs.readdirSync(productsDir).filter((n) => /\.webp$/i.test(n))) {
      saved += await recompressWebp(path.join(productsDir, f), 900, 75);
    }
  }

  console.log('\nLogos / favicons (PNG, no palette):');
  for (const name of ['logo.png', 'logo-white.png', 'favicon.png', 'apple-touch-icon.png']) {
    const p = path.join(pub, name);
    if (fs.existsSync(p)) saved += await recompressPng(p, 512, { quality: 80, palette: false });
  }

  console.log('\nOG / Twitter (PNG):');
  for (const name of ['og-image.png', 'twitter-image.png']) {
    const p = path.join(pub, name);
    if (fs.existsSync(p)) saved += await recompressPng(p, 1200, { quality: 80, palette: false });
  }

  if (fs.existsSync(iconsDir)) {
    console.log('\nPWA icons (PNG, no palette):');
    for (const f of fs.readdirSync(iconsDir).filter((n) => /\.png$/i.test(n))) {
      saved += await recompressPng(path.join(iconsDir, f), 512, { quality: 80, palette: false });
    }
  }

  console.log(`\nDone. Saved ~${(saved / 1024).toFixed(0)} KB on disk.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
