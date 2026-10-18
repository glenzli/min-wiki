import { SURFACE_CELL_SCALE } from './model.ts';
type Point = readonly [number, number];
interface SurfaceCell { center: Point; contour: readonly Point[] }
export interface EpidermisGeometry {
  cells: readonly SurfaceCell[];
  walls: readonly (readonly Point[])[];
}

// A periodic illustrative cell sheet. One raw grid pitch maps to the model's
// 30 µm; it is no longer a grid of millimetre-wide cells spread over a leaf.
const FIELD = { left: -189, top: -231, width: 378, height: 420, step: 7 };
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vertexKey = ([x, y]: Point) => `${x.toFixed(5)},${y.toFixed(5)}`;

/** Shared walls are constructed once, so neighbouring cells never separate. */
export function createEpidermisGeometry(): EpidermisGeometry {
  const columns = FIELD.width / FIELD.step, rows = FIELD.height / FIELD.step;
  const sites: Point[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, col) => {
      const id = row * columns + col;
      return [FIELD.left + (col + .5 + (hash(id) - .5) * .48) * FIELD.step,
        FIELD.top + (row + .5 + (hash(id + 7001) - .5) * .48) * FIELD.step] as Point;
    }));
  const walls = new Map<string, readonly Point[]>(), cells: SurfaceCell[] = [];
  const siteAt = (row: number, col: number): Point => {
    const site = sites[(row % rows + rows) % rows][(col % columns + columns) % columns];
    return [site[0] + Math.floor(col / columns) * FIELD.width, site[1] + Math.floor(row / rows) * FIELD.height];
  };
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const [sx, sy] = sites[row][col];
    let polygon: Point[] = [[sx-14,sy-14],[sx+14,sy-14],[sx+14,sy+14],[sx-14,sy+14]];
    // Bounded jitter means distant sites cannot affect this Voronoi cell.
    for (let r = row - 2; r <= row + 2; r++) {
      for (let q = col - 2; q <= col + 2; q++) {
        if (r === row && q === col) continue;
        const [tx, ty] = siteAt(r,q), nx = tx - sx, ny = ty - sy;
        const d = (tx * tx + ty * ty - sx * sx - sy * sy) / 2;
        const clipped: Point[] = [];
        polygon.forEach((a, i) => {
          const b = polygon[(i + 1) % polygon.length];
          const da = a[0] * nx + a[1] * ny - d, db = b[0] * nx + b[1] * ny - d;
          if (da <= 0) clipped.push(a);
          if ((da <= 0) !== (db <= 0)) {
            const u = da / (da - db);
            clipped.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          }
        });
        polygon = clipped;
      }
    }
    // Canonical, slightly sinuous edges are reused in reverse by the neighbour.
    const contour: Point[] = [];
    polygon.forEach((vertex, i) => {
      const next = polygon[(i + 1) % polygon.length];
      const ox = Math.floor(((vertex[0]+next[0])/2-FIELD.left)/FIELD.width)*FIELD.width;
      const oy = Math.floor(((vertex[1]+next[1])/2-FIELD.top)/FIELD.height)*FIELD.height;
      const ka = vertexKey([vertex[0]-ox,vertex[1]-oy]), kb = vertexKey([next[0]-ox,next[1]-oy]), forward = ka < kb;
      const key = forward ? `${ka}:${kb}` : `${kb}:${ka}`;
      let wall = walls.get(key);
      if (!wall) {
        const a = (forward ? ka : kb).split(',').map(Number);
        const b = (forward ? kb : ka).split(',').map(Number);
        const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
        if (length < 1e-5) return;
        const phase = a[0] * .43 + a[1] * .61;
        wall = Array.from({ length: 13 }, (_, k) => {
          const u = k / 12;
          const wave = Math.min(.7, length * .15) * Math.sin(Math.PI * u) ** 1.4
            * Math.sin(2 * Math.PI * u + phase);
          return [a[0] + dx * u - dy / length * wave, a[1] + dy * u + dx / length * wave] as Point;
        });
        walls.set(key, wall);
      }
      contour.push(...(forward ? wall : [...wall].reverse()).slice(0, -1).map(([x,y])=>[x+ox,y+oy] as Point));
    });
    if (contour.length) cells.push({ center: [sx, sy], contour });
  }
  return { cells, walls: [...walls.values()] };
}

/** Intersections with the actual sheet, shared by the surface and cut edge. */
export function epidermisSeam(geometry: EpidermisGeometry, from: Point, to: Point): number[] {
  const dx = to[0] - from[0], dy = to[1] - from[1], positions = [0, 1];
  const left=Math.floor((Math.min(from[0],to[0])-FIELD.left)/FIELD.width)-1;
  const right=Math.floor((Math.max(from[0],to[0])-FIELD.left)/FIELD.width)+1;
  const top=Math.floor((Math.min(from[1],to[1])-FIELD.top)/FIELD.height)-1;
  const bottom=Math.floor((Math.max(from[1],to[1])-FIELD.top)/FIELD.height)+1;
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)
  for (const wall of geometry.walls) for (let k = 1; k < wall.length; k++) {
    const a:Point=[wall[k-1][0]+col*FIELD.width,wall[k-1][1]+row*FIELD.height];
    const b:Point=[wall[k][0]+col*FIELD.width,wall[k][1]+row*FIELD.height], ex=b[0]-a[0],ey=b[1]-a[1];
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-10) continue;
    const ax = a[0] - from[0], ay = a[1] - from[1];
    const t = (ax * ey - ay * ex) / denominator, u = (ax * dy - ay * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) positions.push(t);
  }
  return positions.sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-5);
}

/** Static transparent material: recolouring a leaf never regenerates cell shapes. */
export class EpidermisSurface {
  readonly geometry = createEpidermisGeometry();
  private plate?: HTMLCanvasElement;
  private pattern?: CanvasPattern;
  seam(from:Point,to:Point) {
    return epidermisSeam(this.geometry,from.map(v=>v/SURFACE_CELL_SCALE) as unknown as Point,
      to.map(v=>v/SURFACE_CELL_SCALE) as unknown as Point);
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (!this.plate) {
      const plate = document.createElement('canvas'), resolution = 6;
      plate.width = FIELD.width * resolution; plate.height = FIELD.height * resolution;
      const c = plate.getContext('2d')!;
      c.scale(resolution, resolution); c.translate(-FIELD.left, -FIELD.top);
      const copies=(points:readonly Point[])=>{
        const xs=[0],ys=[0];
        if(Math.min(...points.map(p=>p[0]))<FIELD.left)xs.push(FIELD.width);
        if(Math.max(...points.map(p=>p[0]))>FIELD.left+FIELD.width)xs.push(-FIELD.width);
        if(Math.min(...points.map(p=>p[1]))<FIELD.top)ys.push(FIELD.height);
        if(Math.max(...points.map(p=>p[1]))>FIELD.top+FIELD.height)ys.push(-FIELD.height);
        return xs.flatMap(x=>ys.map(y=>[x,y] as Point));
      };
      for (const [i, cell] of this.geometry.cells.entries()) for(const [ox,oy] of copies(cell.contour)) {
        c.save(); c.translate(ox,oy);
        c.beginPath(); cell.contour.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
        c.fillStyle = `rgba(250,246,226,${.1 + hash(i + 81) * .09})`; c.fill();
        // Sparse material variation is bound to each cell rather than a moving overlay.
        c.save(); c.clip();
        const [x, y] = cell.center;
        const body = c.createRadialGradient(x - 1.5, y - 2, .3, x, y, 4.8);
        body.addColorStop(0, '#fff8e91e'); body.addColorStop(1, '#4d493310');
        c.fillStyle = body; c.fillRect(x - 7, y - 7, 14, 14); c.restore();
        c.restore();
      }
      c.beginPath();
      for (const wall of this.geometry.walls) for(const [ox,oy] of copies(wall))
        wall.forEach(([x,y],k)=>k?c.lineTo(x+ox,y+oy):c.moveTo(x+ox,y+oy));
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = '#625b4759'; c.lineWidth = .24; c.stroke();
      c.strokeStyle = '#f4eddbd9'; c.lineWidth = .11; c.stroke();
      this.plate = plate;
    }
    if(!this.pattern) {
      this.pattern=ctx.createPattern(this.plate,'repeat')!;
      this.pattern.setTransform(new DOMMatrix([SURFACE_CELL_SCALE/6,0,0,SURFACE_CELL_SCALE/6,
        FIELD.left*SURFACE_CELL_SCALE,FIELD.top*SURFACE_CELL_SCALE]));
    }
    ctx.fillStyle=this.pattern;ctx.fillRect(-200,-240,400,440);
  }
  dispose() { if (this.plate) { this.plate.width = this.plate.height = 0; this.plate = undefined; this.pattern=undefined; } }
}
