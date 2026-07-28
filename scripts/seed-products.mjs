/**
 * Seed categories + sample products with local public images.
 * Run: node scripts/seed-products.mjs
 * Requires DATABASE_URL in .env.local (or env).
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { randomUUID } from 'crypto';
import pg from 'pg';

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local');
  const env = { ...process.env };
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || env.DIRECT_URL;
if (!databaseUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const baseUrl = (env.NEXT_PUBLIC_APP_URL || 'https://thepricelesspalace.com').replace(/\/+$/, '');

const categories = [
  { name: 'Dresses', slug: 'dresses', position: 1 },
  { name: 'Bags', slug: 'bags', position: 2 },
  { name: 'Slippers', slug: 'slippers', position: 3 },
  { name: 'Wigs', slug: 'wigs', position: 4 },
];

const products = [
  {
    name: 'Royal Blue Midi Dress',
    slug: 'royal-blue-midi-dress',
    category: 'dresses',
    price: 280,
    compare: 350,
    sku: 'TPP-DRS-001',
    qty: 25,
    featured: true,
    short: 'Elegant royal blue midi with soft drape.',
    description: 'A refined royal blue midi dress for dinners, events, and everyday elegance. Comfortable fit with a polished finish.',
    image: 'product-blue-midi-dress.webp',
  },
  {
    name: 'White Satin Evening Gown',
    slug: 'white-satin-evening-gown',
    category: 'dresses',
    price: 420,
    compare: 520,
    sku: 'TPP-DRS-002',
    qty: 12,
    featured: true,
    short: 'Luxurious white satin gown for special nights.',
    description: 'Floor-length white satin evening gown with a clean silhouette. Perfect for weddings, dinners, and formal occasions.',
    image: 'product-white-satin-gown.webp',
  },
  {
    name: 'White Quilted Handbag',
    slug: 'white-quilted-handbag',
    category: 'bags',
    price: 190,
    compare: 240,
    sku: 'TPP-BAG-001',
    qty: 30,
    featured: true,
    short: 'Structured white quilted bag with gold accents.',
    description: 'Compact quilted handbag in crisp white with gold-tone hardware. Everyday luxury that elevates any outfit.',
    image: 'product-white-quilted-bag.webp',
  },
  {
    name: 'Royal Blue Tote Bag',
    slug: 'royal-blue-tote-bag',
    category: 'bags',
    price: 210,
    compare: 260,
    sku: 'TPP-BAG-002',
    qty: 22,
    featured: false,
    short: 'Roomy royal blue tote for work and weekends.',
    description: 'Structured royal blue tote with clean lines and generous capacity. Ideal for workdays and travel.',
    image: 'product-blue-tote-bag.webp',
  },
  {
    name: 'Blue & White Slide Slippers',
    slug: 'blue-white-slide-slippers',
    category: 'slippers',
    price: 95,
    compare: 120,
    sku: 'TPP-SLP-001',
    qty: 40,
    featured: true,
    short: 'Comfortable blue and white slide slippers.',
    description: 'Easy slide slippers in blue and white for home and casual outings. Soft footbed with a clean finish.',
    image: 'product-blue-white-slippers.webp',
  },
  {
    name: 'Pearl White Flat Mules',
    slug: 'pearl-white-flat-mules',
    category: 'slippers',
    price: 110,
    compare: 140,
    sku: 'TPP-SLP-002',
    qty: 28,
    featured: false,
    short: 'Elegant pearl-white flat mules.',
    description: 'Minimal pearl-white mules that pair with dresses and everyday looks. Lightweight and easy to wear.',
    image: 'product-pearl-mules.webp',
  },
  {
    name: 'Black Wave Lace-Front Wig',
    slug: 'black-wave-lace-front-wig',
    category: 'wigs',
    price: 450,
    compare: 550,
    sku: 'TPP-WIG-001',
    qty: 15,
    featured: true,
    short: 'Long wavy black lace-front wig.',
    description: 'Natural-looking black wavy lace-front wig with soft movement and easy styling. Glam and versatile.',
    image: 'product-black-wave-wig.webp',
  },
  {
    name: 'Honey Blonde Straight Wig',
    slug: 'honey-blonde-straight-wig',
    category: 'wigs',
    price: 480,
    compare: 580,
    sku: 'TPP-WIG-002',
    qty: 10,
    featured: true,
    short: 'Straight honey blonde lace-front wig.',
    description: 'Sleek honey blonde straight lace-front wig for a bright, polished look. Soft texture and clean parting.',
    image: 'product-blonde-straight-wig.webp',
  },
];

const pool = new pg.Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const catIds = {};
    for (const c of categories) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, position, status, image_url)
         VALUES ($1, $2, $3, 'active', $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position, status = 'active'
         RETURNING id`,
        [c.name, c.slug, c.position, `${baseUrl}/products/${products.find((p) => p.category === c.slug)?.image || 'product-blue-midi-dress.webp'}`]
      );
      catIds[c.slug] = rows[0].id;
      console.log('category', c.slug, rows[0].id);
    }

    for (const p of products) {
      const id = randomUUID();
      const imageUrl = `${baseUrl}/products/${p.image}`;
      const { rows } = await client.query(
        `INSERT INTO products (
           id, name, slug, description, short_description, price, compare_at_price,
           sku, quantity, track_quantity, category_id, brand, status, featured, tags
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,'The Priceless Palace','active',$11,$12
         )
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           short_description = EXCLUDED.short_description,
           price = EXCLUDED.price,
           compare_at_price = EXCLUDED.compare_at_price,
           quantity = EXCLUDED.quantity,
           category_id = EXCLUDED.category_id,
           featured = EXCLUDED.featured,
           status = 'active',
           updated_at = now()
         RETURNING id`,
        [
          id,
          p.name,
          p.slug,
          p.description,
          p.short,
          p.price,
          p.compare,
          p.sku,
          p.qty,
          catIds[p.category],
          p.featured,
          ['palace', p.category],
        ]
      );
      const productId = rows[0].id;

      await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
      await client.query(
        `INSERT INTO product_images (product_id, url, alt_text, position, media_type)
         VALUES ($1, $2, $3, 0, 'image')`,
        [productId, imageUrl, p.name]
      );
      console.log('product', p.slug, productId);
    }

    // Store settings
    const settings = [
      ['site_name', 'The Priceless Palace'],
      ['site_tagline', 'Dresses, bags, slippers, wigs & more'],
      ['contact_email', 'hello@thepricelesspalace.com'],
      ['contact_phone', '+233 20 178 3800'],
      ['contact_phone_alt', '054 559 8755'],
      ['contact_address', 'Abavana Down, Queenstar Guest House'],
      ['whatsapp_number', '233201783800'],
    ];
    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO store_settings (key, value)
         VALUES ($1, to_jsonb($2::text))
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete. Products:', products.length);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
