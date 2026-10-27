export type CosmicWebKind = 'near' | 'middle' | 'observable';
export const COSMIC_WEB_COUNTS: Readonly<Record<CosmicWebKind, number>> = Object.freeze({ near: 23000, middle: 28000, observable: 36000 });
export const COSMIC_WEB_COMPONENT = Object.freeze({ cluster: 0, filament: 1, void: 2 });

export interface CosmicWebPopulation {
  readonly kind: CosmicWebKind;
  readonly count: number;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly opacities: Float32Array;
  /** CPU-only provenance: components and source node/link indices. */
  readonly components: Uint8Array;
  readonly sources: Uint16Array;
  readonly nodes: Float32Array;
  readonly links: Uint16Array;
  readonly controls: Float32Array;
  /** Authored underdense regions, four values per centre/radius. */
  readonly voids: Float32Array;
}

type Point = readonly [number, number, number];
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function generator(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const inside = (kind: CosmicWebKind, p: Point, edge = .995) => kind === 'observable' ? Math.hypot(...p) < edge : Math.max(...p.map(Math.abs)) < edge;
/** Alpha taper, never a material surface or a boundary pile-up. */
export function cosmicWebEdge(kind: CosmicWebKind, x: number, y: number, z: number) {
  const r = kind === 'observable' ? Math.hypot(x, y, z) : Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
  return 1 - smooth(kind === 'observable' ? .74 : .76, .995, r);
}

/** Deterministic statistical teaching geometry, not a survey, distance catalogue,
 * gas-emission field or cosmological simulation. Points are representative
 * luminous objects. Thick, irregular point distributions suggest filaments;
 * the topology below is never rendered as connected luminous ropes. */
export function cosmicWebPopulation(kind: CosmicWebKind): CosmicWebPopulation {
  const seed = kind === 'near' ? 0x8327ad : kind === 'middle' ? 0xb2311d : 0x9af337;
  const random = generator(seed), normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(random() * Math.PI * 2);
  const nodeCount = kind === 'near' ? 34 : kind === 'middle' ? 74 : 112;
  const voidCount = kind === 'near' ? 3 : kind === 'middle' ? 5 : 7;
  const voids = new Float32Array(voidCount * 4);
  for (let i = 0; i < voidCount; i++) {
    voids.set([(random() - .5) * 1.10, (random() - .5) * 1.10, (random() - .5) * 1.10, (kind === 'near' ? .27 : .21) + random() * .09], i * 4);
  }
  const inVoid = (p: Point, scale: number) => {
    for (let i = 0; i < voidCount; i++) if (Math.hypot(p[0] - voids[i * 4]!, p[1] - voids[i * 4 + 1]!, p[2] - voids[i * 4 + 2]!) < voids[i * 4 + 3]! * scale) return true;
    return false;
  };
  const nodes: Point[] = [], masses: number[] = [], separation = kind === 'near' ? .26 : kind === 'middle' ? .20 : .17;
  // Rejection is bounded; this fixed low-density packing has ample capacity.
  for (let tries = 0; nodes.length < nodeCount && tries < 40000; tries++) {
    const p: Point = [(random() - .5) * 1.84, (random() - .5) * 1.84, (random() - .5) * 1.84];
    if (!inside(kind, p, kind === 'observable' ? .88 : .92) || inVoid(p, 1) || nodes.some(node => distance(node, p) < separation)) continue;
    nodes.push(p); masses.push(.38 + random() * .62);
  }
  if (nodes.length !== nodeCount) throw new Error('Cosmic web node budget could not be populated');

  const links: [number, number][] = [], controls: Point[] = [], seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const nearest = nodes.map((node, j) => ({ j, distance: distance(nodes[i]!, node) })).filter(item => item.j !== i).sort((a, b) => a.distance - b.distance).slice(0, i % 5 === 0 ? 4 : 3);
    for (const neighbor of nearest) {
      const a = Math.min(i, neighbor.j), b = Math.max(i, neighbor.j), key = `${a}:${b}`;
      if (seen.has(key)) continue; seen.add(key); links.push([a, b]);
      const start = nodes[a]!, end = nodes[b]!, bend = .08 + random() * .08;
      controls.push([(start[0] + end[0]) / 2 + (random() - .5) * bend, (start[1] + end[1]) / 2 + (random() - .5) * bend, (start[2] + end[2]) / 2 + (random() - .5) * bend]);
    }
  }
  const count = COSMIC_WEB_COUNTS[kind], clusterCount = Math.floor(count * .27), filamentCount = Math.floor(count * .67);
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count), opacities = new Float32Array(count), components = new Uint8Array(count), sources = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const component = i < clusterCount ? COSMIC_WEB_COMPONENT.cluster : i < clusterCount + filamentCount ? COSMIC_WEB_COMPONENT.filament : COSMIC_WEB_COMPONENT.void;
    let p: Point = [0, 0, 0], source = 0, core = 0, accepted = false;
    for (let attempt = 0; attempt < 48 && !accepted; attempt++) {
      if (component === COSMIC_WEB_COMPONENT.cluster) {
        source = Math.floor(random() * nodes.length); const node = nodes[source]!, sigma = .016 + masses[source]! * .034;
        const nx = normal(), ny = normal(), nz = normal(); core = Math.exp(-(nx * nx + ny * ny + nz * nz) / 2);
        p = [node[0] + nx * sigma * (1 + masses[source]! * .5), node[1] + ny * sigma * .86, node[2] + nz * sigma];
      } else if (component === COSMIC_WEB_COMPONENT.filament) {
        source = Math.floor(random() * links.length); const [a, b] = links[source]!, start = nodes[a]!, end = nodes[b]!, control = controls[source]!;
        const t = random(), u = 1 - t, width = .025 + Math.sin(Math.PI * t) ** 2 * .027;
        // Broad stochastic offsets in all three axes, plus varying axial
        // occupancy, prevent uniform thin tubes or coplanar connector strings.
        if (random() > .30 + .70 * (.5 + .5 * Math.sin(t * (8 + source % 7) + source))) continue;
        p = [u * u * start[0] + 2 * u * t * control[0] + t * t * end[0] + normal() * width,
          u * u * start[1] + 2 * u * t * control[1] + t * t * end[1] + normal() * width * .82,
          u * u * start[2] + 2 * u * t * control[2] + t * t * end[2] + normal() * width];
        core = .12 + random() * .28;
      } else {
        p = [(random() - .5) * 1.99, (random() - .5) * 1.99, (random() - .5) * 1.99];
      }
      accepted = inside(kind, p) && (component === COSMIC_WEB_COMPONENT.void || !inVoid(p, .77) || random() < .07);
    }
    if (!accepted) { source = i % nodes.length; p = nodes[source]!; core = .5; }
    positions.set(p, i * 3); components[i] = component; sources[i] = source;
    const warm = component === COSMIC_WEB_COMPONENT.cluster || random() < .13, variation = .78 + random() * .22;
    colors.set(warm ? [variation, variation * (.72 + core * .08), variation * (.47 + core * .10)] : [variation * .49, variation * .66, variation * .84], i * 3);
    sizes[i] = component === COSMIC_WEB_COMPONENT.cluster ? .92 + core * 1.06 : component === COSMIC_WEB_COMPONENT.filament ? .67 + random() * .51 : .55 + random() * .30;
    opacities[i] = cosmicWebEdge(kind, ...p) * (component === COSMIC_WEB_COMPONENT.cluster ? .25 + core * .20 : component === COSMIC_WEB_COMPONENT.filament ? .12 + random() * .14 : .055 + random() * .065);
  }
  return { kind, count, positions, colors, sizes, opacities, components, sources, nodes: new Float32Array(nodes.flat()), links: new Uint16Array(links.flat()), controls: new Float32Array(controls.flat()), voids };
}
