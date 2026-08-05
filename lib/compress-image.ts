import sharp from 'sharp';

export type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Resize + convert uploads to WebP for smaller storefront payloads.
 * Non-image files are returned unchanged (caller should skip).
 */
export async function compressImageUpload(
  input: Buffer,
  opts?: { maxEdge?: number; quality?: number }
): Promise<CompressedImage | null> {
  const maxEdge = opts?.maxEdge ?? 1600;
  const quality = opts?.quality ?? 78;

  try {
    const pipeline = sharp(input, { failOn: 'none' }).rotate();
    const meta = await pipeline.metadata();
    if (!meta.format || meta.format === 'svg' || meta.format === 'gif') {
      return null;
    }

    const buffer = await pipeline
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer();

    return {
      buffer,
      contentType: 'image/webp',
      extension: 'webp',
    };
  } catch {
    return null;
  }
}
