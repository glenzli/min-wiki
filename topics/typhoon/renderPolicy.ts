/** Ray marching on a known software GPU needs a smaller backing buffer.
 * CSS size, camera, 112 ray samples, cloud state and control geometry stay intact.
 */
export const SOFTWARE_VOLUME_PIXELS = 128_000;
export function isSoftwareRenderer(description: string) {
  return /swiftshader|llvmpipe|software renderer/i.test(description);
}
export function volumePixelRatio(width: number, height: number, deviceRatio: number, software: boolean) {
  const requested = Math.min(Math.max(Number.isFinite(deviceRatio) ? deviceRatio : 1, .1), 1.5);
  if (!software || width <= 0 || height <= 0) return requested;
  return Math.min(requested, Math.sqrt(SOFTWARE_VOLUME_PIXELS / (width * height)));
}
