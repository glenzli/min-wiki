import frogSVG from './specimen.svg?raw';
import butterflySVG from '../butterfly-life/specimen.svg?raw';
import { renderAnimal } from './scene.ts';
import { renderButterfly } from '../butterfly-life/scene.ts';
import { growthState, tailPath } from './model.ts';
import { butterflyGrowth } from '../butterfly-life/model.ts';
import type { MetamorphosisState } from './controller.ts';
/** Each species has exactly one retained SVG. Namespacing also permits side-by-side comparison. */
export class Specimen {
  readonly element:HTMLDivElement;
  private svg:SVGSVGElement;
  constructor(private animal:'frog'|'butterfly'){
    this.element=document.createElement('div');this.element.className='specimen-scene';this.element.innerHTML=animal==='frog'?frogSVG:butterflySVG;
    this.svg=this.element.querySelector('svg')!;
    if(animal==='frog'){
      this.svg.setAttribute('preserveAspectRatio','xMidYMid slice');
      const ns='http://www.w3.org/2000/svg',body=this.svg.querySelector('#animal')!,tail=body.querySelector('#tail')!;
      const memory=document.createElementNS(ns,'path');memory.id='tail-memory-outline';memory.setAttribute('fill','none');memory.setAttribute('stroke','#f8efcb');memory.setAttribute('stroke-width','2.6');memory.setAttribute('stroke-dasharray','7 7');memory.setAttribute('vector-effect','non-scaling-stroke');memory.setAttribute('aria-hidden','true');body.insertBefore(memory,tail);
      const marks=document.createElementNS(ns,'g');marks.setAttribute('aria-hidden','true');
      for(const [name,x,y,r] of [['tail',385,290,18],['hind',481,337,16],['front',594,344,15]] as const){
        const ring=document.createElementNS(ns,'circle');ring.id=`mark-${name}`;ring.setAttribute('cx',String(x));ring.setAttribute('cy',String(y));ring.setAttribute('r',String(r));ring.setAttribute('fill','none');ring.setAttribute('stroke','#fff1b5');ring.setAttribute('stroke-width','1.6');ring.setAttribute('vector-effect','non-scaling-stroke');marks.append(ring);
      }
      body.append(marks);
    }
    for(const node of this.element.querySelectorAll('[id]')){const id=node.id;node.setAttribute('data-part',id);node.id=`meta-${animal}-${id}`;}
    for(const node of this.element.querySelectorAll('*'))for(const attribute of [...node.attributes]){let value=attribute.value.replace(/url\(#([^\)]+)\)/g,`url(#meta-${animal}-$1)`);if(attribute.name==='href'&&value.startsWith('#'))value=`#meta-${animal}-${value.slice(1)}`;if(value!==attribute.value)node.setAttribute(attribute.name,value);}
  }
  render(state:MetamorphosisState,label:string){
    this.svg.setAttribute('aria-label',label);
    if(this.animal==='frog'){
      const p=state.frog.progress,s=growthState(p);renderAnimal(p,this.element);
      const memory=this.element.querySelector<SVGPathElement>('[data-part="tail-memory-outline"]')!;
      memory.setAttribute('d',tailPath(p));
      memory.setAttribute('opacity',String(Math.max(0,Math.min(.48,(p-2.55)*1.5,(3.96-p)*3))));
      const marking=state.aspect==='structure'||state.aspect==='movement';
      for(const [name,amount] of [['tail',s.tail],['hind',s.hind],['front',s.front]] as const){
        const ring=this.element.querySelector<SVGCircleElement>(`[data-part="mark-${name}"]`)!;
        const visible=marking&&p>=.95&&amount>.08&&!(name==='tail'&&p>=3.96);
        ring.setAttribute('opacity',visible?String(Math.min(.34,amount*.34)):'0');
      }
      const width=570-200*s.body,cx=s.x-90*s.tail*s.scale,cy=s.y+15*s.scale+34*(1-s.hatch);
      const wide=state.chapter==='compare'?Math.max(width,440):560+70*(1-s.hatch);
      const wholeX=Math.max(0,Math.min(1000-wide,cx-wide/2));
      this.svg.setAttribute('viewBox',state.frog.view==='whole'?`${wholeX} ${cy-wide*.32} ${wide} ${wide*.64}`:`${cx-width/2} ${cy-width*.32} ${width} ${width*.64}`);
      this.svg.setAttribute('data-growth',p.toFixed(4));
    }else{
      const b=state.butterfly;renderButterfly(this.element,b.stage,b.wing,b.peek,b.growth);
      const detail=[[380,175,240,195],[310,220,370,170],[398,119,206,274],[290,180,420,355]];
      // Interpolate the same specimen camera; never jump viewBox at a stage boundary.
      const lower=Math.min(2,Math.floor(b.growth)),u=Math.min(1,b.growth-lower),v=u*u*(3-2*u);
      const box=detail[lower]!.map((a,i)=>a+(detail[lower+1]![i]!-a)*v);
      const s=butterflyGrowth(b.growth);
      // Keep the emergence below the case inside both views.
      box[1]!-=s.emerge*(1-s.wing.width)*20;
      box[3]!+=s.emerge*(1-s.wing.width)*100;
      this.svg.setAttribute('viewBox',b.view==='whole'?'180 20 640 520':box.join(' '));
    }
  }
  dispose(){this.element.replaceChildren();}
}
