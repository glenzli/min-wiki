import { butterflyGrowth } from './model.ts';
/** Display-only projection; whole, detail and comparison consume the same saved anatomy. */
export function renderButterfly(root:ParentNode,stage:number,progress:number,peek:boolean,growth=stage+(stage===3?progress:0)){
  const part=(id:string)=>(root.querySelector(`[data-part="${id}"]`)??root.querySelector(`#${id}`))!;
  const s=butterflyGrowth(growth);
  const alpha=(id:string,value:number)=>{part(id).setAttribute('opacity',String(value));part(id).setAttribute('visibility',value>0?'visible':'hidden');};
  alpha('egg',s.eggOpacity);alpha('larva',s.larvaOpacity);alpha('pupa',s.pupaOpacity);alpha('adult',s.adultOpacity);
  alpha('host-leaf',s.hostOpacity);
  part('egg-crack').setAttribute('opacity',String(s.hatch));
  part('egg-shell').setAttribute('transform',`translate(0 ${s.hatch*8}) scale(1 ${1-s.hatch*.16})`);
  // The larval body grows at its leaf anchor, then turns from the tail attachment
  // to hang before pupation. It is not an adult butterfly stretched into a larva.
  const anchorX=490-140*s.hang;
  const angle=s.larvaAngle*Math.PI/180,tailOffset=(350-anchorX)*s.larvaScale;
  part('larva-silk').setAttribute('d',`M500 98L${s.larvaX+Math.cos(angle)*tailOffset} ${s.larvaY+s.larvaWave+Math.sin(angle)*tailOffset}`);
  part('larva-silk').setAttribute('opacity',String(s.hang*(1-s.pupate)));
  part('larva').setAttribute('transform',`translate(${s.larvaX} ${s.larvaY+s.larvaWave}) rotate(${s.larvaAngle}) scale(${s.larvaScale} ${s.larvaScale*(1+Math.sin(growth*48)*.035*(1-s.hang))}) translate(${-anchorX} -290)`);
  part('pupa-shell').setAttribute('fill-opacity',String(1-s.emerge*.88));
  part('shell-seam').setAttribute('opacity',String(s.shellSplit));
  part('shell-seam').setAttribute('stroke-width',String(1+s.shellSplit*4));
  part('inside').setAttribute('opacity',String(peek?s.pupate*(1-s.emerge)*(.35+.65*s.remodel):0));
  part('inside').setAttribute('transform',`translate(500 275) scale(${.8+.2*s.remodel}) translate(-500 -275)`);
  part('adult').setAttribute('transform',`translate(500 ${260+s.adultY}) scale(${s.adultScale}) translate(-500 -260)`);
  part('expanding-wings').setAttribute('transform',`translate(500 260) scale(${s.wing.width} ${s.wing.length}) translate(-500 -260)`);
  const svg=root.querySelector('svg');svg?.setAttribute('data-growth',s.progress.toFixed(4));
}
