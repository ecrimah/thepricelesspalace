/** Prefer a still image for cards / thumbnails; skip video URLs. */
export function firstCatalogImageUrl(
  images?: Array<{ url?: string | null; position?: number | null }> | null
): string {
  if (!images?.length) return '';
  const sorted = [...images].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );
  const still = sorted.find(
    (img) => img.url && !/\.(mp4|webm|mov)(\?|$)/i.test(img.url)
  );
  return (still?.url || sorted[0]?.url || '').trim();
}

export function isVideoUrl(url?: string | null): boolean {
  return !!url && /\.(mp4|webm|mov)(\?|$)/i.test(url);
}
