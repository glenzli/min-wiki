import { SCALE_ENTRIES, SECTION_SPAN, cellEdge } from './model.ts';

export type Point = readonly [number, number];

export interface MesophyllCell {
  id: string;
  x: number;
  y: number;
  /** An implicitly closed contour in cell-local coordinates, without rotation. */
  contour: readonly Point[];
  selected: boolean;
}

export interface MesophyllContact {
  cellA: string;
  cellB: string;
  /** A shared boundary segment, in the owning band's local coordinates. */
  points: readonly [Point, Point];
}

interface Site { x: number; y: number; retained?: boolean }
interface Contact { a: number; b: number; offset: number; points: readonly [Point, Point]; length: number }

const TOP = 10, BOTTOM = 113, WALL_INSET = 2.1;
const entry = SCALE_ENTRIES[1];
const retainedSite: Site = { x: entry.x, y: entry.y - 2 * entry.size, retained: true };
const retainedContour: readonly Point[] = Object.freeze(Array.from({ length: 97 }, (_, i) => {
  const [x, y] = cellEdge(i / 96 * Math.PI * 2, 171, 134, 1.4, .85);
  return Object.freeze([x * entry.size, y * entry.size] as const);
}));

/** An authored, periodic section of irregular cells. These are illustration
 * parameters, not a species-specific anatomy or a measured 3D porosity.
 *
 * Spongy mesophyll has intercellular air spaces and an organized cell network:
 * https://openstax.org/books/biology-2e/pages/30-4-leaves
 * https://doi.org/10.1111/nph.17971
 * A 2D section cannot establish the tissue's 3D contact topology. */
const sites: readonly Site[] = [
  { x: -194, y: 31 }, { x: -139, y: 39 }, { x: -81, y: 30 }, { x: -26, y: 36 },
  retainedSite, { x: 92, y: 30 }, { x: 147, y: 40 }, { x: 196, y: 29 },
  { x: -214, y: 88 }, { x: -165, y: 85 }, { x: -111, y: 94 }, { x: -56, y: 82 },
  { x: -5, y: 96 }, { x: 55, y: 88 }, { x: 111, y: 95 }, { x: 169, y: 86 },
];

/** Intersect a convex polygon with n·p <= limit. */
function clip(polygon: readonly Point[], nx: number, ny: number, limit: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = nx * a[0] + ny * a[1] - limit, db = nx * b[0] + ny * b[1] - limit;
    if (da <= 1e-9) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}

function inset(polygon: readonly Point[], distance: number): readonly Point[] {
  let result = polygon;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const nx = b[1] - a[1], ny = a[0] - b[0];
    result = clip(result, nx, ny, nx * a[0] + ny * a[1] - distance * Math.hypot(nx, ny));
  }
  return result;
}

function rounded(polygon: readonly Point[], seed: number): readonly Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[(i + polygon.length - 1) % polygon.length], b = polygon[i], c = polygon[(i + 1) % polygon.length];
    const q = .44 + .04 * Math.sin(seed * 1.73 + i * 2.41);
    const start: Point = [b[0] + (a[0] - b[0]) * q, b[1] + (a[1] - b[1]) * q];
    const end: Point = [b[0] + (c[0] - b[0]) * q, b[1] + (c[1] - b[1]) * q];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6, s = 1 - t;
      result.push([s * s * start[0] + 2 * s * t * b[0] + t * t * end[0],
        s * s * start[1] + 2 * s * t * b[1] + t * t * end[1]]);
    }
  }
  return result;
}

function neighbourPartition(site: Site): readonly Point[] {
  // Periodic neighbours, rather than a clip at the band edge, determine the
  // lateral boundaries. Cells can therefore cross a tile seam intact.
  let polygon: readonly Point[] = [[site.x - SECTION_SPAN / 2, TOP], [site.x + SECTION_SPAN / 2, TOP],
    [site.x + SECTION_SPAN / 2, BOTTOM], [site.x - SECTION_SPAN / 2, BOTTOM]];
  for (const shift of [-SECTION_SPAN, 0, SECTION_SPAN]) {
    for (const other of sites) {
      if (other === site && shift === 0) continue;
      const x = other.x + shift, y = other.y, nx = x - site.x, ny = y - site.y;
      polygon = clip(polygon, nx, ny, (x * x + y * y - site.x * site.x - site.y * site.y) / 2);
    }
    // The retained cell is not replaced by its Voronoi polygon. Keep every
    // neighbour outside a supporting line of its exact existing outline.
    const x = retainedSite.x + shift, nx = site.x - x, ny = site.y - retainedSite.y;
    const support = Math.max(...retainedContour.map(p => p[0] * nx + p[1] * ny));
    polygon = clip(polygon, -nx, -ny, -nx * x - ny * retainedSite.y - support - 1.2 * Math.hypot(nx, ny));
  }
  return polygon;
}

const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unique = sorted.filter((p, i) => !i || Math.hypot(p[0] - sorted[i - 1][0], p[1] - sorted[i - 1][1]) > 1e-9);
  const lower: Point[] = [], upper: Point[] = [];
  for (const point of unique) {
    while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 1e-10) lower.pop();
    lower.push(point);
  }
  for (const point of unique.reverse()) {
    while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 1e-10) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Restore only the middle of a common partition edge. Its ends remain well
 * away from the multi-cell junctions, where the larger air pores are retained. */
function sharedSegment(a: readonly Point[], b: readonly Point[]): { points: readonly [Point, Point]; length: number } | undefined {
  for (let i = 0; i < a.length; i++) {
    const start = a[i], end = a[(i + 1) % a.length], dx = end[0] - start[0], dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    if (length < 16) continue;
    for (let j = 0; j < b.length; j++) {
      const p = b[j], q = b[(j + 1) % b.length];
      if (Math.abs(cross(start, end, p)) > 1e-7 * length || Math.abs(cross(start, end, q)) > 1e-7 * length) continue;
      const t0 = ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / (length * length);
      const t1 = ((q[0] - start[0]) * dx + (q[1] - start[1]) * dy) / (length * length);
      const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1)), commonLength = (hi - lo) * length;
      if (commonLength < 16) continue;
      const middle = (lo + hi) / 2, half = Math.min(7, commonLength * .28) / length / 2;
      return { points: [[start[0] + dx * (middle - half), start[1] + dy * (middle - half)],
        [start[0] + dx * (middle + half), start[1] + dy * (middle + half)]], length: commonLength };
    }
  }
}

const ordinary = sites.map((_, i) => i).filter(i => !sites[i].retained);
const partitions = sites.map(site => site.retained ? [] : neighbourPartition(site));
const roundedContours = partitions.map((polygon, i) => polygon.length ? rounded(inset(polygon, WALL_INSET), i) : []);

function ownsOrdinaryRegion(index: number, point: Point): boolean {
  const site = sites[index], distance = (point[0] - site.x) ** 2 + (point[1] - site.y) ** 2;
  return ordinary.every(j => [-SECTION_SPAN, 0, SECTION_SPAN].every(shift =>
    distance <= (point[0] - sites[j].x - shift) ** 2 + (point[1] - sites[j].y) ** 2 + 1e-7));
}

function buildContacts(): { contours: readonly (readonly Point[])[]; contacts: readonly Contact[] } {
  const candidates: Contact[] = [];
  for (const a of ordinary) {
    for (const b of ordinary) {
      for (const offset of [0, 1]) {
        if (!offset && a >= b) continue;
        const other = partitions[b].map(([x, y]) => [x + offset * SECTION_SPAN, y] as const);
        const edge = sharedSegment(partitions[a], other);
        if (edge) candidates.push({ a, b, offset, ...edge });
      }
    }
  }
  candidates.sort((a, b) => b.length - a.length || a.a - b.a || a.b - b.b);
  // A same-band spanning tree guarantees actual contacts connect the tissue.
  // Additional possible neighbours retain open gaps instead of closing every
  // adjacency. One cross-band contact continues that tree over each seam.
  const roots = sites.map((_, i) => i), contacts: Contact[] = [];
  const root = (i: number): number => roots[i] === i ? i : root(roots[i]);
  for (const contact of candidates.filter(c => !c.offset)) {
    const a = root(contact.a), b = root(contact.b);
    if (a === b) continue;
    contacts.push(contact); roots[a] = b;
  }
  const seam = candidates.find(c => c.offset === 1);
  if (seam) contacts.push(seam);
  const additions: Point[][] = sites.map(() => []);
  for (const contact of contacts) {
    additions[contact.a].push(...contact.points);
    additions[contact.b].push(...contact.points.map(([x, y]) => [x - contact.offset * SECTION_SPAN, y] as const));
  }
  const contours = roundedContours.map((points, i) => points.length ? convexHull([...points, ...additions[i]]) : []);
  const selected = sites.findIndex(site => site.retained);
  const retained = retainedContour.slice(0, -1).map(([x, y]) => [x + retainedSite.x, y + retainedSite.y] as const);
  const retainedCandidates: Contact[] = [];
  for (const b of ordinary) {
    let best: Contact | undefined;
    for (let i = 0; i < retained.length; i++) {
      const p = retained[i], q = retained[(i + 1) % retained.length], length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      // A supporting facet separates the complete retained cell from the
      // neighbour hull. Both endpoints must also belong to that neighbour's
      // ordinary-cell Voronoi region, so other cells cannot be crossed.
      if (retained.some(point => cross(p, q, point) < -1e-8) || contours[b].some(point => cross(p, q, point) > 1e-8)) continue;
      if (!ownsOrdinaryRegion(b, p) || !ownsOrdinaryRegion(b, q)) continue;
      if (!best || length > best.length) best = { a: selected, b, offset: 0, points: [p, q], length };
    }
    if (best) retainedCandidates.push(best);
  }
  retainedCandidates.sort((a, b) => b.length - a.length);
  const retainedContacts: Contact[] = [];
  for (const contact of retainedCandidates) {
    const direction: Point = [sites[contact.b].x - retainedSite.x, sites[contact.b].y - retainedSite.y];
    if (retainedContacts.some(other => {
      const otherDirection: Point = [sites[other.b].x - retainedSite.x, sites[other.b].y - retainedSite.y];
      return (direction[0] * otherDirection[0] + direction[1] * otherDirection[1]) > .5 * Math.hypot(...direction) * Math.hypot(...otherDirection);
    })) continue;
    contours[contact.b] = convexHull([...contours[contact.b], ...contact.points]);
    retainedContacts.push(contact);
    if (retainedContacts.length === 2) break;
  }
  return { contours, contacts: [...contacts, ...retainedContacts] };
}

// Geometry is constructed once. Requesting arbitrarily many bands retains no
// growing map of tiles; each band only qualifies the same local identities.
const geometry = buildContacts();
const template = sites.map((site, i) => Object.freeze({
  id: `mesophyll-${i}`, x: site.x, y: site.y,
  contour: site.retained ? retainedContour : Object.freeze(geometry.contours[i].map(([x, y]) =>
    Object.freeze([x - site.x, y - site.y] as const))),
  selected: !!site.retained,
}));
const contactTemplate = geometry.contacts.map(contact => Object.freeze({ ...contact,
  points: Object.freeze([Object.freeze(contact.points[0]), Object.freeze(contact.points[1])] as const),
}));

/** Cell centers are local to a SECTION_SPAN-wide tile. Translate the whole band
 * by tile * SECTION_SPAN; do not clip individual cells to the tile rectangle.
 * Only tile zero owns the cell that is magnified by the nested-scale scene. */
export function mesophyllBand(tile: number): readonly MesophyllCell[] {
  if (!Number.isSafeInteger(tile)) throw new RangeError('Mesophyll tile must be a safe integer');
  return template.map(cell => ({ ...cell, id: `${tile}/${cell.id}`, selected: tile === 0 && cell.selected }));
}

/** Each shared wall is returned once. cellA belongs to tile; cellB belongs to
 * tile or tile+1. Translate both endpoints by tile * SECTION_SPAN, just as for
 * the band's cells. These segments are exact parts of both cell boundaries. */
export function mesophyllContacts(tile: number): readonly MesophyllContact[] {
  if (!Number.isSafeInteger(tile)) throw new RangeError('Mesophyll tile must be a safe integer');
  return contactTemplate.map(contact => ({ cellA: `${tile}/mesophyll-${contact.a}`,
    cellB: `${tile + contact.offset}/mesophyll-${contact.b}`, points: contact.points }));
}

/** Sample a star-shaped cell contour along a polar ray. The radius is a
 * fraction of the distance to its wall, useful for clipped local organelles.
 * It is independent of the contour's vertex spacing and returns cell-local
 * coordinates. Empty contours or non-finite angle/radius return the center. */
export function contourPoint(contour: readonly Point[], angle: number, radius = 1): Point {
  if (contour.length < 3 || !Number.isFinite(angle) || !Number.isFinite(radius)) return [0, 0];
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let distance = Infinity;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length], ex = b[0] - a[0], ey = b[1] - a[1];
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-12) continue;
    const t = (a[0] * ey - a[1] * ex) / denominator;
    const u = (a[0] * dy - a[1] * dx) / denominator;
    if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) distance = Math.min(distance, t);
  }
  if (!Number.isFinite(distance)) return [0, 0];
  const r = distance * Math.max(0, Math.min(1, radius));
  return [dx * r, dy * r];
}
