import { meteorState, positionAt, wakeParcel, WAKE_BIRTHS, type JourneyKind } from './model.ts';
const NS = 'http://www.w3.org/2000/svg';
const attr = (node: Element, values: Record<string, string | number>) => {
  for (const [key, value] of Object.entries(values)) node.setAttribute(key, String(value));
};

export function createMeteorScene(svg: SVGSVGElement) {
  const get = (id: string) => svg.querySelector<SVGElement>(`#${id}`)!;
  const parcels = WAKE_BIRTHS.map(() => {
    const circle = document.createElementNS(NS, 'circle');
    get('wake').append(circle); return circle;
  });
  const sparks = Array.from({ length: 9 }, () => {
    const line = document.createElementNS(NS, 'path');
    get('ablated-material').append(line); return line;
  });
  function draw(progress: number, kind: JourneyKind) {
    const state = meteorState(progress, kind);
    attr(get('rock'), { transform: `translate(${state.x} ${state.y}) rotate(${state.direction * 180 / Math.PI}) scale(${state.radius / 15.34})`, opacity: state.visible ? 1 : 0 });
    attr(get('head-glow'), { transform: `translate(${state.x} ${state.y})`, opacity: state.glow });
    attr(get('heated-face'), { opacity: state.glow * .9 });
    attr(get('ground-shadow'), { opacity: kind === 'stone' ? Math.max(0, (progress - .83) / .17) * .35 : 0 });
    const points: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const p = Math.max(.17, progress - .047 + i * .047 / 20);
      const point = positionAt(Math.min(.65, p), kind);
      points.push(`${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`);
    }
    attr(get('fresh-trail'), { d: points.join(' '), opacity: state.glow });
    parcels.forEach((circle, i) => {
      const parcel = wakeParcel(WAKE_BIRTHS[i], progress);
      attr(circle, { cx: parcel.x, cy: parcel.y, r: parcel.radius, opacity: parcel.opacity * .19 });
    });
    sparks.forEach((line, i) => {
      const cycle = (progress * 31 + i * .618) % 1;
      const along = cycle * (30 + i * 4), side = Math.sin(i * 9.1) * cycle * 18;
      const dx = Math.cos(state.direction), dy = Math.sin(state.direction);
      const x = state.x - dx * along - dy * side, y = state.y - dy * along + dx * side;
      attr(line, { d: `M${x},${y}l${-dx * (4 + cycle * 7)},${-dy * (4 + cycle * 7)}`, opacity: state.glow * Math.sin(cycle * Math.PI) * .7 });
    });
    const path: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const p = (kind === 'stone' ? 1 : .65) * i / 100, point = positionAt(p, kind);
      path.push(`${i === 0 ? 'M' : 'L'}${point.x},${point.y}`);
    }
    attr(get('journey-path'), { d: path.join(' ') });
    svg.dataset.stage = state.stage;
    svg.dataset.glow = state.glow.toFixed(3);
    svg.dataset.mass = state.mass.toFixed(3);
    return state;
  }
  return { draw };
}
