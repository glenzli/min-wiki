export type Cell = 'animal' | 'plant' | 'bacterium';
export type Part = 'membrane' | 'dna' | 'nucleus' | 'chloroplast' | 'mitochondrion' | 'vacuole';
export type Process = 'respiration' | 'photosynthesis';
export type Box = { x:number;y:number;width:number;height:number };
export type Point = { x:number;y:number };
export const clamp = (value:number) => Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export const cellOffset:Record<Cell,number>={animal:0,plant:780,bacterium:1560};
export function hasPart(cell:Cell,part:Part):boolean {
  if(part==='membrane'||part==='dna')return true;
  if(part==='nucleus'||part==='mitochondrion')return cell!=='bacterium';
  return cell==='plant';
}
export function processFor(cell:Cell,choice:Process):Process|null {
  return cell==='bacterium'?null:cell==='animal'?'respiration':choice;
}
export function wholeBox(cell:Cell):Box {return {x:cellOffset[cell],y:0,width:720,height:490};}
const focus:Record<Cell,Record<Part,[number,number,number]>>={
 animal:{membrane:[139,174,168],dna:[345,248,214],nucleus:[345,248,235],chloroplast:[360,245,720],mitochondrion:[478,331,156],vacuole:[360,245,720]},
 plant:{membrane:[143,164,163],dna:[215,248,151],nucleus:[215,248,175],chloroplast:[484,110,170],mitochondrion:[212,358,152],vacuole:[397,249,330]},
 bacterium:{membrane:[145,245,158],dna:[361,245,255],nucleus:[360,245,720],chloroplast:[360,245,720],mitochondrion:[360,245,720],vacuole:[360,245,720]},
};
export function focusBox(cell:Cell,part:Part):Box {
 if(!hasPart(cell,part))return wholeBox(cell);
 const [x,y,width]=focus[cell][part],height=width*490/720;
 return {x:cellOffset[cell]+x-width/2,y:y-height/2,width,height};
}
export function mixBox(from:Box,to:Box,fraction:number):Box {
 const p=clamp(fraction),mix=(a:number,b:number)=>a+(b-a)*p;
 return {x:mix(from.x,to.x),y:mix(from.y,to.y),width:mix(from.width,to.width),height:mix(from.height,to.height)};
}
/** A finite teaching sequence, not reaction rates or a molecular simulation. */
export function processState(progress:number){
 const p=clamp(progress);
 return {progress:p,incoming:clamp(p/.42),conversion:clamp((p-.42)/.28),outgoing:clamp((p-.7)/.3),phase:p<.42?'input':p<.7?'change':'output'} as const;
}
const interval=(p:number,start:number,end:number)=>{
 const x=clamp((p-start)/(end-start));
 return x*x*(3-2*x);
};
/** The teaching clock joins cytoplasmic breakdown to one mitochondrial reaction area.
 * The phases are not reaction rates: ATP is also made during glycolysis. */
export function respirationState(progress:number){
 const p=clamp(progress);
 return {
  progress:p,approach:interval(p,0,.22),breakdown:interval(p,.22,.32),
  transfer:interval(p,.32,.5),oxygen:interval(p,0,.5),
  conversion:interval(p,.52,.7),outgoing:interval(p,.72,1),
  supply:interval(p,.7,.86),work:interval(p,.86,1),
  phase:p<.22?'input':p<.32?'breakdown':p<.52?'converge':p<.7?'change':p<.86?'supply':'work',
 } as const;
}
export function respirationLayout(cell:'animal'|'plant'){
 const animal=cell==='animal';
 const reaction=animal?{x:478,y:331}:{x:212,y:358};
 return {
  reaction,
  start:animal?{x:40,y:268}:{x:386,y:374},
  approachControl:animal?{x:210,y:334}:{x:341,y:389},
  breakdown:animal?{x:310,y:353}:{x:297,y:373},
  transferControl:animal?{x:391,y:377}:{x:257,y:399},
  nutrientPort:{x:reaction.x+(animal?-14:14),y:reaction.y-4},
  oxygenStart:animal?{x:667,y:317}:{x:53,y:317},
  oxygenControl:animal?{x:579,y:278}:{x:111,y:331},
  oxygenPort:{x:reaction.x+(animal?14:-14),y:reaction.y-4},
  carbonStart:{x:reaction.x-13,y:reaction.y-28},
  carbonControl:animal?{x:583,y:190}:{x:91,y:260},
  carbonEnd:animal?{x:665,y:148}:{x:53,y:191},
  waterStart:{x:reaction.x+(animal?43:-43),y:reaction.y+8},
  waterControl:animal?{x:575,y:430}:{x:105,y:421},
  waterEnd:animal?{x:671,y:403}:{x:65,y:438},
  energyStart:{x:reaction.x,y:reaction.y+17},
  energyControl:animal?{x:441,y:408}:{x:244,y:408},
  work:animal?{x:351,y:378}:{x:373,y:388},
 };
}
export function respirationFrame(cell:'animal'|'plant',progress:number){
 const s=respirationState(progress),g=respirationLayout(cell);
 return {state:s,layout:g,
  nutrient:s.progress<=.32?curvePoint(g.start,g.approachControl,g.breakdown,s.approach):curvePoint(g.breakdown,g.transferControl,g.nutrientPort,s.transfer),
  oxygen:curvePoint(g.oxygenStart,g.oxygenControl,g.oxygenPort,s.oxygen),
  energy:curvePoint(g.energyStart,g.energyControl,g.work,s.supply),
 };
}
export function curvePoint(start:Point,control:Point,end:Point,fraction:number):Point {
 const t=clamp(fraction),s=1-t;
 return {x:s*s*start.x+2*s*t*control.x+t*t*end.x,y:s*s*start.y+2*s*t*control.y+t*t*end.y};
}
/** A lobed animal-cell outline; inner contours stay aligned with the same material surface. */
export function animalPoint(angle:number,inset=0):Point {
 const shape=1+.055*Math.sin(3*angle+.6)+.027*Math.cos(5*angle);
 return {x:360+(229-inset)*Math.cos(angle)*shape,y:245+(174-inset)*Math.sin(angle)*shape};
}
export function animalOutline(inset=0):string {
 return Array.from({length:120},(_,i)=>{const p=animalPoint(i*Math.PI/60,inset);return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join(' ')+'Z';
}
/** Hit regions share the diagram's coordinates, including through an SVG use-instance. */
export function hitPart(cell:Cell,point:Point):Part {
 const x=point.x-cellOffset[cell],y=point.y;
 const inside=(cx:number,cy:number,rx:number,ry:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
 if(cell==='bacterium')return inside(361,245,102,61)?'dna':'membrane';
 const nx=cell==='animal'?345:215,ny=248,nr=cell==='animal'?78:52;
 if(inside(nx,ny,nr*.7,nr*.55))return 'dna';
 if(inside(nx,ny,nr,nr*.85))return 'nucleus';
 if(cell==='plant'){
  if([[209,113],[343,109],[484,110],[543,258],[447,380],[309,380]].some(([cx,cy])=>inside(cx,cy,47,32)))return 'chloroplast';
  if(inside(212,358,43,28))return 'mitochondrion';
  if(inside(402,250,132,108))return 'vacuole';
 }else if([[239,329],[473,168],[478,331]].some(([cx,cy])=>inside(cx,cy,46,29)))return 'mitochondrion';
 return 'membrane';
}
