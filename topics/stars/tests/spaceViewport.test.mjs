import test from 'node:test';
import assert from 'node:assert/strict';
import {StellarSpaceViewport} from '../spaceViewport.ts';
const words={loading:'Loading',failed:'Unavailable',retry:'Retry',canvas:'Rotatable geometry',ready:'Drag or use arrows',fallback:'Flat'};
const input={chapter:'evolution',track:'solar',progress:.2,nebula:'nursery',illumination:'emission'};
function harness(){
 class Node{
  children=[];parentElement;hidden=false;dataset={};className='';textContent='';attributes={};onclick=null;
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  before(child){const p=this.parentElement;if(p){p.children.splice(p.children.indexOf(this),0,child);child.parentElement=p;}}
  remove(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);this.parentElement=undefined;}}
  setAttribute(k,v){this.attributes[k]=v;}
 }
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={createElement:()=>new Node()};
 const host=new Node(),canvas=new Node();host.append(canvas);
 let created=0,disposed=0,failures=[],draws=[];
 class Renderer{
  constructor(canvas,onFailure){created++;failures.push(onFailure);}
  draw(...args){draws.push(args);}
  dispose(){disposed++;}
  resetCamera(){}
 }
 const restore=()=>{if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;};
 return {host,canvas,Renderer,restore,stats:()=>({created,disposed,draws,failures})};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('lazy viewport admits one loader and displays only the newest snapshot after rapid input changes',async()=>{
 const h=harness();let resolve,loads=0;const promise=new Promise(r=>resolve=r);let viewport;
 try{viewport=new StellarSpaceViewport(h.canvas,words,()=>{},()=>{loads++;return promise;});assert.equal(loads,0);
  viewport.draw(input,0,false);viewport.draw({...input,progress:.8},2,true);assert.equal(loads,1);assert.equal(h.canvas.hidden,false);
  resolve({StellarSpace3D:h.Renderer});await settle();assert.equal(h.stats().created,1);assert.equal(h.canvas.hidden,true);
  assert.equal(h.stats().draws.at(-1)[0].progress,.8);assert.equal(h.stats().draws.at(-1)[2],true);
  viewport.draw(undefined);assert.equal(h.host.children[0].hidden,true);assert.equal(h.canvas.hidden,false);
 }finally{viewport?.dispose();assert.equal(h.stats().disposed,1);h.restore();}
});
test('disposal before an import completes prevents a late canvas and renderer from mounting',async()=>{
 const h=harness();let resolve;const pending=new Promise(r=>resolve=r);const viewport=new StellarSpaceViewport(h.canvas,words,()=>{},()=>pending);
 try{viewport.draw(input);viewport.dispose();resolve({StellarSpace3D:h.Renderer});await settle();assert.equal(h.stats().created,0);assert.deepEqual(h.host.children,[h.canvas]);}
 finally{viewport.dispose();h.restore();}
});
test('context failure retains science state and retry replaces rather than accumulates resources',async()=>{
 const h=harness();let viewport,redraws=0;
 try{viewport=new StellarSpaceViewport(h.canvas,words,()=>redraws++,async()=>({StellarSpace3D:h.Renderer}));viewport.draw(input,3,true);await settle();assert.equal(h.stats().created,1);
  h.stats().failures[0]();assert.equal(h.stats().disposed,1);assert.equal(h.canvas.hidden,false);const root=h.host.children[0];assert.equal(root.dataset.renderState,'fallback');
  viewport.draw({...input,track:'massive',progress:1},4,true);
  const retry=root.children.find(c=>c.textContent==='Retry');assert.equal(retry.hidden,false);retry.onclick();await settle();assert.equal(h.stats().created,2);assert.equal(root.children.filter(c=>c.className==='stellar-space-canvas').length,1);
  assert.equal(h.stats().draws.at(-1)[0].track,'massive');assert.equal(h.stats().draws.at(-1)[1],4);assert.ok(redraws>=3);
 }finally{viewport?.dispose();assert.equal(h.stats().disposed,2);h.restore();}
});
