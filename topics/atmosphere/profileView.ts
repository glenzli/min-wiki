import { journeyFrame, type Settings } from './model.ts';
import type content from './content.json';

type Text = typeof content.zh;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const path = (d: string, color: string, width = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const arrow = (d: string, x: number, y: number, color: string, rotate = 0) => path(d,color)+`<path d="M-7 -5 0 0 -7 5" transform="translate(${x} ${y}) rotate(${rotate})" fill="none" stroke="${color}" stroke-width="3"/>`;
function art(kind:string) {
 const body=kind==='polar-cloud'?Array.from({length:7},(_,i)=>path(`M35 ${40+i*13}q65-27 117-2t105-5`,['#ead0ee','#bcd9f1','#f0dbc1'][i%3],5)).join(''):Array.from({length:10},(_,i)=>path(`M20 ${40+i*9}q40-20 76-5t72 0t100-7`,'#bcdcee',2)).join('');
 return `<svg viewBox="0 0 300 170" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Supplementary rare-cloud and emission explanations, without a second world renderer. */
export class AtmosphereProfiles {
 private key='';
 constructor(private root:HTMLElement,private text:Text) {}
 draw(s:Settings,labels:boolean) {
  this.root.classList.toggle('hide-profile-labels',!labels);
  const frame=journeyFrame(s.journey), key=s.view+':'+s.world+':'+frame.phase+':'+frame.layer;
  if(key===this.key)return;
  this.key=key;
  this.root.innerHTML=s.view==='layers'&&frame.phase==='ascent'?this.layerEnrichment(frame.layer):'';
 }
 private layerEnrichment(layer:number){
  if(layer===3)return this.energyExplanation();
  if(layer===1||layer===2)return `<section class="high-clouds"><h3>${escape(this.text.diagram.rare)}</h3><div>${this.text.highClouds.map((c,i)=>`<article>${art(i===0?'polar-cloud':'night-cloud')}<h4>${escape(c.name)}</h4><p>${escape(c.body)}</p></article>`).join('')}</div></section>`;
  return '';
 }
 private energyExplanation(){
  const energy=this.text.energy;
  const target=(x:number,y:number,lit=false)=>`<circle cx="${x}" cy="${y}" r="10" fill="${lit?'#9aefc3':'#173449'}" stroke="${lit?'#cdffe5':'#9ccde2'}" stroke-width="2"/>`;
  const drawings=[
   arrow('M18 50H96',96,50,'#f5d49a',0)+target(128,50)+path('M40 45l10 10m0-10L40 55','#ffe2ae',2),
   target(92,50,true)+`<circle cx="92" cy="50" r="23" fill="none" stroke="#9aefc3" stroke-width="1" stroke-dasharray="2 5"/>`+arrow('M18 50H76',76,50,'#f5d49a',0),
   target(51,50)+path('M66 50q6-13 12 0t12 0t12 0t12 0t12 0','#a0f3c8',2)+`<path d="M124 45l7 5-7 5" stroke="#a0f3c8" fill="none" stroke-width="2"/>`
  ];
  return `<section class="energy-explanation"><h3>${escape(energy.title)}</h3><p>${escape(energy.intro)}</p><ol>${energy.steps.map((step,i)=>`<li><svg viewBox="0 0 164 100" aria-hidden="true">${drawings[i]}</svg><strong>${i+1}. ${escape(step.title)}</strong><span>${escape(step.body)}</span></li>`).join('')}</ol><p class="energy-key">${escape(energy.key)}</p></section>`;
 }
 dispose(){this.root.replaceChildren();}
}
