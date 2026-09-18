import { parcelDisplacement, relativeDensity, sourceDisplacement } from './model.ts';
export class SoundScene {
  private dots: SVGCircleElement[];
  private bands: SVGRectElement[];
  constructor(private svg: SVGElement) {
    const ns = 'http://www.w3.org/2000/svg';
    this.bands = Array.from({ length: 42 }, (_, i) => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', String(144 + i * 16)); r.setAttribute('y', '138'); r.setAttribute('width', '16'); r.setAttribute('height', '184'); svg.querySelector('#density-bands')!.append(r); return r; });
    this.dots = Array.from({ length: 336 }, (_, i) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cy', String(151 + Math.floor(i / 42) * 22)); c.setAttribute('r', '3'); c.setAttribute('fill', '#3c787e'); svg.querySelector('#parcels')!.append(c); return c; });
  }
  draw(time: number, tension: number, amplitude: number, airView: number) {
    const source = sourceDisplacement(time, tension, amplitude);
    this.svg.querySelector('#instrument')!.setAttribute('opacity', String(1 - airView));
    this.svg.querySelector('#air-view')!.setAttribute('opacity', String(airView));
    this.svg.querySelector('#string')!.setAttribute('d', Array.from({length: 61}, (_, i) => `${i ? 'L' : 'M'}${172 + i / 60 * 556} ${230 + source * 2 * Math.sin(Math.PI * i / 60)}`).join(''));
    this.svg.querySelector('#piston')!.setAttribute('transform', `translate(${source} 0)`);
    const displacement = parcelDisplacement(336, time, tension, amplitude);
    this.svg.querySelector('#marked-parcel')!.setAttribute('cx', String(128 + 336 + displacement));
    this.svg.querySelector('#marked-guide')!.setAttribute('d', `M464 230H${464 + displacement}`);
    this.svg.querySelector('#receiver')!.setAttribute('d', `M816 171Q${816 + parcelDisplacement(688, time, tension, amplitude) * 2} 230 816 289`);
    this.dots.forEach((dot, i) => dot.setAttribute('cx', String(144 + i % 42 * 16 + parcelDisplacement(16 + i % 42 * 16, time, tension, amplitude))));
    this.bands.forEach((band, i) => { const density = relativeDensity(24 + i * 16, time, tension, amplitude); band.setAttribute('fill', density > 1 ? '#558d96' : '#f5f4df'); band.setAttribute('fill-opacity', String(Math.min(.48, Math.abs(density - 1) * 1.1))); });
  }
}
