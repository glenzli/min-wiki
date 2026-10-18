type Point = readonly [number, number];
interface SurfaceCell { center: Point; contour: readonly Point[] }
export interface EpidermisGeometry {
  cells: readonly SurfaceCell[];
  walls: readonly (readonly Point[])[];
}

// An illustrative pavement-cell sheet in the blade's permanent coordinates.
// Density is compressed for teaching; these are not calibrated microscope units.
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
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const [sx, sy] = sites[row][col];
    let polygon: Point[] = [[FIELD.left, FIELD.top], [FIELD.left + FIELD.width, FIELD.top],
      [FIELD.left + FIELD.width, FIELD.top + FIELD.height], [FIELD.left, FIELD.top + FIELD.height]];
    // Bounded jitter means distant sites cannot affect this Voronoi cell.
    for (let r = Math.max(0, row - 2); r <= Math.min(rows - 1, row + 2); r++) {
      for (let q = Math.max(0, col - 2); q <= Math.min(columns - 1, col + 2); q++) {
        if (r === row && q === col) continue;
        const [tx, ty] = sites[r][q], nx = tx - sx, ny = ty - sy;
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
      const ka = vertexKey(vertex), kb = vertexKey(next), forward = ka < kb;
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
      contour.push(...(forward ? wall : [...wall].reverse()).slice(0, -1));
    });
    if (contour.length) cells.push({ center: [sx, sy], contour });
  }
  return { cells, walls: [...walls.values()] };
}

/** Intersections with the actual sheet, shared by the surface and cut edge. */
export function epidermisSeam(geometry: EpidermisGeometry, from: Point, to: Point): number[] {
  const dx = to[0] - from[0], dy = to[1] - from[1], positions = [0, 1];
  for (const wall of geometry.walls) for (let k = 1; k < wall.length; k++) {
    const a = wall[k - 1], b = wall[k], ex = b[0] - a[0], ey = b[1] - a[1];
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
  draw(ctx: CanvasRenderingContext2D) {
    if (!this.plate) {
      const plate = document.createElement('canvas'), resolution = 6;
      plate.width = FIELD.width * resolution; plate.height = FIELD.height * resolution;
      const c = plate.getContext('2d')!;
      c.scale(resolution, resolution); c.translate(-FIELD.left, -FIELD.top);
      for (const [i, cell] of this.geometry.cells.entries()) {
        c.beginPath(); cell.contour.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
        c.fillStyle = `rgba(247,250,215,${.1 + hash(i + 81) * .09})`; c.fill();
        // Sparse material variation is bound to each cell rather than a moving overlay.
        c.save(); c.clip();
        const [x, y] = cell.center;
        const body = c.createRadialGradient(x - 1.5, y - 2, .3, x, y, 4.8);
        body.addColorStop(0, '#ffffe51e'); body.addColorStop(1, '#183b2010');
        c.fillStyle = body; c.fillRect(x - 7, y - 7, 14, 14); c.restore();
      }
      c.beginPath();
      for (const wall of this.geometry.walls) wall.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y));
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = '#294f3559'; c.lineWidth = .24; c.stroke();
      c.strokeStyle = '#edf4cbd9'; c.lineWidth = .11; c.stroke();
      this.plate = plate;
    }
    ctx.drawImage(this.plate, FIELD.left, FIELD.top, FIELD.width, FIELD.height);
  }
  dispose() { if (this.plate) { this.plate.width = this.plate.height = 0; this.plate = undefined; } }
}
