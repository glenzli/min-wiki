import { groundProjection, hull, parts, project, type Point } from './model.ts';
const path = (points: [number, number][]) => points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + 'Z';
export function drawShadowScene(svg: SVGElement, lightX: number, height: number, overhead: number, extended: boolean) {
  const set = (id: string, key: string, value: string) => svg.querySelector(`#${id}`)!.setAttribute(key, value);
  const projection = (p: Point) => project(p, overhead);
  let grid = '';
  for (let x = 50; x <= 850; x += 50) { const a = projection({ x, y: -160, z: 0 }), b = projection({ x, y: 160, z: 0 }); grid += `M${a}L${b}`; }
  for (let y = -160; y <= 160; y += 40) { const a = projection({ x: 50, y, z: 0 }), b = projection({ x: 850, y, z: 0 }); grid += `M${a}L${b}`; }
  set('floor-grid', 'd', grid);
  set('floor', 'd', path([{x:20,y:-180,z:0},{x:880,y:-180,z:0},{x:880,y:180,z:0},{x:20,y:180,z:0}].map(projection)));
  const count = extended ? 9 : 1;
  for (let i = 0; i < 9; i++) {
    if (i >= count) { set(`shadow-${i}`, 'd', ''); continue; }
    const a = (i - 1) / 8 * Math.PI * 2, spread = extended && i > 0 ? 19 : 0;
    const light = { x: lightX + Math.cos(a) * spread, y: Math.sin(a) * spread, z: height };
    const d = parts.map(part => path(hull(part.points.map(point => projection(groundProjection(point, light)))))).join('');
    set(`shadow-${i}`, 'd', i < count ? d : ''); set(`shadow-${i}`, 'fill-opacity', String(extended ? .13 : .64)); set(`shadow-${i}`, 'filter', extended ? 'url(#soft-edge)' : 'none');
  }
  const light = { x: lightX, y: 0, z: height }, top = {x:450,y:0,z:120}, tip = groundProjection(top, light);
  const l = projection(light), t = projection(top), g = projection(tip);
  set('ray', 'd', `M${l}L${t}L${g}`); set('measure', 'd', `M${projection({x:450,y:0,z:0})}L${g}`);
  set('lamp-tether', 'd', `M${projection({x:lightX,y:0,z:0})}L${l}`);
  set('lamp', 'transform', `translate(${l})`); set('lamp-disc', 'r', extended ? '16' : '9');
  for (let i = 0; i < parts.length; i++) set(`part-${i}`, 'd', path(hull(parts[i]!.points.map(projection))));
}
