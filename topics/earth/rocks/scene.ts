import type { RockSession, RockSnapshot, SpecimenId, Texture } from './model';
import { MATERIAL_TRACERS, coolingTextures, currentRock, frameStates } from './model';
import content from './content.json';

type Words = typeof content.en;
type Point = { x: number; y: number };
type Cell = { center: Point; vertices: Point[]; index: number };
const TAU = Math.PI * 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const noise = (n: number) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const outline: Point[] = Array.from({ length: 17 }, (_, i) => {
  const angle = i / 17 * TAU;
  const r = .92 + noise(i + 14) * .13;
  return { x: Math.cos(angle) * r * 1.12, y: Math.sin(angle) * r * .78 };
});

function clipHalfPlane(polygon: Point[], nx: number, ny: number, limit: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = a.x * nx + a.y * ny - limit, db = b.x * nx + b.y * ny - limit;
    if (da <= 0) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const amount = da / (da - db);
      result.push({ x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount) });
    }
  }
  return result;
}

const centers: Point[] = MATERIAL_TRACERS.map(({ id }) => ({
  x: ((id % 6) - 2.5) * .345 + (noise(id + 91) - .5) * .15,
  y: (Math.floor(id / 6) - 1.5) * .33 + (noise(id + 63) - .5) * .12,
}));
const CELLS: Cell[] = centers.map((center, index) => {
  let vertices = outline;
  centers.forEach((other, j) => {
    if (j === index) return;
    const nx = other.x - center.x, ny = other.y - center.y;
    const limit = (other.x * other.x + other.y * other.y - center.x * center.x - center.y * center.y) / 2;
    vertices = clipHalfPlane(vertices, nx, ny, limit);
  });
  return { center, vertices, index };
});

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
}

function transform(point: Point, cell: Cell, texture: Texture): Point {
  if (texture === 'loose') return {
    x: cell.center.x * 1.26 + (point.x - cell.center.x) * .78,
    y: .17 + cell.center.y * .74 + (point.y - cell.center.y) * .78 + Math.abs(cell.center.x) * .06,
  };
  if (texture === 'cemented') return { x: point.x * 1.06, y: point.y * .79 + .05 };
  if (texture === 'foliated') return { x: point.x * 1.17, y: point.y * .72 + Math.sin(point.x * 4) * .055 };
  if (texture === 'melt') return { x: point.x * 1.1 + Math.sin(point.y * 7) * .06, y: point.y * .83 + Math.sin(point.x * 5) * .05 };
  return point;
}

const palettes: Record<Texture, string[]> = {
  coarse: ['#c5aaa0', '#edd1bf', '#e9d7c2', '#b9c1bc', '#ede4d0', '#545b58'],
  fine: ['#aa8680', '#ad8982', '#a47f78', '#b4968b', '#bda093', '#9b7d78'],
  loose: ['#c6ac8b', '#e6c6a1', '#dbc9b2', '#acb1a3', '#e8d8b9', '#777d70'],
  cemented: ['#b99b75', '#d4b28b', '#dfc49f', '#bbb29a', '#e1cba6', '#8d8c71'],
  foliated: ['#c0b4a3', '#dbcec0', '#d1c2af', '#a0a493', '#e1d3ba', '#5d685f'],
  melt: ['#d76835', '#dd7639', '#e48c43', '#c7562c', '#e6974c', '#bf522d'],
};

function texture(ctx: CanvasRenderingContext2D, kind: Texture, index: number, scale: number, points: Point[]) {
  ctx.fillStyle = palettes[kind][Math.floor(noise(index + 71) * 6)];
  ctx.fillRect(-1.7, -1.4, 3.4, 2.8);
  const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
  const dots = kind === 'fine' ? 130 : 85;
  for (let i = 0; i < dots; i++) {
    const seed = i * 3 + index * 137;
    const x = mix(left, right, noise(seed)), y = mix(top, bottom, noise(seed + 1));
    const radius = (kind === 'fine' ? .002 : .0035) + noise(seed + 2) * (kind === 'fine' ? .003 : .007);
    ctx.fillStyle = noise(seed + 3) > .48 ? '#fff8df4d' : '#332a2340';
    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .6, noise(seed + 6) * 4, 0, TAU); ctx.fill();
  }
  if (kind === 'coarse') {
    ctx.strokeStyle = '#fff6e85c'; ctx.lineWidth = 1.15 / scale;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); const y = noise(index * 19 + i) - .5;
      ctx.moveTo(-1.2, y); ctx.lineTo(1.2, y + .24); ctx.stroke();
    }
  }
  if (kind === 'foliated') {
    for (let i = -6; i < 7; i++) {
      ctx.strokeStyle = i % 3 === 0 ? '#3d4e4480' : '#f5e9d37a';
      ctx.lineWidth = i % 3 === 0 ? .065 : .026;
      ctx.beginPath();
      for (let x = -1.5; x <= 1.6; x += .05) {
        const y = i * .12 + Math.sin(x * 4 + i * .1) * .04;
        x < -1.49 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (kind === 'melt') {
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = i % 2 ? '#ffbd624d' : '#7e2e2440'; ctx.lineWidth = .035;
      ctx.beginPath();
      ctx.ellipse((noise(i + 71) - .5) * 2, (noise(i + 82) - .5) * 1.4, .2 + i * .018, .055, -.35, 0, TAU); ctx.stroke();
    }
  }
}

function drawMaterial(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, from: Texture, to: Texture, amount: number, markers = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(radius, radius);
  ctx.fillStyle = '#332b221c'; ctx.beginPath(); ctx.ellipse(0, .8, 1.3, .14, 0, 0, TAU); ctx.fill();
  for (const cell of CELLS) {
    const points = cell.vertices.map(point => {
      const a = transform(point, cell, from), b = transform(point, cell, to);
      return { x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount) };
    });
    ctx.save(); polygon(ctx, points); ctx.clip();
    texture(ctx, from, cell.index, radius, points);
    if (from !== to) { ctx.globalAlpha = amount; texture(ctx, to, cell.index, radius, points); ctx.globalAlpha = 1; }
    const highlight = ctx.createLinearGradient(-.5, -.8, .7, .8);
    highlight.addColorStop(0, '#fff8e425'); highlight.addColorStop(.6, '#fff8e400'); highlight.addColorStop(1, '#21282438');
    ctx.fillStyle = highlight; ctx.fillRect(-1.7, -1.4, 3.4, 2.8); ctx.restore();
    polygon(ctx, points); ctx.strokeStyle = from === 'loose' || to === 'loose' ? '#574b3b65' : '#564b3b40';
    ctx.lineWidth = .9 / radius; ctx.stroke();
  }
  if (markers) for (const cell of CELLS) {
    const a = transform(cell.center, cell, from), b = transform(cell.center, cell, to);
    const px = mix(a.x, b.x, amount), py = mix(a.y, b.y, amount);
    ctx.beginPath(); ctx.arc(px, py, .023, 0, TAU);
    ctx.strokeStyle = '#563a20'; ctx.lineWidth = .014; ctx.stroke();
    ctx.strokeStyle = '#ffd594'; ctx.lineWidth = .006; ctx.stroke();
  }
  ctx.restore();
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, colour: string) {
  const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 8 + uy * 4, y + dy - uy * 8 - ux * 4);
  ctx.lineTo(x + dx - ux * 8 - uy * 4, y + dy - uy * 8 + ux * 4); ctx.closePath(); ctx.fill();
}

function settingPoint(rock: RockSnapshot, w: number, h: number): Point {
  if (rock.setting === 'surface') return { x: w * .22, y: h * .18 };
  if (rock.setting === 'slope') return { x: w * .35, y: h * .24 };
  if (rock.setting === 'basin') return { x: w * .76, y: h * .28 };
  if (rock.setting === 'buried') return { x: w * .6, y: h * .355 };
  return { x: w * .38, y: h * .41 };
}

function landscape(ctx: CanvasRenderingContext2D, w: number, h: number, from: RockSnapshot, to: RockSnapshot, amount: number, words: Words) {
  const top = h * .08, bottom = h * .46;
  const surface: Point[] = [{ x: w * .04, y: h * .27 }, { x: w * .22, y: h * .145 }, { x: w * .37, y: h * .265 }, { x: w * .53, y: h * .28 }, { x: w * .91, y: h * .28 }];
  const shape = [...surface, { x: w * .91, y: bottom }, { x: w * .04, y: bottom }];
  polygon(ctx, shape); ctx.fillStyle = '#b4a78c'; ctx.fill();
  ctx.save(); polygon(ctx, shape); ctx.clip();
  const shade = ctx.createLinearGradient(0, top, 0, bottom);
  shade.addColorStop(0, '#e1cdb1'); shade.addColorStop(1, '#97867b'); ctx.fillStyle = shade; ctx.fillRect(0, 0, w, bottom);
  for (let j = 0; j < 6; j++) {
    ctx.beginPath(); for (let x = 0; x <= w; x += 12) {
      const y = h * (.27 + j * .036) + Math.sin(x / w * 6.4 + j * .1) * h * .012;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = j % 2 ? '#e5d2b270' : '#786e625c'; ctx.lineWidth = j % 2 ? 5 : 2; ctx.stroke();
  }
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = i % 3 ? '#4d443729' : '#fff6d54d';
    ctx.fillRect(noise(i + 119) * w, noise(i + 81) * bottom, 1.3, 1.2);
  }
  ctx.restore();
  ctx.beginPath(); surface.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = '#6b7a52'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * .33, h * .235); ctx.bezierCurveTo(w * .43, h * .33, w * .6, h * .23, w * .89, h * .285);
  ctx.strokeStyle = '#6b9ca7'; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#b8d3d6'; ctx.beginPath(); ctx.ellipse(w * .78, h * .285, w * .14, h * .018, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b75b3b55'; ctx.beginPath(); ctx.ellipse(w * .34, h * .418, w * .1, h * .033, -.1, 0, TAU); ctx.fill();
  const a = settingPoint(from, w, h), b = settingPoint(to, w, h);
  const p = { x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount) };
  if (Math.hypot(a.x - b.x, a.y - b.y) > 5 && amount > 0) {
    ctx.save(); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#aa6d35'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = '#fff7e6'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#9b5f2c'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#a7662d'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
  ctx.font = `${w < 500 ? 11 : 13}px system-ui, sans-serif`; ctx.fillStyle = '#586357';
  ctx.fillText(words.outcrop, w * .06, h * .12);
  ctx.fillText(words.basin, w * .52, h * .2);
  ctx.fillStyle = '#645c52'; ctx.fillText(words.underground, w * .6, h * .42);
  ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = '#a58c6870'; ctx.beginPath(); ctx.moveTo(p.x, p.y + 12); ctx.lineTo(w * .5, h * .54); ctx.stroke(); ctx.restore();
}

function drawJourney(ctx: CanvasRenderingContext2D, w: number, h: number, session: RockSession, words: Words) {
  const { from, to, amount } = frameStates(session);
  landscape(ctx, w, h, from, to, amount, words);
  const radius = Math.min(w * .31, h * .205);
  ctx.fillStyle = '#83725c'; ctx.font = `${w < 500 ? 11 : 13}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(words.magnified, w * .5, h * .545); ctx.textAlign = 'start';
  drawMaterial(ctx, w * .5, h * .75, radius, from.texture, to.texture, amount);
  if (session.process === 'heat' && amount > 0) {
    arrow(ctx, w * .5 - radius * 1.65, h * .75, radius * .3, 0, '#9b6347');
    arrow(ctx, w * .5 + radius * 1.65, h * .75, -radius * .3, 0, '#9b6347');
  }
}

function drawSpecimen(ctx: CanvasRenderingContext2D, w: number, h: number, specimen: SpecimenId) {
  const x = w * .5, y = h * .5, r = Math.min(w * .35, h * .43);
  const kind: Texture = specimen === 'sandstone' ? 'cemented' : specimen === 'gneiss' || specimen === 'slate' ? 'foliated' : specimen === 'basalt' ? 'fine' : 'coarse';
  if (specimen === 'granite' || specimen === 'sandstone' || specimen === 'gneiss') {
    drawMaterial(ctx, x, y, r, kind, kind, 0, false); return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  ctx.fillStyle = '#302b2224'; ctx.beginPath(); ctx.ellipse(.02, .87, 1.15, .13, 0, 0, TAU); ctx.fill();
  polygon(ctx, outline); ctx.clip();
  ctx.fillStyle = specimen === 'basalt' ? '#4b5050' : specimen === 'slate' ? '#596467' : specimen === 'limestone' ? '#b7b3a0' : '#e2dfd1';
  ctx.fillRect(-1.5, -1, 3, 2);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = i % 3 ? '#ffffff21' : '#18272535';
    const a = noise(i + 33) * 2.5 - 1.25, b = noise(i + 337) * 1.9 - .95;
    ctx.fillRect(a, b, .009 + noise(i + 1) * .008, .005);
  }
  if (specimen === 'basalt') for (let i = 0; i < 12; i++) {
    const a = noise(i + 71) * 1.8 - .9, b = noise(i + 13) * 1.2 - .6, size = .022 + noise(i + 9) * .035;
    ctx.fillStyle = '#252d2d'; ctx.beginPath(); ctx.ellipse(a, b, size, size * .7, .3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b3b7ac60'; ctx.lineWidth = .005; ctx.stroke();
  }
  if (specimen === 'slate') for (let i = -10; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo(-1.5, i * .085 - .16); ctx.lineTo(1.5, i * .085 + .16);
    ctx.strokeStyle = i % 2 ? '#c0c8bc88' : '#25383d88'; ctx.lineWidth = i % 2 ? .009 : .025; ctx.stroke();
  }
  if (specimen === 'limestone') for (let i = 0; i < 14; i++) {
    const a = noise(i + 98) * 1.9 - .95, b = noise(i + 57) * 1.2 - .6;
    ctx.save(); ctx.translate(a, b); ctx.rotate(noise(i + 3) * TAU);
    ctx.fillStyle = '#e6ddbf'; ctx.strokeStyle = '#837b63'; ctx.lineWidth = .009;
    ctx.beginPath(); ctx.moveTo(0, .07); ctx.bezierCurveTo(-.16, -.03, -.11, -.13, 0, -.11); ctx.bezierCurveTo(.11, -.13, .16, -.03, 0, .07); ctx.fill(); ctx.stroke();
    for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(0, .06); ctx.lineTo(j * .032, -.085); ctx.stroke(); }
    ctx.restore();
  }
  if (specimen === 'marble') {
    for (const cell of CELLS) {
      polygon(ctx, cell.vertices); ctx.fillStyle = ['#f0ece0', '#deddd1', '#e8e7db', '#d5d8ce'][cell.index % 4]; ctx.fill();
      ctx.strokeStyle = '#b1b5a280'; ctx.lineWidth = .007; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cell.center.x - .045, cell.center.y); ctx.lineTo(cell.center.x + .06, cell.center.y - .025); ctx.strokeStyle = '#ffffffb3'; ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-1.2, -.5 + i * .45); ctx.bezierCurveTo(-.6, -.4 + i * .4, -.2, .2 + i * .12, 1.2, -.15 + i * .32);
      ctx.strokeStyle = '#929a9a80'; ctx.lineWidth = .02 - i * .004; ctx.stroke();
    }
  }
  const shade = ctx.createLinearGradient(-1, -1, 1, 1); shade.addColorStop(0, '#fff8de20'); shade.addColorStop(1, '#15272435');
  ctx.fillStyle = shade; ctx.fillRect(-1.5, -1, 3, 2); ctx.restore();
}

function mineral(ctx: CanvasRenderingContext2D, w: number, h: number, id: RockSession['mineral']) {
  const r = Math.min(w * .29, h * .35), x = w * .5, y = h * .5;
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  ctx.fillStyle = '#5a5b4622'; ctx.beginPath(); ctx.ellipse(0, .92, 1, .15, 0, 0, TAU); ctx.fill();
  if (id === 'mica') {
    for (let i = 8; i >= 0; i--) {
      const yy = i * .045;
      polygon(ctx, [{ x: -.94, y: -.45 + yy }, { x: -.15, y: -.78 + yy }, { x: .87, y: -.3 + yy }, { x: .62, y: .4 + yy }, { x: -.47, y: .48 + yy }]);
      ctx.fillStyle = i % 2 ? '#7c7563' : '#a69a7b'; ctx.fill(); ctx.lineWidth = .015; ctx.strokeStyle = '#e0d9be'; ctx.stroke();
    }
  } else if (id === 'quartz') {
    const left = [{ x: -.55, y: -.6 }, { x: 0, y: -1.05 }, { x: 0, y: .84 }, { x: -.55, y: .55 }];
    polygon(ctx, left); ctx.fillStyle = '#b3cac8'; ctx.fill();
    polygon(ctx, [{ x: 0, y: -1.05 }, { x: .6, y: -.55 }, { x: .6, y: .55 }, { x: 0, y: .84 }]); ctx.fillStyle = '#dce5d8'; ctx.fill();
    polygon(ctx, [{ x: 0, y: -1.05 }, { x: .6, y: -.55 }, { x: .25, y: -.31 }, { x: -.55, y: -.6 }]); ctx.fillStyle = '#eef0df'; ctx.fill();
    ctx.strokeStyle = '#718f8b'; ctx.lineWidth = .012; polygon(ctx, [...left.slice(0, 2), { x: .6, y: -.55 }, { x: .6, y: .55 }, { x: 0, y: .84 }, { x: -.55, y: .55 }]); ctx.stroke();
    ctx.strokeStyle = '#ffffff70'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-.5, -.3 + i * .13); ctx.lineTo(-.08, -.1 + i * .13); ctx.stroke(); }
  } else {
    const offset = id === 'calcite' ? .28 : 0;
    polygon(ctx, [{ x: -.85, y: -.45 }, { x: -.14, y: -.88 }, { x: .88, y: -.43 }, { x: .1, y: -.02 }]); ctx.fillStyle = id === 'calcite' ? '#eee4c3' : '#e1ad9b'; ctx.fill();
    polygon(ctx, [{ x: -.85, y: -.45 }, { x: .1, y: -.02 }, { x: .1 - offset, y: .86 }, { x: -.85 - offset, y: .38 }]); ctx.fillStyle = id === 'calcite' ? '#bdbd9f' : '#b78980'; ctx.fill();
    polygon(ctx, [{ x: .1, y: -.02 }, { x: .88, y: -.43 }, { x: .88 - offset, y: .43 }, { x: .1 - offset, y: .86 }]); ctx.fillStyle = id === 'calcite' ? '#d6d8bc' : '#d3a695'; ctx.fill();
    ctx.strokeStyle = '#fff6dc70'; ctx.lineWidth = .012;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(.15 - offset * .3, .04 + i * .1); ctx.lineTo(.82 - offset * .3, -.28 + i * .1); ctx.stroke(); }
  }
  ctx.restore();
}

function cooling(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  const sizes = coolingTextures(progress), r = Math.min(w * .19, h * .34);
  for (const [index, grain] of [sizes.slow, sizes.fast].entries()) {
    const x = w * (index === 0 ? .25 : .75), y = h * .48;
    ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
    polygon(ctx, outline); ctx.clip(); ctx.fillStyle = '#ba9e8d'; ctx.fillRect(-1.4, -1, 2.8, 2);
    const cellSize = grain / 42;
    for (let row = -Math.ceil(1 / cellSize); row < Math.ceil(1 / cellSize); row++) for (let col = -Math.ceil(1.3 / cellSize); col < Math.ceil(1.3 / cellSize); col++) {
      const seed = row * 257 + col * 137;
      const xx = col * cellSize, yy = row * cellSize;
      polygon(ctx, [{ x: xx, y: yy }, { x: xx + cellSize * .85, y: yy - cellSize * .13 }, { x: xx + cellSize, y: yy + cellSize * .7 }, { x: xx + cellSize * .35, y: yy + cellSize }]);
      ctx.fillStyle = palettes.coarse[Math.floor(noise(seed) * 6)]; ctx.fill();
      ctx.strokeStyle = '#5e544338'; ctx.lineWidth = .004; ctx.stroke();
    }
    ctx.restore();
  }
}

export function createRockScene(canvas: HTMLCanvasElement, mode: 'main' | 'mineral' | 'cooling' = 'main') {
  const ctx = canvas.getContext('2d');
  let disposed = false;
  return {
    draw(session: RockSession, words: Words) {
      if (disposed || !ctx) return;
      const w = Math.max(280, canvas.clientWidth || 720);
      const h = mode === 'main' ? (session.view === 'journey' ? Math.min(510, Math.max(365, w * .56)) : Math.min(370, Math.max(290, w * .4))) : mode === 'mineral' ? 215 : Math.min(255, Math.max(170, w * .3));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.height = `${h}px`; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      if (mode === 'mineral') mineral(ctx, w, h, session.mineral);
      else if (mode === 'cooling') cooling(ctx, w, h, session.cooling);
      else if (session.view === 'specimens') drawSpecimen(ctx, w, h, session.specimen);
      else drawJourney(ctx, w, h, session, words);
    },
    dispose() { disposed = true; if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); },
    get supported() { return !!ctx; },
  };
}

export function sceneDescription(session: RockSession, words: Words): string {
  if (session.view === 'specimens') return `${words.specimens[session.specimen].name}. ${words.specimens[session.specimen].look}`;
  const { from, to, amount } = frameStates(session);
  const rock = amount >= .5 ? to : currentRock(session);
  return `${words.rockLabels[rock.texture]}. ${words.settings[rock.setting]}. ${session.process ? words.processes[session.process].cue : words.rockLabels[from.texture]}. ${words.identity}`;
}
