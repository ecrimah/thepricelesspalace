import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function png(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const pub = 'public';
fs.mkdirSync(path.join(pub, 'icons'), { recursive: true });

const dark = png(512, 512, 26, 26, 26);
const light = png(512, 512, 245, 245, 245);
const accent = png(512, 512, 37, 99, 235);
const og = png(1200, 630, 26, 26, 26);

fs.writeFileSync(path.join(pub, 'logo.png'), dark);
fs.writeFileSync(path.join(pub, 'logo-white.png'), light);
fs.writeFileSync(path.join(pub, 'favicon.png'), accent);
fs.writeFileSync(path.join(pub, 'favicon.ico'), accent);
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), accent);
fs.writeFileSync(path.join(pub, 'og-image.png'), og);
fs.writeFileSync(path.join(pub, 'twitter-image.png'), og);

for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
  fs.writeFileSync(path.join(pub, 'icons', `icon-${s}x${s}.png`), png(s, s, 37, 99, 235));
}
fs.writeFileSync(path.join(pub, 'icons', 'icon-maskable-192x192.png'), png(192, 192, 37, 99, 235));
fs.writeFileSync(path.join(pub, 'icons', 'icon-maskable-512x512.png'), png(512, 512, 37, 99, 235));

console.log('Neutral placeholder assets written to public/');
