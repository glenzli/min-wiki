import test from 'node:test';
import assert from 'node:assert/strict';
import { mesophyllBand, mesophyllContacts, contourPoint, type MesophyllCell, type Point } from '../mesophyllGeometry.ts';
import { SCALE_ENTRIES, SECTION_SPAN, cellEdge } from '../model.ts';

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
  const denominator = ab[0] * cd[1] - ab[1] * cd[0];
  if (Math.abs(denominator) < 1e-10) return false;
  const ac: Point = [c[0] - a[0], c[1] - a[1]];
  const t = (ac[0] * cd[1] - ac[1] * cd[0]) / denominator;
  const u = (ac[0] * ab[1] - ac[1] * ab[0]) / denominator;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
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

function context(tiles: readonly number[]): Polygon[] {
  return tiles.flatMap(tile => mesophyllBand(tile).map(cell => polygon(cell, tile)));
}

test('bands have fixed bounded finite geometry and deterministic local identities', () => {
  const first = mesophyllBand(0);
  assert.ok(first.length >= 14 && first.length <= 24);
  for (const tile of [-11, -1, 0, 1, 17]) {
    const cells = mesophyllBand(tile);
    assert.equal(cells.length, first.length);
    assert.equal(new Set(cells.map(cell => cell.id)).size, cells.length);
    for (const cell of cells) {
      assert.ok(Number.isFinite(cell.x) && Number.isFinite(cell.y));
      assert.ok(cell.contour.length >= 20 && cell.contour.length <= 100);
      for (const [x, y] of cell.contour) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        assert.ok(x + cell.x >= -250 && x + cell.x <= 250);
        assert.ok(y + cell.y >= 10 - 1e-8 && y + cell.y <= 113 + 1e-8);
      }
    }
  }
  assert.deepEqual(mesophyllBand(0), first);
  assert.throws(() => mesophyllBand(NaN), RangeError);
  assert.throws(() => mesophyllBand(Infinity), RangeError);
  assert.throws(() => mesophyllBand(.5), RangeError);
  assert.throws(() => mesophyllContacts(NaN), RangeError);
  assert.throws(() => mesophyllContacts(.5), RangeError);
});

test('only band zero owns the selected cell and its exact nested-scale outline', () => {
  const selected = mesophyllBand(0).filter(cell => cell.selected);
  assert.equal(selected.length, 1);
  const cell = selected[0], entry = SCALE_ENTRIES[1];
  assert.equal(cell.x, entry.x);
  assert.equal(cell.y, entry.y - 2 * entry.size);
  assert.deepEqual(cell.contour, Array.from({ length: 97 }, (_, i) => {
    const point = cellEdge(i / 96 * Math.PI * 2, 171, 134, 1.4, .85);
    return [point[0] * entry.size, point[1] * entry.size];
  }));
  for (const tile of [-7, -1, 1, 9]) assert.ok(mesophyllBand(tile).every(other => !other.selected));
});

test('radial contour samples keep the vacuole and organelles within star-shaped cells', () => {
  for (const cell of mesophyllBand(0)) {
    const shape = polygon(cell, 0);
    assert.ok(contains(shape, cell.x, cell.y), `${cell.id} must contain its center`);
    for (let i = 0; i < 128; i++) {
      const angle = i / 128 * Math.PI * 2, wall = contourPoint(cell.contour, angle);
      assert.ok(Math.hypot(...wall) > 8 && Math.hypot(...wall) < 48);
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
  const shapes = context([-1, 0, 1]);
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
  for (const cell of mesophyllBand(0)) {
    for (let i = 0; i < 48; i++) {
      for (const radius of [.25, .5, .75, .98]) {
        const [x, y] = contourPoint(cell.contour, i / 48 * Math.PI * 2, radius);
        assert.equal(shapes.filter(shape => contains(shape, cell.x + x, cell.y + y)).length, 1);
      }
    }
  }
});

test('projected illustration occupancy leaves substantial air spaces without sparse floating cells', () => {
  const shapes = context([-1, 0, 1]);
  let occupied = 0, total = 0;
  // This is projected area in one drawn section, never a biological volume fraction.
  for (let x = -216.5; x < 217; x++) {
    for (let y = 10.5; y < 113; y++) {
      const count = shapes.filter(shape => contains(shape, x, y)).length;
      assert.ok(count <= 1);
      occupied += count;
      total++;
    }
  }
  const fraction = occupied / total;
  assert.ok(fraction >= .55 && fraction <= .78, `Illustration area occupancy was ${fraction}`);
});

test('exported contacts have positive exact shared boundary length with interiors on opposite sides', () => {
  const shapes = new Map(context([-1, 0, 1]).map(shape => [shape.id, shape]));
  const contacts = mesophyllContacts(0);
  assert.ok(contacts.length >= 16 && contacts.length <= 24);
  assert.equal(new Set(contacts.map(c => `${c.cellA}:${c.cellB}`)).size, contacts.length);
  assert.ok(contacts.some(c => c.cellA === '0/mesophyll-4' && c.cellB === '0/mesophyll-5'));
  for (const contact of contacts) {
    const a = shapes.get(contact.cellA)!, b = shapes.get(contact.cellB)!;
    assert.ok(a && b, 'Contact identities must resolve to real cells');
    const [start, end] = contact.points, dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy);
    assert.ok(length > 1 && length <= 8);
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

test('actual shared-wall contacts form a connected network over neighbouring bands', () => {
  const cells = [-1, 0, 1].flatMap(tile => mesophyllBand(tile)), graph = new Map(cells.map(cell => [cell.id, new Set<string>()]));
  for (const tile of [-1, 0, 1]) {
    for (const contact of mesophyllContacts(tile)) {
      if (!graph.has(contact.cellA) || !graph.has(contact.cellB)) continue;
      graph.get(contact.cellA)!.add(contact.cellB); graph.get(contact.cellB)!.add(contact.cellA);
    }
  }
  const visited = new Set<string>([cells[0].id]), pending = [cells[0].id];
  while (pending.length) for (const next of graph.get(pending.pop()!)!) if (!visited.has(next)) { visited.add(next); pending.push(next); }
  assert.equal(visited.size, cells.length);
  assert.ok(graph.get('0/mesophyll-4')!.size >= 1, 'The exact retained cell must participate in actual contacts');
});

test('short contacts retain distributed larger junction pores', () => {
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

test('periodic bands preserve entire cells across seams without introducing lateral cuts', () => {
  const base = mesophyllBand(0);
  for (const tile of [-3, -1, 1, 4]) {
    const other = mesophyllBand(tile);
    for (let i = 0; i < base.length; i++) {
      assert.equal(other[i].x, base[i].x);
      assert.equal(other[i].y, base[i].y);
      assert.strictEqual(other[i].contour, base[i].contour);
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
