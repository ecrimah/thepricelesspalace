/**
 * Compress public heroes + product PNGs to WebP and remove bloated originals.
 * Run: npm run images:optimize
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const productsDir = path.join(pub, 'products');

async function toWebp(inputPath, outputPath, maxWidth, quality) {
  const before = fs.statSync(inputPath).size;
  await sharp(inputPath)
    .rotate()
    .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);
  const after = fs.statSync(outputPath).size;
  const name = path.basename(outputPath);
  console.log(`  ${name}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
  return { before, after };
}

async function optimizeGlob(globDir, pattern, maxWidth, quality) {
  if (!fs.existsSync(globDir)) return;
  const files = fs.readdirSync(globDir).filter((f) => pattern.test(f));
  let saved = 0;
  for (const file of files) {
    const input = path.join(globDir, file);
    const base = file.replace(/\.(png|jpe?g)$/i, '');
    const output = path.join(globDir, `${base}.webp`);
    const { before, after } = await toWebp(input, output, maxWidth, quality);
    saved += before - after;
    if (/\.png$/i.test(file)) fs.unlinkSync(input);
  }
  return saved;
}

async function optimizeHeroes() {
  console.log('Hero images → WebP (max 1600px):');
  const files = fs.readdirSync(pub).filter((f) => /^hero-.*\.(png|jpe?g)$/i.test(f));
  let saved = 0;
  for (const file of files) {
    const input = path.join(pub, file);
    const base = file.replace(/\.(png|jpe?g)$/i, '');
    const output = path.join(pub, `${base}.webp`);
    const { before, after } = await toWebp(input, output, 1600, 82);
    saved += before - after;
    fs.unlinkSync(input);
  }
  return saved;
}

async function optimizePlaceholder() {
  const input = path.join(pub, 'placeholder-product.png');
  if (!fs.existsSync(input)) return 0;
  console.log('Placeholder product:');
  const output = path.join(pub, 'placeholder-product.webp');
  const { before, after } = await toWebp(input, output, 800, 80);
  fs.unlinkSync(input);
  return before - after;
}

async function main() {
  console.log('Optimizing public images...\n');
  let totalSaved = 0;
  totalSaved += (await optimizeHeroes()) || 0;
  console.log('\nProduct images → WebP (max 900px):');
  totalSaved += (await optimizeGlob(productsDir, /\.(png|jpe?g)$/i, 900, 80)) || 0;
  totalSaved += await optimizePlaceholder();
  console.log(`\nDone. Saved ~${(totalSaved / 1024 / 1024).toFixed(1)} MB total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
