import test from 'node:test';
import assert from 'node:assert/strict';
import { mesophyllBand, mesophyllContacts, palisadeBand, contourPoint, type MesophyllCell, type Point } from '../mesophyllGeometry.ts';
import { SCALE_ENTRIES, SECTION_SPAN, mesophyllCellEdge } from '../model.ts';

interface Polygon {
  id: string;
  points: readonly Point[];
  bounds: readonly [number, number, number, number];
}

function polygon(cell: MesophyllCell, tile: number): Polygon {
  const points = cell.contour.map(([x, y]) => [x + cell.x + tile * SECTION_SPAN, y + cell.y] as const);
  return { id: cell.id, points, bounds: [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
    Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))] };
}

function contains(shape: Polygon, x: number, y: number): boolean {
  const [left, right, top, bottom] = shape.bounds;
  if (x <= left || x >= right || y <= top || y >= bottom) return false;
  if (shape.points.some((p, i) => pointSegmentDistance([x, y], p, shape.points[(i + 1) % shape.points.length]) < 1e-8)) return false;
  let inside = false;
  for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
    const a = shape.points[i], b = shape.points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function edgesCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const ab: Point = [b[0] - a[0], b[1] - a[1]], cd: Point = [d[0] - c[0], d[1] - c[1]];
  const lengthAB=Math.hypot(...ab),lengthCD=Math.hypot(...cd);
  if(!lengthAB||!lengthCD)return false;
  // Match contains()'s spatial boundary tolerance. Dividing by a nearly zero
  // intersection denominator otherwise turns 1e-12 roundoff on a shared wall
  // into a supposed crossing well inside the segment's parameter interval.
  const side=(origin:Point,edge:Point,length:number,p:Point)=>(edge[0]*(p[1]-origin[1])-edge[1]*(p[0]-origin[0]))/length;
  const opposite=(x:number,y:number)=>(x>1e-8&&y< -1e-8)||(y>1e-8&&x< -1e-8);
  return opposite(side(a,ab,lengthAB,c),side(a,ab,lengthAB,d))&&opposite(side(c,cd,lengthCD,a),side(c,cd,lengthCD,b));
}

function coversSegment(shape: Polygon, segment: readonly [Point, Point]): boolean {
  const [a, b] = segment, dx = b[0] - a[0], dy = b[1] - a[1], squared = dx * dx + dy * dy;
  const intervals: [number, number][] = [];
  for (let i = 0; i < shape.points.length; i++) {
    const p = shape.points[i], q = shape.points[(i + 1) % shape.points.length];
    if (Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) > 1e-7 * Math.sqrt(squared) ||
      Math.abs(dx * (q[1] - a[1]) - dy * (q[0] - a[0])) > 1e-7 * Math.sqrt(squared)) continue;
    const start = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared;
    const end = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / squared;
    const lo = Math.max(0, Math.min(start, end)), hi = Math.min(1, Math.max(start, end));
    if (hi >= lo) intervals.push([lo, hi]);
  }
  let covered = 0;
  for (const [lo, hi] of intervals.sort((a, b) => a[0] - b[0])) {
    if (lo > covered + 1e-8) return false;
    covered = Math.max(covered, hi);
  }
  return covered >= 1 - 1e-8;
}

function context(tiles: readonly number[], includePalisade = false): Polygon[] {
  return tiles.flatMap(tile => [...mesophyllBand(tile), ...(includePalisade ? palisadeBand(tile) : [])].map(cell => polygon(cell, tile)));
}

test('bands have fixed bounded finite geometry and deterministic local identities', () => {
  const first = mesophyllBand(0);
  assert.ok(first.length > 0 && first.length <= 80);
  for (const tile of [-11, -1, 0, 1, 17]) {
    const cells = mesophyllBand(tile);
    assert.equal(cells.length, first.length);
    assert.equal(new Set(cells.map(cell => cell.id)).size, cells.length);
    for (const cell of [...cells, ...palisadeBand(tile)]) {
      assert.ok(Number.isFinite(cell.x) && Number.isFinite(cell.y));
      assert.ok(cell.contour.length >= 3 && cell.contour.length <= 2048);
      for (const [x, y] of cell.contour) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        assert.ok(x + cell.x >= -250 && x + cell.x <= 250);
        assert.ok(y + cell.y >= (cell.id.includes('palisade') ? -112 : 10) - 1e-8 && y + cell.y <= (cell.id.includes('palisade') ? 10 : 113) + 1e-8);
      }
    }
  }
  assert.deepEqual(mesophyllBand(0), first);
  assert.throws(() => mesophyllBand(NaN), RangeError);
  assert.throws(() => mesophyllBand(Infinity), RangeError);
  assert.throws(() => mesophyllBand(.5), RangeError);
  assert.throws(() => mesophyllContacts(NaN), RangeError);
  assert.throws(() => mesophyllContacts(.5), RangeError);
  assert.throws(() => palisadeBand(Infinity), RangeError);
  assert.deepEqual(palisadeBand(0), palisadeBand(0));
});

test('only band zero owns the selected cell and its exact nested-scale outline', () => {
  const selected = mesophyllBand(0).filter(cell => cell.selected);
  assert.equal(selected.length, 1);
  const cell = selected[0], entry = SCALE_ENTRIES[1];
  assert.equal(cell.x, entry.x);
  assert.equal(cell.y, entry.y - 2 * entry.size);
  assert.deepEqual(cell.contour, Array.from({ length: 97 }, (_, i) => {
    const point = mesophyllCellEdge(i / 96 * Math.PI * 2);
    return [point[0] * entry.size, point[1] * entry.size];
  }));
  for (const tile of [-7, -1, 1, 9]) assert.ok(mesophyllBand(tile).every(other => !other.selected));
});

test('radial contour samples keep the vacuole and organelles within star-shaped cells', () => {
  for (const cell of [...mesophyllBand(0), ...palisadeBand(0)]) {
    const shape = polygon(cell, 0);
    assert.ok(contains(shape, cell.x, cell.y), `${cell.id} must contain its center`);
    for (let i = 0; i < 128; i++) {
      const angle = i / 128 * Math.PI * 2, wall = contourPoint(cell.contour, angle);
      assert.ok(Math.hypot(...wall) > .25 && Math.hypot(...wall) < 140);
      for (const radius of [.1, .35, .65, .97]) {
        const point = contourPoint(cell.contour, angle, radius);
        assert.ok(contains(shape, point[0] + cell.x, point[1] + cell.y), `${cell.id} ray ${i} escaped at ${radius}`);
      }
    }
  }
  const diamond: readonly Point[] = [[10, 0], [0, 8], [-6, 0], [0, -7]];
  const diagonal = contourPoint(diamond, Math.PI / 4);
  assert.ok(Math.abs(diagonal[0] - 40 / 9) < 1e-8 && Math.abs(diagonal[1] - 40 / 9) < 1e-8);
  assert.deepEqual(contourPoint(diamond, 0, .5), [5, 0]);
  assert.deepEqual(contourPoint(diamond, 0, 2), [10, 0]);
  assert.deepEqual(contourPoint(diamond, 0, -1), [0, 0]);
  assert.deepEqual(contourPoint([], 0), [0, 0]);
  assert.deepEqual(contourPoint(diamond, NaN), [0, 0]);
});

test('cell interiors stay disjoint while shared boundaries can coincide, including at seams', () => {
  const shapes = context([-1, 0, 1], true);
  for (let i = 0; i < shapes.length; i++) {
    const a = shapes[i];
    for (let j = i + 1; j < shapes.length; j++) {
      const b = shapes[j];
      if (a.bounds[1] < b.bounds[0] || b.bounds[1] < a.bounds[0] || a.bounds[3] < b.bounds[2] || b.bounds[3] < a.bounds[2]) continue;
      assert.ok(a.points.every(p => !contains(b, ...p)) && b.points.every(p => !contains(a, ...p)), `${a.id} contains a vertex of ${b.id}`);
      for (let k = 0; k < a.points.length; k++) {
        for (let l = 0; l < b.points.length; l++) {
          assert.ok(!edgesCross(a.points[k], a.points[(k + 1) % a.points.length], b.points[l], b.points[(l + 1) % b.points.length]),
            `${a.id} crosses ${b.id}`);
        }
      }
    }
  }
  // Independent interior samples also detect overlap missed at sparse vertices.
  for (const cell of [...mesophyllBand(0), ...palisadeBand(0)]) {
    for (let i = 0; i < 48; i++) {
      for (const radius of [.25, .5, .75, .98]) {
        const [x, y] = contourPoint(cell.contour, i / 48 * Math.PI * 2, radius);
        assert.equal(shapes.filter(shape => contains(shape, cell.x + x, cell.y + y)).length, 1);
      }
    }
  }
});

test('transverse profiles vary in size, aspect, depth and pore-facing concavity', () => {
  const cells = mesophyllBand(0);
  const areas = cells.map(cell => Math.abs(cell.contour.reduce((sum, p, i) => {
    const q = cell.contour[(i + 1) % cell.contour.length]; return sum + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2);
  const aspects = cells.map(cell => { const b = polygon(cell, 0).bounds; return (b[1] - b[0]) / (b[3] - b[2]); });
  const concave = cells.filter(cell => cell.contour.some((b, i) => {
    const a = cell.contour[(i + cell.contour.length - 1) % cell.contour.length], c = cell.contour[(i + 1) % cell.contour.length];
    return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -.001;
  }));
  assert.ok(Math.max(...areas) / Math.min(...areas) > 3, 'Profiles must not be near-equal inflated tiles');
  assert.ok(Math.max(...aspects) / Math.min(...aspects) > 2, 'The section needs differently elongated profiles');
  assert.ok(new Set(cells.map(cell => Math.round(cell.y / 3))).size > 8, 'Centers must not fall into two repeated rows');
  assert.ok(concave.length >= cells.length / 3, 'Several pore-facing walls must be concave');
});

test('exported contacts have positive exact shared boundary length with interiors on opposite sides', () => {
  const shapes = new Map(context([-1, 0, 1]).map(shape => [shape.id, shape]));
  const contacts = mesophyllContacts(0);
  assert.ok(contacts.length > 0 && contacts.length <= 1024);
  assert.equal(new Set(contacts.map(c => `${c.cellA}:${c.cellB}:${JSON.stringify(c.points)}`)).size, contacts.length);
  const selected = mesophyllBand(0).find(cell => cell.selected)!;
  assert.ok(contacts.some(c => c.cellA === selected.id || c.cellB === selected.id));
  assert.ok(contacts.filter(c => Math.hypot(c.points[1][0] - c.points[0][0], c.points[1][1] - c.points[0][1]) > 12).length >= 3,
    'Some contacts must be broad native wall portions rather than tiny extruded necks');
  for (const contact of contacts) {
    const a = shapes.get(contact.cellA)!, b = shapes.get(contact.cellB)!;
    assert.ok(a && b, 'Contact identities must resolve to real cells');
    const [start, end] = contact.points, dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy);
    assert.ok(length >= .75 - 1e-8 && length < 100);
    assert.ok(coversSegment(a, contact.points) && coversSegment(b, contact.points),
      `${contact.cellA}/${contact.cellB} lacks the full shared segment`);
    for (const t of [.2, .5, .8]) {
      const x = start[0] + t * dx, y = start[1] + t * dy, nx = -.05 * dy / length, ny = .05 * dx / length;
      assert.equal(Number(contains(a, x + nx, y + ny)) + Number(contains(b, x + nx, y + ny)), 1);
      assert.equal(Number(contains(a, x - nx, y - ny)) + Number(contains(b, x - nx, y - ny)), 1);
      assert.notEqual(contains(a, x + nx, y + ny), contains(a, x - nx, y - ny));
    }
  }
});

test('the retained cell shares its original wall segments without added connectors', () => {
  const cell = mesophyllBand(0).find(cell => cell.selected)!, wall = polygon(cell, 0);
  const contacts = mesophyllContacts(0).filter(contact => contact.cellA === cell.id || contact.cellB === cell.id);
  assert.ok(contacts.length > 0);
  assert.ok(contacts.every(contact => coversSegment(wall, contact.points)));
  assert.ok(contacts.reduce((sum, contact) => sum + Math.hypot(contact.points[1][0] - contact.points[0][0], contact.points[1][1] - contact.points[0][1]), 0) > 8);
});

test('the section retains distributed larger air pockets', () => {
  // Probe empty disks inside the band, away from its top/bottom boundary.
  const neighbours = context([-1, 0, 1]), pores: number[] = [];
  for (let x = -214.5; x < 217; x += 2) {
    for (let y = 22.5; y < 103; y += 2) {
      if (neighbours.some(shape => contains(shape, x, y))) continue;
      const distance = Math.min(...neighbours.flatMap(shape => shape.points.map((point, i) =>
        pointSegmentDistance([x, y], point, shape.points[(i + 1) % shape.points.length]))));
      if (distance >= 5) pores.push(x);
    }
  }
  assert.ok(pores.length >= 6 && Math.max(...pores) - Math.min(...pores) > SECTION_SPAN / 2,
    'The drawing needs distributed wider pores alongside actual contact regions');
});

test('irregular air chambers communicate through a narrower passage and provide a valid label anchor', () => {
  const shapes = context([-1, 0, 1]);
  const clearance = (point: Point) => Math.min(...shapes.flatMap(shape => shape.points.map((p, i) =>
    pointSegmentDistance(point, p, shape.points[(i + 1) % shape.points.length]))));
  const route: readonly Point[] = [[110,72], [118,69], [132,67], [145,65], [151,58], [162,53]];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    for (let j = 0; j <= 32; j++) {
      const t = j / 32, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      assert.ok(shapes.every(shape => !contains(shape, x, y)), 'Air passage must stay outside cells');
    }
  }
  assert.ok(clearance([110,72]) > 4, 'The scene label anchor must be inside an actual air chamber');
  assert.ok(clearance([110,72]) > 2 * clearance([135,66]), 'Chambers and connecting passages need unequal widths');
});

test('palisade profiles are narrow, closely apposed columns with occasional shorter sections', () => {
  const cells = palisadeBand(0), shapes = cells.map(cell => polygon(cell, 0));
  assert.ok(cells.length > 8 && cells.length <= 80);
  assert.ok(cells.every(cell => !cell.selected));
  const heights = shapes.map(shape => shape.bounds[3] - shape.bounds[2]);
  const aspects = shapes.map(shape => (shape.bounds[3] - shape.bounds[2]) / (shape.bounds[1] - shape.bounds[0])).sort((a,b) => a-b);
  assert.ok(aspects[Math.floor(aspects.length / 2)] > 3);
  assert.ok(Math.min(...heights) < .6 * Math.max(...heights));
  let apposed = 0;
  for (const a of shapes) {
    if (shapes.some(b => a !== b && a.points.some((p, i) => {
      const q = a.points[(i + 1) % a.points.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]) > 5 && coversSegment(b, [p,q]);
    }))) apposed++;
  }
  assert.ok(apposed >= cells.length * .8, 'Most palisade profiles must share substantial lateral wall portions');
});

test('rounded profiles avoid widespread tiny kinks and square palisade ends', () => {
  const sharpestTurn=(cell:MesophyllCell)=>{
    const edges=cell.contour.map((a,i)=>[a,cell.contour[(i+1)%cell.contour.length]] as const);
    const lengths=edges.map(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])),perimeter=lengths.reduce((a,b)=>a+b,0);
    const count=Math.ceil(perimeter/.5),step=perimeter/count;
    let edge=0,offset=0;
    const samples=Array.from({length:count},(_,i)=>{
      const distance=i*step;
      while(edge<edges.length-1&&offset+lengths[edge]<distance)offset+=lengths[edge++];
      const [a,b]=edges[edge],u=(distance-offset)/(lengths[edge]||1);
      return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u] as const;
    });
    return Math.max(...samples.map((p,i)=>{
      const a=samples[(i+count-1)%count],b=samples[(i+1)%count],dx=p[0]-a[0],dy=p[1]-a[1],ex=b[0]-p[0],ey=b[1]-p[1];
      return Math.abs(Math.atan2(dx*ey-dy*ex,dx*ex+dy*ey));
    }));
  };
  // This is an illustration-quality guard at fixed drawing resolution, not a
  // biological curvature measurement. Exact retained-wall joins may differ.
  const spongy=mesophyllBand(0);
  assert.ok(spongy.filter(cell=>sharpestTurn(cell)<.7).length>=spongy.length*.8);
  assert.ok(palisadeBand(0).every(cell=>sharpestTurn(cell)<.45));
});

test('periodic bands preserve entire cells across seams without introducing lateral cuts', () => {
  const base = mesophyllBand(0);
  for (const tile of [-3, -1, 1, 4]) {
    const other = mesophyllBand(tile);
    for (let i = 0; i < base.length; i++) {
      assert.equal(other[i].x, base[i].x);
      assert.equal(other[i].y, base[i].y);
      assert.strictEqual(other[i].contour, base[i].contour);
    }
    const palisade = palisadeBand(tile), palisadeBase = palisadeBand(0);
    for (let i = 0; i < palisade.length; i++) {
      assert.strictEqual(palisade[i].contour, palisadeBase[i].contour);
      assert.equal(palisade[i].x, palisadeBase[i].x); assert.equal(palisade[i].y, palisadeBase[i].y);
    }
    const baseContacts = mesophyllContacts(0), contacts = mesophyllContacts(tile);
    assert.equal(contacts.length, baseContacts.length);
    for (let i = 0; i < contacts.length; i++) {
      assert.equal(contacts[i].cellA, `${tile}/${baseContacts[i].cellA.split('/')[1]}`);
      assert.equal(contacts[i].cellB, `${tile + Number(baseContacts[i].cellB.split('/')[0])}/${baseContacts[i].cellB.split('/')[1]}`);
      assert.strictEqual(contacts[i].points, baseContacts[i].points);
    }
  }
  assert.ok(mesophyllContacts(0).some(contact => contact.cellB.startsWith('1/')), 'One exact contact must cross a band seam');
  const shapes = context([-1, 0, 1, 2]);
  assert.ok(shapes.some(shape => shape.bounds[0] < 217 && shape.bounds[1] > 217), 'At least one complete cell must cross a seam');
  for (let x = 200.5; x < 233; x += 2) {
    for (let y = 10.5; y < 113; y += 2) {
      assert.equal(shapes.filter(shape => contains(shape, x, y)).length,
        shapes.filter(shape => contains(shape, x + SECTION_SPAN, y)).length);
    }
  }
});
