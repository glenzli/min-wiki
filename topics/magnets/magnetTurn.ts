import { create2DMotion } from '@glenzli/wiki-reader/animation2d';

export const MAGNET_TURN_MS = 560;
type Vector = readonly [number, number, number];
type Face = { id: string; color: 'red' | 'blue'; points: readonly Vector[]; normal: Vector };
const halfWidth = 70, halfHeight = 32, halfDepth = 7;
const camera: Vector = [11 / 14, -12 / 14, -1];
const light: Vector = [.38, -.8, -.6];
const point = (x: number, y: number, z: number): Vector => [x, y, z];
const faces: Face[] = [];
for (const [color, left, right] of [['red', -halfWidth, 0], ['blue', 0, halfWidth]] as const) {
  faces.push(
    { id: `${color}-top`, color, normal: [0, -1, 0], points: [point(left, -halfHeight, -halfDepth), point(right, -halfHeight, -halfDepth), point(right, -halfHeight, halfDepth), point(left, -halfHeight, halfDepth)] },
    { id: `${color}-front`, color, normal: [0, 0, -1], points: [point(left, -halfHeight, -halfDepth), point(right, -halfHeight, -halfDepth), point(right, halfHeight, -halfDepth), point(left, halfHeight, -halfDepth)] },
    { id: `${color}-back`, color, normal: [0, 0, 1], points: [point(right, -halfHeight, halfDepth), point(left, -halfHeight, halfDepth), point(left, halfHeight, halfDepth), point(right, halfHeight, halfDepth)] },
  );
}
faces.push(
  { id: 'red-end', color: 'red', normal: [-1, 0, 0], points: [point(-halfWidth, -halfHeight, halfDepth), point(-halfWidth, -halfHeight, -halfDepth), point(-halfWidth, halfHeight, -halfDepth), point(-halfWidth, halfHeight, halfDepth)] },
  { id: 'blue-end', color: 'blue', normal: [1, 0, 0], points: [point(halfWidth, -halfHeight, -halfDepth), point(halfWidth, -halfHeight, halfDepth), point(halfWidth, halfHeight, halfDepth), point(halfWidth, halfHeight, -halfDepth)] },
);
const dot = (a: Vector, b: Vector) => a.reduce((value, n, i) => value + n * b[i]!, 0);
const rotate = ([x, y, z]: Vector, angle: number): Vector => {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
};
// Match the existing tabletop's front, right and upper surfaces at both ends.
// This is an authored orthographic turn cue, not a solved free rotation.
const project = ([x, y, z]: Vector) => [75.5 + x + z * 11 / 14, 38 + y - z * 12 / 14] as const;
const path = (points: readonly (readonly number[])[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(3)} ${y!.toFixed(3)}`).join('') + 'Z';

/** Material stays attached to each half while the entire bar turns around its
 * retained center. Face visibility follows projection, so pole letters are
 * never swapped on a still-facing surface or mirrored through a scaleX. */
export function magnetTurnFrame(degrees: number) {
  const angle = Math.max(0, Math.min(180, degrees)) * Math.PI / 180;
  const projected = faces.map(face => {
    const normal = rotate(face.normal, angle), points = face.points.map(p => rotate(p, angle));
    return { id: face.id, color: face.color, d: path(points.map(project)), visible: dot(normal, camera) > .000001,
      depth: points.reduce((sum, p) => sum + dot(p, camera), 0) / points.length, shade: .24 * (1 - Math.max(0, dot(normal, light))) };
  }).sort((a, b) => a.depth - b.depth);
  const front = dot(rotate([0, 0, -1], angle), camera) >= 0;
  const z = front ? -halfDepth : halfDepth, direction = front ? 1 : -1;
  const xAxis = rotate([direction, 0, 0], angle);
  const horizontal = [xAxis[0] + xAxis[2] * 11 / 14, -xAxis[2] * 12 / 14];
  const labels = ([-35, 35] as const).map((x, i) => {
    const [px, py] = project(rotate([x, 12, z], angle));
    return { pole: i ? 'S' : 'N', transform: `matrix(${horizontal[0]} ${horizontal[1]} 0 1 ${px} ${py})` };
  });
  const footprint = [[-halfWidth, halfHeight + 4, -halfDepth], [halfWidth, halfHeight + 4, -halfDepth], [halfWidth, halfHeight + 4, halfDepth], [-halfWidth, halfHeight + 4, halfDepth]] as const;
  return { faces: projected, labels, shadow: path(footprint.map(p => project(rotate(p, angle)))),
    labelOpacity: Math.min(1, Math.abs(Math.cos(angle) - Math.sin(angle) * 11 / 14) * 3), center: project([0, 0, 0]) };
}

/** Seek-only presentation; the existing tray RAF supplies the elapsed time. */
export function createMagnetTurn() {
  const pose = { amount: 0 };
  const track = create2DMotion({ duration: MAGNET_TURN_MS })
    .add(pose, { amount: [0, 1], duration: MAGNET_TURN_MS, ease: 'inOutSine' }, 0);
  let from = 0, to = 0, started: number | null = null, angle = 0, disposed = false;
  return {
    turn(flipped: boolean, now: number) {
      if (disposed) return;
      from = angle; to = flipped ? 180 : 0; started = now;
    },
    sample(now: number) {
      if (started !== null && !disposed) {
        const progress = Math.max(0, Math.min(1, (now - started) / MAGNET_TURN_MS));
        track.seek(progress * MAGNET_TURN_MS); angle = from + (to - from) * pose.amount;
        if (progress === 1) { angle = to; started = null; }
      }
      return angle;
    },
    settle(flipped: boolean) { angle = to = flipped ? 180 : 0; started = null; return angle; },
    get active() { return started !== null && !disposed; },
    dispose() { disposed = true; started = null; track.dispose(); },
  };
}

export function createTurningMagnet(root: SVGGElement) {
  const ns = 'http://www.w3.org/2000/svg';
  const create = <K extends keyof SVGElementTagNameMap>(tag: K, parent: SVGElement = root) => {
    const node = document.createElementNS(ns, tag); parent.append(node); return node;
  };
  const shadow = create('path'); shadow.setAttribute('fill', '#293c37'); shadow.setAttribute('opacity', '.19'); shadow.setAttribute('filter', 'url(#soft-shadow)');
  const solid = create('g'), parts = new Map<string, SVGGElement>();
  for (const face of faces) {
    const group = create('g', solid), body = create('path', group), shade = create('path', group), edge = create('path', group);
    body.setAttribute('fill', `url(#${face.id.endsWith('top') ? `${face.color}-top` : face.color})`);
    shade.setAttribute('fill', '#162b31');
    edge.setAttribute('fill', 'none'); edge.setAttribute('stroke', '#fff8e7'); edge.setAttribute('stroke-opacity', '.26'); edge.setAttribute('stroke-width', '.8'); edge.setAttribute('stroke-linejoin', 'round');
    parts.set(face.id, group);
  }
  const letters = create('g'); letters.setAttribute('fill', '#fffdf4'); letters.setAttribute('font-size', '28'); letters.setAttribute('font-weight', '800'); letters.setAttribute('text-anchor', 'middle'); letters.setAttribute('font-family', 'system-ui,sans-serif');
  const labels = [create('text', letters), create('text', letters)];
  labels.forEach((label, i) => { label.textContent = i ? 'S' : 'N'; });
  return {
    draw(degrees: number) {
      const frame = magnetTurnFrame(degrees);
      shadow.setAttribute('d', frame.shadow);
      for (const face of frame.faces) {
        const group = parts.get(face.id)!; group.setAttribute('display', face.visible ? 'inline' : 'none');
        for (const node of group.children) node.setAttribute('d', face.d);
        group.children[1]!.setAttribute('opacity', String(face.shade)); solid.append(group);
      }
      letters.setAttribute('opacity', String(frame.labelOpacity));
      labels.forEach((label, i) => label.setAttribute('transform', frame.labels[i]!.transform));
      root.dataset.turnAngle = degrees.toFixed(2);
      root.dataset.turning = String(degrees > .001 && degrees < 179.999);
    },
  };
}
