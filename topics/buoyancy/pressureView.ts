import type { Settings } from './model.ts';
import { buoyancy } from './model.ts';
import type { TankGeometry } from './tankScene.ts';
import { samplePressure, specimenSection, type SectionPoint } from './pressure.ts';
import { t } from './i18n.ts';

const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/** A section of the current specimen. No clock, settings, or model mutation. */
export function drawPressureSection(svg:SVGSVGElement,state:Settings,g:TankGeometry,result:ReturnType<typeof buoyancy>,settled:boolean,opening?:number,replacement=false) {
  const rect=svg.parentElement!.getBoundingClientRect(),width=Math.max(280,rect.width),height=Math.max(210,rect.height);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio','none');
  const minY=Math.min(g.water-34,g.bottom-g.height-35),maxY=Math.max(g.water+35,g.bottom+55);
  const scale=Math.min(2.6,(height-54)/(maxY-minY),(width-112)/g.width),offsetY=28+(height-54-(maxY-minY)*scale)/2-minY*scale;
  const center=width*.46,netX=width*.86;
  const point=(p:SectionPoint):SectionPoint=>[center+(p[0]-365)*scale,offsetY+p[1]*scale];
  const path=(points:readonly SectionPoint[])=>points.map((p,i)=>`${i?'L':'M'}${point(p).join(' ')}`).join('')+'Z';
  // Hide pressure during the illustrative molding transition: an intermediate
  // open form has no independently solved equilibrium or wetted boundary.
  const molding=opening!==undefined&&opening>.001&&opening<.999;
  const points=specimenSection(state,g,result.flooded),samples=settled&&!molding?samplePressure(points,g.water,result.density):[];
  const water=point([365,g.water])[1],top=point([365,g.bottom-g.height])[1],bottom=point([365,g.bottom])[1];
  const kind=state.experiment==='boat'?'clay':state.experiment==='depth'?'stone':state.object;
  const colors={wood:['#d5ae79','#896740'],stone:['#a8afa4','#627066'],steel:['#b8c8d1','#596f7c'],clay:['#d49a7b','#925d47']}[kind];
  const pressureArrows=samples.map(sample=>{
    const end=point(sample.point),length=sample.relativePressure*scale*.24,normal=sample.inward;
    const start=[end[0]-normal[0]*length,end[1]-normal[1]*length];
    return `<path class="local-pressure" data-depth="${sample.depth}" data-nx="${normal[0]}" data-ny="${normal[1]}" d="M${start.join(' ')}L${end.join(' ')}" fill="none" stroke="#357a9a" stroke-width="3" marker-end="url(#pressure-head)"/>`;
  }).join('');
  const boat=state.experiment==='boat'&&state.boat;
  const thickness=20*260/g.width,inner=boat?[[365-g.width/2+thickness*.75,g.bottom-g.height],[365-g.width*.392+thickness*.7,g.bottom-thickness],[365+g.width*.392-thickness*.7,g.bottom-thickness],[365+g.width/2-thickness*.75,g.bottom-g.height]] as SectionPoint[]:[];
  const cargo=boat?Array.from({length:state.cargo},(_,i)=>{
    const p=point([365+(i%4-1.5)*22,g.bottom-thickness-19-Math.floor(i/4)*21]);
    return `<rect x="${p[0]-9*scale}" y="${p[1]}" width="${18*scale}" height="${18*scale}" rx="${3*scale}" fill="#b7a17b" stroke="#8d7b5a" stroke-width="1"/>`;
  }).join(''):'';
  const cord=state.experiment==='depth'&&!replacement?`<path d="M${center} 24V${top}" stroke="#75818a" stroke-width="2.5"/><circle cx="${center}" cy="${top}" r="4" fill="#75818a"/>`:'';
  const forceLength=Math.min(height*.28,result.force*8),forceBottom=Math.min(height-56,bottom+6);
  const parcelCargo=replacement&&boat&&result.flooded?Array.from({length:state.cargo},(_,i)=>{
    const p=point([365+(i%4-1.5)*22,g.bottom-thickness-19-Math.floor(i/4)*21]);
    return `<rect data-parcel-cargo="${i}" x="${p[0]-9*scale}" y="${p[1]}" width="${18*scale}" height="${18*scale}" rx="${3*scale}" fill="#72c4ce" fill-opacity=".75" stroke="#36818c" stroke-dasharray="4 3"/>`;
  }).join(''):'';
  const parcel=replacement?`<g id="water-parcel" data-displaced-ml="${result.displaced}"><path d="${path(points)}" fill="#fcfaf522" stroke="#557b84" stroke-width="2" stroke-dasharray="7 5"/><g clip-path="url(#parcel-underwater)"><path d="${path(points)}" fill="#72c4ce" fill-opacity=".75" stroke="#36818c" stroke-width="2" stroke-dasharray="7 5"/>${parcelCargo}</g></g>`:'';
  svg.innerHTML=`<defs>
    <linearGradient id="pressure-water" x2="0" y2="1"><stop stop-color="#e4f2f6"/><stop offset="1" stop-color="#bfd9e3"/></linearGradient>
    <linearGradient id="pressure-specimen" x2=".7" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
    <marker id="pressure-head" markerWidth="5" markerHeight="5" viewBox="0 0 10 10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#357a9a"/></marker>
    <marker id="pressure-resultant" markerWidth="3" markerHeight="3" viewBox="0 0 10 10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#178b70"/></marker>
    <marker id="parcel-weight-head" markerWidth="3" markerHeight="3" viewBox="0 0 10 10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#b77c3e"/></marker>
    <clipPath id="parcel-underwater"><rect x="0" y="${water}" width="${width}" height="${Math.max(0,height-water)}"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="#f7f8f6"/>
  <rect x="12" y="${water}" width="${width-24}" height="${Math.max(0,height-18-water)}" rx="2" fill="url(#pressure-water)"/>
  <path d="M12 ${water}H${width-12}" stroke="#6799ad" stroke-width="1.5"/>
  <text x="22" y="${water-10}" fill="#577887" font-size="13">${escape(t('水面'))}</text>
  ${replacement?parcel:`${cord}<path d="${path(points)}" fill="url(#pressure-specimen)" stroke="${colors[1]}" stroke-width="2.5" stroke-linejoin="round"/>${boat?`<path d="${path(inner)}" fill="${result.flooded?'url(#pressure-water)':'#f7f8f6'}" stroke="#9c6c52" stroke-width="2" stroke-linejoin="round"/>`:''}${cargo}`}${pressureArrows}
  ${settled&&result.force>0?`<path id="pressure-net-force" data-newtons="${result.force}" d="M${netX} ${forceBottom}v-${forceLength}" stroke="#178b70" stroke-width="5" marker-end="url(#pressure-resultant)"/><text x="${netX}" y="${forceBottom+23}" text-anchor="middle" fill="#19775f" font-size="13">${escape(t('水的合力'))}</text>`:''}
  ${replacement&&settled&&result.force>0?`<path id="parcel-weight" data-newtons="${result.force}" d="M${width*.14} ${forceBottom-forceLength}v${forceLength}" stroke="#b77c3e" stroke-width="5" marker-end="url(#parcel-weight-head)"/><text x="${width*.14}" y="${forceBottom+23}" text-anchor="middle" fill="#946d3d" font-size="13">${escape(t('这份水的重量'))}</text><text x="${center}" y="${Math.max(water+24,Math.min(bottom-10,(water+bottom)/2))}" text-anchor="middle" fill="#245d68" font-size="14">${escape(t('想象换回水'))}</text>`:''}`;
}
