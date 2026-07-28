-- Point product/category image URLs at optimized WebP assets
UPDATE product_images
SET url = regexp_replace(url, '\.png(\?.*)?$', '.webp\1', 'i')
WHERE url ~* '\.png';

UPDATE categories
SET image_url = regexp_replace(image_url, '\.png(\?.*)?$', '.webp\1', 'i')
WHERE image_url ~* '\.png';

SELECT 'product_images' AS t, count(*) FROM product_images WHERE url ~* '\.webp'
UNION ALL SELECT 'categories', count(*) FROM categories WHERE image_url ~* '\.webp';
