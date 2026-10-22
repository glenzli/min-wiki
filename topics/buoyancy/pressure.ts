import type { Settings } from './model.ts';
import type { TankGeometry } from './tankScene.ts';

export type SectionPoint = readonly [number, number];
export interface PressureSample {
  point: SectionPoint;
  inward: SectionPoint;
  depth: number;
  /** Relative gauge pressure: diagram depth has no metre calibration. */
  relativePressure: number;
}

/** Uniform-liquid gauge pressure, with physical SI inputs. */
export function gaugePressure(densityKgM3: number, depthMetres: number) {
  return Math.max(0, densityKgM3) * 9.81 * Math.max(0, depthMetres);
}

/** The section follows the retained specimen, not a second experiment. Shapes
 * are illustrative; their areas are never used to recompute volume or force. */
export function specimenSection(state: Settings, g: TankGeometry, flooded: boolean): SectionPoint[] {
  const x = 365 - g.width / 2, y = g.bottom - g.height, w = g.width, h = g.height;
  if (state.experiment === 'boat' && state.boat) {
    const outer: SectionPoint[] = [[x,y],[x+w*.108,g.bottom-12],[x+w*.192,g.bottom],[x+w*.808,g.bottom],[x+w*.892,g.bottom-12],[x+w,y]];
    if (!flooded) return outer;
    const thickness = 20 * 260 / w;
    return [...outer,[x+w-thickness*.75,y],[x+w*.892-thickness*.7,g.bottom-thickness],[x+w*.108+thickness*.7,g.bottom-thickness],[x+thickness*.75,y]];
  }
  if (state.experiment === 'objects' && state.object === 'stone') {
    return [[0,.76],[.08,.3],[.44,0],[.86,.16],[1,.75],[.72,1],[.21,1]].map(([u,v]) => [x+u*w,y+v*h]);
  }
  if (state.experiment === 'boat' || state.experiment === 'objects' && state.object === 'clay') {
    return Array.from({length:32},(_,i)=>{const angle=i/32*Math.PI*2;return [365+w/2*Math.cos(angle),y+h/2+h/2*Math.sin(angle)] as SectionPoint;});
  }
  return [[x,y],[x+w,y],[x+w,g.bottom],[x,g.bottom]];
}

/** Pressure acts perpendicular into each wetted face. Equal-length face
 * patches have arrows scaled by local depth; these are pressure samples,
 * never a numerical integration of the nonmetric illustration. */
export function samplePressure(points: readonly SectionPoint[], water: number, density: number): PressureSample[] {
  const area = points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
  const winding = Math.sign(area) || 1;
  const samples: PressureSample[] = [];
  for (let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if (length<.001) continue;
    const count=Math.max(1,Math.round(length/38));
    for(let j=0;j<count;j++) {
      const amount=(j+.5)/count,point:SectionPoint=[a[0]+dx*amount,a[1]+dy*amount],depth=Math.max(0,point[1]-water);
      if (depth<.5) continue;
      samples.push({point,inward:[-dy/length*winding,dx/length*winding],depth,relativePressure:Math.max(0,density)*depth});
    }
  }
  return samples;
}
