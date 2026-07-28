BEGIN;

INSERT INTO categories (name, slug, position, status, image_url) VALUES
  ('Dresses', 'dresses', 1, 'active', 'https://thepricelesspalace.com/products/product-blue-midi-dress.png'),
  ('Bags', 'bags', 2, 'active', 'https://thepricelesspalace.com/products/product-white-quilted-bag.png'),
  ('Slippers', 'slippers', 3, 'active', 'https://thepricelesspalace.com/products/product-blue-white-slippers.png'),
  ('Wigs', 'wigs', 4, 'active', 'https://thepricelesspalace.com/products/product-black-wave-wig.png')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position, status = 'active', image_url = EXCLUDED.image_url;

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Royal Blue Midi Dress', 'royal-blue-midi-dress',
  'A refined royal blue midi dress for dinners, events, and everyday elegance.',
  'Elegant royal blue midi with soft drape.', 280, 350, 'TPP-DRS-001', 25, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','dresses']
FROM categories WHERE slug = 'dresses'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'White Satin Evening Gown', 'white-satin-evening-gown',
  'Floor-length white satin evening gown with a clean silhouette.',
  'Luxurious white satin gown for special nights.', 420, 520, 'TPP-DRS-002', 12, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','dresses']
FROM categories WHERE slug = 'dresses'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'White Quilted Handbag', 'white-quilted-handbag',
  'Compact quilted handbag in crisp white with gold-tone hardware.',
  'Structured white quilted bag with gold accents.', 190, 240, 'TPP-BAG-001', 30, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','bags']
FROM categories WHERE slug = 'bags'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Royal Blue Tote Bag', 'royal-blue-tote-bag',
  'Structured royal blue tote with clean lines and generous capacity.',
  'Roomy royal blue tote for work and weekends.', 210, 260, 'TPP-BAG-002', 22, true, id, 'The Priceless Palace', 'active', false, ARRAY['palace','bags']
FROM categories WHERE slug = 'bags'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Blue & White Slide Slippers', 'blue-white-slide-slippers',
  'Easy slide slippers in blue and white for home and casual outings.',
  'Comfortable blue and white slide slippers.', 95, 120, 'TPP-SLP-001', 40, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','slippers']
FROM categories WHERE slug = 'slippers'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Pearl White Flat Mules', 'pearl-white-flat-mules',
  'Minimal pearl-white mules that pair with dresses and everyday looks.',
  'Elegant pearl-white flat mules.', 110, 140, 'TPP-SLP-002', 28, true, id, 'The Priceless Palace', 'active', false, ARRAY['palace','slippers']
FROM categories WHERE slug = 'slippers'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Black Wave Lace-Front Wig', 'black-wave-lace-front-wig',
  'Natural-looking black wavy lace-front wig with soft movement.',
  'Long wavy black lace-front wig.', 450, 550, 'TPP-WIG-001', 15, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','wigs']
FROM categories WHERE slug = 'wigs'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

INSERT INTO products (name, slug, description, short_description, price, compare_at_price, sku, quantity, track_quantity, category_id, brand, status, featured, tags)
SELECT 'Honey Blonde Straight Wig', 'honey-blonde-straight-wig',
  'Sleek honey blonde straight lace-front wig for a bright, polished look.',
  'Straight honey blonde lace-front wig.', 480, 580, 'TPP-WIG-002', 10, true, id, 'The Priceless Palace', 'active', true, ARRAY['palace','wigs']
FROM categories WHERE slug = 'wigs'
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, quantity = EXCLUDED.quantity, featured = EXCLUDED.featured, status = 'active', category_id = EXCLUDED.category_id, updated_at = now();

DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'TPP-%');

INSERT INTO product_images (product_id, url, alt_text, position, media_type)
SELECT p.id,
  'https://thepricelesspalace.com/products/' || CASE p.slug
    WHEN 'royal-blue-midi-dress' THEN 'product-blue-midi-dress.png'
    WHEN 'white-satin-evening-gown' THEN 'product-white-satin-gown.png'
    WHEN 'white-quilted-handbag' THEN 'product-white-quilted-bag.png'
    WHEN 'royal-blue-tote-bag' THEN 'product-blue-tote-bag.png'
    WHEN 'blue-white-slide-slippers' THEN 'product-blue-white-slippers.png'
    WHEN 'pearl-white-flat-mules' THEN 'product-pearl-mules.png'
    WHEN 'black-wave-lace-front-wig' THEN 'product-black-wave-wig.png'
    WHEN 'honey-blonde-straight-wig' THEN 'product-blonde-straight-wig.png'
  END,
  p.name, 0, 'image'
FROM products p
WHERE p.sku LIKE 'TPP-%';

INSERT INTO store_settings (key, value) VALUES
  ('site_name', to_jsonb('The Priceless Palace'::text)),
  ('site_tagline', to_jsonb('Dresses, bags, slippers, wigs & more'::text)),
  ('contact_email', to_jsonb('hello@thepricelesspalace.com'::text)),
  ('contact_phone', to_jsonb('+233 20 178 3800'::text)),
  ('contact_phone_alt', to_jsonb('054 559 8755'::text)),
  ('contact_address', to_jsonb('Abavana Down, Queenstar Guest House'::text)),
  ('whatsapp_number', to_jsonb('233201783800'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Admin: admin@palace.com / admin123
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  'a1111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@palace.com',
  '$2b$10$RBGa9n9y1tjLy2fg4HZ0v.Lq6T3Mzhnc3QLjwhyhgtrsgTZ4Rt64m',
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
  updated_at = now();

INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
  'a1111111-1111-4111-8111-111111111111',
  'admin@palace.com',
  'admin',
  'Admin',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, updated_at = now();

COMMIT;

SELECT 'categories' AS t, count(*)::int FROM categories
UNION ALL SELECT 'products', count(*)::int FROM products
UNION ALL SELECT 'product_images', count(*)::int FROM product_images
UNION ALL SELECT 'admins', count(*)::int FROM profiles WHERE role = 'admin';
