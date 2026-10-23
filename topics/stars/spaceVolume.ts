import { spaceRandom, type SpaceFrame } from './spaceModel.ts';
import type { NebulaMedium } from '../../src/visuals/nebulaPortrait.ts';

export const SPACE_VOLUME_RESOLUTION = 48;
export const SPACE_VOLUME_EXTENT = 4.3;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

/** Authored enhanced-colour coordinate, not a spectral or ionization model.
 * Coherent regions remain recognisable after splatting neighbouring parcels;
 * independent random parcel colours would average into one grey-pink cloud.
 * Canvas uses the same coordinate as the retained three-dimensional medium. */
export function stellarMediumColour(frame: SpaceFrame, x: number, y: number, z: number): number {
  const fold = Math.sin(x * 1.6 + Math.sin(z * 2.1) * .65 + y * .9);
  if (frame.shellBlend > .001) {
    const radius = Math.max(.01, frame.shellRadius);
    const r = Math.hypot(x, y / frame.shellFlattening, z) / radius;
    if (frame.kind === 'planetary') return clamp(smooth(.87, 1.01, r) + .12 * fold);
    const angular = Math.sin(x / radius * 3.3 + z / radius * 2.5 + .7 * Math.sin(y / radius * 4.1));
    return clamp(smooth(-.7, .7, angular) * .82 + .16 * smooth(.90, 1.04, r));
  }
  const distance = Math.hypot(x - 1.8, y - .3, z * .9);
  return clamp(smooth(.65, 3.1, distance) + .10 * fold);
}

/** Dust stays attached to the same numbered parcels as the cloud contracts. */
export function stellarMediumDust(shell: boolean, parcel: number): number {
  return shell ? .025 : .09 + .70 * Math.exp(-(((spaceRandom(parcel + 1) - .48) / .13) ** 2) - ((spaceRandom(parcel + 734) - .65) / .19) ** 2);
}

/** Presentation density only. The topic's numbered parcels remain the geometry
 * owner; this splats those exact positions into one retained gas/dust volume.
 * No lighting choice, camera or surface clock enters the reconstruction. */
export class StellarMedium {
  readonly medium: NebulaMedium = { resolution: SPACE_VOLUME_RESOLUTION, data: new Uint8Array(SPACE_VOLUME_RESOLUTION ** 3 * 4) };
  private accumulation = new Float32Array(SPACE_VOLUME_RESOLUTION ** 3 * 4);
  private weights = new Float64Array(15);

  update(frame: SpaceFrame, positions: Float32Array, alpha: Float32Array) {
    const size = this.medium.resolution, accumulation = this.accumulation, weights = this.weights;
    accumulation.fill(0);
    const shell = frame.shellOpacity > .001, step = 2 * SPACE_VOLUME_EXTENT / (size - 1);
    const sigma = shell ? .155 : .235;
    for (let parcel = 0; parcel < alpha.length; parcel++) {
      const density = alpha[parcel]!;
      if (density <= .0001) continue;
      const x = positions[parcel * 3]!, y = positions[parcel * 3 + 1]!, z = positions[parcel * 3 + 2]!;
      const gx = (x / SPACE_VOLUME_EXTENT + 1) * .5 * (size - 1), gy = (y / SPACE_VOLUME_EXTENT + 1) * .5 * (size - 1), gz = (z / SPACE_VOLUME_EXTENT + 1) * .5 * (size - 1);
      const ix = Math.round(gx), iy = Math.round(gy), iz = Math.round(gz);
      for (let offset = -2; offset <= 2; offset++) {
        weights[offset + 2] = Math.exp(-(((ix + offset - gx) * step / sigma) ** 2));
        weights[offset + 7] = Math.exp(-(((iy + offset - gy) * step / sigma) ** 2));
        weights[offset + 12] = Math.exp(-(((iz + offset - gz) * step / sigma) ** 2));
      }
      const uneven = .52 + .48 * spaceRandom(parcel + 1703);
      const sourceDistance = ((x - 1.8) ** 2 + (y - .3) ** 2 + z * z) / 12;
      const illuminated = shell ? .8 + .2 * uneven : .34 + .66 * Math.exp(-sourceDistance);
      // Dust is a separate channel, with dense foreground strands and a faint
      // diffuse component. Its identity follows the same parcel into the disk.
      const dustParcel = stellarMediumDust(shell, parcel);
      const colour = stellarMediumColour(frame, x, y, z);
      const amount = density * uneven * (shell ? .26 : .20);
      for (let oz = -2; oz <= 2; oz++) {
        const vz = iz + oz; if (vz < 1 || vz >= size - 1) continue;
        for (let oy = -2; oy <= 2; oy++) {
          const vy = iy + oy; if (vy < 1 || vy >= size - 1) continue;
          const yz = weights[oz + 12]! * weights[oy + 7]! * amount;
          for (let ox = -2; ox <= 2; ox++) {
            const vx = ix + ox; if (vx < 1 || vx >= size - 1) continue;
            const contribution = yz * weights[ox + 2]!, index = ((vz * size + vy) * size + vx) * 4;
            accumulation[index] += contribution;
            accumulation[index + 1] += contribution * illuminated;
            accumulation[index + 2] += contribution * dustParcel;
            accumulation[index + 3] += contribution * colour;
          }
        }
      }
    }
    const data = this.medium.data;
    for (let index = 0; index < data.length; index += 4) {
      const density = accumulation[index]!;
      data[index] = Math.round(Math.min(1, density) * 255);
      data[index + 1] = Math.round(Math.min(1, accumulation[index + 1]!) * 255);
      data[index + 2] = Math.round(Math.min(1, accumulation[index + 2]!) * 255);
      // Neighbouring parcels carry a coherent display coordinate; weighted
      // reconstruction preserves connected regions through their overlap.
      data[index + 3] = density > .002 ? Math.round(accumulation[index + 3]! / density * 255) : 0;
    }
  }
}
