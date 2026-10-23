import {
  createPhotosphereField, samplePhotosphere, stellarDisplayEmission, stellarProfileSettings, stellarSpotDirections, stellarSurfacePalette,
  type PhotosphereField, type StellarProfile,
} from '../../src/visuals/stellarPortrait.ts';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (a: number, b: number, value: number) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
const display = (value: number) => 255 * (value <= .0031308 ? value * 12.92 : 1.055 * Math.max(0, value) ** (1 / 2.4) - .055);
const MAX_MAPS = 12;

/** Canvas projects the shared spherical field, palette and morphology settings.
 * The topic owns cadence and its bounded LRU; no scientific clock lives here. */
export class StellarSurface {
  private maps = new Map<string, { canvas: HTMLCanvasElement; image: ImageData; phase: number }>();
  private fields = new Map<number, PhotosphereField>();
  private sample = new Float64Array(3);

  draw(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, time = 0,
    limbVariation = 0, activeRegion = 0, suppliedProfile: StellarProfile | 'photosphere' = 'photosphere', emission = 1, glare = 1) {
    if (r < .8) {
      c.strokeStyle = color; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.stroke(); return;
    }
    const profile = suppliedProfile === 'photosphere' ? 'solar' : suppliedProfile;
    const settings = stellarProfileSettings(profile), palette = stellarSurfacePalette(color, profile);
    const compact = profile === 'compact', size = r < 45 ? 64 : 256;
    const uneven = compact ? 0 : Math.round(Math.max(0, Math.min(.02, limbVariation)) * 200) / 200;
    const spots = clamp(activeRegion) * settings.activity;
    const radiance = Math.round(clamp(Number.isFinite(emission) ? emission : 1) * 128) / 128;
    const displayRadiance = stellarDisplayEmission(radiance, profile);
    const key = `${color}:${size}:${uneven}:${spots}:${profile}:${radiance}`;
    let map = this.maps.get(key);
    if (!map) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      map = { canvas, image: canvas.getContext('2d')!.createImageData(size, size), phase: NaN };
      if (this.maps.size >= MAX_MAPS) {
        const oldest = this.maps.entries().next().value!;
        oldest[1].canvas.width = oldest[1].canvas.height = 0; this.maps.delete(oldest[0]);
      }
    } else this.maps.delete(key);
    this.maps.set(key, map);
    const phase = compact ? 0 : Math.floor((Number.isFinite(time) ? time : 0) * 8) / 8;
    if (map.phase !== phase) {
      map.phase = phase;
      const pixels = map.image.data, angle = phase * .055, cos = Math.cos(angle), sin = Math.sin(angle);
      const cool = palette.cool.toArray(), hot = palette.hot.toArray(), directions = stellarSpotDirections(profile);
      const seed = profile === 'red-dwarf' ? 77149 : 11293;
      if (!compact && !this.fields.has(seed)) this.fields.set(seed, createPhotosphereField(seed));
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const screenX = (px + .5) * 2 / size - 1, screenY = (py + .5) * 2 / size - 1;
        const theta = Math.atan2(screenY, screenX);
        const contour = .68 * Math.sin(4 * theta + phase * .018) + .32 * Math.sin(7 * theta - 1.4 - phase * .012);
        const edge = 1 - uneven * (.35 - .35 * contour), nx = screenX / edge, ny = -screenY / edge;
        const rr = nx * nx + ny * ny, index = (py * size + px) * 4;
        if (rr >= 1) { pixels[index + 3] = 0; continue; }
        const nz = Math.sqrt(1 - rr), sx = nx * cos + nz * sin, sz = nz * cos - nx * sin;
        let heat: number, brightness: number;
        if (compact) {
          heat = .30 + .70 * nz ** .42;
          brightness = 1 - settings.limb * (1 - nz ** .58);
        } else {
          samplePhotosphere(this.fields.get(seed)!, sx, ny, sz, this.sample, settings.granuleScale, phase);
          const grain = this.sample[0]!, broad = this.sample[1]!, fine = this.sample[2]!;
          heat = smooth(.24, .80, grain);
          brightness = (1.025 + settings.contrast * (heat - .5) + (fine - .5) * .035) * (.97 + .06 * broad);
          if (spots) {
            let penumbra = 0, umbra = 0, surround = 0;
            directions.forEach(([dx, dy, dz, radius], spotIndex) => {
              const ax = sx - dx, ay = ny - dy, az = sz - dz, a = Math.atan2(ay, ax + az * .37);
              const aspect = 1 + .18 * Math.sin(spotIndex * 2.3);
              const warp = .94 + .10 * Math.sin(a * 5 + spotIndex * 1.7) + .065 * Math.sin(a * 9 - spotIndex * 2.1)
                + .12 * (broad - .5) + .08 * (fine - .5);
              const distance = Math.hypot(ax * aspect, ay / aspect, az) / Math.max(radius, .00001) / warp;
              penumbra = Math.max(penumbra, (1 - smooth(.44, 1.28, distance)) * (.96 + .04 * Math.sin(a * 24 + distance * 18)));
              umbra = Math.max(umbra, 1 - smooth(.14, .59, distance));
              surround = Math.max(surround, 1 - smooth(1, 2.5, distance));
            });
            brightness *= 1 - spots * (.31 * penumbra + .53 * umbra);
            brightness += spots * Math.max(0, surround - penumbra) * (1 - nz) ** 1.7 * (.15 + .12 * fine);
          }
          brightness *= 1 - settings.limb * (1 - nz ** .63);
        }
        for (let channel = 0; channel < 3; channel++) {
          pixels[index + channel] = display((cool[channel]! + (hot[channel]! - cool[channel]!) * heat) * brightness * displayRadiance);
        }
        pixels[index + 3] = Math.min(255, (1 - Math.sqrt(rr)) * size * 255);
      }
      map.canvas.getContext('2d')!.putImageData(map.image, 0, 0);
    }
    // Unequal, overlapping display lobes keep the halo soft and asymmetric.
    // It is an observing cue, not a measured corona or a change to stellar radius.
    const strength = settings.glareStrength * clamp(glare) * radiance ** .7;
    if (strength > 0) {
      const glow = `#${palette.glow.getHexString()}`, width = settings.glareWidth * (.42 + .58 * Math.sqrt(radiance));
      const alpha = (value: number) => Math.round(clamp(value) * 255).toString(16).padStart(2, '0');
      for (const [ox, oy, weight] of [[0, 0, .64], [.018, -.012, .23], [-.012, .018, .13]]) {
        const halo = c.createRadialGradient(x + ox! * r, y + oy! * r, r * .98, x + ox! * r, y + oy! * r, r * (1.15 / .85));
        halo.addColorStop(0, glow + alpha(strength * weight!));
        halo.addColorStop(.24, glow + alpha(strength * weight! * Math.exp(-.085 / width)));
        halo.addColorStop(.6, glow + alpha(strength * weight! * Math.exp(-.21 / width) * .5));
        halo.addColorStop(1, glow + '00'); c.fillStyle = halo;
        c.fillRect(x - r * 1.38, y - r * 1.38, r * 2.76, r * 2.76);
      }
    }
    c.drawImage(map.canvas, x - r, y - r, r * 2, r * 2);
  }

  dispose() {
    for (const map of this.maps.values()) map.canvas.width = map.canvas.height = 0;
    this.maps.clear(); this.fields.clear();
  }
}
