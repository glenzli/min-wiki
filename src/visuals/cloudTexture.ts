/** Content-free cloud texture. Topic scenes supply silhouettes, color and opacity.
 * Generated once per scene; no weather state, animation loop or global cache. */
export type CloudLobe = readonly [x: number, y: number, radiusX: number, radiusY: number];
export interface CloudTextureOptions {
  bounds: readonly [x: number, y: number, width: number, height: number];
  lobes: readonly CloudLobe[];
  seed?: number;
  light?: readonly [number, number, number];
  shade?: readonly [number, number, number];
}
export function createCloudTexture({bounds, lobes, seed = 1, light = [251, 249, 232], shade = [105, 132, 153]}: CloudTextureOptions) {
  const [left, top, width, height] = bounds;
  // Bound memory and initialization even if an owner passes a large scene.
  const scale = Math.min(1.35, Math.sqrt(600_000 / (width * height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(canvas.width, canvas.height);
  const grid = new Float32Array(128 * 128);
  let state = seed >>> 0 || 1;
  for (let i = 0; i < grid.length; i++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    grid[i] = (state >>> 0) / 0xffffffff;
  }
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const sample = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), u = smooth(x - ix), v = smooth(y - iy);
    const a = grid[(iy & 127) * 128 + (ix & 127)], b = grid[(iy & 127) * 128 + ((ix + 1) & 127)];
    const d = grid[((iy + 1) & 127) * 128 + (ix & 127)], e = grid[((iy + 1) & 127) * 128 + ((ix + 1) & 127)];
    return (a + (b - a) * u) * (1 - v) + (d + (e - d) * u) * v;
  };
  const density = (x: number, y: number) => sample(x * .026, y * .026) * .57 + sample(x * .067 + 21, y * .067) * .28
    + sample(x * .16, y * .16 + 42) * .11 + sample(x * .39 + 71, y * .39) * .04;
  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const x = left + px / scale, y = top + py / scale;
    let field = -1e3;
    for (const [cx, cy, rx, ry] of lobes) {
      const d = (1 - Math.hypot((x - cx) / rx, (y - cy) / ry)) * Math.min(rx, ry);
      // Soft union avoids seams between the owner-supplied cloud masses.
      const blend = Math.max(0, 1 - Math.abs(field - d) / 9);
      field = Math.max(field, d) + blend * blend * 2.25;
    }
    if (field < -16) continue;
    const n = density(x, y), fine = sample(x * .34 + 17, y * .34 + 51);
    field += (n - .5) * 34 + (fine - .5) * 3;
    const opacity = smooth(Math.max(0, Math.min(1, (field + 3) / 8)));
    if (!opacity) continue;
    const vertical = Math.max(0, Math.min(1, 1 - (y - top) / height));
    const relief = (n - density(x - 5, y - 8)) * .72;
    const brightness = Math.max(0, Math.min(1, vertical * .95 + .02 + (n - .5) * .2 + relief));
    const offset = (py * canvas.width + px) * 4;
    for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] = shade[channel] + (light[channel] - shade[channel]) * brightness;
    pixels.data[offset + 3] = opacity * 255;
  }
  context.putImageData(pixels, 0, 0);
  return {canvas, x: left, y: top, width, height};
}
