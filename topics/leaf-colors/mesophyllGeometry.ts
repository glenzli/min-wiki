import { SCALE_ENTRIES, SECTION_SPAN, mesophyllCellEdge, smooth } from './model.ts';

export type Point = readonly [number, number];
export interface MesophyllCell {
  id: string;
  x: number;
  y: number;
  /** Implicitly closed, star-shaped outline relative to this cell's center. */
  contour: readonly Point[];
  selected: boolean;
}
export interface MesophyllContact {
  cellA: string;
  cellB: string;
  /** A shared boundary segment in the owning band's local coordinates. */
  points: readonly [Point, Point];
}
interface Site { x: number; y: number; retained?: boolean }
interface Contact { a: number; b: number; offset: number; points: readonly [Point, Point] }
type Segment = readonly [Point, Point];
const TOP = 10, BOTTOM = 113, TAU = Math.PI * 2;
const entry = SCALE_ENTRIES[1];
const retainedSite: Site = { x: entry.x, y: entry.y - 2 * entry.size, retained: true };
const retainedContour: readonly Point[] = freezePoints(Array.from({ length: 97 }, (_, i) => {
  const [x, y] = mesophyllCellEdge(i / 96 * TAU);
  return [x * entry.size, y * entry.size];
}));

/** Authored transverse-section anatomy, not a traced specimen or a porosity
 * calibration. Varied profiles and pockets follow the UTokyo micrograph of
 * Chenopodium album; the paradermal three-armed cells in Borsuk et al. must not
 * be copied as the appearance of every transverse profile.
 * https://www.u-tokyo.ac.jp/focus/ja/features/z1304_00207.html
 * https://www.u-tokyo.ac.jp/content/400200842.jpg
 * https://doi.org/10.1111/nph.17971
 * A section need not expose every contact in a three-dimensional tissue. */
const sites: readonly Site[] = [
  { x: -204, y: 25 }, { x: -169, y: 51 }, { x: -130, y: 24 }, { x: -111, y: 76 },
  retainedSite, { x: -68, y: 40 }, { x: -34, y: 21 }, { x: -12, y: 72 },
  { x: 73, y: 22 }, { x: 91, y: 63 }, { x: 135, y: 38 }, { x: 163, y: 19 },
  { x: 190, y: 57 }, { x: 215, y: 24 }, { x: -211, y: 93 }, { x: -160, y: 99 },
  { x: -132, y: 61 }, { x: -75, y: 99 }, { x: -40, y: 94 }, { x: 39, y: 98 },
  { x: 70, y: 76 }, { x: 115, y: 98 }, { x: 157, y: 80 }, { x: 203, y: 102 },
  { x: -185, y: 24 }, { x: -144, y: 81 }, { x: -89, y: 20 }, { x: -48, y: 76 },
  { x: -18, y: 39 }, { x: 12, y: 78 }, { x: 61, y: 105 }, { x: 104, y: 20 },
  { x: 126, y: 89 }, { x: 177, y: 35 }, { x: 181, y: 90 }, { x: 216, y: 50 },
];

/** Pockets and their occasional narrow extensions determine wall concavities.
 * These are explicit spatial objects, rather than independent random wiggles
 * applied to each cell. Several pockets share a narrow mouth; broad chambers,
 * flattened faces and crooked branches deliberately have different curvature. */
const pockets: readonly (readonly Point[])[] = [
  [[-205,47],[-200,43],[-194,49],[-193,61],[-182,63],[-176,57],[-166,64],[-168,73],[-163,79],[-177,87],[-192,90],[-202,80],[-199,69],[-208,61]],
  [[-151,32],[-142,29],[-132,35],[-128,39],[-108,40],[-109,28],[-100,22],[-90,34],[-91,50],[-98,60],[-108,56],[-112,46],[-132,46],[-142,52],[-153,45]],
  [[-96,70],[-89,66],[-79,65],[-71,68],[-59,68],[-59,75],[-68,80],[-83,83],[-93,78]],
  [[-46,39],[-35,40],[-25,50],[-21,59],[-30,68],[-39,67],[-48,59]],
  [[-13,98],[-8,88],[3,88],[12,95],[16,87],[25,94],[32,107],[26,116],[5,121],[-5,111],[-16,109]],
  [[68,42],[73,34],[81,34],[85,39],[91,42],[87,51],[81,56],[74,54],[66,49]],
  [[102,65],[111,60],[120,62],[125,66],[144,62],[147,56],[154,47],[164,43],[178,47],[181,57],[171,65],[157,62],[150,67],[131,70],[123,75],[116,83],[106,82],[101,74]],
  [[201,65],[209,62],[215,65],[220,75],[219,82],[210,90],[205,87],[200,80]],
];

function freezePoints(points: readonly Point[]): readonly Point[] {
  return Object.freeze(points.map(([x, y]) => Object.freeze([x, y] as const)));
}
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function segments(points: readonly Point[]): Segment[] { return points.map((p, i) => [p, points[(i + 1) % points.length]]); }
function translated(points: readonly Point[], shift: number): Point[] { return points.map(([x, y]) => [x + shift, y]); }

function clip(polygon: readonly Point[], nx: number, ny: number, limit: number): Point[] {
  const result: Point[] = [];
  for (const [a, b] of segments(polygon)) {
    const da = nx * a[0] + ny * a[1] - limit, db = nx * b[0] + ny * b[1] - limit;
    if (da <= 1e-9) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}

function partition(site: Site): readonly Point[] {
  let polygon: readonly Point[] = [[site.x - SECTION_SPAN / 2, TOP], [site.x + SECTION_SPAN / 2, TOP],
    [site.x + SECTION_SPAN / 2, BOTTOM], [site.x - SECTION_SPAN / 2, BOTTOM]];
  for (const shift of [-SECTION_SPAN, 0, SECTION_SPAN]) for (const other of sites) {
    if (other.retained || (other === site && !shift)) continue;
    const x = other.x + shift, y = other.y, nx = x - site.x, ny = y - site.y;
    polygon = clip(polygon, nx, ny, (x * x + y * y - site.x * site.x - site.y * site.y) / 2);
  }
  return polygon;
}

/** Unequal oval section profiles occupy only part of their spatial partition.
 * Local neighbour distances set their four extents. Where profiles press into
 * a shared partition face a broad wall remains; elsewhere the cell is rounded
 * and separated by air. Outermost ends do not all flatten onto the layer edge. */
function bodyPartition(site: Site): readonly Point[] {
  let polygon = partition(site);
  const box = bounds(polygon), left = (site.x - box[0]) * 1.1, right = (box[1] - site.x) * 1.1;
  const top = (site.y - box[2]) * (Math.abs(box[2] - TOP) < 1e-7 ? .96 : 1.12);
  const bottom = (box[3] - site.y) * (Math.abs(box[3] - BOTTOM) < 1e-7 ? .96 : 1.12);
  const envelope = Array.from({ length: 96 }, (_, i) => {
    const angle = i / 96 * TAU, x = Math.cos(angle), y = Math.sin(angle);
    return [site.x + x * (x < 0 ? left : right), site.y + y * (y < 0 ? top : bottom)] as const;
  });
  for (const [a, b] of segments(envelope)) {
    const nx = b[1] - a[1], ny = a[0] - b[0];
    polygon = clip(polygon, nx, ny, nx * a[0] + ny * a[1]);
  }
  return polygon;
}

function bounds(points: readonly Point[]): readonly [number, number, number, number] {
  return [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
    Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))];
}
function intersects(a: readonly Point[], b: readonly Point[]): boolean {
  const p = bounds(a), q = bounds(b);
  return p[0] <= q[1] && q[0] <= p[1] && p[2] <= q[3] && q[2] <= p[3];
}
function rayDistance(origin: Point, angle: number, edges: readonly Segment[]): number {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let nearest = Infinity;
  for (const [a, b] of edges) {
    const ex = b[0] - a[0], ey = b[1] - a[1], denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-12) continue;
    const ax = a[0] - origin[0], ay = a[1] - origin[1];
    const t = (ax * ey - ay * ex) / denominator, u = (ax * dy - ay * dx) / denominator;
    if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) nearest = Math.min(nearest, t);
  }
  return nearest;
}

/** Keep the center-visible part of a cell's partition around explicit pores
 * and the unchanged retained cell. All obstacle vertices contribute critical
 * rays, so curved/concave obstacle boundaries cannot be cut by a coarse chord.
 * No convex hull or narrow connector is added after the pores are cut. */
function visibleContour(site: Site, polygon: readonly Point[], obstacles: readonly (readonly Point[])[]): readonly Point[] {
  const localObstacles = obstacles.filter(obstacle => intersects(polygon, obstacle)).map(obstacle => {
    let clipped = obstacle;
    for (const [a, b] of segments(polygon)) {
      const nx = b[1] - a[1], ny = a[0] - b[0];
      clipped = clip(clipped, nx, ny, nx * a[0] + ny * a[1]);
    }
    return clipped;
  }).filter(obstacle => obstacle.length >= 3);
  const edges = [polygon, ...localObstacles].flatMap(segments), origin: Point = [site.x, site.y];
  const vertices = [polygon, ...localObstacles].flat();
  const angles = Array.from({ length: 80 }, (_, i) => i / 80 * TAU);
  for (const point of vertices) {
    const angle = Math.atan2(point[1] - site.y, point[0] - site.x);
    angles.push(angle - 1e-8, angle, angle + 1e-8);
  }
  const points = angles.map(angle => ((angle % TAU) + TAU) % TAU).sort((a, b) => a - b).map(angle => {
    const radius = rayDistance(origin, angle, edges);
    const point: Point = [site.x + Math.cos(angle) * radius, site.y + Math.sin(angle) * radius];
    return vertices.find(vertex => Math.hypot(point[0] - vertex[0], point[1] - vertex[1]) < 1e-6) ?? point;
  });
  return simplify(points);
}

function simplify(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  const between = (a: Point, p: Point, b: Point) => Math.abs(cross(a, p, b)) < 1e-8 * Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1])) &&
    (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]) <= 1e-8;
  for (const point of points) {
    if (result.length && Math.hypot(point[0] - result[result.length - 1][0], point[1] - result[result.length - 1][1]) < 1e-7) continue;
    while (result.length > 1 && between(result[result.length - 2], result[result.length - 1], point)) result.pop();
    result.push(point);
  }
  if (result.length > 1 && Math.hypot(result[0][0] - result[result.length - 1][0], result[0][1] - result[result.length - 1][1]) < 1e-7) result.pop();
  while (result.length > 3 && between(result[result.length - 1], result[0], result[1])) result.shift();
  while (result.length > 3 && between(result[result.length - 2], result[result.length - 1], result[0])) result.pop();
  return result;
}

/** Smooth a whole boundary at a fixed spatial scale, including the concave
 * joins left by pore clipping. Arc-length sampling prevents tiny ray-casting
 * edges from preserving a sharp tip despite adding many curve vertices.
 * Weighted averages remain in each cell's convex ownership partition; long
 * shared straight walls keep their middle portions rather than drifting apart.
 * The retained cell and its immediate contact boundary are left exact. */
function softenProfile(points: readonly Point[]): readonly Point[] {
  const edges=segments(points),lengths=edges.map(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1]));
  const perimeter=lengths.reduce((sum,length)=>sum+length,0),count=Math.max(32,Math.ceil(perimeter/.7)),step=perimeter/count;
  let edge=0,offset=0;
  const samples=Array.from({length:count},(_,i)=>{
    const distance=i*step;
    while(edge<edges.length-1&&offset+lengths[edge]<distance)offset+=lengths[edge++];
    const [a,b]=edges[edge],u=lengths[edge]?(distance-offset)/lengths[edge]:0;
    return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u] as const;
  });
  const sigma=2.8,support=Math.ceil(3*sigma/step),selectedEdges=segments(retainedWorld);
  const weights=Array.from({length:support*2+1},(_,i)=>Math.exp(-(((i-support)*step)**2)/(2*sigma*sigma)));
  const weightSum=weights.reduce((sum,weight)=>sum+weight,0);
  const clearanceAt=(point:Point)=>Math.min(...selectedEdges.map(([a,b])=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],squared=dx*dx+dy*dy;
    const u=squared?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/squared)):0;
    return Math.hypot(point[0]-a[0]-u*dx,point[1]-a[1]-u*dy);
  }));
  const softened=samples.map((point,i)=>{
    let x=0,y=0;
    for(let j=-support;j<=support;j++) {
      const sample=samples[(i+j+count)%count],weight=weights[j+support];
      x+=sample[0]*weight;y+=sample[1]*weight;
    }
    const amount=smooth(2,6,clearanceAt(point));
    return {distance:i*step,point:[point[0]+(x/weightSum-point[0])*amount,point[1]+(y/weightSum-point[1])*amount] as Point};
  });
  // Keep every original knot beside the selected wall. Uniform resampling
  // alone could chord across its convex corners even if its samples stay put.
  let distance=0;
  points.forEach((point,i)=>{
    if(clearanceAt(point)<=2+1e-8)softened.push({distance,point});
    distance+=lengths[i];
  });
  return simplify(softened.sort((a,b)=>a.distance-b.distance).map(sample=>sample.point));
}

const retainedWorld = retainedContour.map(([x, y]) => [x + retainedSite.x, y + retainedSite.y] as const);
const poreOutlines = pockets.map(pocket => {
  const result: Point[] = [];
  for (let i = 0; i < pocket.length; i++) {
    const a = pocket[(i + pocket.length - 1) % pocket.length], b = pocket[i], c = pocket[(i + 1) % pocket.length];
    const q = cross(a, b, c) < 0 ? .28 : .42;
    const start: Point = [b[0] + (a[0] - b[0]) * q, b[1] + (a[1] - b[1]) * q];
    const end: Point = [b[0] + (c[0] - b[0]) * q, b[1] + (c[1] - b[1]) * q];
    for (let j = 0; j <= 6; j++) { const t = j / 6, s = 1 - t; result.push([s * s * start[0] + 2 * s * t * b[0] + t * t * end[0], s * s * start[1] + 2 * s * t * b[1] + t * t * end[1]]); }
  }
  return result;
});
const obstacles = [-SECTION_SPAN, 0, SECTION_SPAN].flatMap(shift =>
  [retainedWorld, ...poreOutlines].map(outline => translated(outline, shift)));
const worldContours = sites.map(site => site.retained ? retainedWorld : softenProfile(visibleContour(site, bodyPartition(site), obstacles)));

function sharedSegments(a: readonly Point[], b: readonly Point[]): Segment[] {
  const result: Segment[] = [];
  for (const [start, end] of segments(a)) {
    const dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy);
    if (length < .75) continue;
    for (const [p, q] of segments(b)) {
      if (Math.abs(cross(start, end, p)) > 1e-6 * length || Math.abs(cross(start, end, q)) > 1e-6 * length) continue;
      const t0 = ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / (length * length);
      const t1 = ((q[0] - start[0]) * dx + (q[1] - start[1]) * dy) / (length * length);
      const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
      if ((hi - lo) * length < .75) continue;
      result.push([[start[0] + dx * lo, start[1] + dy * lo], [start[0] + dx * hi, start[1] + dy * hi]]);
    }
  }
  return result;
}
const contacts: Contact[] = [];
for (let a = 0; a < sites.length; a++) for (let b = 0; b < sites.length; b++) for (const offset of [0, 1]) {
  if (!offset && a >= b) continue;
  const other = translated(worldContours[b], offset * SECTION_SPAN);
  if (!intersects(worldContours[a], other)) continue;
  for (const points of sharedSegments(worldContours[a], other)) contacts.push({ a, b, offset,
    points: Object.freeze([Object.freeze(points[0]), Object.freeze(points[1])] as const) });
}
const template = sites.map((site, i) => Object.freeze({ id: 'mesophyll-' + i, x: site.x, y: site.y,
  contour: site.retained ? retainedContour : freezePoints(worldContours[i].map(([x, y]) => [x - site.x, y - site.y])),
  selected: !!site.retained }));

// Narrow, closely apposed columns share the same gently bowed lateral walls.
// A few shorter profiles represent different cuts/ends, not another uniform row.
const columnEdges = [-217, -199, -175, -155, -131, -105, -87, -62, -38, -18, 7, 25, 49, 73, 90, 117, 140, 164, 184, 204, 217];
const columnBows = [.8, -1.8, 2.2, -.7, 1.5, -2, .5, 1.8, -1.2, .7, -1.5, 1.1, -2.1, .6, 1.8, -.8, 1.2, -1.7, .4, -1.1, .8];
const columnBottoms = [7, 2, 10, 6, 9, -4, 3, 10, 5, -2, 8, 1, 9, 6, 10, -3, 5, 10, 2, 7];
const columnSplits = new Map([[2, -39], [8, -25], [14, -49], [18, -18]]);
// A neighbour ending part-way down a bowed wall uses the same polyline knots,
// rather than a different chord approximation that could cross the first wall.
const wallKnots = [...new Set([-112, 10, ...columnBottoms, ...columnSplits.values(),
  ...Array.from({ length: 16 }, (_, i) => -112 + i * 8)])].sort((a, b) => a - b);
function wall(index: number, y: number): Point {
  const xAt=(yy:number)=>columnEdges[index]+columnBows[index]*Math.sin((yy+112)/122*Math.PI);
  const upper=wallKnots.findIndex(knot=>knot>=y);
  if(upper<=0)return [xAt(y),y];
  const a=wallKnots[upper-1],b=wallKnots[upper],u=(y-a)/(b-a);
  return [xAt(a)+(xAt(b)-xAt(a))*u,y];
}
function wallSlope(index:number,y:number):number {
  const upper=wallKnots.findIndex(knot=>knot>y);
  const i=Math.max(1,upper<0?wallKnots.length-1:upper),a=wall(index,wallKnots[i-1]),b=wall(index,wallKnots[i]);
  return (b[0]-a[0])/(b[1]-a[1]);
}
function palisadeProfile(index: number, top: number, bottom: number): readonly Point[] {
  const rx=Math.min(9,(columnEdges[index+1]-columnEdges[index])*.38),ry=Math.min(rx,(bottom-top)*.18);
  const lt=wall(index,top),rt=wall(index+1,top),lb=wall(index,bottom),rb=wall(index+1,bottom);
  const result:Point[]=[[lt[0]+rx,top],[rt[0]-rx,top]];
  const cap=(from:Point,control:Point,to:Point)=>{
    const times=Array.from({length:16},(_,i)=>(i+1)/16);
    const aa=from[1]-2*control[1]+to[1],bb=2*(control[1]-from[1]);
    // Include every shared side-wall knot crossed by this cap, so the sampled
    // curve stays inside the same piecewise-linear strip as its neighbour.
    for(const y of wallKnots)if(y>Math.min(from[1],to[1])&&y<Math.max(from[1],to[1])) {
      const cc=from[1]-y,root=Math.sqrt(Math.max(0,bb*bb-4*aa*cc));
      for(const t of Math.abs(aa)<1e-12?[-cc/bb]:[(-bb+root)/(2*aa),(-bb-root)/(2*aa)])if(t>0&&t<1)times.push(t);
    }
    for(const t of times.sort((a,b)=>a-b)) {
      const u=1-t,y=u*u*from[1]+2*u*t*control[1]+t*t*to[1];
      const x=u*u*from[0]+2*u*t*control[0]+t*t*to[0];
      result.push([Math.max(wall(index,y)[0],Math.min(wall(index+1,y)[0],x)),y]);
    }
  };
  const rightTop=wall(index+1,top+ry),rightBottom=wall(index+1,bottom-ry);
  cap(result[result.length-1],[rightTop[0]-wallSlope(index+1,top+ry)*ry,top],rightTop);
  for(const y of wallKnots)if(y>top+ry&&y<bottom-ry)result.push(wall(index+1,y));
  result.push(rightBottom);
  cap(rightBottom,[rightBottom[0]+wallSlope(index+1,bottom-ry-1e-8)*ry,bottom],[rb[0]-rx,bottom]);
  result.push([lb[0]+rx,bottom]);
  const leftBottom=wall(index,bottom-ry),leftTop=wall(index,top+ry);
  cap(result[result.length-1],[leftBottom[0]+wallSlope(index,bottom-ry-1e-8)*ry,bottom],leftBottom);
  for(const y of [...wallKnots].reverse())if(y>top+ry&&y<bottom-ry)result.push(wall(index,y));
  result.push(leftTop);
  cap(leftTop,[leftTop[0]-wallSlope(index,top+ry)*ry,top],result[0]);
  return simplify(result);
}
const palisadeTemplate: MesophyllCell[] = [];
for (let i = 0; i < columnEdges.length - 1; i++) {
  const split = columnSplits.get(i);
  const stops = split === undefined ? [-112, columnBottoms[i]] : [-112, split, columnBottoms[i]];
  for (let j = 1; j < stops.length; j++) {
    const y = (stops[j - 1] + stops[j]) / 2, x = (wall(i, y)[0] + wall(i + 1, y)[0]) / 2;
    palisadeTemplate.push(Object.freeze({ id: 'palisade-' + i + '-' + j, x, y, selected: false,
      contour: freezePoints(palisadeProfile(i, stops[j - 1], stops[j]).map(([px, py]) => [px - x, py - y])) }));
  }
}

function validateTile(tile: number) { if (!Number.isSafeInteger(tile)) throw new RangeError('Mesophyll tile must be a safe integer'); }
/** Translate the complete local band by tile*SECTION_SPAN; do not cut cells at
 * a tile seam. Geometry is constructed once and no growing tile map is kept. */
export function mesophyllBand(tile: number): readonly MesophyllCell[] {
  validateTile(tile);
  return template.map(cell => ({ ...cell, id: String(tile) + '/' + cell.id, selected: tile === 0 && cell.selected }));
}
/** Contacts are observed shared contour portions, not proximity links. A cell
 * pair may have several adjacent segments, especially beside the retained cell.
 * cellA is in tile and cellB in tile or tile+1; endpoints are tile-local. */
export function mesophyllContacts(tile: number): readonly MesophyllContact[] {
  validateTile(tile);
  return contacts.map(contact => ({ cellA: String(tile) + '/mesophyll-' + contact.a,
    cellB: String(tile + contact.offset) + '/mesophyll-' + contact.b, points: contact.points }));
}
/** Closely apposed palisade profiles in the existing -112..10 layer. */
export function palisadeBand(tile: number): readonly MesophyllCell[] {
  validateTile(tile);
  return palisadeTemplate.map(cell => ({ ...cell, id: String(tile) + '/' + cell.id }));
}

/** Sample a star-shaped cell along a polar ray; radius is a fraction of the
 * wall distance. Empty contours/non-finite angle or radius return the center. */
export function contourPoint(contour: readonly Point[], angle: number, radius = 1): Point {
  if (contour.length < 3 || !Number.isFinite(angle) || !Number.isFinite(radius)) return [0, 0];
  const distance = rayDistance([0, 0], angle, segments(contour));
  if (!Number.isFinite(distance)) return [0, 0];
  const r = distance * Math.max(0, Math.min(1, radius));
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}
