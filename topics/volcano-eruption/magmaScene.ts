import type { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import type { MagmaState } from './magmaSystem.ts';
import { STORAGE, FEEDERS, lens, dike, ribbon, seed, type Point } from './magmaGeometry.ts';

export function drawMagma(s: CanvasSurface, state: MagmaState, vents: number[], terrain: (x: number) => number) {
  const c = s.context;
  const heat = 1 - state.cooling * .6;
  const glow = c.createRadialGradient(0, 166, 5, 0, 166, 138);
  glow.addColorStop(0, `rgba(244,128,50,${.08 + state.stored * .17})`); glow.addColorStop(1, '#e2633000');
  s.ellipse(0, 167, 154, 88, glow);
  for (const [j, points] of FEEDERS.entries()) {
    s.path(ribbon(points, 5), '#392c32');
    c.save(); c.globalAlpha = .22 + state.recharge * .78;
    s.path(ribbon(points, 2.8), '#e98d46');
    for (let i = 0; i < 7; i++) {
      const f = (i / 7 + state.p * 2.8) % 1 * (points.length - 1), k = Math.floor(f), u = f % 1;
      const a = points[k], b = points[k + 1];
      s.ellipse(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 1.3, 2.6, '#ffe3a0');
    }
    c.restore();
  }
  STORAGE.forEach((zone, j) => {
    const shape = lens(zone.x, zone.y, zone.w, zone.h * (1 + state.pressure * .14), zone.phase);
    const melt = c.createLinearGradient(zone.x, zone.y - zone.h, zone.x, zone.y + zone.h);
    melt.addColorStop(0, '#543738'); melt.addColorStop(.45, '#d57e42'); melt.addColorStop(.63, '#efad63'); melt.addColorStop(1, '#593334');
    s.path(shape, '#493336', '#b67b52', .9);
    c.save(); s.path(shape); c.clip(); c.globalAlpha = heat * (.38 + state.stored * .62);
    s.path(shape, melt);
    // A crystal framework stays visible through the connected melt lenses.
    for (let i = 0; i < 75; i++) {
      const x = zone.x + (seed(i + j * 251) - .5) * zone.w * 2.1;
      const y = zone.y + (seed(i + j * 347 + 17) - .5) * zone.h * 2.5;
      const r = 1.4 + seed(i + 828) * 3.4;
      s.path([[x - r, y], [x - .3 * r, y - r], [x + r, y - .4 * r], [x + .2 * r, y + r]], i % 3 ? '#5d4a42' : '#9b7654', '#dec59a44', .5);
    }
    for (let i = 0; i < 5; i++) {
      const line: Point[] = Array.from({ length: 30 }, (_, k) => [zone.x - zone.w + k / 29 * zone.w * 2, zone.y - 7 + i * 3 + Math.sin(k * .24 + i + state.p * 7) * 2]);
      s.path(line, undefined, '#ffcf8055', .65);
    }
    c.restore();
  });
  for (const [vi, vx] of vents.entries()) {
    // Existing joints are dim, discontinuous hairlines, not pre-open pipes.
    c.save(); c.setLineDash([4, 6]); s.path(dike(vx, terrain(vx)), undefined, '#ded0ad44', .7); c.restore();
    if (state.front <= 0) continue;
    const points = dike(vx, terrain(vx), state.front), width = (3 + state.pressure * 2) / Math.sqrt(vents.length);
    s.path(ribbon(points, width + 1.8), '#302a30');
    s.path(ribbon(points, width), state.cooling > .6 ? '#8d513c' : '#ed944d');
    s.path(points, undefined, '#ffdb9566', .8);
    const tip = points[points.length - 1];
    if (!state.connected && state.cooling < .4) {
      const split: Point[] = [[tip[0] - 9, tip[1] - 10], tip, [tip[0] + 10, tip[1] - 7]];
      s.path(split, undefined, '#e4c39a', .8);
      c.save(); c.globalAlpha = .28 * (1 - state.cooling);
      s.ellipse(tip[0], tip[1], 10 + Math.sin(state.p * 70) * 2, 7, '#00000000', '#edc88d'); c.restore();
    }
    // Short side intrusions taper and stop in the host rock.
    if (state.front > .28) for (const side of [-1, 1]) {
      const branch: Point[] = [[11, 119], [side * 26, 110], [side * 49, 111], [side * 69, 104]];
      const f = Math.min(1, (state.front - .28) / .38);
      const scaled = branch.map(([x, y]): Point => [11 + (x - 11) * f, 119 + (y - 119) * f]);
      s.path(ribbon(scaled, 2.2), state.cooling > .6 ? '#795047' : '#c17b49');
    }
    for (let i = 0; i < 17; i++) {
      const u = (i / 17 + state.p * 1.8) % 1;
      if (u >= state.front) continue;
      const path = dike(vx, terrain(vx), u), [x, y] = path[path.length - 1];
      const size = (.35 + u * u * 2.5) * state.gasExpansion;
      s.ellipse(x, y, size, size * 1.35, '#63412e', '#ffd894');
    }
  }
  if (state.pressure > .08) {
    c.save(); c.globalAlpha = state.pressure * .8;
    s.arrow(-118, 176, -118 - state.pressure * 22, 166, '#e6bb80', 1);
    s.arrow(109, 160, 109 + state.pressure * 22, 151, '#e6bb80', 1);
    c.restore();
  }
}
