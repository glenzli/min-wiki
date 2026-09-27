import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveComparison, createIntegration, DEFAULT_EXPERIMENT, initialConditions, frameAt, MAX_FRAMES, STRIDE } from '../threeBody/model.ts';
import { ThreeBodyExperiment } from '../threeBody/controller.ts';
test('live integration starts immediately and crosses the old duration without resetting',()=>{
  const live=createLiveComparison(DEFAULT_EXPERIMENT),finite=createIntegration(initialConditions(DEFAULT_EXPERIMENT));
  assert.equal(live.result.count,1);
  for(let i=0;i<200;i++)live.advance(100);
  while(!finite.advance()){}
  assert.deepEqual(frameAt(live.result.base,1000),frameAt(finite.trajectory,1000));
  const values=live.result.base.values,saved=frameAt(live.result.base,500).slice();
  for(let i=0;i<600;i++)live.advance(100);
  assert.equal(live.done,false);assert.equal(live.result.count,MAX_FRAMES);
  assert.equal(live.result.base.values,values);assert.equal(values.byteLength,MAX_FRAMES*STRIDE*8);
  assert.equal(frameAt(live.result.base,1000)[0],80);assert.equal(frameAt(live.result.base,0)[0],60);
  assert.equal(saved[0],10);
  for(let i=0;i<MAX_FRAMES;i++){
    const a=frameAt(live.result.base,i),b=frameAt(live.result.perturbed,i);
    assert.equal(a[0],b[0]);assert.ok(a[14]!<1e-5);assert.ok(a[16]!<1e-9);
    assert.ok(Math.abs(a[0]!-(60+i*.02))<1e-10);
  }
});
test('live work budgets and history reads do not change integration identity',()=>{
  const a=createLiveComparison(DEFAULT_EXPERIMENT),b=createLiveComparison(DEFAULT_EXPERIMENT);
  for(let i=0;i<100;i++)a.advance(100);
  for(let i=0;i<1000;i++)b.advance(10);
  assert.deepEqual(a.result.base.values,b.result.base.values);
  const latest=frameAt(a.result.base,a.result.count-1).slice();frameAt(a.result.base,0);frameAt(a.result.base,40);
  assert.deepEqual(frameAt(a.result.base,a.result.count-1),latest);
  assert.throws(()=>a.advance(Infinity));assert.throws(()=>a.advance(101));assert.throws(()=>a.advance(0));
});
test('continuous mode still stops at guards and pairs share accepted timestamps',()=>{
  for(const xC of [.3,-.3]){
    const live=createLiveComparison({...DEFAULT_EXPERIMENT,xC});
    for(let i=0;i<1000&&!live.done;i++)live.advance(100);
    assert.equal(live.done,true);
    const before=live.result.base.values.slice();live.advance(100);assert.deepEqual(live.result.base.values,before);
    assert.ok([live.result.base.reason,live.result.perturbed.reason].some(r=>r!=='complete'));
    for(let i=0;i<live.result.count;i++){
      const a=frameAt(live.result.base,i),b=frameAt(live.result.perturbed,i);
      assert.equal(a[0],b[0]);assert.ok(a[14]!<=.001&&b[14]!<=.001);
    }
  }
});

test('production controller preserves seek input, paused state, chapter history and bounded scheduling',()=>{
  // Minimal DOM adapter exercises real controller callbacks and model. Canvas intentionally fails
  // so the accessible numeric fallback is tested independently from browser visual checks.
  class Node {
    children:(Node|string)[]=[];parentElement?:Node;dataset:Record<string,string>={};attributes:Record<string,string>={};
    textContent='';className='';value='';disabled=false;hidden=false;checked=false;max='';
    onclick?:()=>void;oninput?:()=>void;onchange?:()=>void;
    constructor(public tag:string){}
    append(...nodes:(Node|string)[]){for(const n of nodes)if(n instanceof Node)n.parentElement=this;this.children.push(...nodes);}
    replaceChildren(...nodes:(Node|string)[]){this.children=[];this.append(...nodes);}
    setAttribute(k:string,v:string){this.attributes[k]=v;}
    getContext(){return null;}
    querySelector(tag:string):Node|undefined{return this.find(n=>n.tag===tag);}
    find(predicate:(node:Node)=>boolean):Node|undefined{if(predicate(this))return this;for(const n of this.children)if(n instanceof Node){const result=n.find(predicate);if(result)return result;}}
    text():string{return this.textContent+this.children.map(n=>typeof n==='string'?n:n.text()).join('');}
  }
  const host=globalThis as unknown as Record<string,unknown>,keys=['document','requestAnimationFrame','cancelAnimationFrame'];
  const originals=keys.map(k=>Object.getOwnPropertyDescriptor(host,k));
  let serial=0,now=performance.now();const pending=new Map<number,(t:number)=>void>();
  const doc={hidden:false,createElement:(tag:string)=>new Node(tag)};
  Object.assign(host,{document:doc,requestAnimationFrame:(cb:(t:number)=>void)=>{pending.set(++serial,cb);return serial;},cancelAnimationFrame:(id:number)=>pending.delete(id)});
  let controller:ThreeBodyExperiment|undefined;
  try{
    controller=new ThreeBodyExperiment(v=>v.en);controller.setActive(true);
    const root=controller.root as unknown as Node,find=(f:(n:Node)=>boolean)=>{const n=root.find(f);assert.ok(n);return n;};
    const play=()=>find(n=>n.tag==='button'&&/Start \/ continue|^Pause$/.test(n.textContent));
    const scrub=find(n=>n.tag==='input'&&n.parentElement?.className==='three-time');
    const readings=()=>find(n=>n.className==='readouts three-readouts').text();
    const tick=()=>{now+=50;const jobs=[...pending.values()];pending.clear();for(const cb of jobs)cb(now);assert.ok(pending.size<=1);};
    assert.equal(pending.size,0);play().onclick!();for(let i=0;i<60;i++)tick();
    const integrated=Number(scrub.max);assert.ok(integrated>100);
    scrub.value='20';scrub.oninput!();assert.equal(scrub.value,'20');assert.equal(pending.size,0);assert.match(readings(),/0.40 \/ /);
    const paused=readings();tick();assert.equal(readings(),paused);
    controller.setActive(false);controller.setActive(true);assert.equal(scrub.value,'20');assert.equal(pending.size,0);
    play().onclick!();for(let i=0;i<80;i++)tick();assert.ok(Number(scrub.max)>integrated);
    doc.hidden=true;tick();assert.equal(pending.size,0);doc.hidden=false;
    const reset=find(n=>n.tag==='button'&&n.textContent==='Reset initial positions');reset.onclick!();assert.equal(scrub.value,'0');assert.equal(scrub.max,'0');
    const wandering=find(n=>n.tag==='button'&&n.textContent==='Wandering path · perturbation');wandering.onclick!();
    assert.equal(wandering.attributes['aria-pressed'],'true');
    const overlay=find(n=>n.tag==='input'&&n.parentElement?.className==='three-overlay');
    const compareNote=find(n=>n.className==='three-compare-note');
    assert.equal(overlay.checked,true);assert.equal(compareNote.hidden,false);
    assert.match(compareNote.textContent,/separate run/);
    overlay.checked=false;overlay.onchange!();assert.equal(compareNote.hidden,true);
    overlay.checked=true;overlay.onchange!();assert.equal(compareNote.hidden,false);
    assert.equal(scrub.max,'0');
    play().onclick!();tick();controller.dispose();assert.equal(pending.size,0);
  }finally{controller?.dispose();keys.forEach((k,i)=>{const d=originals[i];if(d)Object.defineProperty(host,k,d);else delete host[k];});}
});
