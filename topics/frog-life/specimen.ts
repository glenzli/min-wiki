import frogSVG from './specimen.svg?raw';
import butterflySVG from '../butterfly-life/specimen.svg?raw';
import { renderAnimal } from './scene.ts';
import { renderButterfly } from '../butterfly-life/scene.ts';
import { growthState } from './model.ts';
import { butterflyGrowth } from '../butterfly-life/model.ts';
import type { MetamorphosisState } from './controller.ts';
/** Each species has exactly one retained SVG. Namespacing also permits side-by-side comparison. */
export class Specimen {
  readonly element:HTMLDivElement;
  private svg:SVGSVGElement;
  constructor(private animal:'frog'|'butterfly'){
    this.element=document.createElement('div');this.element.className='specimen-scene';this.element.innerHTML=animal==='frog'?frogSVG:butterflySVG;
    this.svg=this.element.querySelector('svg')!;
    for(const node of this.element.querySelectorAll('[id]')){const id=node.id;node.setAttribute('data-part',id);node.id=`meta-${animal}-${id}`;}
    for(const node of this.element.querySelectorAll('*'))for(const attribute of [...node.attributes]){let value=attribute.value.replace(/url\(#([^\)]+)\)/g,`url(#meta-${animal}-$1)`);if(attribute.name==='href'&&value.startsWith('#'))value=`#meta-${animal}-${value.slice(1)}`;if(value!==attribute.value)node.setAttribute(attribute.name,value);}
  }
  render(state:MetamorphosisState,label:string){
    this.svg.setAttribute('aria-label',label);
    if(this.animal==='frog'){
      const p=state.frog.progress,s=growthState(p);renderAnimal(p,this.element);
      const width=570-200*s.body,cx=s.x-90*s.tail*s.scale,cy=s.y+15*s.scale;
      const wide=state.chapter==='compare'?Math.max(width,440):680;
      this.svg.setAttribute('viewBox',state.frog.view==='whole'?`${cx-wide/2} ${cy-wide*.32} ${wide} ${wide*.64}`:`${cx-width/2} ${cy-width*.32} ${width} ${width*.64}`);
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
