import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFragment} from 'parse5';
import {createHearingScene,drawHearing} from '../scene.ts';

// Execute the production SVG construction and renderer. This adapter supplies
// DOM storage and path-length APIs only; browser layout remains a separate check.
class Element {
 children=[];attributes={};
 constructor(attrs=[]){for(const {name,value} of attrs)this.setAttribute(name,value);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 querySelector(selector){
  for(const child of this.children){
   if(child.getAttribute('id')===selector.slice(1))return child;
   const found=child.querySelector(selector);if(found)return found;
  }
  return null;
 }
 set innerHTML(source){
  const convert=node=>{const element=new Element(node.attrs);element.children=(node.childNodes??[]).filter(n=>n.tagName).map(convert);return element;};
  this.children=parseFragment(source).childNodes.filter(node=>node.tagName).map(convert);
 }
 getTotalLength(){return 100;}
 getPointAtLength(distance){return{x:distance,y:distance};}
}
function scene(){
 const root=new Element();root.innerHTML='<svg id="h-ear-art"></svg><svg id="h-detail-art"></svg>';
 createHearingScene(root);
 const get=id=>{const node=root.querySelector('#'+id);assert.ok(node,`production scene missing ${id}`);return node;};
 const numbers=(id,attribute='transform')=>(get(id).getAttribute(attribute)?.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)??[]).map(Number);
 const draw=(p,pitch=0,strength=.55)=>drawHearing(p,pitch,strength,root);
 const snapshot=()=>Object.fromEntries(['hair-cell','stereocilia','flow-arrows','sample-cell-anchor','sample-cell-focus','cell-signal'].map(id=>[id,{...get(id).attributes}]));
 return{get,numbers,draw,snapshot};
}

test('production close-up stays at rest before local arrival while middle-ear motion is visible',()=>{
 const h=scene();h.draw(.25);
 assert.ok(Math.abs(h.numbers('eardrum')[0])>.1);
 assert.deepEqual(h.numbers('hair-cell'),[0,0]);assert.deepEqual(h.numbers('stereocilia'),[0,0,0]);
 assert.deepEqual(h.numbers('flow-arrows'),[0,0]);assert.equal(h.get('flow-arrows').getAttribute('opacity'),'0');
 assert.equal(h.get('cell-signal').getAttribute('stroke-dashoffset'),'1');
 assert.ok(h.get('ions').children.every(dot=>dot.getAttribute('opacity')==='0'));
 h.draw(.44,0);assert.deepEqual(h.numbers('hair-cell'),[0,0]);
 h.draw(.44,1);assert.ok(Math.abs(h.numbers('hair-cell')[1])>.1);
});

test('production B close-up follows the selected strip cell instead of the global eardrum driver',()=>{
 const h=scene();h.draw(.6,0);
 assert.ok(Math.abs(h.numbers('eardrum')[0])<1e-12);
 const movement=h.numbers('hair-cell')[1];assert.ok(Math.abs(movement)>.1);
 const sampleX=h.numbers('sample-cell-anchor')[0];
 const strip=Array.from({length:18},(_,i)=>h.numbers(`strip-cell-${i}`)).find(([x])=>Math.abs(x-sampleX)<1e-9);
 assert.ok(strip);
 assert.ok(Math.abs((strip[1]-239)-movement*12)<1e-9);
 assert.ok(Math.abs(h.numbers('sample-cell-focus','cy')[0]-(strip[1]-20))<1e-9);
 assert.ok(Math.abs(h.numbers('stereocilia')[0]+movement*5)<1e-9);
 assert.ok(Math.abs(h.numbers('flow-arrows')[0]-movement*4)<1e-9);
 h.draw(.6,0,1);assert.ok(Math.abs(h.numbers('hair-cell')[1])>Math.abs(movement));
 assert.equal(h.numbers('sample-cell-anchor')[0],sampleX);
});

test('rewinding and changing pitch recompute local arrival without retained close-up motion',()=>{
 const h=scene();h.draw(.62,0);const low=h.snapshot();
 h.draw(.62,1);assert.notEqual(h.numbers('sample-cell-anchor')[0],Number(low['sample-cell-anchor'].transform.match(/translate\(([^ ]+)/)[1]));
 h.draw(.25,0);assert.deepEqual(h.numbers('hair-cell'),[0,0]);assert.equal(h.get('cell-signal').getAttribute('stroke-dashoffset'),'1');
 h.draw(.62,0);assert.deepEqual(h.snapshot(),low);
 h.draw(1);assert.deepEqual(h.numbers('hair-cell'),[0,0]);assert.deepEqual(h.numbers('stereocilia'),[0,0,0]);
 assert.equal(h.get('flow-arrows').getAttribute('opacity'),'0');assert.equal(h.get('cell-signal').getAttribute('stroke-dashoffset'),'0');
 h.draw(0);assert.deepEqual(h.numbers('hair-cell'),[0,0]);assert.equal(h.get('cell-signal').getAttribute('stroke-dashoffset'),'1');
});

test('production zero-amplitude control clears local and whole-ear evoked responses at every phase',()=>{
 const h=scene();
 for(const pitch of [0,.5,1])for(let i=0;i<=50;i++){
  const p=i/50;
  h.draw(p,pitch,1);const positive=h.snapshot();
  h.draw(p,pitch,0);
  assert.deepEqual(h.numbers('eardrum'),[0,0]);assert.deepEqual(h.numbers('ossicles'),[0,369,201]);
  assert.deepEqual(h.numbers('hair-cell'),[0,0]);assert.deepEqual(h.numbers('stereocilia'),[0,0,0]);
  assert.deepEqual(h.numbers('flow-arrows'),[0,0]);assert.deepEqual(h.numbers('vesicles'),[0,0]);
  for(const id of ['air-waves','cochlea-glow','response-envelope','flow-arrows','nerve-dot','brain-mark'])assert.equal(h.get(id).getAttribute('opacity'),'0',id);
  for(const id of ['nerve-route','cell-signal'])assert.equal(h.get(id).getAttribute('stroke-dashoffset'),'1',id);
  assert.ok(h.get('ions').children.every(dot=>dot.getAttribute('opacity')==='0'));
  assert.ok(h.numbers('basilar-membrane','d').filter((_,index)=>index%2===1).every(y=>y===230));
  for(let cell=0;cell<18;cell++)assert.equal(h.numbers(`strip-cell-${cell}`)[1],239);
  h.draw(p,pitch,1);assert.deepEqual(h.snapshot(),positive,'restoring input recovers the same selected site and sequence');
 }
});
