import { noise, field, clamp, smooth, type World } from './model.ts';
type Point = [number, number];
type RGB = [number, number, number];
export const seed = (i: number) => { const v = Math.sin(i * 134.1 + 217.8) * 41947; return v - Math.floor(v); };
const mix = (a: RGB, b: RGB, p: number): RGB => a.map((v, i) => v + (b[i] - v) * clamp(p)) as RGB;
const rgb = (v: RGB) => `rgb(${v.map(n => Math.round(clamp(n, 0, 255))).join(',')})`;
const makeCanvas = (width: number, height: number) => new OffscreenCanvas(width, height);
export const palette: Record<World['id'], { sky: [string, string]; rock: RGB; haze: RGB }> = {
  mercury: { sky: ['#04070d', '#080c12'], rock: [132, 126, 117], haze: [25, 28, 33] },
  venus: { sky: ['#655139', '#caa567'], rock: [152, 111, 69], haze: [185, 147, 86] },
  earth: { sky: ['#487d9f', '#c2d1ca'], rock: [115, 119, 81], haze: [148, 174, 175] },
  mars: { sky: ['#6e625a', '#d4ab8a'], rock: [172, 109, 72], haze: [183, 145, 116] },
  jupiter: { sky: ['#352d2b', '#b5a18b'], rock: [187, 153, 121], haze: [213, 190, 157] },
  neptune: { sky: ['#16252f', '#82acb7'], rock: [104, 154, 174], haze: [151, 192, 201] },
  titan: { sky: ['#715438', '#bba06b'], rock: [137, 118, 80], haze: [172, 146, 99] },
  cancri: { sky: ['#180f12', '#773721'], rock: [70, 52, 45], haze: [156, 67, 34] },
};
const craterSeeds = Array.from({ length: 54 }, (_, i) => ({ x: (seed(i + 100) - .5) * 2.8, y: (seed(i + 490) - .5) * 2.5, r: .025 + seed(i + 550) ** 2 * .22 }));


/** Pure topic-owned raster preparation, executed in a worker. */
export class SurfacePainter {
  paintTexture(world: World) {
    const size = 640, data = new ImageData(size, size / 2), base = palette[world.id].rock;
    for (let y = 0; y < size / 2; y++) for (let x = 0; x < size; x++) {
      const lon = x / size * Math.PI * 2, lat = y / (size / 2) * Math.PI - Math.PI / 2;
      const u = Math.cos(lon) * 130 + lat * 37, v = Math.sin(lon) * 130 + lat * 103;
      const n = noise(u, v), fine = noise(u * 5, v * 5), tiny = field(u * .71, v * .71);
      let color = base.map(c => c * (.94 + n * .34 + fine * .14 + tiny * .035)) as RGB;
      if (world.id === 'mercury') {
        let relief = 0;
        const px = Math.cos(lon) * Math.cos(lat), py = Math.sin(lat);
        for (const cr of craterSeeds) {
          const r = Math.hypot(px - cr.x, py - cr.y) / cr.r;
          if (r < 1.3) relief += r < .78 ? -.18 * (1 - r) : .15 * Math.sin((r - .78) / .52 * Math.PI);
        }
        color = color.map(c => c * (1 + relief)) as RGB;
      } else if (world.id === 'earth') {
        const land = n + .14 * Math.sin(lon * 2.3 + Math.cos(lat * 3));
        const ocean = mix([17, 52, 75], [44, 112, 131], smooth(-.13, .015, land));
        color = land > .015 ? mix([48, 87, 55], [172, 150, 103], smooth(-.1, .3, noise(u + 34, v - 240))) : ocean;
        const cloud = smooth(.33, .67, noise(u * 1.7 + Math.sin(lat * 8) * 16 + 261, v * 1.7) + .08 * fine);
        color = mix(color, [229, 233, 220], cloud * .93);
        color = mix(color, [219, 227, 225], smooth(1.28, 1.52, Math.abs(lat) + fine * .09));
      } else if (world.id === 'venus') {
        const streak = noise(u * .75 + Math.sin(lat * 7) * 35, v * 2.5);
        color = mix([152, 132, 95], [231, 214, 170], .61 + streak * .36 + fine * .08);
      } else if (world.id === 'mars') {
        const dark = smooth(.03, .36, noise(u * .7 + 28, v * 1.2 - 41));
        color = mix(color, [80, 75, 62], dark * .6);
        const canyon = Math.abs(Math.sin(lon * 2 + .15 * Math.sin(lat * 11)) + lat * 2.8);
        color = mix(color, [78, 53, 43], (1 - smooth(.015, .07, canyon)) * .65 * (1 - smooth(.25, .6, Math.abs(lat))));
        color = mix(color, [209, 210, 195], smooth(1.36, 1.52, Math.abs(lat) + fine * .07));
      } else if (world.id === 'jupiter' || world.id === 'neptune') {
        const giant = world.id === 'jupiter', warped = lat * (giant ? 26 : 18) + n * 1.7 + fine * .37;
        const bands = Math.sin(warped) * .19 + Math.sin(warped * 2.6) * .08;
        color = giant ? mix([130, 98, 78], [231, 214, 179], .56 + bands + fine * .1) : mix([87, 142, 161], [138, 185, 192], .6 + bands * .3 + fine * .04);
        const storm = Math.hypot((lon - 1.1) / .39, (lat - .36) / .17);
        if (giant && storm < 1.22) {
          const swirl = Math.sin(storm * 37 + Math.atan2(lat - .36, lon - 1.1) * 3 + fine * 3);
          color = mix(color, [176 + swirl * 16, 107 + swirl * 12, 76 + swirl * 8], (1 - smooth(.85, 1.22, storm)) * .86);
        }
        if (!giant) {
          const cloud = smooth(.53, .7, noise(u * .6 + 27, v * 4.8));
          color = mix(color, [225, 234, 224], cloud * .75);
        }
      } else if (world.id === 'titan') {
        // Visible-light haze conceals the lakes: close/section views deliberately look beneath it.
        color = mix([158, 116, 55], [207, 164, 95], .55 + n * .19 + fine * .025);
        color = mix(color, [164, 157, 123], smooth(1.18, 1.55, Math.abs(lat)) * .6);
      } else if (world.id === 'cancri') {
        const hot = Math.max(0, Math.cos(lon - .2) * Math.cos(lat));
        const crust = smooth(-.14, .15, noise(u * 1.65, v * 1.65));
        color = mix([24, 24, 27], mix([117, 44, 24], [255, 151, 53], (1 - crust) * .88), smooth(.05, .8, hot));
      }
      const i = (y * size + x) * 4;
      color.forEach((c, k) => data.data[i + k] = c); data.data[i + 3] = 255;
    }
    return data;
  }
  paintLandscape(world: World) {
    const canvas = makeCanvas(1280, 720), c = canvas.getContext('2d')!, p = palette[world.id];
    const sky = c.createLinearGradient(0, 0, 0, 390); sky.addColorStop(0, p.sky[0]); sky.addColorStop(1, p.sky[1]); c.fillStyle = sky; c.fillRect(0, 0, 1280, 720);
    if (!world.surface) this.cloudLandscape(c, world);
    else {
      if (world.id === 'earth') {
        for (let i = 0; i < 48; i++) {
          const x = seed(i + 183) * 1280, y = 100 + seed(i + 987) * 130, r = 24 + seed(i + 334) * 70;
          const cloud = c.createRadialGradient(x, y, 0, x, y, r); cloud.addColorStop(0, '#f8f3dc58'); cloud.addColorStop(1, '#f3efdd00');
          c.fillStyle = cloud; c.beginPath(); c.ellipse(x, y, r * 1.7, r * .28, -.05, 0, Math.PI * 2); c.fill();
        }
      }
      if (world.id === 'cancri') {
        const glow = c.createRadialGradient(440, 360, 0, 440, 360, 580); glow.addColorStop(0, '#f9a04566'); glow.addColorStop(1, '#f8a04400'); c.fillStyle = glow; c.fillRect(0, 0, 1280, 720);
      }
      this.terrain(c, world);
      if (world.id !== 'mercury') {
        const haze = c.createLinearGradient(0, 225, 0, 420); haze.addColorStop(0, rgb(p.haze) .replace('rgb(', 'rgba(').replace(')', ',0)')); haze.addColorStop(.4, rgb(p.haze).replace('rgb(', 'rgba(').replace(')', ',.18)')); haze.addColorStop(1, '#ffffff00'); c.fillStyle = haze; c.fillRect(0, 225, 1280, 195);
      }
    }
    return canvas;
  }
  private terrain(c: OffscreenCanvasRenderingContext2D, world: World) {
    const p = palette[world.id], wet = world.liquid !== 'none';
    const floor = c.createLinearGradient(0, 320, 0, 720); floor.addColorStop(0, rgb(mix(p.rock, p.haze, .5))); floor.addColorStop(1, rgb(mix(p.rock, [24, 25, 28], .4))); c.fillStyle = floor; c.fillRect(0, 310, 1280, 410);
    // Back-to-front perspective strips with slope-lit facets and nested roughness.
    const rows = 240, columns = 560, previous: Point[] = [];
    for (let row = 0; row <= rows; row++) {
      const depth = row / rows, perspective = depth * depth, spread = 1.7 - depth * .7;
      const points: Point[] = [];
      for (let col = 0; col <= columns; col++) {
        const x = col / columns * 1280, u = (x - 640) * spread, v = (1 - depth) * 900;
        const coarse = noise(u * .4, v * .4), fine = noise(u * 2.3, v * 2.3), tiny = field(u * .35, v * .35);
        let h = coarse * 33 + fine * 9;
        if (world.id === 'mercury') {
          h *= .85;
          for (const crater of [{ x: -170, y: 370, r: 155 }, { x: 320, y: 150, r: 100 }, { x: -580, y: 675, r: 180 }]) {
            const radius = Math.hypot(u - crater.x, v - crater.y) / crater.r;
            if (radius < 1.35) h += radius < .83 ? -35 * (1 - radius ** 2) : 17 * Math.sin((radius - .83) / .52 * Math.PI);
          }
        } else if (world.id === 'venus') {
          h = coarse * 14 + fine * 6 + 120 * Math.exp(-(((u + 220) / 330) ** 2) - ((v - 800) / 230) ** 2);
        } else if (world.id === 'mars') {
          const mesa = smooth(-.07, .33, noise(u * .18 - 580, v * .22));
          h = mesa * 62 + coarse * 14 + fine * 2;
          h += Math.sin(u * .026 + v * .072 + coarse * 3) * (1 - mesa) * 5;
        } else if (world.id === 'earth') h = coarse * 42 + fine * 3 + (u + v * .48 - 170) * .06;
        else if (world.id === 'titan') h = coarse * 20 + fine * 2 + (u + v * .25 - 120) * .04;
        else if (world.id === 'cancri') h = coarse * 19 + fine * 4 - 10;
        const liquid = wet && h < 2, surfaceHeight = liquid ? 2 : h;
        const y = 324 + perspective * 460 - surfaceHeight * (.38 + depth * 1.7);
        points.push([x, y]);
        if (!row || !col) continue;
        const normal = clamp(.79 + (points[col - 1][1] - y) * .15 + tiny * .025, .48, 1.14);
        let color = p.rock.map(value => value * normal * (.97 + fine * .11)) as RGB;
        if (world.id === 'mars') color = mix(color, [101, 69, 48], (Math.sin(h * .57) * .5 + .5) * .13);
        if (world.id === 'venus') color = mix(color, [78, 65, 48], smooth(.04, .27, fine) * .28);
        if (world.id === 'earth' && !liquid) color = mix(color, [50, 77, 44], smooth(6, 26, h) * .58);
        if (liquid) {
          const glint = Math.exp(-(((u + 280 + coarse * 90) / (45 + depth * 80)) ** 2)) * (.3 + .7 * seed(col * 71 + row));
          if (world.liquid === 'water') color = mix(mix([31, 78 + perspective * 9, 96 + perspective * 7], [54, 125, 135], smooth(-12, 2, h) * .65), [196, 204, 181], glint * .7);
          else if (world.liquid === 'hydrocarbon') color = mix([61, 59, 44], [164, 142, 98], glint * .54);
          else color = mix([176, 45, 15], [255, 192, 76], .35 + fine * .5 + tiny * .1);
        }
        if (world.id !== 'mercury') color = mix(color, p.haze, (1 - depth) ** 3 * .73);
        c.fillStyle = rgb(color); c.beginPath(); c.moveTo(...previous[col - 1]); c.lineTo(...previous[col]); c.lineTo(points[col][0] + 1, points[col][1] + 1); c.lineTo(points[col - 1][0] - 1, points[col - 1][1] + 1); c.fill();
      }
      previous.splice(0, previous.length, ...points);
    }
    // Sparse foreground stones keep metre-scale detail distinct from distant relief.
    if (world.liquid === 'none') for (let i = 0; i < 170; i++) {
      const x = seed(i + 20) * 1280, y = 470 + seed(i + 41) ** .5 * 260, r = (2 + seed(i + 80) ** 4 * 20) * (y - 330) / 300;
      c.fillStyle = '#11182030'; c.beginPath(); c.ellipse(x + r * .8, y + 2, r * 1.5, r * .33, .1, 0, Math.PI * 2); c.fill();
      c.fillStyle = rgb(p.rock.map(v => v * (.51 + seed(i + 761) * .38)) as RGB);
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * .6, y - r * .58); c.lineTo(x + r * .13, y - r * .86); c.lineTo(x + r, y - r * .15); c.lineTo(x + r * .65, y + r * .16); c.closePath(); c.fill();
      c.strokeStyle = '#edd8aa40'; c.lineWidth = .8; c.beginPath(); c.moveTo(x - r * .6, y - r * .58); c.lineTo(x + r * .13, y - r * .86); c.lineTo(x + r * .63, y - r * .43); c.stroke();
    }
  }
  private cloudLandscape(c: OffscreenCanvasRenderingContext2D, world: World) {
    const blue = world.id === 'neptune', w = 1280, h = 720, image = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x - 640) * .32, v = (y - 340) * .51, n = noise(u, v), fine = noise(u * 4.5, v * 4.5);
      const sx = (x - 830) / 210, sy = (y - 430) / 97, radius = Math.hypot(sx, sy), angle = Math.atan2(sy, sx);
      let band = Math.sin(v * .071 + n * 2.6 + fine * .45);
      if (!blue && radius < 1.35) band = Math.sin(radius * 25 - angle * 3 + n * 3.4);
      let color = blue ? mix([77, 128, 148], [142, 188, 199], .56 + band * .08 + n * .1 + fine * .06) : mix([127, 94, 72], [224, 205, 174], .55 + band * .22 + n * .16 + fine * .11);
      if (!blue && radius < 1.25) color = mix(color, [181 + band * 28, 104 + band * 23, 71 + band * 17], (1 - smooth(.9, 1.25, radius)) * .8);
      const wisps = smooth(.28, .69, noise(u * .6 + 35, v * 3.1 + 297));
      color = mix(color, [224, 230, 214], wisps * (blue ? .72 : .36));
      const index = (y * w + x) * 4; color.forEach((value, k) => image.data[index + k] = value); image.data[index + 3] = 255;
    }
    c.putImageData(image, 0, 0);
  }
}
