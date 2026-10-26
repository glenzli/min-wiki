// Run from the repository root: node --import tsx topics/earth/history/assets/build-fields.mjs
// Original numeric material fields. Lossless WebP preserves all four packed data channels.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { createHistoryFieldTextures } from '../journeyGeometry.ts';

for (const size of [1024]) {
  const fields = createHistoryFieldTextures(size === 512, size);
  for (const [kind, texture] of Object.entries(fields)) {
    const { data, width, height } = texture.image;
    const path = fileURLToPath(new URL(`./surface-${kind}-${size}.webp`, import.meta.url));
    await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(path);
    const decoded = await sharp(path).raw().toBuffer();
    if (!decoded.equals(Buffer.from(data))) throw new Error(`Packed channel mismatch: ${path}`);
    texture.dispose();
  }
}
